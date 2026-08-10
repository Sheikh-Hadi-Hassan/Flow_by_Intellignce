import { describe, expect, it } from "vitest";
import type { ApprovalGrant } from "./approval.js";
import type {
  ActionRequest,
  ActionWall,
  AuthorizationDecision,
} from "./action-wall.js";
import { StaticActionWall } from "./action-wall.js";
import type {
  CorrelationId,
  MembershipId,
  RequestSource,
  UserId,
  WorkspaceId,
} from "./identity.js";
import { InMemoryAuditSink } from "./audit.js";
import { ActionExecutionEngine } from "./execution-engine.js";
import { createModuleEnableTool } from "./module-tools.js";
import { coreOrganizationModule, ModuleRegistry } from "./module-registry.js";
import { createOrganizationUpdateProfileTool } from "./organization-tools.js";
import type { ToolDefinition } from "./tool-registry.js";
import { systemEchoTool, ToolRegistry } from "./tool-registry.js";

const workspaceA = "workspace-a" as WorkspaceId;
const workspaceB = "workspace-b" as WorkspaceId;

function buildRegistry(
  tools: readonly ToolDefinition[] = [systemEchoTool],
): ToolRegistry {
  const registry = new ToolRegistry();
  for (const tool of tools) {
    registry.register(tool);
  }
  return registry;
}

function request(
  overrides: Partial<ActionRequest<{ readonly message: string }>> = {},
  source: RequestSource = "UI",
): ActionRequest<{ readonly message: string }> {
  const correlationId = (overrides.correlationId ??
    "corr-spine") as CorrelationId;

  return {
    action: "system.echo",
    requestedToolId: "system.echo",
    actor: {
      actorId: "user-a" as UserId,
      userId: "user-a" as UserId,
      membershipId: "membership-a" as MembershipId,
      actorKind: "user",
      workspace: { workspaceId: workspaceA },
      roleIds: ["member"],
      permissionIds: ["system.echo"],
      requestSource: source,
      correlationId,
    },
    workspace: { workspaceId: workspaceA },
    resource: { resourceType: "system", workspaceId: workspaceA },
    input: { message: "hello" },
    riskLevel: "LOW",
    evidence: [],
    correlationId,
    ...overrides,
  };
}

const approvalGrant: ApprovalGrant = {
  approved: true,
  approvedBy: "approver-a",
  reason: "Approved for test scope.",
  scope: {
    workspaceId: workspaceA,
    userId: "user-a",
    resourceType: "system",
    action: "system.highRisk",
  },
};

const highRiskTool: ToolDefinition<
  { readonly message: string },
  { readonly message: string }
> = {
  ...systemEchoTool,
  id: "system.high-risk",
  description: "Mock high-risk tool used to prove approval blocking.",
  riskLevel: "LOW",
  requiredAction: "system.highRisk",
  approvalPolicy: {
    mode: "always-ask",
    reason: "High-risk mock tool requires approval.",
  },
};

const evidenceRequiredTool: ToolDefinition<
  { readonly message: string },
  { readonly message: string }
> = {
  ...systemEchoTool,
  id: "system.evidence-required",
  description: "Mock evidence-required tool.",
  requiredAction: "system.evidenceRequired",
  evidencePolicy: "REQUIRED",
};

const throwingTool: ToolDefinition<
  { readonly message: string },
  { readonly message: string }
> = {
  ...systemEchoTool,
  id: "system.throws",
  description: "Mock failing tool.",
  requiredAction: "system.throws",
  execute() {
    return Promise.reject(new Error("Synthetic tool failure."));
  },
};

class DenyAllActionWall implements ActionWall {
  authorize<TInput>(
    request: ActionRequest<TInput>,
  ): Promise<AuthorizationDecision> {
    return Promise.resolve({
      outcome: "DENY",
      reason: "Explicit test denial.",
      requiredPermission: request.action,
    });
  }
}

describe("ActionExecutionEngine", () => {
  it("A. executes an authorized actor through system.echo", async () => {
    const auditSink = new InMemoryAuditSink();
    const result = await new ActionExecutionEngine(
      buildRegistry(),
      new StaticActionWall(),
      auditSink,
    ).execute(request());

    expect(result.status).toBe("EXECUTED");
    expect(result.output).toEqual({ message: "hello" });
    expect(auditSink.list()).toHaveLength(1);
  });

  it("B. denies cross-workspace execution and never runs the tool", async () => {
    let ran = false;
    const tool: ToolDefinition<
      { readonly message: string },
      { readonly message: string }
    > = {
      ...systemEchoTool,
      execute(input) {
        ran = true;
        return Promise.resolve(systemEchoTool.outputSchema.parse(input));
      },
    };
    const auditSink = new InMemoryAuditSink();
    const result = await new ActionExecutionEngine(
      buildRegistry([tool]),
      new StaticActionWall(),
      auditSink,
    ).execute(
      request({
        workspace: { workspaceId: workspaceB },
      }),
    );

    expect(result.status).toBe("DENIED");
    expect(ran).toBe(false);
    expect(auditSink.list()[0]?.resultStatus).toBe("DENIED");
  });

  it("C. does not execute when Action Wall denies explicitly", async () => {
    let ran = false;
    const tool = {
      ...systemEchoTool,
      execute(input: unknown) {
        ran = true;
        return Promise.resolve(systemEchoTool.outputSchema.parse(input));
      },
    };
    const result = await new ActionExecutionEngine(
      buildRegistry([tool]),
      new DenyAllActionWall(),
    ).execute(request());

    expect(result.status).toBe("DENIED");
    expect(ran).toBe(false);
  });

  it("D. returns awaiting approval and never executes when approval is required", async () => {
    let ran = false;
    const tool = {
      ...highRiskTool,
      execute(input: unknown) {
        ran = true;
        return Promise.resolve(systemEchoTool.outputSchema.parse(input));
      },
    };
    const result = await new ActionExecutionEngine(
      buildRegistry([tool]),
      new StaticActionWall(),
    ).execute(
      request({
        action: "system.highRisk",
        requestedToolId: "system.high-risk",
        actor: {
          ...request().actor,
          permissionIds: ["system.highRisk"],
        },
      }),
    );

    expect(result.status).toBe("AWAITING_APPROVAL");
    expect(ran).toBe(false);
  });

  it("E. executes an approval-required action when a scoped grant is supplied", async () => {
    const result = await new ActionExecutionEngine(
      buildRegistry([highRiskTool]),
      new StaticActionWall(),
    ).execute(
      request({
        action: "system.highRisk",
        requestedToolId: "system.high-risk",
        actor: {
          ...request().actor,
          permissionIds: ["system.highRisk"],
        },
        approvalGrant,
      }),
    );

    expect(result.status).toBe("EXECUTED");
  });

  it("F. blocks missing required evidence before execution", async () => {
    const result = await new ActionExecutionEngine(
      buildRegistry([evidenceRequiredTool]),
      new StaticActionWall(),
    ).execute(
      request({
        action: "system.evidenceRequired",
        requestedToolId: "system.evidence-required",
        actor: {
          ...request().actor,
          permissionIds: ["system.evidenceRequired"],
        },
      }),
    );

    expect(result.status).toBe("DENIED");
    expect(result.evidence?.valid).toBe(false);
  });

  it("G. returns a safe failure for an unknown tool", async () => {
    const result = await new ActionExecutionEngine(
      buildRegistry(),
      new StaticActionWall(),
    ).execute(request({ requestedToolId: "system.missing" }));

    expect(result.status).toBe("FAILED");
    expect(result.error).toBe("Requested tool is not registered.");
  });

  it("H. returns a safe failure for invalid input", async () => {
    const result = await new ActionExecutionEngine(
      buildRegistry(),
      new StaticActionWall(),
    ).execute(
      request({
        input: { message: 123 } as unknown as { readonly message: string },
      }),
    );

    expect(result.status).toBe("FAILED");
    expect(result.error).toContain("string message");
  });

  it("I. audits failed tool execution", async () => {
    const auditSink = new InMemoryAuditSink();
    const result = await new ActionExecutionEngine(
      buildRegistry([throwingTool]),
      new StaticActionWall(),
      auditSink,
    ).execute(
      request({
        action: "system.throws",
        requestedToolId: "system.throws",
        actor: {
          ...request().actor,
          permissionIds: ["system.throws"],
        },
      }),
    );

    expect(result.status).toBe("FAILED");
    expect(auditSink.list()[0]?.resultStatus).toBe("FAILED");
  });

  it("J. preserves correlation ID through result and audit", async () => {
    const correlationId = "corr-shared" as CorrelationId;
    const result = await new ActionExecutionEngine(
      buildRegistry(),
      new StaticActionWall(),
    ).execute(request({ correlationId }));

    expect(result.correlationId).toBe(correlationId);
    expect(result.auditEvent.correlationId).toBe(correlationId);
  });

  it("K. creates audit events for denied requests", async () => {
    const auditSink = new InMemoryAuditSink();
    await new ActionExecutionEngine(
      buildRegistry(),
      new DenyAllActionWall(),
      auditSink,
    ).execute(request());

    expect(auditSink.list()[0]?.resultStatus).toBe("DENIED");
  });

  it("L. AI request source receives no privilege and cannot bypass Action Wall", async () => {
    const result = await new ActionExecutionEngine(
      buildRegistry(),
      new StaticActionWall(),
    ).execute(
      request(
        {
          actor: {
            ...request().actor,
            permissionIds: [],
            requestSource: "AI",
          },
        },
        "AI",
      ),
    );

    expect(result.status).toBe("DENIED");
    expect(result.authorization?.reason).toContain("does not hold");
  });

  it("M. executes an authorized organization profile mutation through the spine and audits it", async () => {
    const organizationTool = createOrganizationUpdateProfileTool((input) =>
      Promise.resolve({
        organizationId: input.organizationId,
        workspaceId: input.workspaceId,
        ...(input.displayName ? { displayName: input.displayName } : {}),
        ...(input.website ? { website: input.website } : {}),
      }),
    );
    const auditSink = new InMemoryAuditSink();
    const result = await new ActionExecutionEngine(
      buildRegistry([organizationTool]),
      new StaticActionWall(),
      auditSink,
    ).execute(
      request({
        action: "organization.update_profile",
        requestedToolId: "organization.update_profile",
        actor: {
          ...request().actor,
          permissionIds: ["organization.update_profile"],
        },
        resource: {
          resourceType: "organization",
          resourceId: "organization-alpha-primary",
          workspaceId: workspaceA,
        },
        input: {
          workspaceId: workspaceA,
          organizationId: "organization-alpha-primary",
          displayName: "Alpha Studio",
          website: "https://studio.example.test",
        } as unknown as { readonly message: string },
      }),
    );

    expect(result.status).toBe("EXECUTED");
    expect(result.output).toMatchObject({
      organizationId: "organization-alpha-primary",
      workspaceId: workspaceA,
      displayName: "Alpha Studio",
    });
    expect(auditSink.list()[0]).toMatchObject({
      action: "organization.update_profile",
      resultStatus: "EXECUTED",
      resourceType: "organization",
      resourceId: "organization-alpha-primary",
    });
  });

  it("N. denies organization mutation when the actor lacks permission, including AI source", async () => {
    const organizationTool = createOrganizationUpdateProfileTool((input) =>
      Promise.resolve({
        organizationId: input.organizationId,
        workspaceId: input.workspaceId,
      }),
    );
    const result = await new ActionExecutionEngine(
      buildRegistry([organizationTool]),
      new StaticActionWall(),
    ).execute(
      request(
        {
          action: "organization.update_profile",
          requestedToolId: "organization.update_profile",
          actor: {
            ...request().actor,
            permissionIds: [],
            requestSource: "AI",
          },
          resource: {
            resourceType: "organization",
            resourceId: "organization-alpha-primary",
            workspaceId: workspaceA,
          },
          input: {
            workspaceId: workspaceA,
            organizationId: "organization-alpha-primary",
            displayName: "Escalated",
          } as unknown as { readonly message: string },
        },
        "AI",
      ),
    );

    expect(result.status).toBe("DENIED");
  });

  it("O. enables a trusted module through the spine and emits an audit event", async () => {
    const moduleRegistry = new ModuleRegistry([coreOrganizationModule]);
    const moduleTool = createModuleEnableTool((input) =>
      Promise.resolve(moduleRegistry.enableModule(input)),
    );
    const auditSink = new InMemoryAuditSink();
    const result = await new ActionExecutionEngine(
      buildRegistry([moduleTool]),
      new StaticActionWall(),
      auditSink,
    ).execute(
      request({
        action: "module.enable",
        requestedToolId: "module.enable",
        actor: {
          ...request().actor,
          permissionIds: ["module.enable"],
        },
        resource: {
          resourceType: "module",
          resourceId: "core.organization",
          workspaceId: workspaceA,
        },
        input: {
          workspaceId: workspaceA,
          moduleKey: "core.organization",
          version: "1.0.0",
          enabledBy: "user-a",
          configuration: { profileEditing: true },
        } as unknown as { readonly message: string },
      }),
    );

    expect(result.status).toBe("EXECUTED");
    expect(result.output).toMatchObject({
      workspaceId: workspaceA,
      moduleKey: "core.organization",
      status: "ENABLED",
    });
    expect(auditSink.list()[0]).toMatchObject({
      action: "module.enable",
      resultStatus: "EXECUTED",
      resourceType: "module",
      resourceId: "core.organization",
    });
  });

  it("P. denies AI-originated module activation without user permission", async () => {
    const moduleRegistry = new ModuleRegistry([coreOrganizationModule]);
    const moduleTool = createModuleEnableTool((input) =>
      Promise.resolve(moduleRegistry.enableModule(input)),
    );
    const result = await new ActionExecutionEngine(
      buildRegistry([moduleTool]),
      new StaticActionWall(),
    ).execute(
      request(
        {
          action: "module.enable",
          requestedToolId: "module.enable",
          actor: {
            ...request().actor,
            permissionIds: [],
            requestSource: "AI",
          },
          resource: {
            resourceType: "module",
            resourceId: "core.organization",
            workspaceId: workspaceA,
          },
          input: {
            workspaceId: workspaceA,
            moduleKey: "core.organization",
            version: "1.0.0",
            enabledBy: "user-a",
            configuration: { profileEditing: true },
          } as unknown as { readonly message: string },
        },
        "AI",
      ),
    );

    expect(result.status).toBe("DENIED");
  });
});
