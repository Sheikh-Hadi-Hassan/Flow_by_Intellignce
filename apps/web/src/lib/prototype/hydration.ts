"use client";

import { useSyncExternalStore } from "react";

function subscribeNoop() {
  return () => {};
}

/** False during SSR and the hydration pass; true immediately after. */
export function useClientHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
}
