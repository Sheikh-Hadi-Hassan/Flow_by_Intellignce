import { describe, expect, it, vi } from "vitest";
import {
  extractBearerToken,
  StaticTokenAuthenticationAdapter,
  SupabaseAuthAdapter,
} from "./index.js";

describe("authentication adapter boundary", () => {
  it("extracts bearer tokens without accepting malformed auth headers", () => {
    expect(extractBearerToken("Bearer test-token")).toBe("test-token");
    expect(extractBearerToken("Basic test-token")).toBeUndefined();
    expect(extractBearerToken(undefined)).toBeUndefined();
  });

  it("denies unknown static tokens for local proof tests", async () => {
    const adapter = new StaticTokenAuthenticationAdapter(new Map());

    await expect(adapter.authenticateBearerToken("bad-token")).resolves.toEqual(
      {
        authenticated: false,
        reason: "Invalid bearer token.",
      },
    );
  });

  it("validates Supabase tokens by calling the auth user endpoint", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            id: "supabase-auth-user-alice",
            email: "alice@example.test",
            aud: "authenticated",
            role: "authenticated",
            app_metadata: { provider: "email" },
            user_metadata: { unsafeRole: "admin" },
          }),
        ),
      ),
    );
    const adapter = new SupabaseAuthAdapter({
      supabaseUrl: "https://example.supabase.co/",
      anonKey: "anon-key",
      fetchImpl,
    });

    const result = await adapter.authenticateBearerToken("valid-token");

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://example.supabase.co/auth/v1/user",
      expect.objectContaining({
        headers: {
          apikey: "anon-key",
          authorization: "Bearer valid-token",
        },
      }),
    );
    expect(result).toMatchObject({
      authenticated: true,
      identity: {
        subjectId: "supabase-auth-user-alice",
        provider: "supabase",
        email: "alice@example.test",
      },
    });
    expect(result.authenticated && result.identity.claims).not.toHaveProperty(
      "user_metadata",
    );
  });

  it("denies invalid Supabase tokens without decoding and trusting claims", async () => {
    const adapter = new SupabaseAuthAdapter({
      supabaseUrl: "https://example.supabase.co",
      anonKey: "anon-key",
      fetchImpl: vi.fn(() =>
        Promise.resolve(new Response(null, { status: 401 })),
      ),
    });

    await expect(adapter.authenticateBearerToken("tampered")).resolves.toEqual({
      authenticated: false,
      reason: "Supabase token verification failed.",
    });
  });
});
