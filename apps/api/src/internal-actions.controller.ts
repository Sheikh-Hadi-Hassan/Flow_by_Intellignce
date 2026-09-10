import { Body, Controller, Headers, Inject, Post } from "@nestjs/common";
import {
  ActionExecutionEngine,
  ProviderBackedActionWall,
  systemEchoTool,
  ToolRegistry,
} from "@flow/contracts";
import type { ActionRequest, CorrelationId } from "@flow/contracts";
import type { AuditSink } from "@flow/contracts";
import {
  createDevelopmentAuthenticationStack,
  parseRequestSource,
} from "./security/flow-auth-context.js";
import { AUDIT_SINK } from "./database/persistence.providers.js";

interface ExecuteEchoBody {
  readonly message?: unknown;
}

@Controller("internal/actions")
export class InternalActionsController {
  private readonly authenticationStack = createDevelopmentAuthenticationStack();
  private readonly engine: ActionExecutionEngine;
  private readonly identityResolver = this.authenticationStack.identityResolver;

  constructor(@Inject(AUDIT_SINK) auditSink: AuditSink) {
    const registry = new ToolRegistry();
    registry.register(systemEchoTool);
    this.engine = new ActionExecutionEngine(
      registry,
      new ProviderBackedActionWall(
        this.authenticationStack.authorizationProvider,
      ),
      auditSink,
    );
  }

  @Post("execute")
  async executeSystemEcho(
    @Body() body: ExecuteEchoBody,
    @Headers("authorization") authorizationHeader?: string,
    @Headers("x-flow-workspace-id") workspaceIdHeader?: string,
    @Headers("x-flow-request-source") requestSourceHeader?: string,
    @Headers("x-correlation-id") correlationIdHeader?: string,
    @Headers("traceparent") traceparentHeader?: string,
  ) {
    const correlationId = (correlationIdHeader ??
      "internal-api-proof") as CorrelationId;
    const context = await this.identityResolver.resolve({
      authorizationHeader,
      workspaceIdHeader,
    });

    const request: ActionRequest<{ readonly message: unknown }> = {
      action: "system.echo",
      requestedToolId: "system.echo",
      actor: {
        actorId: context.actorId,
        userId: context.userId,
        membershipId: context.membershipId,
        actorKind: "user",
        workspace: { workspaceId: context.workspaceId },
        roleIds: context.roleIds,
        permissionIds: context.permissionIds,
        requestSource: parseRequestSource(requestSourceHeader),
        correlationId,
      },
      workspace: { workspaceId: context.workspaceId },
      resource: {
        resourceType: "system",
        workspaceId: context.workspaceId,
      },
      input: {
        message: body.message,
      },
      riskLevel: "LOW",
      evidence: [],
      correlationId,
      ...(traceparentHeader ? { traceparent: traceparentHeader } : {}),
      metadata: {
        route: "POST /internal/actions/execute",
        proofOnly: true,
      },
    };

    return this.engine.execute(request);
  }
}
