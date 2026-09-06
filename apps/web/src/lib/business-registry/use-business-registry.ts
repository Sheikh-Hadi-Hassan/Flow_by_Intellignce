"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useSyncExternalStore } from "react";

import { ApiError } from "../api/client";
import { isDemoWorkspaceSlug } from "../workspace/demo";
import { useWorkspaceApi } from "../workspace/context";
import { createBusinessRegistryApi } from "./api";
import {
  addDemoDocument,
  applyBusinessRegistrySeed,
  archiveDemoLocation,
  assignDemoComplianceOwner,
  businessRegistryView,
  changePrimaryLocation,
  clearBusinessRegistrySeed,
  isBusinessRegistryActive,
  readBusinessRegistryState,
  setBusinessRegistryError,
  setBusinessRegistryLoading,
  setBusinessRegistryRole,
  setBusinessRegistryUi,
  setTradingNameDraft,
  subscribeBusinessRegistry,
  updateRenewalDate,
  updateTradingName,
  upsertDemoLocation,
} from "./store";
import type { BusinessLocationSeed } from "@flow/contracts";

export function useBusinessRegistry(workspaceSlug: string) {
  const state = useSyncExternalStore(
    subscribeBusinessRegistry,
    readBusinessRegistryState,
    readBusinessRegistryState,
  );
  const { accessToken, apiSession } = useWorkspaceApi();
  const hydrating = useRef(false);

  const api = useMemo(() => {
    if (isDemoWorkspaceSlug(workspaceSlug)) return null;
    if (!accessToken || !apiSession?.workspaceId) return null;
    return createBusinessRegistryApi({
      token: accessToken,
      workspaceId: apiSession.workspaceId,
    });
  }, [accessToken, apiSession?.workspaceId, workspaceSlug]);

  useEffect(() => {
    if (!api || hydrating.current) return;
    let cancelled = false;
    hydrating.current = true;
    setBusinessRegistryLoading();
    void (async () => {
      try {
        try {
          const view = await api.get();
          if (cancelled) return;
          applyBusinessRegistrySeed(view.profile, "api");
        } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 404) throw error;
          const seeded = await api.seed();
          if (cancelled) return;
          applyBusinessRegistrySeed(seeded, "api");
        }
      } catch (error) {
        if (cancelled) return;
        setBusinessRegistryError(
          error instanceof Error
            ? error.message
            : "Business Registry could not load.",
        );
      } finally {
        hydrating.current = false;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api]);

  const runMutation = useCallback(
    async (local: () => void, remote?: () => Promise<unknown>) => {
      if (!api || !remote) {
        local();
        return;
      }
      setBusinessRegistryLoading();
      try {
        const result = await remote();
        if (result && typeof result === "object" && "organizationId" in result) {
          applyBusinessRegistrySeed(result as never, "api");
        } else {
          const view = await api.get();
          applyBusinessRegistrySeed(view.profile, "api");
        }
      } catch (error) {
        setBusinessRegistryError(
          error instanceof Error ? error.message : "Update failed.",
        );
      }
    },
    [api],
  );

  return {
    ...state,
    active: isBusinessRegistryActive(),
    view: businessRegistryView(),
    source: state.source,
    apiBacked: Boolean(api) || state.source === "api",
    setUi: useCallback(setBusinessRegistryUi, []),
    setRole: useCallback(setBusinessRegistryRole, []),
    setDraftTradingName: useCallback(setTradingNameDraft, []),
    clearSeed: useCallback(clearBusinessRegistrySeed, []),
    updateTradingName: useCallback(
      (tradingName: string, reason: string) =>
        runMutation(
          () => updateTradingName(tradingName, reason),
          api
            ? () => api.updateProfile({ tradingName, reason })
            : undefined,
        ),
      [api, runMutation],
    ),
    upsertLocation: useCallback(
      (location: BusinessLocationSeed, reason: string) =>
        runMutation(
          () => upsertDemoLocation(location, reason),
          api ? () => api.upsertLocation(location, reason) : undefined,
        ),
      [api, runMutation],
    ),
    archiveLocation: useCallback(
      (locationId: string, reason: string) =>
        runMutation(
          () => archiveDemoLocation(locationId, reason),
          api ? () => api.archiveLocation(locationId, reason) : undefined,
        ),
      [api, runMutation],
    ),
    changePrimary: useCallback(
      (locationId: string, reason: string) =>
        runMutation(
          () => changePrimaryLocation(locationId, reason),
          api
            ? async () => {
                await api.proposePrimary(locationId, reason);
                return api.confirmPrimary(locationId, reason);
              }
            : undefined,
        ),
      [api, runMutation],
    ),
    updateRenewal: useCallback(updateRenewalDate, []),
    addDocument: useCallback(addDemoDocument, []),
    assignOwner: useCallback(assignDemoComplianceOwner, []),
  };
}
