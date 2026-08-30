import { describe, expect, it } from "vitest";

import { NORTHSTAR_COMMERCIAL_STORAGE_KEY } from "../../content/demo/northstar-commercial";
import { northstarDemoSession } from "../../content/demo/northstar";
import { createUserSession } from "../prototype/defaults";
import { DEMO_WORKSPACE_SLUG, isDemoWorkspaceSlug } from "./demo";
import { mapWorkspaceBundleToSession } from "./map-api-session";

describe("demo isolation", () => {
  it("only treats the Northstar slug as the demo workspace", () => {
    expect(isDemoWorkspaceSlug(DEMO_WORKSPACE_SLUG)).toBe(true);
    expect(isDemoWorkspaceSlug("acme-studio")).toBe(false);
  });

  it("never maps API bundles to demo mode", () => {
    const session = mapWorkspaceBundleToSession({
      workspace: {
        id: "ws-1",
        slug: "acme-studio",
        name: "Acme Studio",
      },
      onboarding: {
        currentStep: "business",
        business: createUserSession("Acme Studio", "founder@acme.test")
          .business,
        operations: createUserSession("Acme Studio", "founder@acme.test")
          .operations,
        services: [],
        policies: createUserSession("Acme Studio", "founder@acme.test")
          .policies,
      },
    });
    expect(session.mode).toBe("user");
    expect(session.workspaceSlug).not.toBe(DEMO_WORKSPACE_SLUG);
  });

  it("keeps Northstar fixture in explicit demo mode only", () => {
    const demo = northstarDemoSession();
    expect(demo.mode).toBe("demo");
    expect(demo.workspaceSlug).toBe(DEMO_WORKSPACE_SLUG);
  });

  it("isolates Northstar commercial storage from live workspaces", () => {
    expect(NORTHSTAR_COMMERCIAL_STORAGE_KEY).toBe(
      "flow-northstar-commercial-v1",
    );
  });
});
