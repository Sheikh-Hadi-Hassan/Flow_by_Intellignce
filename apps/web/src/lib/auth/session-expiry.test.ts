import { describe, expect, it } from "vitest";

import { SESSION_STORAGE_KEY } from "../prototype/preferences";
import { clearPrivateClientState } from "./sign-out";

const WORKSPACE_CACHE_KEY = "flow-workspace-api-cache-v1";

describe("session expiry cleanup", () => {
  it("clears persisted private client state on sign-out", () => {
    const storage = new Map<string, string>();
    const removeItem = (key: string) => {
      storage.delete(key);
    };
    storage.set(SESSION_STORAGE_KEY, "{}");
    storage.set(WORKSPACE_CACHE_KEY, "{}");

    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage: {
          removeItem: (key: string) => removeItem(key),
        },
        sessionStorage: {
          removeItem: (key: string) => removeItem(key),
        },
      },
    });

    try {
      clearPrivateClientState();
      expect(storage.has(SESSION_STORAGE_KEY)).toBe(false);
      expect(storage.has(WORKSPACE_CACHE_KEY)).toBe(false);
    } finally {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: originalWindow,
      });
    }
  });
});
