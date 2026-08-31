import { describe, expect, it } from "vitest";

import {
  logicId,
  toSemanticId,
  type BusinessLogicDefinition,
} from "@flow/blm-contracts";

import {
  InMemoryBusinessLogicRegistry,
  assertDraftCannotPublish,
  createProposedBusinessLogicDraft,
  smbStarterBusinessLogicCatalogV1,
} from "./business-logic-registry.js";

describe("Flow Business Logic Registry contracts v1", () => {
  it("publishes a governed SMB starter catalog", () => {
    expect(smbStarterBusinessLogicCatalogV1.length).toBeGreaterThanOrEqual(20);
    expect(
      smbStarterBusinessLogicCatalogV1.map((item) => item.logicId),
    ).toEqual(
      expect.arrayContaining([
        logicId("finance", "gross-margin", 1),
        logicId("finance", "gross-margin-percentage", 1),
        logicId("inventory", "available-inventory", 1),
        logicId("projects", "project-margin", 1),
        logicId("pricing", "discount-percentage", 1),
        logicId("tax", "tax-exclusive-inclusive-boundary", 1),
      ]),
    );
  });

  it("resolves approved logic deterministically", () => {
    const registry = new InMemoryBusinessLogicRegistry();
    const result = registry.resolve({
      conceptIds: [toSemanticId("flow.concept.finance.gross-margin")],
      logicType: "CALCULATION",
      asOf: "2026-08-11",
    });

    expect(result.status).toBe("FOUND");
    expect(result.logic?.logicId).toBe(logicId("finance", "gross-margin", 1));
    expect(result.logic?.implementationType).toBe("CONTRACT_ONLY");
  });

  it("does not select draft logic as authoritative", () => {
    const registry = new InMemoryBusinessLogicRegistry();
    const result = registry.resolve({
      conceptIds: [toSemanticId("flow.concept.finance.tax")],
      logicType: "POLICY_RULE",
      asOf: "2026-08-11",
    });

    expect(result.status).toBe("MISSING");
    expect(result.missing?.reason).toBe("ONLY_DRAFT_FOUND");
  });

  it("uses workspace-specific override before universal logic", () => {
    const universal = smbStarterBusinessLogicCatalogV1.find(
      (item) => item.logicId === logicId("pricing", "discount-percentage", 1),
    );
    expect(universal).toBeDefined();
    const workspaceOverride: BusinessLogicDefinition = {
      ...universal!,
      logicId: logicId("pricing", "discount-percentage-workspace-alpha", 1),
      scope: { level: "WORKSPACE", workspaceId: "workspace-alpha" },
      fingerprint: "workspace-specific-fingerprint",
    };
    const registry = new InMemoryBusinessLogicRegistry([
      universal!,
      workspaceOverride,
    ]);

    const result = registry.resolve({
      workspaceId: "workspace-alpha",
      conceptIds: [toSemanticId("flow.concept.pricing.discount")],
      logicType: "CALCULATION",
      asOf: "2026-08-11",
    });

    expect(result.status).toBe("FOUND");
    expect(result.logic?.logicId).toBe(workspaceOverride.logicId);
  });

  it("keeps deprecated and superseded logic out of authoritative resolution", () => {
    const current = smbStarterBusinessLogicCatalogV1.find(
      (item) => item.logicId === logicId("finance", "working-capital", 1),
    );
    expect(current).toBeDefined();
    const deprecated: BusinessLogicDefinition = {
      ...current!,
      logicId: logicId("finance", "working-capital", 0),
      version: "0",
      status: "DEPRECATED",
      fingerprint: "deprecated",
    };
    const registry = new InMemoryBusinessLogicRegistry([deprecated, current!]);

    const result = registry.resolve({
      conceptIds: [toSemanticId("flow.concept.finance.working-capital")],
      logicType: "CALCULATION",
      asOf: "2026-08-11",
    });

    expect(result.status).toBe("FOUND");
    expect(result.logic?.logicId).toBe(current?.logicId);
  });

  it("returns MissingBusinessLogic for unknown calculations", () => {
    const result = new InMemoryBusinessLogicRegistry().resolve({
      conceptIds: [toSemanticId("flow.concept.unknown.custom-metric")],
      logicType: "CALCULATION",
      asOf: "2026-08-11",
    });

    expect(result.status).toBe("MISSING");
    expect(result.missing?.reason).toBe("NO_APPROVED_LOGIC");
  });

  it("prevents AI-created drafts from self-publishing", () => {
    const draft = createProposedBusinessLogicDraft({
      name: "Local tax rule",
      businessPurpose: "Draft jurisdiction tax handling for review.",
      logicType: "POLICY_RULE",
      conceptIds: [toSemanticId("flow.concept.finance.tax")],
      scope: { level: "JURISDICTION", jurisdiction: "US" },
    });

    expect(draft.authority).toBe("DRAFT_ONLY");
    expect(() => assertDraftCannotPublish(draft)).not.toThrow();
  });

  it("keeps logic fingerprints stable for the same versioned contract", () => {
    const first = smbStarterBusinessLogicCatalogV1.find(
      (item) => item.logicId === logicId("projects", "project-margin", 1),
    );
    const second = smbStarterBusinessLogicCatalogV1.find(
      (item) => item.logicId === logicId("projects", "project-margin", 1),
    );

    expect(first?.fingerprint).toBe(second?.fingerprint);
  });
});
