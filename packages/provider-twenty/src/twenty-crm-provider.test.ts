import { describe, expect, it, vi } from "vitest";
import {
  ActionExecutionEngine,
  createFlowProviderMutationContext,
  createFlowProviderReadContext,
  ReliabilityError,
  StaticActionWall,
  ToolRegistry,
  type ActionRequest,
  type ActorContext,
  type CorrelationId,
  type CrmProviderAuthority,
  type FlowProviderMutationContext,
  type MembershipId,
  type ToolDefinition,
  type UserId,
  type WorkspaceId,
} from "@flow/contracts";
import {
  loadTwentyCrmProviderConfig,
  TWENTY_CRM_OBJECT_BINDINGS,
  TwentyCrmProvider,
} from "./twenty-crm-provider.js";

const workspaceId = "workspace-a" as WorkspaceId;
const correlationId = "correlation-a" as CorrelationId;
const recordId = "11111111-1111-4111-8111-111111111111";

function actor(): ActorContext {
  return {
    actorId: "user-a" as UserId,
    userId: "user-a" as UserId,
    membershipId: "membership-a" as MembershipId,
    actorKind: "user",
    workspace: { workspaceId },
    roleIds: ["member"],
    permissionIds: ["client.read", "client.manage"],
    requestSource: "UI",
    correlationId,
  };
}

function readContext(authority: CrmProviderAuthority) {
  return createFlowProviderReadContext({
    actor: actor(),
    providerId: "twenty-crm",
    authority,
    requiredPermission: "client.read",
  });
}

async function mutationContext(
  authority: CrmProviderAuthority,
  idempotencyKey = "mutation-1",
): Promise<FlowProviderMutationContext<"twenty-crm", CrmProviderAuthority>> {
  let context:
    FlowProviderMutationContext<"twenty-crm", CrmProviderAuthority> | undefined;
  const tool: ToolDefinition<Record<string, never>, { readonly ok: true }> = {
    id: "test.twenty.mutation-context",
    description: "Mint a test provider context through the execution spine.",
    inputSchema: {
      description: "Empty input.",
      parse: () => ({}),
    },
    outputSchema: {
      description: "Test output.",
      parse: () => ({ ok: true }),
    },
    riskLevel: "LOW",
    requiredAction: "client.manage",
    evidencePolicy: "NONE",
    approvalPolicy: { mode: "not-required", reason: "Test only." },
    execute(_input, execution) {
      context = createFlowProviderMutationContext(execution, {
        providerId: "twenty-crm",
        authority,
        idempotencyKey,
      });
      return Promise.resolve({ ok: true });
    },
  };
  const registry = new ToolRegistry();
  registry.register(tool);
  const request: ActionRequest<Record<string, never>> = {
    action: "client.manage",
    requestedToolId: tool.id,
    actor: actor(),
    workspace: { workspaceId },
    resource: { resourceType: authority, workspaceId },
    input: {},
    riskLevel: "LOW",
    evidence: [],
    correlationId,
  };
  const result = await new ActionExecutionEngine(
    registry,
    new StaticActionWall(),
  ).execute(request);
  expect(result.status).toBe("EXECUTED");
  if (!context) throw new Error("Mutation context was not created.");
  return context;
}

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "x-request-id": "req-1" },
  });
}

function requestUrl(input: string | URL | Request): string {
  if (typeof input === "string") return input;
  return input instanceof URL ? input.href : input.url;
}

function provider(fetchImplementation: typeof fetch, maxRetries = 2) {
  return new TwentyCrmProvider(
    {
      baseUrl: "http://localhost:3020",
      apiKey: "test-secret-token",
      flowWorkspaceId: workspaceId,
      timeoutMs: 100,
      maxRetries,
    },
    { fetch: fetchImplementation, sleep: () => Promise.resolve() },
  );
}

describe("TwentyCrmProvider", () => {
  it("binds Flow CRM authority to exact Twenty object names", () => {
    expect(TWENTY_CRM_OBJECT_BINDINGS).toEqual({
      company: {
        authority: "company",
        plural: "companies",
        singular: "company",
      },
      contact: {
        authority: "contact",
        plural: "people",
        singular: "person",
      },
      opportunity: {
        authority: "opportunity",
        plural: "opportunities",
        singular: "opportunity",
      },
    });
  });

  it("loads bounded environment configuration without exposing the key", () => {
    expect(
      loadTwentyCrmProviderConfig({
        TWENTY_CRM_BASE_URL: "http://localhost:3020",
        TWENTY_CRM_API_KEY: "secret",
        TWENTY_CRM_FLOW_WORKSPACE_ID: "workspace-a",
        TWENTY_CRM_TIMEOUT_MS: "2000",
        TWENTY_CRM_MAX_RETRIES: "1",
      }),
    ).toEqual({
      baseUrl: "http://localhost:3020",
      apiKey: "secret",
      flowWorkspaceId: "workspace-a",
      timeoutMs: 2000,
      maxRetries: 1,
    });
    expect(() =>
      loadTwentyCrmProviderConfig({
        TWENTY_CRM_BASE_URL: "http://localhost:3020",
      }),
    ).toThrow("TWENTY_CRM_API_KEY is required");
  });

  it("lists companies with validated filters and deterministic evidence", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(
      response({
        data: {
          companies: [
            { id: recordId, name: "Acme", workspaceId: "not-exposed" },
          ],
        },
      }),
    );
    const result = await provider(transport).read({
      context: readContext("company"),
      operation: "list",
      filters: [{ field: "name", operator: "contains", value: "Acme" }],
      limit: 20,
    });

    expect(result.data).toEqual([{ id: recordId, name: "Acme" }]);
    expect(result.evidence).toEqual([
      expect.objectContaining({
        id: `twenty-crm:company:${recordId}`,
        kind: "external-record",
      }),
    ]);
    const [url, init] = transport.mock.calls[0]!;
    expect(requestUrl(url)).toContain("/rest/companies?");
    expect(requestUrl(url)).toContain("limit=20");
    expect(decodeURIComponent(requestUrl(url))).toContain(
      'name[ilike]:"%Acme%"',
    );
    expect(new Headers(init?.headers).get("authorization")).toBe(
      "Bearer test-secret-token",
    );
  });

  it.each([
    ["contact", "people", "person"],
    ["opportunity", "opportunities", "opportunity"],
  ] as const)(
    "maps %s reads to Twenty's canonical object",
    async (authority, plural, singular) => {
      const transport = vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          response({ data: { [singular]: { id: recordId } } }),
        );
      await provider(transport).read({
        context: readContext(authority),
        operation: "get",
        externalId: recordId,
      });
      expect(requestUrl(transport.mock.calls[0]![0])).toBe(
        `http://localhost:3020/rest/${plural}/${recordId}`,
      );
    },
  );

  it.each([
    ["create", { name: "Acme" }],
    ["update", { name: "Updated" }],
    ["archive", {}],
  ] as const)(
    "keeps %s disabled until the reliability migration is live-verified",
    async (operation, values) => {
      const transport = vi.fn<typeof fetch>();
      await expect(
        provider(transport).mutate({
          context: await mutationContext("company", `${operation}-1`),
          operation,
          externalId: recordId,
          values,
        }),
      ).rejects.toMatchObject({
        code: "PROVIDER_UNAVAILABLE",
        retryable: false,
      });
      expect(transport).not.toHaveBeenCalled();
    },
  );

  it("retries transient reads but not authentication failures", async () => {
    const transient = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response({ error: "down" }, 503))
      .mockResolvedValueOnce(response({ data: { companies: [] } }));
    await provider(transient).read({
      context: readContext("company"),
      operation: "list",
    });
    expect(transient).toHaveBeenCalledTimes(2);

    const denied = vi
      .fn<typeof fetch>()
      .mockResolvedValue(response({ error: "denied" }, 401));
    await expect(
      provider(denied).read({
        context: readContext("company"),
        operation: "list",
      }),
    ).rejects.toMatchObject({ code: "AUTHENTICATION", retryable: false });
    expect(denied).toHaveBeenCalledTimes(1);
  });

  it("fails closed on malformed responses and unsafe filters", async () => {
    const malformed = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("not json", { status: 200 }));
    await expect(
      provider(malformed).read({
        context: readContext("company"),
        operation: "list",
      }),
    ).rejects.toMatchObject({ code: "INVALID_RESPONSE" });

    const unused = vi.fn<typeof fetch>();
    await expect(
      provider(unused).read({
        context: readContext("company"),
        operation: "list",
        filters: [{ field: "name),or(id", operator: "equals", value: "x" }],
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    expect(unused).not.toHaveBeenCalled();
  });

  it("rejects forged Flow authority before transport execution", async () => {
    const transport = vi.fn<typeof fetch>();
    await expect(
      provider(transport).read({
        context: {
          providerId: "twenty-crm",
          authority: "company",
          workspaceId,
          actorId: "user-a",
          correlationId,
          requiredPermission: "client.read",
          source: "FLOW_APPLICATION_SERVICE",
        } as ReturnType<typeof readContext>,
        operation: "list",
      }),
    ).rejects.toThrow("require a Flow application service context");
    expect(transport).not.toHaveBeenCalled();
  });

  it("rejects a valid context from a different Flow workspace", async () => {
    const transport = vi.fn<typeof fetch>();
    const context = createFlowProviderReadContext({
      actor: {
        ...actor(),
        workspace: { workspaceId: "workspace-b" as WorkspaceId },
      },
      providerId: "twenty-crm",
      authority: "company",
      requiredPermission: "client.read",
    });
    await expect(
      provider(transport).read({ context, operation: "list" }),
    ).rejects.toMatchObject({ code: "PERMISSION", retryable: false });
    expect(transport).not.toHaveBeenCalled();
  });

  it("never includes the API key in provider errors", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValue(response({ message: "bad token" }, 401));
    let failure: unknown;
    try {
      await provider(transport).read({
        context: readContext("company"),
        operation: "list",
      });
    } catch (error) {
      failure = error;
    }
    expect(failure).toBeInstanceOf(ReliabilityError);
    expect(String(failure)).not.toContain("test-secret-token");
  });
});
