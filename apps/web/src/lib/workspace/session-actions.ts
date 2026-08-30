"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

import { buildModuleRecommendations } from "../prototype/recommendations";
import { usePrototype } from "../prototype/context";
import type { PrototypeSession } from "../prototype/types";
import type { ApiBackedSession } from "./map-api-session";
import {
  buildOnboardingSavePatch,
  mergeSessionPatch,
} from "./session-patch";
import { useUnifiedWorkspaceSession, useWorkspaceApi } from "./context";

const ONBOARDING_SAVE_DEBOUNCE_MS = 400;

export function useWorkspaceSessionActions(workspaceSlug: string) {
  const prototype = usePrototype();
  const api = useWorkspaceApi();
  const unified = useUnifiedWorkspaceSession(workspaceSlug);
  const onboardingSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const pendingOnboardingPatch = useRef<Record<string, unknown> | null>(null);

  const flushOnboardingSave = useCallback(() => {
    if (onboardingSaveTimer.current) {
      clearTimeout(onboardingSaveTimer.current);
      onboardingSaveTimer.current = null;
    }
    const patch = pendingOnboardingPatch.current;
    pendingOnboardingPatch.current = null;
    if (patch) {
      void api.saveOnboardingPatch(patch);
    }
  }, [api]);

  useEffect(() => () => flushOnboardingSave(), [flushOnboardingSave]);

  const queueOnboardingSave = useCallback(
    (session: ApiBackedSession) => {
      pendingOnboardingPatch.current = buildOnboardingSavePatch(session);
      if (onboardingSaveTimer.current) {
        clearTimeout(onboardingSaveTimer.current);
      }
      onboardingSaveTimer.current = setTimeout(() => {
        onboardingSaveTimer.current = null;
        const patch = pendingOnboardingPatch.current;
        pendingOnboardingPatch.current = null;
        if (patch) {
          void api.saveOnboardingPatch(patch);
        }
      }, ONBOARDING_SAVE_DEBOUNCE_MS);
    },
    [api],
  );

  const updateSession = useCallback(
    (
      patch:
        | Partial<PrototypeSession>
        | ((session: PrototypeSession) => PrototypeSession),
    ) => {
      if (unified.isApiBacked && unified.session) {
        const next = mergeSessionPatch(
          unified.session,
          patch,
        ) as ApiBackedSession;
        api.patchApiSession(next);

        const settingsPatch: { workspaceName?: string; accentColor?: string } =
          {};
        if (
          patch &&
          typeof patch === "object" &&
          "workspaceName" in patch &&
          patch.workspaceName !== unified.session.workspaceName
        ) {
          settingsPatch.workspaceName = next.workspaceName;
        }
        if (
          patch &&
          typeof patch === "object" &&
          "accentColor" in patch &&
          patch.accentColor !== unified.session.accentColor
        ) {
          settingsPatch.accentColor = next.accentColor;
        }
        if (settingsPatch.workspaceName || settingsPatch.accentColor) {
          void api.saveWorkspaceSettings(settingsPatch);
        }

        const onboardingFields =
          patch &&
          typeof patch === "object" &&
          ("business" in patch ||
            "operations" in patch ||
            "services" in patch ||
            "policies" in patch ||
            "onboardingComplete" in patch);
        if (onboardingFields) {
          queueOnboardingSave(next);
        }
        return;
      }
      prototype.updateSession(patch);
    },
    [api, prototype, queueOnboardingSave, unified.isApiBacked, unified.session],
  );

  const completeOnboarding = useCallback(async () => {
    flushOnboardingSave();
    if (unified.isApiBacked) {
      await api.completeOnboarding();
      return;
    }
    prototype.completeOnboarding();
  }, [api, flushOnboardingSave, prototype, unified.isApiBacked]);

  const toggleDeferredModule = useCallback(
    (moduleId: string) => {
      if (unified.isApiBacked && unified.session) {
        const set = new Set(unified.session.deferredModuleIds);
        if (set.has(moduleId)) set.delete(moduleId);
        else set.add(moduleId);
        api.patchApiSession({
          ...unified.session,
          deferredModuleIds: [...set],
        } as ApiBackedSession);
        return;
      }
      prototype.toggleDeferredModule(moduleId);
    },
    [api, prototype, unified.isApiBacked, unified.session],
  );

  const moduleRecommendations = useMemo(
    () => (unified.session ? buildModuleRecommendations(unified.session) : []),
    [unified.session],
  );

  return {
    session: unified.session,
    mismatch: unified.mismatch,
    isResolving: unified.isResolving,
    isDemo: unified.isDemo,
    isApiBacked: unified.isApiBacked,
    error: unified.error,
    updateSession,
    completeOnboarding,
    toggleDeferredModule,
    moduleRecommendations,
    flushOnboardingSave,
  };
}
