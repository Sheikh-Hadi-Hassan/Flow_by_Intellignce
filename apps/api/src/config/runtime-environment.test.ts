import { afterEach, describe, expect, it } from "vitest";

import {
  assertProductionRuntimeConfig,
  isDevOrTestRuntime,
} from "./runtime-environment.js";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("production runtime configuration", () => {
  it("allows development runtime without database configuration", () => {
    process.env.NODE_ENV = "development";
    delete process.env.DATABASE_URL;
    delete process.env.DATABASE_POOLER_URL;
    expect(() => assertProductionRuntimeConfig()).not.toThrow();
    expect(isDevOrTestRuntime()).toBe(true);
  });

  it("fails closed in production when database or Supabase config is missing", () => {
    process.env.NODE_ENV = "production";
    delete process.env.VITEST;
    delete process.env.DATABASE_URL;
    delete process.env.DATABASE_POOLER_URL;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_PUBLISHABLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    expect(() => assertProductionRuntimeConfig()).toThrow(
      /Production startup blocked/,
    );
  });

  it("passes production checks when required configuration keys are present", () => {
    process.env.NODE_ENV = "production";
    delete process.env.VITEST;
    process.env.DATABASE_URL = "postgres://example";
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_PUBLISHABLE_KEY = "publishable-key";

    expect(() => assertProductionRuntimeConfig()).not.toThrow();
  });
});
