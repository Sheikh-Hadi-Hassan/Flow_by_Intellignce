import { describe, expect, it } from "vitest";
import type { AskToolName, AskToolResult } from "./types";
import { deriveResponseWidgets } from "./response-shape";

function result(
  name: AskToolName,
  values: Record<string, unknown>,
  extra: Partial<AskToolResult> = {},
): AskToolResult {
  return {
    ok: true,
    name,
    workspaceId: "northstar",
    recordIds: [],
    asOf: "Today, 08:12",
    values,
    evidence: [],
    related: [],
    actions: [],
    ...extra,
  };
}

describe("deriveResponseWidgets", () => {
  it("returns no widgets when the tool failed", () => {
    const failed = result("list_projects", {}, {
      ok: false,
      error: { code: "unavailable", message: "down" },
    });
    expect(deriveResponseWidgets(failed)).toEqual([]);
  });

  it("returns no widgets for degraded registry snapshots", () => {
    const partial = result("get_business_profile", { incomplete: true });
    expect(deriveResponseWidgets(partial)).toEqual([]);
  });

  it("returns no widgets for protected proposals", () => {
    expect(deriveResponseWidgets(result("propose_client_update", { status: "proposed" }))).toEqual([]);
    expect(deriveResponseWidgets(result("propose_duplicate_merge", {}))).toEqual([]);
    expect(deriveResponseWidgets(result("propose_business_profile_update", {}))).toEqual([]);
    expect(deriveResponseWidgets(result("propose_location_change", {}))).toEqual([]);
  });

  it("returns no widgets for unknown tools", () => {
    expect(
      deriveResponseWidgets(result("not_a_tool" as AskToolName, {})),
    ).toEqual([]);
  });

  it("derives workspace summary metrics with decision and invoice tones", () => {
    const widgets = deriveResponseWidgets(
      result("get_workspace_summary", {
        ready: true,
        decisionCount: 3,
        exposure: "$18,500",
        overdueInvoices: 2,
      }),
    );
    expect(widgets).toEqual([
      {
        type: "metrics",
        metrics: [
          { label: "Open decisions", value: "3", tone: "warning" },
          { label: "Exposure", value: "$18,500", tone: "warning" },
          { label: "Overdue invoices", value: "2", tone: "critical" },
        ],
      },
    ]);
  });

  it("marks clean workspace summaries positive and skips unready snapshots", () => {
    const clean = deriveResponseWidgets(
      result("get_workspace_summary", {
        ready: true,
        decisionCount: 0,
        exposure: null,
        overdueInvoices: 0,
      }),
    );
    expect(clean).toEqual([
      {
        type: "metrics",
        metrics: [
          { label: "Open decisions", value: "0", tone: "positive" },
          { label: "Overdue invoices", value: "0", tone: "positive" },
        ],
      },
    ]);
    expect(
      deriveResponseWidgets(result("get_workspace_summary", { ready: false })),
    ).toEqual([]);
  });

  it("derives today sales metrics and clickable activity entities", () => {
    const widgets = deriveResponseWidgets(
      result(
        "get_today_sales_update",
        {
          pipelineTotal: "$240,000",
          newOpportunities: 2,
          wonOrContract: 1,
          todayEvents: [
            { id: "ev-1", summary: "Proposal signed", category: "sales", time: "09:20" },
            { id: "ev-2", summary: "Discovery call", category: "pipeline", time: "11:00" },
          ],
        },
        {
          related: [
            { id: "ev-1", label: "Proposal signed", href: "/northstar/admin" },
            { id: "ev-2", label: "Discovery call", href: "/northstar/admin/opportunities" },
          ],
        },
      ),
    );
    expect(widgets).toEqual([
      {
        type: "metrics",
        metrics: [
          { label: "Pipeline", value: "$240,000" },
          { label: "New opportunities", value: "2" },
          { label: "Won or executed", value: "1" },
        ],
      },
      {
        type: "entities",
        title: "Today",
        entities: [
          {
            id: "ev-1",
            label: "Proposal signed",
            meta: "sales · 09:20",
            href: "/northstar/admin",
          },
          {
            id: "ev-2",
            label: "Discovery call",
            meta: "pipeline · 11:00",
            href: "/northstar/admin/opportunities",
          },
        ],
      },
    ]);
  });

  it("derives project entities with health tones plus risk analysis facts", () => {
    const widgets = deriveResponseWidgets(
      result(
        "list_projects",
        {
          projects: [
            {
              id: "prj-1",
              name: "Brand refresh",
              client: "Meridian Health",
              status: "In progress",
              health: "critical",
              progress: "62%",
              value: "$45,000",
              due: "Mar 14",
            },
          ],
          risks: [{ project: "Brand refresh", statement: "Deadline at risk" }],
        },
        {
          related: [
            { id: "prj-1", label: "Meridian Health · Brand refresh", href: "/northstar/admin/lifecycle/projects" },
          ],
        },
      ),
    );
    expect(widgets).toEqual([
      {
        type: "entities",
        entities: [
          {
            id: "prj-1",
            label: "Brand refresh",
            meta: "Meridian Health · In progress · 62% · $45,000 · due Mar 14",
            tone: "critical",
            href: "/northstar/admin/lifecycle/projects",
          },
        ],
      },
      {
        type: "analysis",
        items: [{ statement: "Brand refresh: Deadline at risk", claim: "FACT" }],
      },
    ]);
  });

  it("derives payment behavior comparison with baseline and analysis", () => {
    const widgets = deriveResponseWidgets(
      result("analyze_client_payment_behavior", {
        comparisonPeriod: "last 30 days vs on-time baseline",
        clients: [
          {
            client: "Kestrel Studio",
            overdueAmount: "$4,200",
            overdueDays: 14,
            change: "Deteriorated from on-time to 14 days overdue",
          },
        ],
        termChanges: ["Payment terms moved to net 60"],
      }),
    );
    expect(widgets).toEqual([
      {
        type: "comparison",
        title: "last 30 days vs on-time baseline",
        rows: [
          {
            label: "Kestrel Studio",
            current: "$4,200 · 14 days overdue",
            baseline: "on-time baseline",
          },
        ],
      },
      {
        type: "analysis",
        items: [
          { statement: "Deteriorated from on-time to 14 days overdue", claim: "FACT" },
          { statement: "Payment terms moved to net 60", claim: "FACT" },
        ],
      },
    ]);
  });

  it("derives overdue invoice metrics and day-scaled entity tones", () => {
    const widgets = deriveResponseWidgets(
      result(
        "list_overdue_invoices",
        {
          count: 2,
          total: "$9,400",
          invoices: [
            { id: "inv-1", client: "Kestrel Studio", reference: "INV-1024", amount: "$4,200", days: 14 },
            { id: "inv-2", client: "Harbor Line", reference: "INV-1031", amount: "$5,200", days: 36 },
          ],
        },
        {
          related: [
            { id: "inv-1", label: "Kestrel Studio · INV-1024", href: "/northstar/admin/lifecycle/reporting" },
            { id: "inv-2", label: "Harbor Line · INV-1031", href: "/northstar/admin/lifecycle/reporting" },
          ],
        },
      ),
    );
    expect(widgets).toEqual([
      {
        type: "metrics",
        metrics: [
          { label: "Overdue invoices", value: "2", tone: "critical" },
          { label: "Total overdue", value: "$9,400", tone: "critical" },
        ],
      },
      {
        type: "entities",
        entities: [
          {
            id: "inv-1",
            label: "Kestrel Studio INV-1024",
            meta: "$4,200 · 14 days",
            tone: "warning",
            href: "/northstar/admin/lifecycle/reporting",
          },
          {
            id: "inv-2",
            label: "Harbor Line INV-1031",
            meta: "$5,200 · 36 days",
            tone: "critical",
            href: "/northstar/admin/lifecycle/reporting",
          },
        ],
      },
    ]);
  });

  it("derives pipeline metrics and stage comparison", () => {
    const widgets = deriveResponseWidgets(
      result("get_pipeline_summary", {
        total: "$240,000",
        opportunities: 9,
        stages: [
          { label: "Discovery", count: 3, value: "$60,000" },
          { label: "Proposal", count: 2, value: "$90,000" },
        ],
      }),
    );
    expect(widgets).toEqual([
      {
        type: "metrics",
        metrics: [
          { label: "Pipeline", value: "$240,000" },
          { label: "Opportunities", value: "9" },
        ],
      },
      {
        type: "comparison",
        rows: [
          { label: "Discovery", current: "3 · $60,000" },
          { label: "Proposal", current: "2 · $90,000" },
        ],
      },
    ]);
  });

  it("derives pending approval count and urgency-toned entities", () => {
    const widgets = deriveResponseWidgets(
      result(
        "list_pending_approvals",
        {
          count: 1,
          decisions: [
            { id: "dec-1", title: "Approve change order", client: "Meridian Health", urgency: "high" },
          ],
        },
        {
          related: [
            { id: "dec-1", label: "Approve change order", href: "/northstar/admin" },
          ],
        },
      ),
    );
    expect(widgets).toEqual([
      {
        type: "metrics",
        metrics: [{ label: "Pending approvals", value: "1", tone: "warning" }],
      },
      {
        type: "entities",
        entities: [
          {
            id: "dec-1",
            label: "Approve change order",
            meta: "Meridian Health · high",
            tone: "warning",
            href: "/northstar/admin",
          },
        ],
      },
    ]);
  });

  it("derives team capacity entities with utilization tones and label-joined hrefs", () => {
    const widgets = deriveResponseWidgets(
      result(
        "get_team_capacity",
        {
          people: [
            { name: "Amara Osei", role: "Design lead", utilization: "104%", note: "Over capacity" },
            { name: "Ravi Menon", role: "Engineer", utilization: "70%", note: "Has room" },
          ],
        },
        {
          related: [
            { id: "p-amara", label: "Amara Osei", href: "/northstar/admin/team" },
            { id: "p-ravi", label: "Ravi Menon", href: "/northstar/admin/team" },
          ],
        },
      ),
    );
    expect(widgets).toEqual([
      {
        type: "entities",
        entities: [
          {
            id: "Amara Osei",
            label: "Amara Osei",
            meta: "Design lead · 104% · Over capacity",
            tone: "critical",
            href: "/northstar/admin/team",
          },
          {
            id: "Ravi Menon",
            label: "Ravi Menon",
            meta: "Engineer · 70% · Has room",
            tone: "neutral",
            href: "/northstar/admin/team",
          },
        ],
      },
    ]);
  });

  it("labels deadline capacity guidance as recommendation with inference support", () => {
    const widgets = deriveResponseWidgets(
      result("get_team_capacity", {
        tradeoff: "deadline",
        absorbName: "Ravi Menon",
        overName: "Amara Osei",
        people: [
          { name: "Amara Osei", role: "Design lead", utilization: "104%" },
          { name: "Ravi Menon", role: "Engineer", utilization: "70%" },
        ],
      }),
    );
    expect(widgets).toEqual([
      {
        type: "entities",
        entities: [
          { id: "Amara Osei", label: "Amara Osei", meta: "Design lead · 104%", tone: "critical" },
          { id: "Ravi Menon", label: "Ravi Menon", meta: "Engineer · 70%", tone: "neutral" },
        ],
      },
      {
        type: "analysis",
        items: [
          {
            statement: "Ravi Menon can absorb the work while protecting the deadline",
            claim: "RECOMMENDATION",
          },
          {
            statement: "Margin on that path holds near the current level until pricing reopens",
            claim: "INFERENCE",
          },
        ],
      },
    ]);
  });

  it("labels margin capacity guidance as recommendation with inference support", () => {
    const widgets = deriveResponseWidgets(
      result("get_team_capacity", {
        tradeoff: "margin",
        absorbName: "Ravi Menon",
        overName: "Amara Osei",
        people: [{ name: "Amara Osei", role: "Design lead", utilization: "104%" }],
      }),
    );
    expect(widgets).toEqual([
      {
        type: "entities",
        entities: [
          { id: "Amara Osei", label: "Amara Osei", meta: "Design lead · 104%", tone: "critical" },
        ],
      },
      {
        type: "analysis",
        items: [
          {
            statement: "Keeping Amara Osei on the current assignment protects margin",
            claim: "RECOMMENDATION",
          },
          {
            statement: "Slipping the checkpoint avoids overtime against the rate floor",
            claim: "INFERENCE",
          },
        ],
      },
    ]);
  });

  it("skips capacity analysis when tradeoff names are missing", () => {
    const widgets = deriveResponseWidgets(
      result("get_team_capacity", {
        tradeoff: "deadline",
        people: [{ name: "Amara Osei", role: "Design lead", utilization: "104%" }],
      }),
    );
    expect(widgets).toEqual([
      {
        type: "entities",
        entities: [
          { id: "Amara Osei", label: "Amara Osei", meta: "Design lead · 104%", tone: "critical" },
        ],
      },
    ]);
  });

  it("derives exposure metrics and decision entities", () => {
    const widgets = deriveResponseWidgets(
      result(
        "explain_open_exposure",
        {
          decisionCount: 2,
          exposure: "$18,500",
          decisions: [
            { id: "dec-1", client: "Kestrel Studio", title: "Unsigned change order" },
          ],
        },
        {
          related: [
            { id: "dec-1", label: "Unsigned change order", href: "/northstar/admin" },
          ],
        },
      ),
    );
    expect(widgets).toEqual([
      {
        type: "metrics",
        metrics: [
          { label: "Exposure", value: "$18,500", tone: "warning" },
          { label: "Open decisions", value: "2" },
        ],
      },
      {
        type: "entities",
        entities: [
          {
            id: "dec-1",
            label: "Unsigned change order",
            meta: "Kestrel Studio",
            href: "/northstar/admin",
          },
        ],
      },
    ]);
  });

  it("derives search entities straight from related records", () => {
    const widgets = deriveResponseWidgets(
      result(
        "search_clients",
        { clients: ["Meridian Health", "Kestrel Studio"] },
        {
          related: [
            { id: "cli-1", label: "Meridian Health", href: "/northstar/admin/clients/cli-1" },
            { id: "cli-2", label: "Kestrel Studio", href: "/northstar/admin/clients/cli-2" },
          ],
        },
      ),
    );
    expect(widgets).toEqual([
      { type: "metrics", metrics: [{ label: "Client matches", value: "2" }] },
      {
        type: "entities",
        title: "Matches",
        entities: [
          { id: "cli-1", label: "Meridian Health", href: "/northstar/admin/clients/cli-1" },
          { id: "cli-2", label: "Kestrel Studio", href: "/northstar/admin/clients/cli-2" },
        ],
      },
    ]);
  });

  it("derives a single client entity with relationship meta", () => {
    const widgets = deriveResponseWidgets(
      result(
        "get_client_360",
        {
          name: "Meridian Health",
          stage: "active",
          owner: "Dana Whitfield",
          health: "72",
          lastInteraction: "Yesterday",
        },
        {
          related: [
            { id: "cli-meridian", label: "Meridian Health", href: "/northstar/admin/clients/cli-meridian" },
          ],
        },
      ),
    );
    expect(widgets).toEqual([
      {
        type: "entities",
        entities: [
          {
            id: "cli-meridian",
            label: "Meridian Health",
            meta: "active · owner Dana Whitfield · health 72 · last interaction Yesterday",
            href: "/northstar/admin/clients/cli-meridian",
          },
        ],
      },
    ]);
    expect(deriveResponseWidgets(result("get_client_360", {}))).toEqual([]);
  });

  it("parses segment clients rendered as Name (stage) strings", () => {
    const widgets = deriveResponseWidgets(
      result(
        "list_clients_by_segment",
        { clients: ["Meridian Health (active)", "Kestrel Studio (dormant)"] },
        {
          related: [
            { id: "cli-1", label: "Meridian Health", href: "/northstar/admin/clients/cli-1" },
          ],
        },
      ),
    );
    expect(widgets).toEqual([
      {
        type: "entities",
        entities: [
          {
            id: "Meridian Health",
            label: "Meridian Health",
            meta: "active",
            href: "/northstar/admin/clients/cli-1",
          },
          { id: "Kestrel Studio", label: "Kestrel Studio", meta: "dormant" },
        ],
      },
    ]);
  });

  it("derives duplicate match score, pair entities, and reason fact", () => {
    const widgets = deriveResponseWidgets(
      result(
        "find_duplicate_clients",
        { pair: "Kestrel Studio / Kestrel Studios", score: 0.92, reason: "Shared invoice email" },
        {
          related: [
            { id: "cli-1", label: "Kestrel Studio", href: "/northstar/admin/clients/cli-1" },
            { id: "cli-2", label: "Kestrel Studios", href: "/northstar/admin/clients/cli-2" },
          ],
        },
      ),
    );
    expect(widgets).toEqual([
      { type: "metrics", metrics: [{ label: "Match score", value: "0.92" }] },
      {
        type: "entities",
        entities: [
          { id: "cli-1", label: "Kestrel Studio", href: "/northstar/admin/clients/cli-1" },
          { id: "cli-2", label: "Kestrel Studios", href: "/northstar/admin/clients/cli-2" },
        ],
      },
      { type: "analysis", items: [{ statement: "Shared invoice email", claim: "FACT" }] },
    ]);
  });

  it("derives registry location, signatory, and document entities", () => {
    const locations = deriveResponseWidgets(
      result("list_business_locations", {
        locations: [
          { name: "Head office", city: "Karachi", timezone: "PKT", primary: true },
          { name: "Studio", city: "Lahore", timezone: "PKT" },
        ],
      }),
    );
    expect(locations).toEqual([
      {
        type: "entities",
        entities: [
          { id: "Head office-0", label: "Head office", meta: "Karachi · PKT · primary" },
          { id: "Studio-1", label: "Studio", meta: "Lahore · PKT" },
        ],
      },
    ]);

    const signatories = deriveResponseWidgets(
      result("list_authorised_signatories", {
        signatories: [{ name: "Sara Khan", title: "Founder", authority: "full" }],
      }),
    );
    expect(signatories).toEqual([
      {
        type: "entities",
        entities: [{ id: "Sara Khan-0", label: "Sara Khan", meta: "Founder · full" }],
      },
    ]);

    const documents = deriveResponseWidgets(
      result("list_expiring_business_documents", {
        documents: [
          { title: "Trade licence", reference: "TL-441", expiry: "Dec 2026", urgency: "action_soon", owner: "Sara Khan" },
        ],
      }),
    );
    expect(documents).toEqual([
      {
        type: "entities",
        entities: [
          {
            id: "Trade licence-0",
            label: "Trade licence",
            meta: "TL-441 · Dec 2026 · action soon · owner Sara Khan",
            tone: "warning",
          },
        ],
      },
    ]);
  });

  it("derives firmographics comparison and revenue band metric", () => {
    const widgets = deriveResponseWidgets(
      result("get_business_firmographics", {
        employeeTarget: "12",
        employeeActual: "9",
        revenueBand: "$1M to $5M",
      }),
    );
    expect(widgets).toEqual([
      {
        type: "comparison",
        rows: [
          { label: "Employees", current: "actual 9", baseline: "declared 12" },
        ],
      },
      { type: "metrics", metrics: [{ label: "Revenue band", value: "$1M to $5M" }] },
    ]);
  });
});
