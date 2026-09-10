import type { EvidenceReference } from "./evidence.js";
import type { ActorContext, CorrelationId, WorkspaceId } from "./identity.js";
import type { ToolExecutionContext } from "./tool-registry.js";
import { isUniversalToolExecutionContext } from "./tool-registry.js";

export type FlowProviderId = "twenty-crm" | "penpot" | "documenso-ce";
export type CrmProviderAuthority = "company" | "contact" | "opportunity";
export type StudioProviderAuthority = "design_assets" | "visual_layout";
export type SigningProviderAuthority =
  "signature_execution" | "signature_evidence";
export type FlowProviderAuthority =
  CrmProviderAuthority | StudioProviderAuthority | SigningProviderAuthority;

export const FLOW_PROVIDER_AUTHORITIES = {
  "twenty-crm": ["company", "contact", "opportunity"],
  penpot: ["design_assets", "visual_layout"],
  "documenso-ce": ["signature_evidence", "signature_execution"],
} as const satisfies Readonly<
  Record<FlowProviderId, readonly FlowProviderAuthority[]>
>;

const readContextBrand: unique symbol = Symbol("FlowProviderReadContext");
const mutationContextBrand: unique symbol = Symbol(
  "FlowProviderMutationContext",
);

export interface FlowProviderReadContext<
  TProviderId extends FlowProviderId = FlowProviderId,
  TAuthority extends FlowProviderAuthority = FlowProviderAuthority,
> {
  readonly [readContextBrand]: true;
  readonly providerId: TProviderId;
  readonly authority: TAuthority;
  readonly workspaceId: WorkspaceId;
  readonly actorId: string;
  readonly correlationId: CorrelationId;
  readonly traceparent?: string;
  readonly requiredPermission: string;
  readonly source: "FLOW_APPLICATION_SERVICE";
}

export interface FlowProviderMutationContext<
  TProviderId extends FlowProviderId = FlowProviderId,
  TAuthority extends FlowProviderAuthority = FlowProviderAuthority,
> {
  readonly [mutationContextBrand]: true;
  readonly providerId: TProviderId;
  readonly authority: TAuthority;
  readonly workspaceId: WorkspaceId;
  readonly actorId: string;
  readonly correlationId: CorrelationId;
  readonly traceparent?: string;
  readonly action: string;
  readonly idempotencyKey: string;
  readonly source: "UNIVERSAL_EXECUTION_SPINE";
}

export interface ProviderFilter {
  readonly field: string;
  readonly operator: "equals" | "contains" | "in";
  readonly value: string | readonly string[];
}

export interface ProviderReadRequest<
  TProviderId extends FlowProviderId,
  TAuthority extends FlowProviderAuthority,
> {
  readonly context: FlowProviderReadContext<TProviderId, TAuthority>;
  readonly operation: "get" | "list";
  readonly externalId?: string;
  readonly filters?: readonly ProviderFilter[];
  readonly limit?: number;
}

export interface ProviderMutationRequest<
  TProviderId extends FlowProviderId,
  TAuthority extends FlowProviderAuthority,
  TOperation extends string,
> {
  readonly context: FlowProviderMutationContext<TProviderId, TAuthority>;
  readonly operation: TOperation;
  readonly externalId?: string;
  readonly values: Readonly<Record<string, unknown>>;
}

export interface ProviderResult<TData = Readonly<Record<string, unknown>>> {
  readonly data: TData;
  readonly evidence: readonly EvidenceReference[];
  readonly providerRequestId?: string;
}

export interface FlowCrmProvider {
  readonly id: "twenty-crm";
  read(
    request: ProviderReadRequest<"twenty-crm", CrmProviderAuthority>,
  ): Promise<ProviderResult<readonly Readonly<Record<string, unknown>>[]>>;
  mutate(
    request: ProviderMutationRequest<
      "twenty-crm",
      CrmProviderAuthority,
      "create" | "update" | "archive"
    >,
  ): Promise<ProviderResult>;
}

export interface FlowStudioProvider {
  readonly id: "penpot";
  read(
    request: ProviderReadRequest<"penpot", StudioProviderAuthority>,
  ): Promise<ProviderResult<readonly Readonly<Record<string, unknown>>[]>>;
  mutate(
    request: ProviderMutationRequest<
      "penpot",
      StudioProviderAuthority,
      "save_revision"
    >,
  ): Promise<ProviderResult>;
}

export interface FlowSigningProvider {
  readonly id: "documenso-ce";
  read(
    request: ProviderReadRequest<"documenso-ce", SigningProviderAuthority>,
  ): Promise<ProviderResult<readonly Readonly<Record<string, unknown>>[]>>;
  mutate(
    request: ProviderMutationRequest<
      "documenso-ce",
      "signature_execution",
      "create_signing_request" | "void_signing_request"
    >,
  ): Promise<ProviderResult>;
  inspectWebhook(input: {
    readonly body: Uint8Array;
    readonly headers: Readonly<Record<string, string>>;
  }): Promise<{
    readonly verified: boolean;
    readonly authoritative: false;
    readonly replayKey: string;
    readonly payloadHash: string;
    readonly evidence: readonly EvidenceReference[];
  }>;
}

export function assertFlowProviderReadContext(
  context: FlowProviderReadContext,
): void {
  if (context[readContextBrand] !== true) {
    throw new Error(
      "Provider reads require a Flow application service context.",
    );
  }
  assertProviderAuthority(context.providerId, context.authority);
}

export function assertFlowProviderMutationContext(
  context: FlowProviderMutationContext,
): void {
  if (context[mutationContextBrand] !== true) {
    throw new Error(
      "Provider mutations require the Universal Execution Spine context.",
    );
  }
  assertProviderAuthority(context.providerId, context.authority);
  assertNonEmpty(context.idempotencyKey, "idempotencyKey");
}

function assertProviderAuthority(
  providerId: FlowProviderId,
  authority: FlowProviderAuthority,
): void {
  const allowed: readonly FlowProviderAuthority[] =
    FLOW_PROVIDER_AUTHORITIES[providerId];
  if (!allowed.includes(authority)) {
    throw new Error(
      `${providerId} cannot exercise Flow authority '${authority}'.`,
    );
  }
}

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${field} is required.`);
  }
}

export function createFlowProviderReadContext<
  TProviderId extends FlowProviderId,
  TAuthority extends FlowProviderAuthority,
>(input: {
  readonly actor: ActorContext;
  readonly providerId: TProviderId;
  readonly authority: TAuthority;
  readonly requiredPermission: string;
}): FlowProviderReadContext<TProviderId, TAuthority> {
  assertProviderAuthority(input.providerId, input.authority);
  assertNonEmpty(input.requiredPermission, "requiredPermission");
  if (!input.actor.permissionIds.includes(input.requiredPermission)) {
    throw new Error("Flow actor lacks the required provider read permission.");
  }

  return {
    [readContextBrand]: true,
    providerId: input.providerId,
    authority: input.authority,
    workspaceId: input.actor.workspace.workspaceId,
    actorId: input.actor.actorId,
    correlationId: input.actor.correlationId,
    requiredPermission: input.requiredPermission,
    source: "FLOW_APPLICATION_SERVICE",
  };
}

export function createFlowProviderMutationContext<
  TProviderId extends FlowProviderId,
  TAuthority extends FlowProviderAuthority,
>(
  execution: ToolExecutionContext,
  input: {
    readonly providerId: TProviderId;
    readonly authority: TAuthority;
    readonly idempotencyKey: string;
  },
): FlowProviderMutationContext<TProviderId, TAuthority> {
  if (!isUniversalToolExecutionContext(execution)) {
    throw new Error(
      "Provider mutations require the Universal Execution Spine.",
    );
  }
  assertProviderAuthority(input.providerId, input.authority);
  assertNonEmpty(input.idempotencyKey, "idempotencyKey");

  return {
    [mutationContextBrand]: true,
    providerId: input.providerId,
    authority: input.authority,
    workspaceId: execution.workspaceId,
    actorId: execution.actor.actorId,
    correlationId: execution.correlationId,
    ...(execution.traceparent ? { traceparent: execution.traceparent } : {}),
    action: execution.action,
    idempotencyKey: input.idempotencyKey,
    source: "UNIVERSAL_EXECUTION_SPINE",
  };
}
