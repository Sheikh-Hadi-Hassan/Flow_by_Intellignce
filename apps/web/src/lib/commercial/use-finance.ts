"use client";

import { useMemo } from "react";

import { isDemoWorkspaceSlug } from "../workspace/demo";
import { useWorkspaceApi } from "../workspace/context";
import { createFinanceApi } from "./finance-api";
import { createNorthstarFinanceApi } from "./northstar-finance";

export function useFinanceClient(workspaceSlug: string) {
  const { accessToken, apiSession } = useWorkspaceApi();
  return useMemo(() => {
    if (isDemoWorkspaceSlug(workspaceSlug)) {
      return createNorthstarFinanceApi();
    }
    if (!accessToken || !apiSession?.workspaceId) return null;
    return createFinanceApi({
      token: accessToken,
      workspaceId: apiSession.workspaceId,
    });
  }, [accessToken, apiSession?.workspaceId, workspaceSlug]);
}

export function isDemoFinanceClient(
  client: ReturnType<typeof useFinanceClient>,
): client is ReturnType<typeof createNorthstarFinanceApi> {
  return Boolean(client && "isDemo" in client && client.isDemo);
}
