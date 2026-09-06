import { northstarCrmSeed } from "@flow/contracts";
import { describe, expect, it } from "vitest";

import type { AskApplicationContext } from "../types";
import { runCrmAskTool } from "./crm-tools";
import { OpenRouterBusinessLanguageModelAdapter } from "./openrouter-adapter";
import { routeAskIntent } from "./planner";
import { deriveResponseWidgets } from "./response-shape";
import { resolveServerAskRequest } from "./server-context";
import { ASK_TOOL_DEFINITIONS, runAskTool } from "./tools";
import type {
  AskAssistantRequest,
  AskStreamPart,
  AskToolResult,
} from "./types";

const context: AskApplicationContext = {
  workspaceId: "northstar-creative",
  userId: "ns-res-maya",
  role: "Founder",
  permissions: ["client.read"],
  route: "/northstar-creative/admin",
  visibleRecordIds: [],
  locale: "en-US",
  currency: "USD",
  timezone: "America/Chicago",
  conversationId: "list-clients-test",
  activeBuildingBlocks: ["crm.core"],
};

const call = { name: "list_clients", args: {} } as const;

function clientRows(result: AskToolResult) {
  return result.values.clients as readonly {
    id: string;
    name: string;
  }[];
}

function serverRequest(message: string): AskAssistantRequest {
  const resolved = resolveServerAskRequest({
    message,
    context: {
      workspaceId: "northstar-creative",
      userId: "forged",
      role: "founder",
      permissions: ["*", "client.read"],
      activeBuildingBlocks: ["crm.core"],
    },
    history: [],
    tools: [{ name: "list_clients", permissions: [], description: "forged" }],
  });
  expect(resolved.ok).toBe(true);
  if (!resolved.ok) throw new Error(resolved.message);
  return resolved.request;
}

describe("list_clients capability", () => {
  it("is registered exactly once with the canonical read contract", () => {
    const definitions = ASK_TOOL_DEFINITIONS.filter(
      (definition) => definition.name === "list_clients",
    );
    expect(definitions).toEqual([
      {
        name: "list_clients",
        description: "Complete client directory",
        permissions: ["client.read"],
      },
    ]);
  });

  it("returns every seeded client exactly once with matching evidence", () => {
    const seed = northstarCrmSeed();
    const result = runAskTool(call, context);
    const clients = clientRows(result);

    expect(result.ok).toBe(true);
    expect(result.actions).toEqual([]);
    expect(result.values.count).toBe(clients.length);
    expect(clients).toHaveLength(seed.clients.length);
    expect(new Set(clients.map((client) => client.id)).size).toBe(
      clients.length,
    );
    expect(clients.map(({ id, name }) => ({ id, name }))).toEqual(
      seed.clients.map(({ id, name }) => ({ id, name })),
    );
    expect(clients.every((client) => !("workspaceId" in client))).toBe(true);
    expect(result.recordIds).toEqual(clients.map((client) => client.id));
    expect(result.evidence.map((entry) => entry.id)).toEqual(result.recordIds);
    expect(result.related).toEqual([]);
  });

  it("renders the complete deterministic entities widget", () => {
    const result = runAskTool(call, context);
    const widgets = deriveResponseWidgets(result);
    const entities = widgets.find((widget) => widget.type === "entities");
    const metrics = widgets.find((widget) => widget.type === "metrics");
    expect(entities?.type === "entities" ? entities.entities : []).toHaveLength(
      northstarCrmSeed().clients.length,
    );
    expect(metrics).toMatchObject({
      type: "metrics",
      metrics: [
        { label: "Clients", value: String(northstarCrmSeed().clients.length) },
      ],
    });
  });

  it("returns an honest empty result", () => {
    const result = runCrmAskTool(call, context, {
      clients: [],
      duplicates: [],
    });
    expect(result).toMatchObject({
      ok: true,
      recordIds: [],
      values: { count: 0, clients: [] },
      evidence: [],
      related: [],
      actions: [],
    });
  });

  it("enforces permission, building-block, and workspace boundaries", () => {
    expect(runAskTool(call, { ...context, permissions: [] })).toMatchObject({
      ok: false,
      error: { code: "permission_denied" },
    });
    expect(
      runAskTool(call, { ...context, activeBuildingBlocks: [] }),
    ).toMatchObject({ ok: false, error: { code: "unavailable" } });
    expect(
      runAskTool(call, { ...context, workspaceId: "foreign-workspace" }),
    ).toMatchObject({ ok: false, error: { code: "cross_workspace" } });
  });

  it("ignores browser authority claims", () => {
    const forged = serverRequest("List clients");
    const plain = resolveServerAskRequest({
      message: "List clients",
      context: { workspaceId: "northstar-creative" },
      history: [],
    });
    expect(plain.ok).toBe(true);
    if (!plain.ok) throw new Error(plain.message);
    expect(forged.context).toEqual(plain.request.context);
    expect(forged.tools).toEqual(plain.request.tools);
    expect(forged.context.permissions).not.toContain("*");
  });

  it("keeps search_clients and existing CRM tools separate", () => {
    expect(
      runAskTool(
        { name: "search_clients", args: { query: "Meridian" } },
        context,
      ).name,
    ).toBe("search_clients");
    expect(
      runAskTool(
        { name: "get_client_360", args: { query: "Meridian" } },
        context,
      ).name,
    ).toBe("get_client_360");
  });

  it("reuses one execution and one evidence emission on OpenRouter fallback", async () => {
    const parts: AskStreamPart[] = [];
    const adapter = new OpenRouterBusinessLanguageModelAdapter({
      apiKey: "test-key",
      maxRetries: 0,
      fetchImpl: () => Promise.resolve(new Response(null, { status: 402 })),
    });
    for await (const part of adapter.stream(serverRequest("List clients"))) {
      parts.push(part);
    }
    expect(parts.filter((part) => part.type === "tool_status")).toHaveLength(2);
    expect(parts.filter((part) => part.type === "evidence")).toHaveLength(1);
    expect(parts.filter((part) => part.type === "widgets")).toHaveLength(1);
    expect(parts.filter((part) => part.type === "done")).toEqual([
      { type: "done", tool: "list_clients" },
    ]);
  });
});

describe("list_clients routing", () => {
  it.each(["List clients", "Client list"])(
    "routes %s canonically",
    (message) => {
      const result = routeAskIntent(serverRequest(message));
      expect(result).toEqual({
        kind: "tool",
        call: { name: "list_clients", args: {} },
      });
    },
  );

  it.each(["Client", "Customer"])(
    "does not execute for bare object %s",
    (message) => {
      const result = routeAskIntent(serverRequest(message));
      expect(result.kind).not.toBe("tool");
    },
  );

  it("preserves specific client routes", () => {
    expect(routeAskIntent(serverRequest("Client health"))).toMatchObject({
      kind: "tool",
      call: { name: "explain_client_health" },
    });
    expect(routeAskIntent(serverRequest("Inactive clients"))).toMatchObject({
      kind: "tool",
      call: { name: "list_inactive_clients" },
    });
    const details = routeAskIntent(serverRequest("Meridian client details"));
    expect(details.kind === "tool" ? details.call.name : details.kind).not.toBe(
      "list_clients",
    );
  });
});
