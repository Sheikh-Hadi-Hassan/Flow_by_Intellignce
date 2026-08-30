import { describe, expect, it } from "vitest";

import {
  isWorkspaceScopedPath,
  sanitizeInternalRedirect,
  workspaceSlugFromPath,
} from "./redirects";

describe("auth redirects", () => {
  it("detects workspace-scoped protected paths", () => {
    expect(isWorkspaceScopedPath("/acme-studio/admin")).toBe(true);
    expect(isWorkspaceScopedPath("/acme-studio/onboarding/business")).toBe(
      true,
    );
    expect(isWorkspaceScopedPath("/sign-in")).toBe(false);
  });

  it("rejects external redirect targets", () => {
    expect(sanitizeInternalRedirect("https://evil.test", "/safe")).toBe(
      "/safe",
    );
    expect(sanitizeInternalRedirect("//evil.test/path", "/safe")).toBe("/safe");
    expect(sanitizeInternalRedirect("/acme/admin", "/safe")).toBe(
      "/acme/admin",
    );
  });

  it("extracts workspace slug from path", () => {
    expect(workspaceSlugFromPath("/northstar-creative/admin/setup")).toBe(
      "northstar-creative",
    );
  });
});
