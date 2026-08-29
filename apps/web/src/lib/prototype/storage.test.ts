import { describe, expect, it, beforeEach, vi } from "vitest";

import { createUserSession } from "./defaults";
import { applyAccent, loadSession, saveSession } from "./storage";
import { DEFAULT_ACCENT } from "./preferences";

describe("prototype storage boundary", () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    const mockStorage = {
      getItem(key: string) {
        return store[key] ?? null;
      },
      setItem(key: string, value: string) {
        store[key] = value;
      },
      removeItem(key: string) {
        delete store[key];
      },
    };
    vi.stubGlobal("localStorage", mockStorage);
  });

  it("persists and loads user session", () => {
    const session = createUserSession("Acme Studio", "founder@acme.test");
    saveSession(session);
    const loaded = loadSession();
    expect(loaded?.workspaceSlug).toBe("acme-studio");
    expect(loaded?.auth?.email).toBe("founder@acme.test");
    expect(loaded?.mode).toBe("user");
  });

  it("derives accent navigation tokens from workspace accent", () => {
    const styles: Record<string, string> = {};
    const element = {
      style: {
        setProperty(key: string, value: string) {
          styles[key] = value;
        },
        getPropertyValue(key: string) {
          return styles[key] ?? "";
        },
      },
    };
    vi.stubGlobal("document", { documentElement: element });

    applyAccent("#c2410c");
    expect(styles["--color-brand"]).toBe("#c2410c");
    expect(styles["--color-brand-surface"]).toContain("color-mix");

    applyAccent(DEFAULT_ACCENT);
    expect(styles["--color-brand"]).toBe(DEFAULT_ACCENT);
  });
});
