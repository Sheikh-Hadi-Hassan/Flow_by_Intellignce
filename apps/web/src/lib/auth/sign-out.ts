"use client";

import { SESSION_STORAGE_KEY } from "../prototype/preferences";
import { clearPrototypeSnapshot } from "../prototype/sync-store";

const WORKSPACE_CACHE_KEY = "flow-workspace-api-cache-v1";

export function clearPrivateClientState(): void {
  clearPrototypeSnapshot();
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    window.sessionStorage.removeItem(WORKSPACE_CACHE_KEY);
  } catch {
    // Ignore storage failures during sign-out cleanup.
  }
}
