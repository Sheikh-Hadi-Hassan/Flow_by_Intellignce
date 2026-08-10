import { describe, expect, it, vi } from "vitest";
import { ProviderBackedActionWall, StaticActionWall } from "./action-wall.js";
import type { ActionRequest } from "./action-wall.js";
import type {
  ActorContext,
  CorrelationId,
  MembershipId,
  WorkspaceId,
  UserId,
} from "./identity.js";

const workspaceA = "workspace-a" as WorkspaceId;
const workspaceB = "workspace-b" as WorkspaceId;
const actorId = "user-a" as UserId;

function actor(
  permissionIds: readonly string[],
  workspaceId: WorkspaceId = workspaceA,
): ActorContext {
  return {
    actorId,
    userId: actorId,
    membershipId: "membership-a" as MembershipId,
    actorKind: "user",
    workspace: { workspaceId },
    roleIds: [],
    permissionIds,
    requestSource: "UI",
    correlationId: "corr-actor" as CorrelationId,
  };
}

function request(
  overrides: Partial<ActionRequest<{ readonly message: string }>> = {},
): ActionRequest<{ readonly message: string }> {
  return {
    action: "system.echo",
    requestedToolId: "system.echo",
    actor: actor(["system.echo"]),
    workspace: { workspaceId: workspaceA },
    resource: { resourceType: "system", workspaceId: workspaceA },
    input: { message: "hello" },
    riskLevel: "LOW",
    evidence: [],
    correlationId: "corr-1" as CorrelationId,
    ...overrides,
  };
}

describe("StaticActionWall", () => {
  it("allows a permitted low-risk action inside the actor workspace", async () => {
    const decision = await new StaticActionWall().authorize(request());

    expect(decision.outcome).toBe("ALLOW");
  });

  it("denies actions when the actor lacks the required permission", async () => {
    const decision = await new StaticActionWall().authorize(
      request({ actor: actor([]) }),
    );

    expect(decision.outcome).toBe("DENY");
  });

  it("denies cross-workspace resource access structurally", async () => {
    const decision = await new StaticActionWall().authorize(
      request({
        resource: { resourceType: "system", workspaceId: workspaceB },
      }),
    );

    expect(decision.outcome).toBe("DENY");
  });

  it("requires approval for high-risk actions even when permission exists", async () => {
    const decision = await new StaticActionWall().authorize(
      request({ riskLevel: "HIGH" }),
    );

    expect(decision.outcome).toBe("REQUIRES_APPROVAL");
    expect(decision.approval?.mode).toBe("always-ask");
  });

  it("uses provider-backed authorization without letting request source add privilege", async () => {
    const provider = {
      authorize: vi.fn((input: { readonly action: string }) =>
        Promise.resolve({
          allowed: input.action === "system.echo",
          reason: "Persisted permission matched the current membership.",
          requiredPermission: input.action,
          membershipStatus: "ACTIVE" as const,
          roleIds: ["member"],
          permissionIds: ["system.echo"],
        }),
      ),
    };

    const uiDecision = await new ProviderBackedActionWall(provider).authorize(
      request({ actor: { ...actor(["system.echo"]), requestSource: "UI" } }),
    );
    const aiDecision = await new ProviderBackedActionWall(provider).authorize(
      request({ actor: { ...actor(["system.echo"]), requestSource: "AI" } }),
    );

    expect(uiDecision.outcome).toBe("ALLOW");
    expect(aiDecision.outcome).toBe(uiDecision.outcome);
  });
});
