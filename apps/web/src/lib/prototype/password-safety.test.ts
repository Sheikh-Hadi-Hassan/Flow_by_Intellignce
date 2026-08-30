import { describe, expect, it } from "vitest";

import { createUserSession } from "./defaults";
import {
  loadSession,
  saveSession,
  sanitizeSessionForPersistence,
} from "./storage";

const PASSWORD_KEYS = ["password", "passwordHash", "password_hash"];

describe("prototype session password safety", () => {
  it("never persists password fields in local storage session shape", () => {
    const session = createUserSession("Acme Studio", "founder@acme.test");
    saveSession(session);
    const raw = JSON.stringify(loadSession());
    for (const key of PASSWORD_KEYS) {
      expect(raw.includes(`"${key}"`)).toBe(false);
    }
  });

  it("strips password fields before persistence", () => {
    const polluted = {
      ...createUserSession("Acme", "founder@acme.test"),
      password: "must-not-persist",
    } as Record<string, unknown>;
    const sanitized = sanitizeSessionForPersistence(
      polluted as unknown as ReturnType<typeof createUserSession>,
    );
    const serialized = JSON.stringify(sanitized);
    for (const key of PASSWORD_KEYS) {
      expect(serialized.includes(`"${key}"`)).toBe(false);
    }
  });
});
