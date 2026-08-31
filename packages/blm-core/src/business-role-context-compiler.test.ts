import { describe, expect, it } from "vitest";

import { createWorkspaceRoleOverlay, toSemanticId } from "@flow/blm-contracts";
import type { ActorContext, WorkspaceContext } from "@flow/contracts";

import {
  BusinessRoleContextCompiler,
  type BusinessContextRequest,
} from "./index.js";

const workspace: WorkspaceContext = {
  workspaceId: "workspace-role-alpha" as WorkspaceContext["workspaceId"],
  slug: "role-alpha",
};

const actor: ActorContext = {
  actorId: "actor-role-alpha" as ActorContext["actorId"],
  userId: "user-role-alpha" as ActorContext["userId"],
  membershipId: "membership-role-alpha" as ActorContext["membershipId"],
  actorKind: "user",
  workspace,
  roleIds: ["member"],
  permissionIds: ["finance.invoice.read"],
  requestSource: "UI",
  correlationId: "correlation-role-alpha" as ActorContext["correlationId"],
};

function request(task: string): BusinessContextRequest {
  return {
    workspace,
    actor,
    task: {
      taskType: "DIAGNOSTIC",
      requestedTask: task,
    },
    referencedConceptIds: [],
    channel: "TEXT",
    knowledgeReleaseId: "flow.blm.knowledge-release.role-test",
  };
}

describe("BusinessRoleContextCompiler 008.1", () => {
  it("compiles only task-relevant role context and keeps authority advisory", () => {
    const context = new BusinessRoleContextCompiler().compile({
      businessContextRequest: request(
        "Analyze this as CEO and CFO: profitable business but cash is tight.",
      ),
      roleTitles: ["CEO", "CFO"],
    });

    expect(context.primaryRole?.role_id).toBe(
      toSemanticId("flow.role.business.ceo"),
    );
    expect(context.multiRolePerspectives).toHaveLength(2);
    expect(context.relevantMetricIds).toContain(
      toSemanticId("flow.decision.metric.finance.cash-flow"),
    );
    expect(context.authorityBoundaries.join(" ")).toMatch(
      /Action Wall|workspace permissions/i,
    );
    expect(context.compilerExplanation).toMatch(
      /does not grant workspace authority/i,
    );
  });

  it("keeps ambiguous CRO unresolved when context is not enough", () => {
    const context = new BusinessRoleContextCompiler().compile({
      businessContextRequest: request("What would CRO say about this?"),
      roleTitles: ["CRO"],
    });

    expect(context.aliasResolutions[0]?.status).toBe("AMBIGUOUS");
    expect(context.aliasResolutions[0]?.candidates.length).toBe(2);
  });

  it("uses business context to resolve CRO when decision context is revenue", () => {
    const context = new BusinessRoleContextCompiler().compile({
      businessContextRequest: request(
        "Pipeline quality and win rate are weak.",
      ),
      roleTitles: ["CRO"],
      decisionContext: ["pipeline revenue win rate"],
    });

    expect(context.aliasResolutions[0]?.status).toBe("RESOLVED");
    expect(context.primaryRole?.role_id).toBe(
      toSemanticId("flow.role.business.chief-revenue-officer"),
    );
  });

  it("maps FounderSpeak to role lenses without choosing a single cause", () => {
    const context = new BusinessRoleContextCompiler().compile({
      businessContextRequest: request("We're busy but broke."),
      roleTitles: ["Founder / Owner"],
      maxRoles: 4,
    });

    expect(context.primaryRole?.role_id).toBe(
      toSemanticId("flow.role.business.founder-owner"),
    );
    expect(context.primaryRole?.founder_translations[0]?.roleLensIds).toEqual(
      expect.arrayContaining([
        toSemanticId("flow.role.business.cfo"),
        toSemanticId("flow.role.business.coo"),
        toSemanticId("flow.role.business.chief-revenue-officer"),
      ]),
    );
  });

  it("applies workspace overlays without treating title as actual authority", () => {
    const overlay = createWorkspaceRoleOverlay({
      workspaceId: workspace.workspaceId,
      roleId: toSemanticId("flow.role.business.cfo"),
      workspaceTitle: "Head of Finance",
      addedAccountabilities: ["legal coordination"],
    });
    const context = new BusinessRoleContextCompiler().compile({
      businessContextRequest: request("Head of Finance should review runway."),
      roleIds: [toSemanticId("flow.role.business.cfo")],
      overlays: [overlay],
    });

    expect(context.primaryRole?.accountabilities).toContain(
      "legal coordination",
    );
    expect(context.primaryRole?.authority_scope.boundary).toMatch(
      /workspace actual authority/i,
    );
  });
});
