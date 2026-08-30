"use client";

import { useMemo } from "react";

import { isDemoWorkspaceSlug } from "../workspace/demo";
import { useWorkspaceApi } from "../workspace/context";
import { createCommercialApi } from "./api";
import { createNorthstarCommercialApi } from "./northstar-store";

export function useCommercialClient(workspaceSlug: string) {
  const { accessToken, apiSession } = useWorkspaceApi();
  return useMemo(() => {
    if (isDemoWorkspaceSlug(workspaceSlug)) {
      return createNorthstarCommercialApi();
    }
    if (!accessToken || !apiSession?.workspaceId) return null;
    return createCommercialApi({
      token: accessToken,
      workspaceId: apiSession.workspaceId,
    });
  }, [accessToken, apiSession?.workspaceId, workspaceSlug]);
}
