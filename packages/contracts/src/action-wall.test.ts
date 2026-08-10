import { describe, expect, it } from "vitest";
import { StaticActionWall } from "./action-wall.js";
import type { ActionRequest } from "./action-wall.js";
import type {
  ActorContext,
  CorrelationId,
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
});
