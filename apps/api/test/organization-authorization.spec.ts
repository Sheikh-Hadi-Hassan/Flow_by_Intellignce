import {
  ProviderBackedActionWall,
  type ActionRequest,
  type CorrelationId,
  type MembershipId,
  type UserId,
  type WorkspaceId,
} from "../../../packages/contracts/src/index.js";
import { createFlowIdentityTestRepository } from "../../../packages/database/src/index.js";
import { describe, expect, it } from "vitest";
import { RepositoryAuthorizationProvider } from "../src/security/flow-auth-context.js";

function organizationRequest(input: {
  readonly userId: string;
  readonly membershipId: string;
  readonly workspaceId: string;
  readonly requestSource?: "UI" | "AI";
}): ActionRequest<{ readonly organizationId: string }> {
  return {
    action: "organization.update_profile",
    requestedToolId: "organization.update_profile",
    actor: {
      actorId: input.userId as UserId,
      userId: input.userId as UserId,
      membershipId: input.membershipId as MembershipId,
      actorKind: "user",
      workspace: { workspaceId: input.workspaceId as WorkspaceId },
      roleIds: [],
      permissionIds: [],
      requestSource: input.requestSource ?? "UI",
      correlationId: "org-authz-correlation" as CorrelationId,
    },
    workspace: { workspaceId: input.workspaceId as WorkspaceId },
    resource: {
      resourceType: "organization",
      resourceId: "organization-alpha-primary",
      workspaceId: input.workspaceId,
    },
    input: { organizationId: "organization-alpha-primary" },
    riskLevel: "LOW",
    evidence: [],
    correlationId: "org-authz-correlation" as CorrelationId,
  };
}

describe("organization authorization provider integration", () => {
  it("denies organization mutation for suspended membership", async () => {
    const repository = createFlowIdentityTestRepository();
    const decision = await new ProviderBackedActionWall(
      new RepositoryAuthorizationProvider(repository),
    ).authorize(
      organizationRequest({
        userId: "flow-user-bob",
        membershipId: "membership-bob-beta",
        workspaceId: "workspace-beta",
      }),
    );

    expect(decision).toMatchObject({
      outcome: "DENY",
      reason: "Workspace membership is not active.",
    });
  });

  it("denies active membership missing organization permission", async () => {
    const repository = createFlowIdentityTestRepository();
    const decision = await new ProviderBackedActionWall(
      new RepositoryAuthorizationProvider(repository),
    ).authorize(
      organizationRequest({
        userId: "flow-user-alice",
        membershipId: "membership-alice-beta",
        workspaceId: "workspace-beta",
      }),
    );

    expect(decision).toMatchObject({
      outcome: "DENY",
      reason: "Persisted workspace membership lacks the required permission.",
    });
  });

  it("allows organization update after role grant and gives AI no extra privilege", async () => {
    const repository = createFlowIdentityTestRepository();
    repository.replaceMembershipRoles({
      membershipId: "membership-alice-alpha",
      roleIds: ["role-alpha-owner"],
    });
    const actionWall = new ProviderBackedActionWall(
      new RepositoryAuthorizationProvider(repository),
    );

    const uiDecision = await actionWall.authorize(
      organizationRequest({
        userId: "flow-user-alice",
        membershipId: "membership-alice-alpha",
        workspaceId: "workspace-alpha",
        requestSource: "UI",
      }),
    );
    const aiDecision = await actionWall.authorize(
      organizationRequest({
        userId: "flow-user-alice",
        membershipId: "membership-alice-alpha",
        workspaceId: "workspace-alpha",
        requestSource: "AI",
      }),
    );

    expect(uiDecision.outcome).toBe("ALLOW");
    expect(aiDecision.outcome).toBe(uiDecision.outcome);
  });
});
