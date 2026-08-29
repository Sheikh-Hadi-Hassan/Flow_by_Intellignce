import { describe, expect, it } from "vitest";

import { northstarDemoSession } from "../content/demo/northstar";
import { NORTHSTAR_SLUG } from "../lib/prototype/defaults";
import {
  buildModuleRecommendations,
  getSetupProgress,
} from "../lib/prototype/recommendations";
import { FOUNDER_NAV, ONBOARDING_STEPS } from "../lib/prototype/types";
import {
  compileTwin,
  getCompilationTotalDuration,
} from "../lib/prototype/twin-compile";

describe("Phase 1A prototype foundation", () => {
  it("defines onboarding step sequence", () => {
    expect(ONBOARDING_STEPS.map((s) => s.path)).toEqual([
      "business",
      "operations",
      "services",
      "policies",
      "review",
    ]);
  });

  it("founder nav contains only working Phase 1A routes", () => {
    const hrefs = FOUNDER_NAV.map((n) => n.href);
    expect(hrefs).toEqual(["", "/twin", "/setup", "/settings"]);
    expect(hrefs).not.toContain("/clients");
    expect(hrefs).not.toContain("/pulse");
  });

  it("compiles twin from northstar demo fixture", () => {
    const session = northstarDemoSession();
    const twin = compileTwin(session);
    expect(twin.identity).toContain("Northstar Creative");
    expect(twin.expertisePack).toBe("Digital Agency Expertise");
    expect(twin.sourceClassification).toBe("demo-fixture");
    expect(twin.services.length).toBeGreaterThan(0);
  });

  it("builds module recommendations from session", () => {
    const session = northstarDemoSession();
    const mods = buildModuleRecommendations(session);
    expect(mods.some((m) => m.id === "crm")).toBe(true);
    expect(mods.every((m) => m.setupStatus.length > 0)).toBe(true);
    expect(mods.some((m) => m.setupStatus === "essential")).toBe(true);
  });

  it("northstar slug matches demo entry", () => {
    expect(northstarDemoSession().workspaceSlug).toBe(NORTHSTAR_SLUG);
  });

  it("reduced-motion compilation completes instantly", () => {
    expect(getCompilationTotalDuration(true)).toBe(0);
  });

  it("calculates setup progress for demo session", () => {
    const session = northstarDemoSession();
    expect(getSetupProgress(session)).toBeGreaterThanOrEqual(80);
  });
});
