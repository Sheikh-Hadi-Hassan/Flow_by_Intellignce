import { afterEach, describe, expect, it } from "vitest";

import { createPersistenceStack } from "./persistence.providers.js";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("persistence stack", () => {
  it("uses in-memory repositories only in development", () => {
    process.env.NODE_ENV = "development";
    delete process.env.DATABASE_URL;
    delete process.env.DATABASE_POOLER_URL;
    const stack = createPersistenceStack();
    expect(stack.identityRepository).toBeTruthy();
    expect(stack.commercialRepository).toBeTruthy();
  });

  it("fails closed in production without database configuration", () => {
    process.env.NODE_ENV = "production";
    delete process.env.VITEST;
    delete process.env.DATABASE_URL;
    delete process.env.DATABASE_POOLER_URL;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_PUBLISHABLE_KEY;

    expect(() => createPersistenceStack()).toThrow(
      /Production startup blocked/,
    );
  });
});
