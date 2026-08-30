"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { useClientHydrated } from "./hydration";

import { northstarDemoSession } from "../../content/demo/northstar";
import {
  createUserSession,
  NORTHSTAR_SLUG,
  workspacePlaceholder,
} from "./defaults";
import { initServices } from "./context-init";
import { buildModuleRecommendations } from "./recommendations";
import { parseAccent } from "./preferences";
import { applyAccent } from "./storage";
import {
  clearPrototypeSnapshot,
  getPrototypeSnapshot,
  patchPrototypeSnapshot,
  setPrototypeSnapshot,
  subscribePrototype,
} from "./sync-store";
import { compileTwin } from "./twin-compile";
import type { PrototypeSession } from "./types";

interface PrototypeContextValue {
  session: PrototypeSession | null;
  startDemo: () => PrototypeSession;
  startUserSignup: (businessName: string, email: string) => PrototypeSession;
  signInPrototype: (email: string) => PrototypeSession | null;
  updateSession: (
    patch:
      Partial<PrototypeSession> | ((s: PrototypeSession) => PrototypeSession),
  ) => void;
  completeOnboarding: () => void;
  toggleDeferredModule: (moduleId: string) => void;
  clearPrototype: () => void;
  moduleRecommendations: ReturnType<typeof buildModuleRecommendations>;
}

const PrototypeContext = createContext<PrototypeContextValue | null>(null);

export function PrototypeProvider({ children }: { children: ReactNode }) {
  const session = useSyncExternalStore(
    subscribePrototype,
    getPrototypeSnapshot,
    () => null,
  );

  const persist = useCallback((next: PrototypeSession) => {
    const withServices = next.services.length > 0 ? next : initServices(next);
    setPrototypeSnapshot(withServices);
    applyAccent(parseAccent(withServices.accentColor));
    return withServices;
  }, []);

  const updateSession = useCallback(
    (
      patch:
        Partial<PrototypeSession> | ((s: PrototypeSession) => PrototypeSession),
    ) => {
      patchPrototypeSnapshot((prev) => {
        const next =
          typeof patch === "function" ? patch(prev) : { ...prev, ...patch };
        applyAccent(parseAccent(next.accentColor));
        return next;
      });
    },
    [],
  );

  const startDemo = useCallback(() => {
    clearPrototypeSnapshot();
    const demo = northstarDemoSession();
    return persist(demo);
  }, [persist]);

  const startUserSignup = useCallback(
    (businessName: string, email: string) => {
      const user = initServices(createUserSession(businessName, email));
      return persist(user);
    },
    [persist],
  );

  const signInPrototype = useCallback(
    (email: string) => {
      const stored = getPrototypeSnapshot();
      if (stored?.auth?.email === email && stored.mode !== "demo") {
        return persist(stored);
      }
      return null;
    },
    [persist],
  );

  const completeOnboarding = useCallback(() => {
    patchPrototypeSnapshot((prev) => {
      const twin = compileTwin(prev);
      return {
        ...prev,
        onboardingComplete: true,
        twinCompiled: true,
        twin,
      };
    });
  }, []);

  const toggleDeferredModule = useCallback((moduleId: string) => {
    patchPrototypeSnapshot((prev) => {
      const set = new Set(prev.deferredModuleIds);
      if (set.has(moduleId)) set.delete(moduleId);
      else set.add(moduleId);
      return { ...prev, deferredModuleIds: [...set] };
    });
  }, []);

  const clearPrototype = useCallback(() => {
    clearPrototypeSnapshot();
  }, []);

  const moduleRecommendations = useMemo(
    () => (session ? buildModuleRecommendations(session) : []),
    [session],
  );

  const value: PrototypeContextValue = {
    session,
    startDemo,
    startUserSignup,
    signInPrototype,
    updateSession,
    completeOnboarding,
    toggleDeferredModule,
    clearPrototype,
    moduleRecommendations,
  };

  return (
    <PrototypeContext.Provider value={value}>
      {children}
    </PrototypeContext.Provider>
  );
}

export function usePrototype(): PrototypeContextValue {
  const ctx = useContext(PrototypeContext);
  if (!ctx) {
    throw new Error("usePrototype must be used within PrototypeProvider");
  }
  return ctx;
}

export function useWorkspaceSession(workspaceSlug: string): {
  session: PrototypeSession | null;
  mismatch: boolean;
  isResolving: boolean;
} {
  const hydrated = useClientHydrated();
  const { session } = usePrototype();
  const mismatch =
    hydrated && session !== null && session.workspaceSlug !== workspaceSlug;

  if (!hydrated) {
    return {
      session: workspacePlaceholder(workspaceSlug),
      mismatch: false,
      isResolving: true,
    };
  }

  if (session === null) {
    return { session: null, mismatch: false, isResolving: false };
  }

  if (mismatch) {
    return { session: null, mismatch: true, isResolving: false };
  }

  return { session, mismatch: false, isResolving: false };
}

export { NORTHSTAR_SLUG, workspacePlaceholder };
