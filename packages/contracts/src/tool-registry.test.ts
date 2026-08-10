import { describe, expect, it } from "vitest";
import { StaticActionWall } from "./action-wall.js";
import type { ActionRequest } from "./action-wall.js";
import type {
  CorrelationId,
  MembershipId,
  WorkspaceId,
  UserId,
} from "./identity.js";
import { systemEchoTool, ToolRegistry } from "./tool-registry.js";

const workspaceId = "workspace-a" as WorkspaceId;

describe("ToolRegistry architecture proof", () => {
  it("executes a harmless tool only after Action Wall authorization and emits audit context", async () => {
    const registry = new ToolRegistry();
    registry.register(systemEchoTool);

    const request: ActionRequest<{ readonly message: string }> = {
      action: "system.echo",
      actor: {
        actorId: "user-a" as UserId,
        userId: "user-a" as UserId,
        membershipId: "membership-a" as MembershipId,
        actorKind: "user",
        workspace: { workspaceId },
        roleIds: [],
        permissionIds: ["system.echo"],
        requestSource: "UI",
        correlationId: "corr-proof" as CorrelationId,
      },
      requestedToolId: "system.echo",
      workspace: { workspaceId },
      resource: { resourceType: "system", workspaceId },
      input: { message: "foundation" },
      riskLevel: "LOW",
      evidence: [],
      correlationId: "corr-proof" as CorrelationId,
    };

    const result = await registry.execute<
      { readonly message: string },
      { readonly message: string }
    >("system.echo", request, new StaticActionWall());

    expect(result.authorization.outcome).toBe("ALLOW");
    expect(result.output.message).toBe("foundation");
    expect(result.auditEvent.actorId).toBe("user-a");
    expect(result.auditEvent.workspaceId).toBe("workspace-a");
    expect(result.auditEvent.toolId).toBe("system.echo");
  });

  it("does not execute a tool when authorization denies the request", async () => {
    const registry = new ToolRegistry();
    registry.register(systemEchoTool);

    const request: ActionRequest<{ readonly message: string }> = {
      action: "system.echo",
      actor: {
        actorId: "user-a" as UserId,
        userId: "user-a" as UserId,
        membershipId: "membership-a" as MembershipId,
        actorKind: "user",
        workspace: { workspaceId },
        roleIds: [],
        permissionIds: [],
        requestSource: "UI",
        correlationId: "corr-denied" as CorrelationId,
      },
      requestedToolId: "system.echo",
      workspace: { workspaceId },
      resource: { resourceType: "system", workspaceId },
      input: { message: "blocked" },
      riskLevel: "LOW",
      evidence: [],
      correlationId: "corr-denied" as CorrelationId,
    };

    await expect(
      registry.execute("system.echo", request, new StaticActionWall()),
    ).rejects.toThrow("Tool execution blocked");
  });
});
