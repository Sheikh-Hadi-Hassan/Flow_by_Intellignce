"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  completeWorkspaceOnboarding,
  fetchWorkspaceBundle,
  provisionWorkspace,
  updateWorkspaceOnboarding,
  updateWorkspaceSettings,
} from "../api/workspace";
import { createBrowserSupabaseClient } from "../auth/supabase-browser";
import { isSupabaseConfigured } from "../auth/config";
import { clearPrivateClientState } from "../auth/sign-out";
import { usePrototype } from "../prototype/context";
import { applyAccent } from "../prototype/storage";
import { parseAccent } from "../prototype/preferences";
import type { PrototypeSession } from "../prototype/types";
import { isDemoWorkspaceSlug } from "./demo";
import {
  mapWorkspaceBundleToSession,
  type ApiBackedSession,
} from "./map-api-session";

interface WorkspaceApiContextValue {
  readonly apiSession: ApiBackedSession | null;
  readonly accessToken: string | null;
  readonly loading: boolean;
  readonly error: string | null;
  loadWorkspace: (slug: string) => Promise<ApiBackedSession | null>;
  ensureProvisioned: (input: {
    firstName: string;
    workspaceName: string;
    email?: string;
  }) => Promise<ApiBackedSession | null>;
  patchApiSession: (next: ApiBackedSession) => void;
  saveOnboardingPatch: (
    patch: Record<string, unknown>,
  ) => Promise<ApiBackedSession | null>;
  completeOnboarding: () => Promise<ApiBackedSession | null>;
  saveWorkspaceSettings: (input: {
    workspaceName?: string;
    accentColor?: string;
  }) => Promise<ApiBackedSession | null>;
  refreshWorkspace: () => Promise<ApiBackedSession | null>;
  signOut: () => Promise<void>;
}

const WorkspaceApiContext = createContext<WorkspaceApiContextValue | null>(
  null,
);

export function WorkspaceApiProvider({ children }: { children: ReactNode }) {
  const [apiSession, setApiSession] = useState<ApiBackedSession | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncAccessToken = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setAccessToken(null);
      return null;
    }
    const supabase = createBrowserSupabaseClient();
    const { data } = await supabase.auth.getSession();
    let token = data.session?.access_token ?? null;
    if (!token) {
      try {
        const response = await fetch("/api/auth/session", {
          credentials: "include",
          cache: "no-store",
        });
        if (response.ok) {
          const payload = (await response.json()) as {
            session?: { access_token?: string };
          };
          token = payload.session?.access_token ?? null;
        }
      } catch {
        token = null;
      }
    }
    setAccessToken(token);
    return token;
  }, []);

  useEffect(() => {
    void syncAccessToken();
    if (!isSupabaseConfigured()) return;
    const supabase = createBrowserSupabaseClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAccessToken(session?.access_token ?? null);
      if (!session) {
        setApiSession(null);
      }
    });
    return () => subscription.unsubscribe();
  }, [syncAccessToken]);

  const loadWorkspace = useCallback(
    async (slug: string): Promise<ApiBackedSession | null> => {
      if (isDemoWorkspaceSlug(slug)) {
        return null;
      }
      setLoading(true);
      setError(null);
      try {
        const token = (await syncAccessToken()) ?? undefined;
        if (!token) {
          setApiSession(null);
          setError("Unable to establish authenticated session.");
          return null;
        }
        const bundle = await fetchWorkspaceBundle({
          token,
          slug,
          includeTwin: true,
        });
        const session = mapWorkspaceBundleToSession(bundle);
        setApiSession(session);
        applyAccent(parseAccent(session.accentColor));
        return session;
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load workspace.",
        );
        setApiSession(null);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [syncAccessToken],
  );

  const ensureProvisioned = useCallback(
    async (input: {
      firstName: string;
      workspaceName: string;
      email?: string;
    }): Promise<ApiBackedSession | null> => {
      setLoading(true);
      setError(null);
      try {
        const token = (await syncAccessToken()) ?? undefined;
        if (!token) return null;
        const provisioned = await provisionWorkspace({
          token,
          firstName: input.firstName,
          workspaceName: input.workspaceName,
          ...(input.email ? { email: input.email } : {}),
        });
        const bundle = await fetchWorkspaceBundle({
          token,
          workspaceId: provisioned.workspace.id,
          slug: provisioned.slug,
          includeTwin: true,
        });
        const session = mapWorkspaceBundleToSession(bundle);
        setApiSession(session);
        applyAccent(parseAccent(session.accentColor));
        return session;
      } catch (provisionError) {
        setError(
          provisionError instanceof Error
            ? provisionError.message
            : "Unable to provision workspace.",
        );
        return null;
      } finally {
        setLoading(false);
      }
    },
    [syncAccessToken],
  );

  const patchApiSession = useCallback((next: ApiBackedSession) => {
    setApiSession(next);
    applyAccent(parseAccent(next.accentColor));
  }, []);

  const saveOnboardingPatch = useCallback(
    async (
      patch: Record<string, unknown>,
    ): Promise<ApiBackedSession | null> => {
      if (!apiSession || !accessToken) return null;
      setError(null);
      try {
        await updateWorkspaceOnboarding({
          token: accessToken,
          workspaceId: apiSession.workspaceId,
          patch,
        });
        return apiSession;
      } catch (saveError) {
        setError(
          saveError instanceof Error
            ? saveError.message
            : "Unable to save onboarding.",
        );
        try {
          const bundle = await fetchWorkspaceBundle({
            token: accessToken,
            workspaceId: apiSession.workspaceId,
            slug: apiSession.workspaceSlug,
          });
          const session = mapWorkspaceBundleToSession(bundle);
          setApiSession(session);
          return session;
        } catch {
          return null;
        }
      }
    },
    [accessToken, apiSession],
  );

  const saveWorkspaceSettings = useCallback(
    async (input: {
      workspaceName?: string;
      accentColor?: string;
    }): Promise<ApiBackedSession | null> => {
      if (!apiSession || !accessToken) return null;
      setError(null);
      try {
        await updateWorkspaceSettings({
          token: accessToken,
          workspaceId: apiSession.workspaceId,
          ...(input.workspaceName ? { workspaceName: input.workspaceName } : {}),
          preferences: {
            ...(input.accentColor ? { accentColor: input.accentColor } : {}),
          },
        });
        return apiSession;
      } catch (settingsError) {
        setError(
          settingsError instanceof Error
            ? settingsError.message
            : "Unable to save settings.",
        );
        try {
          const bundle = await fetchWorkspaceBundle({
            token: accessToken,
            workspaceId: apiSession.workspaceId,
            slug: apiSession.workspaceSlug,
            includeTwin: true,
          });
          const session = mapWorkspaceBundleToSession(bundle);
          setApiSession(session);
          applyAccent(parseAccent(session.accentColor));
          return session;
        } catch {
          return null;
        }
      }
    },
    [accessToken, apiSession],
  );

  const completeOnboarding =
    useCallback(async (): Promise<ApiBackedSession | null> => {
      if (!apiSession || !accessToken) return null;
      setError(null);
      try {
        await completeWorkspaceOnboarding({
          token: accessToken,
          workspaceId: apiSession.workspaceId,
        });
        const bundle = await fetchWorkspaceBundle({
          token: accessToken,
          workspaceId: apiSession.workspaceId,
          slug: apiSession.workspaceSlug,
          includeTwin: true,
        });
        const session = mapWorkspaceBundleToSession(bundle);
        setApiSession(session);
        return session;
      } catch (completeError) {
        setError(
          completeError instanceof Error
            ? completeError.message
            : "Unable to complete onboarding.",
        );
        return null;
      }
    }, [accessToken, apiSession]);

  const refreshWorkspace =
    useCallback(async (): Promise<ApiBackedSession | null> => {
      if (!apiSession || !accessToken) return null;
      const bundle = await fetchWorkspaceBundle({
        token: accessToken,
        workspaceId: apiSession.workspaceId,
        slug: apiSession.workspaceSlug,
        includeTwin: true,
      });
      const session = mapWorkspaceBundleToSession(bundle);
      setApiSession(session);
      return session;
    }, [accessToken, apiSession]);

  const signOut = useCallback(async () => {
    clearPrivateClientState();
    setApiSession(null);
    setAccessToken(null);
    setError(null);
    if (isSupabaseConfigured()) {
      const supabase = createBrowserSupabaseClient();
      await supabase.auth.signOut();
    }
  }, []);

  const value = useMemo(
    () => ({
      apiSession,
      accessToken,
      loading,
      error,
      loadWorkspace,
      ensureProvisioned,
      patchApiSession,
      saveOnboardingPatch,
      completeOnboarding,
      saveWorkspaceSettings,
      refreshWorkspace,
      signOut,
    }),
    [
      apiSession,
      accessToken,
      loading,
      error,
      loadWorkspace,
      ensureProvisioned,
      patchApiSession,
      saveOnboardingPatch,
      completeOnboarding,
      saveWorkspaceSettings,
      refreshWorkspace,
      signOut,
    ],
  );

  return (
    <WorkspaceApiContext.Provider value={value}>
      {children}
    </WorkspaceApiContext.Provider>
  );
}

export function useWorkspaceApi(): WorkspaceApiContextValue {
  const ctx = useContext(WorkspaceApiContext);
  if (!ctx) {
    throw new Error("useWorkspaceApi must be used within WorkspaceApiProvider");
  }
  return ctx;
}

export function useUnifiedWorkspaceSession(workspaceSlug: string): {
  session: PrototypeSession | null;
  mismatch: boolean;
  isResolving: boolean;
  isDemo: boolean;
  isApiBacked: boolean;
  error: string | null;
} {
  const prototype = usePrototype();
  const api = useWorkspaceApi();
  const isDemo =
    isDemoWorkspaceSlug(workspaceSlug) &&
    prototype.session?.mode === "demo" &&
    prototype.session.workspaceSlug === workspaceSlug;

  const awaitingApiSession =
    !isDemoWorkspaceSlug(workspaceSlug) &&
    api.apiSession?.workspaceSlug !== workspaceSlug;

  useEffect(() => {
    if (!awaitingApiSession) return;
    void api.loadWorkspace(workspaceSlug);
  }, [api, awaitingApiSession, workspaceSlug]);

  if (isDemoWorkspaceSlug(workspaceSlug)) {
    if (isDemo) {
      return {
        session: prototype.session,
        mismatch: false,
        isResolving: false,
        isDemo: true,
        isApiBacked: false,
        error: null,
      };
    }
    return {
      session: null,
      mismatch: false,
      isResolving: false,
      isDemo: false,
      isApiBacked: false,
      error: null,
    };
  }

  if (awaitingApiSession) {
    if (api.loading || (!api.apiSession && !api.error)) {
      return {
        session: null,
        mismatch: false,
        isResolving: true,
        isDemo: false,
        isApiBacked: true,
        error: null,
      };
    }
  }

  if (!api.apiSession) {
    return {
      session: null,
      mismatch: false,
      isResolving: false,
      isDemo: false,
      isApiBacked: true,
      error: api.error,
    };
  }

  if (api.apiSession.workspaceSlug !== workspaceSlug) {
    return {
      session: null,
      mismatch: true,
      isResolving: false,
      isDemo: false,
      isApiBacked: true,
      error: api.error,
    };
  }

  return {
    session: api.apiSession,
    mismatch: false,
    isResolving: false,
    isDemo: false,
    isApiBacked: true,
    error: api.error,
  };
}
