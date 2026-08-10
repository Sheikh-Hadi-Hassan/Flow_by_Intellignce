import { Body, Controller, Headers, Post } from "@nestjs/common";
import {
  ActionExecutionEngine,
  StaticActionWall,
  systemEchoTool,
  ToolRegistry,
} from "../../../packages/contracts/src/index.js";
import type {
  ActionRequest,
  CorrelationId,
  UserId,
  WorkspaceId,
} from "../../../packages/contracts/src/index.js";

interface ExecuteEchoBody {
  readonly message?: unknown;
}

@Controller("internal/actions")
export class InternalActionsController {
  private readonly engine: ActionExecutionEngine;

  constructor() {
    const registry = new ToolRegistry();
    registry.register(systemEchoTool);
    this.engine = new ActionExecutionEngine(registry, new StaticActionWall());
  }

  @Post("execute")
  async executeSystemEcho(
    @Body() body: ExecuteEchoBody,
    @Headers("x-correlation-id") correlationIdHeader?: string,
  ) {
    const correlationId = (correlationIdHeader ??
      "internal-api-proof") as CorrelationId;
    const workspaceId = "internal-dev-workspace" as WorkspaceId;

    const request: ActionRequest<{ readonly message: unknown }> = {
      action: "system.echo",
      requestedToolId: "system.echo",
      actor: {
        actorId: "internal-dev-user" as UserId,
        actorKind: "user",
        workspace: { workspaceId },
        roleIds: ["developer"],
        permissionIds: ["system.echo"],
        requestSource: "API",
        correlationId,
      },
      workspace: { workspaceId },
      resource: {
        resourceType: "system",
        workspaceId,
      },
      input: {
        message: body.message,
      },
      riskLevel: "LOW",
      evidence: [],
      correlationId,
      metadata: {
        route: "POST /internal/actions/execute",
        proofOnly: true,
      },
    };

    return this.engine.execute(request);
  }
}
