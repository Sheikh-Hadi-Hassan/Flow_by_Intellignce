import { describe, expect, it } from "vitest";

import { GENERIC_FALLBACK_MARK } from "./planner";
import { answerAskSync, LocalBusinessLanguageModelAdapter } from "./local-adapter";
import { ASK_TOOL_DEFINITIONS } from "./tools";
import type { AskAssistantRequest } from "./types";
import type { AskApplicationContext } from "../types";

const founder: AskApplicationContext = {
  workspaceId: "northstar-creative",
  userId: "ns-res-maya",
  role: "Founder",
  permissions: [
    "opportunity.read",
    "opportunity.manage",
    "proposal.approve",
    "project.manage",
    "finance.read",
  ],
  route: "/northstar-creative/admin",
  visibleRecordIds: [],
  locale: "en-US",
  currency: "USD",
  timezone: "America/Chicago",
  conversationId: "ask-af02",
  missionStateKind: "populated",
};

function ask(
  message: string,
  extra: Partial<AskApplicationContext> = {},
  history: AskAssistantRequest["history"] = [],
  options?: ConstructorParameters<typeof LocalBusinessLanguageModelAdapter>[0],
) {
  return answerAskSync(
    {
      context: { ...founder, ...extra },
      message,
      history,
      tools: ASK_TOOL_DEFINITIONS,
    },
    options,
  );
}

describe("AF-02 local assistant", () => {
  it("redirects greetings with a friendly message instead of the generic fallback", () => {
    const result = ask("hi");
    expect(result.version.answer).toMatch(/workspace records/i);
    expect(result.version.answer).not.toContain(GENERIC_FALLBACK_MARK);
    expect(result.tool).toBeUndefined();
  });

  it("lists clients with worsening payment behaviour from the ledger", () => {
    const result = ask("Show clients with worsening payment behaviour");
    expect(result.tool).toBe("analyze_client_payment_behavior");
    expect(result.version.answer).toContain("Vantage Logistics");
    expect(result.version.answer).toContain("$18,500");
    expect(result.version.answer).toContain("34 days");
    expect(result.version.answer).toContain("last 30 days");
    expect(result.version.answer).not.toContain(GENERIC_FALLBACK_MARK);
    expect(result.version.related.every((row) => row.id.startsWith("inv-"))).toBe(
      true,
    );
  });

  it("returns today's sales update from CRM activity and pipeline totals", () => {
    const result = ask("list today sales update");
    expect(result.tool).toBe("get_today_sales_update");
    expect(result.version.answer).toMatch(/sales update/i);
    expect(result.version.answer).toContain("Pipeline");
    expect(result.version.answer).not.toContain(GENERIC_FALLBACK_MARK);
  });

  it("interprets show all active projects as the full project list", () => {
    const result = ask("show all active projects");
    expect(result.tool).toBe("list_projects");
    expect(result.version.answer).toMatch(/Q4 Product Launch|Wayfindin…/);
    expect(result.version.answer).not.toContain(GENERIC_FALLBACK_MARK);
  });

  it("asks a clarification when list projects is ambiguous across tools", () => {
    const result = ask("list projects");
    expect(result.version.clarification?.choices.length).toBeGreaterThan(0);
    expect(result.version.clarification?.choices.some((c) => c.id === "list_projects")).toBe(true);
  });

  it("lists pending approvals", () => {
    const result = ask("What needs my approval?");
    expect(result.tool).toBe("list_pending_approvals");
    expect(result.version.answer).toContain("Meridian");
    expect(result.version.related.length).toBeGreaterThan(0);
  });

  it("explains populated exposure from the snapshot", () => {
    const result = ask("Why is $356K exposed?");
    expect(result.tool).toBe("explain_open_exposure");
    expect(result.version.answer).toContain("$356,000");
    expect(result.version.answer).toContain("3 open");
  });

  it("routes urgent project questions to project health", () => {
    const result = ask("get project health");
    expect(result.tool).toBe("get_project_health");
    expect(result.version.answer).toMatch(/Meridian|Wayfinding|urgent/i);
  });

  it("denies another workspace", () => {
    const result = ask("explain the open exposure", {
      workspaceId: "acme-other",
    });
    expect(result.version.answer).toMatch(/not available to this session/i);
    expect(result.errorCode).toBe("cross_workspace");
    expect(result.version.related).toEqual([]);
  });

  it("denies finance tools without permission", () => {
    const result = ask("Show clients with worsening payment behaviour", {
      role: "Copywriter",
      permissions: ["opportunity.read"],
    });
    expect(result.errorCode).toBe("permission_denied");
    expect(result.version.answer).toMatch(/cannot read/i);
  });

  it("reports model unavailable without a canned fallback", () => {
    const result = ask("hi", {}, [], { unavailable: true });
    expect(result.errorCode).toBe("model_unavailable");
    expect(result.version.answer).toMatch(/unavailable/i);
    expect(result.version.answer).not.toContain(GENERIC_FALLBACK_MARK);
  });

  it("reports a failed tool without repeating the generic fallback", () => {
    const result = ask("show all active projects", {}, [], {
      failTool: "list_projects",
    });
    expect(result.errorCode).toBe("tool_unavailable");
    expect(result.version.answer).toMatch(/could not retrieve/i);
    expect(result.version.answer).not.toContain(GENERIC_FALLBACK_MARK);
  });

  it("maps team capacity questions to the capacity tool", () => {
    const result = ask("show team capacity");
    expect(result.tool).toBe("get_team_capacity");
    expect(result.version.answer).toMatch(/Taylor Kim|70%/);
    expect(result.version.answer).not.toContain(GENERIC_FALLBACK_MARK);
  });

  it("explains workload from capacity records", () => {
    const result = ask("show the team workload");
    expect(result.tool).toBe("get_team_capacity");
    expect(result.version.answer).toMatch(/Protecting the deadline/);
    expect(result.version.answer).toContain("Taylor Kim");
  });

  it("does not mutate seed records", () => {
    const before = ask("lis all project");
    const after = ask("lis all project");
    expect(before.version.related.map((row) => row.id)).toEqual(
      after.version.related.map((row) => row.id),
    );
  });

  it("finds CRM duplicate candidates when CRM Core is active", () => {
    const result = ask("find duplicate clients", {
      activeBuildingBlocks: ["crm.core"],
    });
    expect(result.tool).toBe("find_duplicate_clients");
    expect(result.version.answer).toMatch(/Brightline/i);
    expect(result.version.evidence.length).toBeGreaterThan(0);
    expect(result.version.answer).not.toContain(GENERIC_FALLBACK_MARK);
  });

  it("does not answer CRM duplicate tools when the block is inactive", () => {
    const result = ask("Which clients look like duplicates?", {
      activeBuildingBlocks: [],
    });
    expect(result.errorCode).toBe("tool_unavailable");
    expect(result.version.answer).toMatch(/CRM Core is not active/i);
  });

  it("cites the Northstar registration record", () => {
    const result = ask("Where is Northstar registered?", {
      activeBuildingBlocks: ["registry.business"],
      role: "Founder",
      permissions: [
        "organization.read",
        "organization.update_profile",
        "opportunity.read",
      ],
    });
    expect(result.tool).toBe("get_business_registration");
    expect(result.version.answer).toContain("Northstar Creative LLC");
    expect(result.version.answer).toContain("DEMO-LLC-2021-08417");
    expect(result.version.answer).toMatch(/fictional demonstration company/i);
    expect(result.version.related.some((row) => row.id.startsWith("00000000-0000-4000-b001"))).toBe(
      true,
    );
    expect(result.version.answer).not.toContain(GENERIC_FALLBACK_MARK);
  });

  it("lists documents due against the demo clock", () => {
    const result = ask("Which business documents need renewal?", {
      activeBuildingBlocks: ["registry.business"],
      role: "Founder",
      permissions: [
        "organization.read",
        "organization.update_profile",
        "opportunity.read",
      ],
    });
    expect(result.tool).toBe("list_expiring_business_documents");
    expect(result.version.answer).toMatch(/DEMO-GL-2088|DEMO-PL-4419/);
    expect(result.version.answer).toMatch(/fictional/i);
  });

  it("names authorised signatories", () => {
    const result = ask("Who can sign contracts for the company?", {
      activeBuildingBlocks: ["registry.business"],
      role: "Founder",
      permissions: [
        "organization.read",
        "organization.update_profile",
        "opportunity.read",
      ],
    });
    expect(result.tool).toBe("list_authorised_signatories");
    expect(result.version.answer).toContain("Maya Chen");
    expect(result.version.answer).toContain("Jordan Ellis");
  });
});
