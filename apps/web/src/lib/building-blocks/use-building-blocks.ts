"use client";

import { useCallback, useSyncExternalStore } from "react";

import {
  approveCrmCore,
  configureCrmCore,
  crmClientsVisible,
  isCrmCoreActive,
  readBuildingBlockState,
  setCrmUiState,
  submitCrmCore,
  subscribeBuildingBlocks,
  suspendCrmCore,
} from "./store";

export function useBuildingBlocks() {
  const state = useSyncExternalStore(
    subscribeBuildingBlocks,
    readBuildingBlockState,
    readBuildingBlockState,
  );
  const configure = useCallback(configureCrmCore, []);
  const submit = useCallback(submitCrmCore, []);
  const approve = useCallback(approveCrmCore, []);
  const suspend = useCallback(suspendCrmCore, []);
  return {
    ...state,
    active: isCrmCoreActive(),
    visibleClients: crmClientsVisible(),
    configure,
    submit,
    approve,
    suspend,
    setCrmUiState,
  };
}
