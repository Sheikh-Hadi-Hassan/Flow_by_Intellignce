import { describe, expect, it } from "vitest";
import type { ActionRequest } from "./action-wall.js";
import { StaticActionWall } from "./action-wall.js";
import { ActionExecutionEngine } from "./execution-engine.js";
import type {
  ActorContext,
  CorrelationId,
  MembershipId,
  UserId,
  WorkspaceId,
} from "./identity.js";
import {
  assertFlowProviderMutationContext,
  assertFlowProviderReadContext,
  createFlowProviderMutationContext,
  createFlowProviderReadContext,
  FLOW_PROVIDER_AUTHORITIES,
} from "./provider-contracts.js";
import type { ToolDefinition, ToolExecutionContext } from "./tool-registry.js";
import { ToolRegistry } from "./tool-registry.js";

const workspaceId = "workspace-a" as WorkspaceId;

function actor(permissionIds: readonly string[]): ActorContext {
  return {
    actorId: "user-a" as UserId,
    userId: "user-a" as UserId,
    membershipId: "membership-a" as MembershipId,
    actorKind: "user",
    workspace: { workspaceId },
    roleIds: ["member"],
    permissionIds,
    requestSource: "UI",
    correlationId: "provider-contract-test" as CorrelationId,
  };
}

const mutationTool: ToolDefinition<
  { readonly idempotencyKey: string },
  { readonly providerId: string; readonly source: string }
> = {
  id: "crm.company.update",
  description: "Provider contract boundary proof.",
  inputSchema: {
    description: "Mutation with an idempotency key.",
    parse(input) {
      if (
        typeof input !== "object" ||
        input === null ||
        !("idempotencyKey" in input) ||
        typeof input.idempotencyKey !== "string"
      ) {
        throw new Error("idempotencyKey is required.");
      }
      return { idempotencyKey: input.idempotencyKey };
    },
  },
  outputSchema: {
    description: "Provider mutation context summary.",
    parse(input) {
      if (
        typeof input !== "object" ||
        input === null ||
        !("providerId" in input) ||
        typeof input.providerId !== "string" ||
        !("source" in input) ||
        typeof input.source !== "string"
      ) {
        throw new Error("Invalid provider context summary.");
      }
      return { providerId: input.providerId, source: input.source };
    },
  },
  riskLevel: "LOW",
  requiredAction: "client.manage",
  evidencePolicy: "NONE",
  approvalPolicy: {
    mode: "not-required",
    reason: "Boundary test has no external provider.",
  },
  execute(input, execution) {
    const parsed = mutationTool.inputSchema.parse(input);
    const context = createFlowProviderMutationContext(execution, {
      providerId: "twenty-crm",
      authority: "company",
      idempotencyKey: parsed.idempotencyKey,
    });
    return Promise.resolve({
      providerId: context.providerId,
      source: context.source,
    });
  },
};

function mutationRequest(
  permissionIds: readonly string[],
  idempotencyKey = "company-update-1",
): ActionRequest<{ readonly idempotencyKey: string }> {
  const context = actor(permissionIds);
  return {
    action: "client.manage",
    requestedToolId: mutationTool.id,
    actor: context,
    workspace: context.workspace,
    resource: {
      resourceType: "company",
      resourceId: "company-a",
      workspaceId,
    },
    input: { idempotencyKey },
    riskLevel: "LOW",
    evidence: [],
    correlationId: context.correlationId,
  };
}

function registry(): ToolRegistry {
  const tools = new ToolRegistry();
  tools.register(mutationTool);
  return tools;
}

describe("Flow provider authority contracts", () => {
  it("keeps each provider inside its declared authority", () => {
    expect(FLOW_PROVIDER_AUTHORITIES).toEqual({
      "twenty-crm": ["company", "contact", "opportunity"],
      penpot: ["design_assets", "visual_layout"],
      "documenso-ce": ["signature_evidence", "signature_execution"],
    });
    expect(() =>
      createFlowProviderReadContext({
        actor: actor(["proposal.read"]),
        providerId: "penpot",
        authority: "company",
        requiredPermission: "proposal.read",
      }),
    ).toThrow("cannot exercise Flow authority");
  });

  it("derives read scope from the server-owned actor and checks permission", () => {
    const context = createFlowProviderReadContext({
      actor: actor(["client.read"]),
      providerId: "twenty-crm",
      authority: "company",
      requiredPermission: "client.read",
    });

    expect(context).toMatchObject({
      workspaceId,
      actorId: "user-a",
      source: "FLOW_APPLICATION_SERVICE",
    });
    expect(() =>
      createFlowProviderReadContext({
        actor: actor([]),
        providerId: "twenty-crm",
        authority: "company",
        requiredPermission: "client.read",
      }),
    ).toThrow("lacks the required provider read permission");
  });

  it("mints mutation context only after the Universal Execution Spine", async () => {
    const result = await new ActionExecutionEngine(
      registry(),
      new StaticActionWall(),
    ).execute(mutationRequest(["client.manage"]));

    expect(result.status).toBe("EXECUTED");
    expect(result.output).toEqual({
      providerId: "twenty-crm",
      source: "UNIVERSAL_EXECUTION_SPINE",
    });
  });

  it("denies before provider execution when Flow permission is absent", async () => {
    const result = await new ActionExecutionEngine(
      registry(),
      new StaticActionWall(),
    ).execute(mutationRequest([]));

    expect(result.status).toBe("DENIED");
    expect(result.output).toBeUndefined();
  });

  it("rejects legacy direct execution and missing idempotency", async () => {
    await expect(
      registry().execute(
        mutationTool.id,
        mutationRequest(["client.manage"]),
        new StaticActionWall(),
      ),
    ).rejects.toThrow("require the Universal Execution Spine");

    const result = await new ActionExecutionEngine(
      registry(),
      new StaticActionWall(),
    ).execute(mutationRequest(["client.manage"], " "));
    expect(result.status).toBe("FAILED");
    expect(result.error).toBe("idempotencyKey is required.");
  });

  it("rejects a forged execution-spine context", () => {
    const forged = {
      executionPath: "UNIVERSAL_EXECUTION_SPINE",
    } as ToolExecutionContext;
    expect(() =>
      createFlowProviderMutationContext(forged, {
        providerId: "twenty-crm",
        authority: "company",
        idempotencyKey: "forged-1",
      }),
    ).toThrow("require the Universal Execution Spine");
  });

  it("lets provider adapters reject forged read and mutation contexts", () => {
    expect(() =>
      assertFlowProviderReadContext({
        providerId: "twenty-crm",
        authority: "company",
        workspaceId,
        actorId: "user-a",
        correlationId: "forged" as CorrelationId,
        requiredPermission: "client.read",
        source: "FLOW_APPLICATION_SERVICE",
      } as ReturnType<typeof createFlowProviderReadContext>),
    ).toThrow("require a Flow application service context");

    expect(() =>
      assertFlowProviderMutationContext({
        providerId: "twenty-crm",
        authority: "company",
        workspaceId,
        actorId: "user-a",
        correlationId: "forged" as CorrelationId,
        action: "client.manage",
        idempotencyKey: "forged",
        source: "UNIVERSAL_EXECUTION_SPINE",
      } as ReturnType<typeof createFlowProviderMutationContext>),
    ).toThrow("require the Universal Execution Spine context");
  });
});
