import { describe, expect, it } from "vitest";

import { DEMO_WORKSPACE_SLUG } from "../workspace/demo";
import {
  isDemoWorkspaceBypass,
  isPublicAuthPath,
  requiresAuthenticatedWorkspaceAccess,
} from "./route-policy";

describe("protected route policy", () => {
  it("allows public auth pages without session", () => {
    expect(isPublicAuthPath("/sign-in")).toBe(true);
    expect(isPublicAuthPath("/sign-up")).toBe(true);
    expect(requiresAuthenticatedWorkspaceAccess("/sign-in")).toBe(false);
  });

  it("requires authentication for founder and onboarding routes", () => {
    expect(requiresAuthenticatedWorkspaceAccess("/acme/admin")).toBe(true);
    expect(
      requiresAuthenticatedWorkspaceAccess("/acme/onboarding/business"),
    ).toBe(true);
  });

  it("keeps Northstar demo routes open without authentication", () => {
    expect(isDemoWorkspaceBypass(`/${DEMO_WORKSPACE_SLUG}/admin`)).toBe(true);
    expect(
      requiresAuthenticatedWorkspaceAccess(`/${DEMO_WORKSPACE_SLUG}/admin`),
    ).toBe(false);
    expect(
      requiresAuthenticatedWorkspaceAccess(
        `/${DEMO_WORKSPACE_SLUG}/onboarding`,
      ),
    ).toBe(false);
  });

  it("still protects non-demo workspace routes", () => {
    expect(requiresAuthenticatedWorkspaceAccess("/acme-studio/admin")).toBe(
      true,
    );
  });
});
