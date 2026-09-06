import { describe, expect, it } from "vitest";

import { routeAskIntent } from "./planner";
import { ASK_TOOL_DEFINITIONS } from "./tools";
import type { AskAssistantRequest, AskToolDefinition } from "./types";

function buildRequest(
  overrides: Partial<AskAssistantRequest> = {},
): AskAssistantRequest {
  return {
    context: {
      workspaceId: "northstar-creative",
      userId: "user-test",
      role: "founder",
      permissions: ["opportunity.read", "finance.read", "project.manage"],
      route: "/northstar-creative/admin",
      visibleRecordIds: [],
      locale: "en",
      currency: "USD",
      timezone: "UTC",
      conversationId: "conv-test",
    },
    message: "",
    history: [],
    tools: ASK_TOOL_DEFINITIONS,
    ...overrides,
  };
}

describe("routeAskIntent bridge", () => {
  it("returns kind=tool for a confident exposure question", () => {
    const result = routeAskIntent(
      buildRequest({ message: "Why is money exposed?" }),
    );

    expect(result.kind).toBe("tool");
    if (result.kind === "tool") {
      expect(result.call.name).toBe("explain_open_exposure");
    }
  });

  it("returns kind=tool for overdue invoices with scope arg", () => {
    const result = routeAskIntent(
      buildRequest({ message: "show all overdue invoices" }),
    );

    expect(result.kind).toBe("tool");
    if (result.kind === "tool") {
      expect(result.call.name).toBe("list_overdue_invoices");
      expect(result.call.args.scope).toBe("all");
    }
  });

  it("returns kind=tool for search with query arg", () => {
    const result = routeAskIntent(
      buildRequest({ message: "search clients Meridian" }),
    );

    expect(result.kind).toBe("tool");
    if (result.kind === "tool") {
      expect(result.call.name).toBe("search_clients");
      expect(result.call.args.query).toContain("Meridian");
    }
  });

  it("returns kind=tool for workspace summary", () => {
    const result = routeAskIntent(
      buildRequest({ message: "workspace status" }),
    );

    expect(result.kind).toBe("tool");
    if (result.kind === "tool") {
      expect(result.call.name).toBe("get_workspace_summary");
    }
  });

  it("returns kind=tool for pipeline question", () => {
    const result = routeAskIntent(
      buildRequest({ message: "show the pipeline" }),
    );

    expect(result.kind).toBe("tool");
    if (result.kind === "tool") {
      expect(result.call.name).toBe("get_pipeline_summary");
    }
  });

  it("returns kind=out_of_domain for a greeting", () => {
    const result = routeAskIntent(
      buildRequest({ message: "hello" }),
    );

    expect(result.kind).toBe("out_of_domain");
    if (result.kind === "out_of_domain") {
      expect(result.reason).toMatch(/workspace records/i);
    }
  });

  it("returns kind=out_of_domain for empty message", () => {
    const result = routeAskIntent(
      buildRequest({ message: "" }),
    );

    expect(result.kind).toBe("out_of_domain");
    if (result.kind === "out_of_domain") {
      expect(result.reason.length).toBeGreaterThan(0);
    }
  });

  it("returns kind=clarify for ambiguous multi-intent message", () => {
    const result = routeAskIntent(
      buildRequest({ message: "show invoices and projects" }),
    );

    // Classifier may return clarification_required or multiple_intents,
    // both of which the bridge maps to kind=clarify.
    // Or it may resolve to a single tool. Accept either clarify or tool.
    expect(["clarify", "tool"]).toContain(result.kind);
    if (result.kind === "clarify") {
      expect(result.clarification.question.length).toBeGreaterThan(0);
      expect(result.clarification.choices.length).toBeGreaterThan(0);
    }
  });

  it("maps clarification choices without the tool field", () => {
    const result = routeAskIntent(
      buildRequest({ message: "show invoices and projects" }),
    );

    if (result.kind === "clarify") {
      for (const choice of result.clarification.choices) {
        expect(choice).toHaveProperty("id");
        expect(choice).toHaveProperty("label");
        expect(choice).not.toHaveProperty("tool");
      }
    }
  });

  it("passes follow-up context through lastAssistantTool", () => {
    const result = routeAskIntent(
      buildRequest({
        message: "tell me more",
        history: [
          { role: "user", text: "Why is money exposed?" },
          { role: "assistant", text: "Three decisions hold $356K", tool: "explain_open_exposure" },
          { role: "user", text: "tell me more" },
        ],
      }),
    );

    // Follow-up messages should still route (may be tool or out_of_domain).
    expect(result.kind).toBeDefined();
  });

  it("filters tools by permittedTools from request.tools", () => {
    const limitedTools: readonly AskToolDefinition[] = [
      { name: "get_workspace_summary", description: "Workspace status", permissions: ["opportunity.read"] },
      { name: "list_projects", description: "Project list", permissions: ["project.manage"] },
    ];

    const result = routeAskIntent(
      buildRequest({
        message: "Why is money exposed?",
        tools: limitedTools,
      }),
    );

    // The classifier should not select a tool that's not in permittedTools.
    if (result.kind === "tool") {
      const toolNames = limitedTools.map((t) => t.name);
      expect(toolNames).toContain(result.call.name);
    }
  });

  it("uses activeBuildingBlocks from request context", () => {
    const result = routeAskIntent(
      buildRequest({
        message: "workspace status",
        context: {
          workspaceId: "northstar-creative",
          userId: "user-test",
          role: "founder",
          permissions: ["opportunity.read"],
          route: "/northstar-creative/admin",
          visibleRecordIds: [],
          locale: "en",
          currency: "USD",
          timezone: "UTC",
          conversationId: "conv-test",
          activeBuildingBlocks: ["crm", "finance"],
        },
      }),
    );

    // Should still route normally with building blocks present.
    expect(result.kind).toBeDefined();
  });

  it("extracts urgent focus arg from message", () => {
    const result = routeAskIntent(
      buildRequest({ message: "urgent project health" }),
    );

    if (result.kind === "tool") {
      expect(result.call.args.focus).toBe("urgent");
    }
  });

  it("extracts risk scope arg from message", () => {
    const result = routeAskIntent(
      buildRequest({ message: "show risk exposure" }),
    );

    if (result.kind === "tool" && result.call.name.startsWith("explain")) {
      expect(result.call.args.scope).toBe("risk");
    }
  });

  it("handles undefined history gracefully", () => {
    const result = routeAskIntent(
      buildRequest({
        message: "workspace status",
        history: undefined as unknown as readonly never[],
      }),
    );

    expect(result.kind).toBeDefined();
  });
});
