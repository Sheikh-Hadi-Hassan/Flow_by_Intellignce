import { describe, expect, it } from "vitest";

import {
  applyRoleOverlays,
  createMultiRolePerspectives,
  createWorkspaceRoleOverlay,
  resolveBusinessRoleAlias,
  roleConfusionPairsV1,
  roleDecisionOwnershipGraphV1,
  roleEvaluationCasesV1,
  roleEvidenceRequirementsV1,
  roleMetricGraphV1,
  toSemanticId,
  universalBusinessRolesV1,
  validateBusinessRoleRegistry,
  type BusinessRoleAssignment,
  type SecurityRole,
  type WorkspaceRoleAssignment,
} from "./index.js";

describe("Business Role Registry 008.1", () => {
  it("loads the universal executive and management seed registry", () => {
    expect(universalBusinessRolesV1.length).toBeGreaterThanOrEqual(58);
    expect(
      universalBusinessRolesV1.map((role) => role.canonical_title),
    ).toEqual(
      expect.arrayContaining([
        "Board Chair",
        "CEO",
        "CFO",
        "Chief Revenue Officer",
        "Chief Risk Officer",
        "Founder / Owner",
      ]),
    );
    expect(
      universalBusinessRolesV1.every(
        (role) =>
          role.role_id.startsWith("flow.role.business.") &&
          role.source_refs.length > 0 &&
          role.authority_scope.workspaceActualAuthorityOverridesNormative,
      ),
    ).toBe(true);
  });

  it("keeps business roles separate from security roles and workspace assignments", () => {
    const securityRole: SecurityRole = "ADMIN";
    const businessAssignment: BusinessRoleAssignment = {
      assignmentId: "business-role-assignment-1",
      workspaceId: "workspace-alpha",
      userId: "user-alpha",
      businessRoleId: toSemanticId("flow.role.business.cfo"),
      workspaceRoleOverlayIds: [],
    };
    const workspaceAssignment: WorkspaceRoleAssignment = {
      assignmentId: "workspace-role-assignment-1",
      workspaceId: "workspace-alpha",
      userId: "user-alpha",
      workspaceRoleId: "workspace-admin",
      securityRoleIds: [securityRole],
      businessRoleIds: [businessAssignment.businessRoleId],
    };

    expect(workspaceAssignment.securityRoleIds).toEqual(["ADMIN"]);
    expect(workspaceAssignment.businessRoleIds).toEqual([
      toSemanticId("flow.role.business.cfo"),
    ]);
    expect(workspaceAssignment.securityRoleIds).not.toContain(
      businessAssignment.businessRoleId,
    );
  });

  it("resolves aliases without silently guessing ambiguous abbreviations", () => {
    const cfo = resolveBusinessRoleAlias({ title: "Chief Financial Officer" });
    const cro = resolveBusinessRoleAlias({ title: "CRO" });
    const contextualCro = resolveBusinessRoleAlias({
      title: "CRO",
      businessContext: ["pipeline revenue win rate"],
    });

    expect(cfo.status).toBe("RESOLVED");
    expect(cfo.selectedRole?.role_id).toBe(
      toSemanticId("flow.role.business.cfo"),
    );
    expect(cro.status).toBe("AMBIGUOUS");
    expect(cro.askIfDecisionMaterial).toBe(true);
    expect(cro.candidates.map((candidate) => candidate.role.role_id)).toEqual(
      expect.arrayContaining([
        toSemanticId("flow.role.business.chief-revenue-officer"),
        toSemanticId("flow.role.business.chief-risk-officer"),
      ]),
    );
    expect(contextualCro.status).toBe("RESOLVED");
    expect(contextualCro.selectedRole?.role_id).toBe(
      toSemanticId("flow.role.business.chief-revenue-officer"),
    );
  });

  it("links roles to decisions, metrics, and evidence without duplicate metric definitions", () => {
    expect(roleDecisionOwnershipGraphV1.length).toBeGreaterThanOrEqual(
      universalBusinessRolesV1.length * 4,
    );
    expect(roleMetricGraphV1.length).toBeGreaterThan(
      universalBusinessRolesV1.length,
    );
    expect(roleEvidenceRequirementsV1.length).toBeGreaterThan(
      universalBusinessRolesV1.length,
    );
    expect(
      roleMetricGraphV1.every((link) =>
        link.metricId.startsWith("flow.decision.metric."),
      ),
    ).toBe(true);
  });

  it("applies scale and workspace overlays without mutating universal role authority", () => {
    const cfo = universalBusinessRolesV1.find(
      (role) => role.role_id === toSemanticId("flow.role.business.cfo"),
    );
    if (!cfo) throw new Error("Missing CFO");
    const overlay = createWorkspaceRoleOverlay({
      workspaceId: "workspace-alpha",
      roleId: cfo.role_id,
      workspaceTitle: "Head of Finance",
      addedAccountabilities: ["HR coordination", "procurement coordination"],
      addedMetricIds: [toSemanticId("flow.decision.metric.finance.runway")],
    });
    const compiled = applyRoleOverlays({ role: cfo, overlays: [overlay] });

    expect(cfo.accountabilities).not.toContain("HR coordination");
    expect(compiled.accountabilities).toContain("HR coordination");
    expect(compiled.authority_scope.boundary).toMatch(
      /workspace actual authority/i,
    );
  });

  it("supports multi-role lenses without persona hallucination", () => {
    const roles = ["ceo", "cfo"].map((key) => {
      const role = universalBusinessRolesV1.find((item) =>
        item.role_id.endsWith(key),
      );
      if (!role) throw new Error(`Missing role ${key}`);
      return role;
    });

    const perspectives = createMultiRolePerspectives(roles);

    expect(perspectives).toHaveLength(2);
    expect(perspectives[0]?.recommendationBoundary).toMatch(
      /do not grant authority/i,
    );
    expect(perspectives[1]?.metricIds).toContain(
      toSemanticId("flow.decision.metric.finance.cash-flow"),
    );
  });

  it("generates 150+ role-focused evaluation cases and required confusion pairs", () => {
    expect(roleEvaluationCasesV1.length).toBeGreaterThanOrEqual(150);
    expect(
      new Set(roleEvaluationCasesV1.flatMap((item) => item.languageVariants)),
    ).toEqual(new Set(["en", "ur", "ur-Latn", "mixed"]));
    expect(roleConfusionPairsV1).toEqual(
      expect.arrayContaining([
        [
          "flow.role.business.chief-revenue-officer",
          "flow.role.business.chief-risk-officer",
        ],
        ["flow.role.business.ciso", "flow.role.business.security-director"],
      ]),
    );
  });

  it("passes role knowledge quality control with only intentional ambiguous aliases", () => {
    expect(validateBusinessRoleRegistry()).toEqual([]);
  });
});
