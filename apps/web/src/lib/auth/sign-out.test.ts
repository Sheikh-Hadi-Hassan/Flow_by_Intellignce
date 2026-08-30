import { describe, expect, it } from "vitest";

import { clearPrivateClientState } from "./sign-out";
import { SESSION_STORAGE_KEY } from "../prototype/preferences";

describe("sign-out cleanup", () => {
  it("clears private prototype session storage keys", () => {
    const storage = new Map<string, string>();
    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage: {
          getItem: (key: string) => storage.get(key) ?? null,
          setItem: (key: string, value: string) => {
            storage.set(key, value);
          },
          removeItem: (key: string) => {
            storage.delete(key);
          },
        },
        sessionStorage: {
          removeItem: (key: string) => {
            storage.delete(key);
          },
        },
      },
    });

    storage.set(SESSION_STORAGE_KEY, '{"mode":"user"}');
    clearPrivateClientState();
    expect(storage.has(SESSION_STORAGE_KEY)).toBe(false);

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
    });
  });
});
