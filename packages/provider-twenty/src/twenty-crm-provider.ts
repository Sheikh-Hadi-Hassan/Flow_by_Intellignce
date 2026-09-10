import {
  assertFlowProviderMutationContext,
  assertFlowProviderReadContext,
  executeReliableProviderCall,
  ReliabilityError,
  type CrmProviderAuthority,
  type EvidenceReference,
  type FlowCrmProvider,
  type ProviderFilter,
  type ProviderMutationRequest,
  type ProviderReadRequest,
  type ProviderResult,
  type RetryPolicy,
} from "@flow/contracts";

export const TWENTY_CRM_OBJECT_BINDINGS = {
  company: { authority: "company", plural: "companies", singular: "company" },
  contact: { authority: "contact", plural: "people", singular: "person" },
  opportunity: {
    authority: "opportunity",
    plural: "opportunities",
    singular: "opportunity",
  },
} as const;

const FIELD_PATH = /^[A-Za-z][A-Za-z0-9]*(?:\.[A-Za-z][A-Za-z0-9]*)*$/;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RESERVED_FIELDS = new Set(["workspaceId", "workspace_id"]);

export interface TwentyCrmProviderConfig {
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly flowWorkspaceId: string;
  readonly timeoutMs?: number;
  readonly maxRetries?: number;
}

export interface TwentyCrmProviderOptions {
  readonly fetch?: typeof globalThis.fetch;
  readonly sleep?: (delayMs: number) => Promise<void>;
  readonly now?: () => number;
}

export function loadTwentyCrmProviderConfig(
  environment: NodeJS.ProcessEnv = process.env,
): TwentyCrmProviderConfig {
  const baseUrl = required(
    environment.TWENTY_CRM_BASE_URL,
    "TWENTY_CRM_BASE_URL",
  );
  const apiKey = required(environment.TWENTY_CRM_API_KEY, "TWENTY_CRM_API_KEY");
  return {
    baseUrl,
    apiKey,
    flowWorkspaceId: required(
      environment.TWENTY_CRM_FLOW_WORKSPACE_ID,
      "TWENTY_CRM_FLOW_WORKSPACE_ID",
    ),
    timeoutMs: boundedInteger(
      environment.TWENTY_CRM_TIMEOUT_MS,
      "TWENTY_CRM_TIMEOUT_MS",
      15_000,
      1,
      120_000,
    ),
    maxRetries: boundedInteger(
      environment.TWENTY_CRM_MAX_RETRIES,
      "TWENTY_CRM_MAX_RETRIES",
      2,
      0,
      4,
    ),
  };
}

export class TwentyCrmProvider implements FlowCrmProvider {
  readonly id = "twenty-crm" as const;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly flowWorkspaceId: string;
  private readonly retryPolicy: RetryPolicy;
  private readonly fetchImplementation: typeof globalThis.fetch;

  constructor(
    config: TwentyCrmProviderConfig,
    private readonly options: TwentyCrmProviderOptions = {},
  ) {
    this.baseUrl = normalizeBaseUrl(config.baseUrl);
    this.apiKey = required(config.apiKey, "TWENTY_CRM_API_KEY");
    this.flowWorkspaceId = required(
      config.flowWorkspaceId,
      "TWENTY_CRM_FLOW_WORKSPACE_ID",
    );
    this.fetchImplementation = options.fetch ?? globalThis.fetch;
    this.retryPolicy = {
      timeoutMs: config.timeoutMs ?? 15_000,
      maxAttempts: (config.maxRetries ?? 2) + 1,
      initialDelayMs: 250,
      maxDelayMs: 2_000,
      backoffMultiplier: 2,
    };
  }

  async read(
    request: ProviderReadRequest<"twenty-crm", CrmProviderAuthority>,
  ): Promise<ProviderResult<readonly Readonly<Record<string, unknown>>[]>> {
    assertFlowProviderReadContext(request.context);
    assertTwentyContext(request.context.providerId, request.context.authority);
    this.assertWorkspace(request.context.workspaceId);
    const object = TWENTY_CRM_OBJECT_BINDINGS[request.context.authority];
    const path = readPath(object.plural, request.operation, request.externalId);
    const query =
      request.operation === "list"
        ? buildListQuery(request.limit, request.filters)
        : undefined;
    const execution = await executeReliableProviderCall({
      idempotencyKey: `${request.context.correlationId}:${request.context.authority}:${request.operation}`,
      policy: this.retryPolicy,
      operation: ({ signal }) =>
        this.request({
          method: "GET",
          path,
          ...(query ? { query } : {}),
          signal,
          correlationId: request.context.correlationId,
          ...(request.context.traceparent
            ? { traceparent: request.context.traceparent }
            : {}),
        }),
      options: this.options,
    });
    const records = parseReadResponse(
      execution.value.body,
      request.operation === "list" ? object.plural : object.singular,
      request.operation,
    );
    return {
      data: records,
      evidence: records.map((record) =>
        evidenceFor(request.context.authority, record.id, execution.value.url),
      ),
      ...(execution.value.requestId
        ? { providerRequestId: execution.value.requestId }
        : {}),
    };
  }

  mutate(
    request: ProviderMutationRequest<
      "twenty-crm",
      CrmProviderAuthority,
      "create" | "update" | "archive"
    >,
  ): Promise<ProviderResult> {
    assertFlowProviderMutationContext(request.context);
    assertTwentyContext(request.context.providerId, request.context.authority);
    this.assertWorkspace(request.context.workspaceId);
    return Promise.reject(
      new ReliabilityError(
        "PROVIDER_UNAVAILABLE",
        "Twenty CRM mutations are disabled until the Flow reliability migration is live-verified.",
        false,
      ),
    );
  }

  private async request(input: {
    readonly method: "GET";
    readonly path: string;
    readonly query?: Readonly<Record<string, string>>;
    readonly signal: AbortSignal;
    readonly correlationId: string;
    readonly traceparent?: string;
  }): Promise<{
    readonly body: unknown;
    readonly requestId?: string;
    readonly url: string;
  }> {
    const url = new URL(input.path, `${this.baseUrl}/`);
    for (const [name, value] of Object.entries(input.query ?? {})) {
      url.searchParams.set(name, value);
    }
    const headers = new Headers({
      accept: "application/json",
      authorization: `Bearer ${this.apiKey}`,
      "x-correlation-id": input.correlationId,
    });
    if (input.traceparent) headers.set("traceparent", input.traceparent);

    let response: Response;
    try {
      response = await this.fetchImplementation(url, {
        method: input.method,
        headers,
        signal: input.signal,
      });
    } catch (error) {
      if (input.signal.aborted) throw error;
      throw new ReliabilityError("NETWORK", "Twenty CRM is unreachable.", true);
    }

    if (!response.ok) throw classifyHttpFailure(response.status);
    const body = await parseJson(response);
    const requestId = response.headers.get("x-request-id");
    return {
      body,
      url: url.toString(),
      ...(requestId ? { requestId } : {}),
    };
  }

  private assertWorkspace(workspaceId: string): void {
    if (workspaceId !== this.flowWorkspaceId) {
      throw new ReliabilityError(
        "PERMISSION",
        "Twenty CRM is not configured for this Flow workspace.",
        false,
      );
    }
  }
}

function assertTwentyContext(
  providerId: string,
  authority: CrmProviderAuthority,
): void {
  if (
    providerId !== "twenty-crm" ||
    !(authority in TWENTY_CRM_OBJECT_BINDINGS)
  ) {
    throw new ReliabilityError(
      "PERMISSION",
      "Twenty CRM authority is invalid.",
      false,
    );
  }
}

function normalizeBaseUrl(value: string): string {
  const url = new URL(required(value, "TWENTY_CRM_BASE_URL"));
  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "::1"].includes(url.hostname)
    )
  ) {
    throw new ReliabilityError(
      "VALIDATION",
      "Twenty CRM requires HTTPS except on localhost.",
      false,
    );
  }
  return url.toString().replace(/\/$/, "");
}

function readPath(
  plural: string,
  operation: "get" | "list",
  externalId?: string,
): string {
  if (operation === "get") {
    return `/rest/${plural}/${encodeURIComponent(requiredExternalId(externalId))}`;
  }
  if (externalId) {
    throw new ReliabilityError(
      "VALIDATION",
      "List requests cannot include externalId.",
      false,
    );
  }
  return `/rest/${plural}`;
}

function buildListQuery(
  limit = 60,
  filters: readonly ProviderFilter[] = [],
): Readonly<Record<string, string>> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new ReliabilityError(
      "VALIDATION",
      "limit must be from 1 to 100.",
      false,
    );
  }
  return {
    limit: String(limit),
    ...(filters.length > 0 ? { filter: buildFilter(filters) } : {}),
  };
}

function buildFilter(filters: readonly ProviderFilter[]): string {
  const clauses = filters.map((filter) => {
    if (!FIELD_PATH.test(filter.field) || RESERVED_FIELDS.has(filter.field)) {
      throw new ReliabilityError(
        "VALIDATION",
        "Invalid CRM filter field.",
        false,
      );
    }
    if (filter.operator === "in") {
      if (!Array.isArray(filter.value) || filter.value.length === 0) {
        throw new ReliabilityError(
          "VALIDATION",
          "CRM in filters require values.",
          false,
        );
      }
      return `or(${filter.value.map((value) => `${filter.field}[eq]:${JSON.stringify(value)}`).join(",")})`;
    }
    if (typeof filter.value !== "string") {
      throw new ReliabilityError(
        "VALIDATION",
        "CRM filter value must be text.",
        false,
      );
    }
    if (filter.operator === "contains" && /[%_]/.test(filter.value)) {
      throw new ReliabilityError(
        "VALIDATION",
        "CRM contains filters cannot include wildcard characters.",
        false,
      );
    }
    const operator = filter.operator === "equals" ? "eq" : "ilike";
    const value =
      filter.operator === "contains" ? `%${filter.value}%` : filter.value;
    return `${filter.field}[${operator}]:${JSON.stringify(value)}`;
  });
  return clauses.length === 1 ? clauses[0]! : `and(${clauses.join(",")})`;
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.trim().length === 0) {
    throw new ReliabilityError(
      "INVALID_RESPONSE",
      "Twenty CRM returned an empty response.",
      false,
    );
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ReliabilityError(
      "INVALID_RESPONSE",
      "Twenty CRM returned malformed JSON.",
      false,
    );
  }
}

function parseReadResponse(
  body: unknown,
  key: string,
  operation: "get" | "list",
): readonly (Readonly<Record<string, unknown>> & { readonly id: string })[] {
  const value = dataValue(body, key);
  const records = operation === "list" ? value : [value];
  if (!Array.isArray(records)) return invalidResponse();
  return records.map(parseRecord);
}

function dataValue(body: unknown, key: string): unknown {
  if (!isRecord(body) || !isRecord(body.data) || !(key in body.data)) {
    return invalidResponse();
  }
  return body.data[key];
}

function parseRecord(
  value: unknown,
): Readonly<Record<string, unknown>> & { readonly id: string } {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    value.id.length === 0
  ) {
    return invalidResponse();
  }
  return Object.fromEntries(
    Object.entries(value).filter(([field]) => !RESERVED_FIELDS.has(field)),
  ) as Readonly<Record<string, unknown>> & { readonly id: string };
}

function invalidResponse(): never {
  throw new ReliabilityError(
    "INVALID_RESPONSE",
    "Twenty CRM response did not match the expected record shape.",
    false,
  );
}

function evidenceFor(
  authority: CrmProviderAuthority,
  externalId: string,
  uri: string,
): EvidenceReference {
  return {
    id: `twenty-crm:${authority}:${externalId}`,
    kind: "external-record",
    source: `Twenty CRM ${authority}`,
    uri,
    claimClassification: "FACT",
    trustLevel: "high",
  };
}

function classifyHttpFailure(status: number): ReliabilityError {
  if (status === 401)
    return new ReliabilityError(
      "AUTHENTICATION",
      "Twenty CRM authentication failed.",
      false,
    );
  if (status === 403)
    return new ReliabilityError(
      "PERMISSION",
      "Twenty CRM denied the request.",
      false,
    );
  if (status === 429)
    return new ReliabilityError(
      "RATE_LIMIT",
      "Twenty CRM rate limit reached.",
      true,
    );
  if (status >= 500)
    return new ReliabilityError(
      "PROVIDER_UNAVAILABLE",
      "Twenty CRM is unavailable.",
      true,
    );
  return new ReliabilityError(
    "VALIDATION",
    "Twenty CRM rejected the request.",
    false,
  );
}

function required(value: string | undefined, field: string): string {
  if (!value || value.trim().length === 0) {
    throw new ReliabilityError("VALIDATION", `${field} is required.`, false);
  }
  return value.trim();
}

function requiredExternalId(value: string | undefined): string {
  const externalId = required(value, "externalId");
  if (!UUID.test(externalId)) {
    throw new ReliabilityError(
      "VALIDATION",
      "externalId must be a UUID.",
      false,
    );
  }
  return externalId;
}

function boundedInteger(
  value: string | undefined,
  field: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new ReliabilityError("VALIDATION", `${field} is invalid.`, false);
  }
  return parsed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
