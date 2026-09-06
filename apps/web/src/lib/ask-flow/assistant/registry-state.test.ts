import { describe, expect, it } from "vitest";

import { northstarBusinessRegistrySeed } from "@flow/contracts";
import { runRegistryAskTool } from "./registry-tools";
import { composeFromTool } from "./compose";
import type { AskApplicationContext } from "../types";
import type { AskToolCall } from "./types";

function context(
  overrides: Partial<AskApplicationContext> = {},
): AskApplicationContext {
  const seed = northstarBusinessRegistrySeed();
  return {
    workspaceId: "northstar-creative",
    userId: "ns-res-maya",
    role: "Founder",
    permissions: [
      "organization.read",
      "organization.update_profile",
      "opportunity.read",
    ],
    route: "/northstar-creative/admin/settings/business",
    visibleRecordIds: [seed.organizationId],
    locale: "en-US",
    currency: "USD",
    timezone: "America/Chicago",
    conversationId: "test",
    activeBuildingBlocks: ["registry.business"],
    businessRegistry: seed,
    organizationId: seed.organizationId,
    demoState: "populated",
    snapshotId: `registry:${seed.organizationId}:populated:founder`,
    visibleRecordPermissions: [
      "organization.read",
      "organization.update_profile",
      "location.manage",
      "registry.document.manage",
      "registry.tax.manage",
      "registry.signatory.manage",
      "registry.compliance.manage",
    ],
    ...overrides,
  };
}

function ask(name: AskToolCall["name"], ctx: AskApplicationContext) {
  return runRegistryAskTool({ name, args: {} }, ctx);
}

describe("Business Registry Ask Flow state reconciliation", () => {
  it("populated page yields a populated registration answer", () => {
    const result = ask("get_business_registration", context());
    expect(result?.ok).toBe(true);
    const text = composeFromTool(result!);
    expect(text).toContain("DEMO-LLC-2021-08417");
    expect(text).not.toMatch(/incomplete/i);
    expect(result?.values.snapshotId).toContain(":populated:");
  });

  it("missing page yields an incomplete answer", () => {
    const result = ask(
      "get_business_registration",
      context({
        demoState: "partial",
        snapshotId: "registry:org:partial:founder",
      }),
    );
    expect(result?.ok).toBe(true);
    const text = composeFromTool(result!);
    expect(text).toMatch(/registration profile is incomplete/i);
    expect(text).toMatch(/still missing/i);
    expect(text).toMatch(/fictional/i);
    expect(text).not.toMatch(/is registered as DEMO-LLC/);
  });

  it("restricted page denies hidden signatories", () => {
    const result = ask(
      "list_authorised_signatories",
      context({
        role: "Employee",
        demoState: "restricted",
        snapshotId: "registry:org:restricted:employee",
        visibleRecordPermissions: ["organization.read"],
        permissions: ["organization.read"],
      }),
    );
    expect(result?.ok).toBe(false);
    expect(result?.error?.code).toBe("permission_denied");
  });

  it("changing demo state changes the snapshot id used in evidence", () => {
    const populated = ask(
      "get_business_profile",
      context({ snapshotId: "registry:org:populated:founder" }),
    );
    const missing = ask(
      "get_business_profile",
      context({
        demoState: "partial",
        snapshotId: "registry:org:partial:founder",
      }),
    );
    expect(populated?.evidence[0]?.source).toContain("populated");
    expect(missing?.evidence[0]?.source).toContain("partial");
    expect(composeFromTool(missing!)).toMatch(/incomplete/i);
  });

  it("changing workspace removes access to prior registry answers", () => {
    const other = ask(
      "get_business_registration",
      context({
        workspaceId: "acme-production",
        activeBuildingBlocks: [],
      }),
    );
    expect(other?.ok).toBe(false);
    expect(other?.error?.message).toMatch(/not active/i);
  });
});
