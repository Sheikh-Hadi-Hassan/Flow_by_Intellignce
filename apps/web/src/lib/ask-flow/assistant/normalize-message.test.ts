import { describe, expect, it } from "vitest";

import { normalizeAskMessage } from "./normalize-message";
import { routeAskIntent } from "./planner";
import { resolveServerAskRequest } from "./server-context";
import type { AskAssistantRequest } from "./types";

function serverRequest(message: string): AskAssistantRequest {
  const resolved = resolveServerAskRequest({
    message,
    context: { workspaceId: "northstar-creative" },
    history: [],
  });
  expect(resolved.ok).toBe(true);
  if (!resolved.ok) throw new Error(resolved.message);
  return resolved.request;
}

describe("Ask message normalization", () => {
  it("normalizes client aliases, bounded typos, case, whitespace, and punctuation", () => {
    expect(normalizeAskMessage("  SHOW, all CUSTMERS?!  ")).toEqual({
      original: "  SHOW, all CUSTMERS?!  ",
      normalized: "show all client",
      reasonCodes: [
        "case_normalized",
        "punctuation_normalized",
        "whitespace_normalized",
        "client_typo_normalized",
      ],
    });
    expect(normalizeAskMessage("list customers")).toMatchObject({
      normalized: "list client",
      reasonCodes: ["client_alias_normalized"],
    });
    expect(normalizeAskMessage("list clints").normalized).toBe("list client");
  });

  it("does not introduce ambiguous domain aliases", () => {
    const message = "work team resource revenue sale record data business";
    expect(normalizeAskMessage(message).normalized).toBe(message);
  });

  it("preserves the original names, IDs, and money text", () => {
    const original = "Why is $356K exposed for Meridian Health ID CRM-ABC-123?";
    const normalized = normalizeAskMessage(original);
    expect(normalized.original).toBe(original);

    const request = serverRequest(original);
    routeAskIntent(request);
    expect(request.message).toBe(original);
  });
});

describe("normalized client-list routing", () => {
  it.each([
    "list customer",
    "list customers",
    "show all customers",
    "who are my clients",
    "give me the client list",
    "list clints",
    "list custmers",
  ])("routes %s to the canonical capability", (message) => {
    expect(routeAskIntent(serverRequest(message))).toEqual({
      kind: "tool",
      call: { name: "list_clients", args: {} },
    });
  });

  it.each([
    "client",
    "customer",
    "show",
    "show data",
    "list things",
    "customer success report",
    "client health",
    "inactive clients",
    "Meridian client details",
  ])("does not route %s to list_clients", (message) => {
    const result = routeAskIntent(serverRequest(message));
    expect(result.kind === "tool" ? result.call.name : result.kind).not.toBe(
      "list_clients",
    );
  });
});
