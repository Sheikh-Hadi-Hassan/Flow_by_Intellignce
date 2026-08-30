import { describe, expect, it } from "vitest";

import {
  DEMO_FOUNDER_FIRST_NAME,
  NORTHSTAR_WORKSPACE_NAME,
  northstarDemoSession,
} from "../../content/demo/northstar";
import { NORTHSTAR_ACME_NOTES } from "../../content/demo/northstar-commercial";
import { suggestedServicesFixture } from "../../content/demo/suggested-services";
import {
  createUserSession,
  NORTHSTAR_SLUG,
  workspacePlaceholder,
} from "./defaults";
import { normalizeLoadedSession } from "./session-normalize";
import { compileTwin } from "./twin-compile";

const EXPECTED_SERVICE_COUNT = suggestedServicesFixture().length;

describe("Northstar demo integrity", () => {
  it("uses the canonical workspace name and slug", () => {
    const session = northstarDemoSession();
    expect(session.workspaceName).toBe(NORTHSTAR_WORKSPACE_NAME);
    expect(session.business.businessName).toBe(NORTHSTAR_WORKSPACE_NAME);
    expect(session.workspaceSlug).toBe(NORTHSTAR_SLUG);
    expect(session.mode).toBe("demo");
  });

  it("includes all approved Northstar services", () => {
    const session = northstarDemoSession();
    const selected = session.services.filter((s) => s.selected);
    expect(selected).toHaveLength(EXPECTED_SERVICE_COUNT);
    expect(session.twin?.services).toHaveLength(EXPECTED_SERVICE_COUNT);
  });

  it("matches founder home service count to fixture services", () => {
    const session = northstarDemoSession();
    expect(session.twin?.services.length).toBe(EXPECTED_SERVICE_COUNT);
  });

  it("matches twin services to fixture services", () => {
    const session = northstarDemoSession();
    const twin = compileTwin(session);
    const fixtureNames = suggestedServicesFixture().map((s) => s.name);
    expect(twin.services).toEqual(fixtureNames);
  });

  it("settings workspace name matches the same fixture", () => {
    const session = northstarDemoSession();
    expect(session.workspaceName).toBe(NORTHSTAR_WORKSPACE_NAME);
  });

  it("exposes the canonical demo founder first name", () => {
    expect(DEMO_FOUNDER_FIRST_NAME).toBe("Maya");
  });

  it("includes the isolated Acme Robotics commercial scenario", () => {
    expect(NORTHSTAR_ACME_NOTES).toMatch(/Acme Robotics/);
    expect(suggestedServicesFixture().some((s) => /brand strategy/i.test(s.name))).toBe(
      true,
    );
  });

  it("rehydrates stale demo sessions from the canonical fixture", () => {
    const stale = northstarDemoSession();
    stale.workspaceName = "Intellignce";
    stale.services = [];
    stale.twinCompiled = false;
    delete stale.twin;
    const normalized = normalizeLoadedSession(stale);
    expect(normalized.workspaceName).toBe(NORTHSTAR_WORKSPACE_NAME);
    expect(normalized.services.filter((s) => s.selected)).toHaveLength(
      EXPECTED_SERVICE_COUNT,
    );
    expect(normalized.twin?.services).toHaveLength(EXPECTED_SERVICE_COUNT);
  });

  it("normalizes partial stored demo accent sessions without throwing", () => {
    const normalized = normalizeLoadedSession({
      mode: "demo",
      workspaceSlug: NORTHSTAR_SLUG,
      accentColor: "#0d6e6e",
    } as ReturnType<typeof northstarDemoSession>);
    expect(normalized.workspaceName).toBe(NORTHSTAR_WORKSPACE_NAME);
    expect(normalized.mode).toBe("demo");
  });

  it("never gives Northstar data to a normal signup session", () => {
    const user = createUserSession("Acme Studio", "founder@acme.test");
    expect(user.workspaceName).toBe("Acme Studio");
    expect(user.workspaceSlug).not.toBe(NORTHSTAR_SLUG);
    expect(user.mode).toBe("user");
    expect(user.business.businessName).toBe("Acme Studio");
  });

  it("never gives Northstar data to unknown workspace placeholders", () => {
    const placeholder = workspacePlaceholder("unknown-workspace");
    expect(placeholder.workspaceName).not.toBe(NORTHSTAR_WORKSPACE_NAME);
    expect(placeholder.workspaceSlug).not.toBe(NORTHSTAR_SLUG);
    expect(placeholder.mode).toBe("user");
  });

  it("does not report high confidence when services are absent", () => {
    const session = northstarDemoSession();
    session.services = session.services.map((s) => ({ ...s, selected: false }));
    const twin = compileTwin(session);
    expect(twin.services).toHaveLength(0);
    expect(twin.confidence).toBe("low");
  });

  it("keeps completeness and confidence as separate concepts", () => {
    const session = northstarDemoSession();
    const twin = compileTwin(session);
    expect(typeof twin.completeness).toBe("number");
    expect(["high", "medium", "low"]).toContain(twin.confidence);
    expect(twin.verification).toBeTruthy();
    expect(twin.freshnessLabel).toBeTruthy();
  });
});
