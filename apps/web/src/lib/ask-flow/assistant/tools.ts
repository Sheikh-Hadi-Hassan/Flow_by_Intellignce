import { formatMoney } from "../../mission-control/format";
import { snapshotForState } from "../../mission-control/ask-snapshot";
import { NORTHSTAR_SLUG } from "../../prototype/defaults";
import { missionViewForState } from "../../mission-control/states";
import type { AskApplicationContext } from "../types";
import type {
  AskToolCall,
  AskToolDefinition,
  AskToolName,
  AskToolResult,
} from "./types";
import { runCrmAskTool } from "./crm-tools";
import { runRegistryAskTool } from "./registry-tools";
import { humanToolLabel } from "./ask-tool-labels";

export const ASK_TOOL_DEFINITIONS: readonly AskToolDefinition[] = [
  {
    name: "get_workspace_summary",
    description: "Workspace status and open exposure",
    permissions: ["opportunity.read"],
  },
  {
    name: "get_today_sales_update",
    description: "Today CRM and pipeline movement",
    permissions: ["opportunity.read"],
  },
  {
    name: "list_projects",
    description: "Project list",
    permissions: ["project.manage", "opportunity.read"],
  },
  {
    name: "get_project_health",
    description: "Project health and urgency",
    permissions: ["project.manage", "opportunity.read"],
  },
  {
    name: "analyze_client_payment_behavior",
    description: "Clients whose payment timing worsened",
    permissions: ["finance.read"],
  },
  {
    name: "list_overdue_invoices",
    description: "Overdue invoices",
    permissions: ["finance.read"],
  },
  {
    name: "get_pipeline_summary",
    description: "Pipeline stages and values",
    permissions: ["opportunity.read"],
  },
  {
    name: "list_pending_approvals",
    description: "Founder approval queue",
    permissions: ["opportunity.manage", "proposal.approve"],
  },
  {
    name: "get_team_capacity",
    description: "Team utilisation",
    permissions: ["project.manage"],
  },
  {
    name: "explain_open_exposure",
    description: "Why money is exposed",
    permissions: ["opportunity.read", "finance.read"],
  },
  {
    name: "list_clients",
    description: "Complete client directory",
    permissions: ["client.read"],
  },
  {
    name: "search_clients",
    description: "Find clients",
    permissions: ["opportunity.read"],
  },
  {
    name: "search_business_records",
    description: "Search workspace records",
    permissions: ["opportunity.read"],
  },
  {
    name: "get_client_360",
    description: "Client 360",
    permissions: ["client.read", "opportunity.read"],
  },
  {
    name: "list_clients_by_segment",
    description: "Clients by segment",
    permissions: ["client.read", "opportunity.read"],
  },
  {
    name: "summarize_client_relationship",
    description: "Relationship summary",
    permissions: ["client.read", "opportunity.read"],
  },
  {
    name: "list_inactive_clients",
    description: "Dormant and former clients",
    permissions: ["client.read", "opportunity.read"],
  },
  {
    name: "find_duplicate_clients",
    description: "Duplicate candidates",
    permissions: ["client.read", "opportunity.read"],
  },
  {
    name: "explain_client_health",
    description: "Relationship health",
    permissions: ["client.read", "opportunity.read"],
  },
  {
    name: "list_client_opportunities",
    description: "Client opportunities",
    permissions: ["opportunity.read"],
  },
  {
    name: "list_client_projects",
    description: "Client projects",
    permissions: ["project.manage"],
  },
  {
    name: "list_client_contracts",
    description: "Client contracts",
    permissions: ["opportunity.read"],
  },
  {
    name: "list_client_invoices",
    description: "Client invoices",
    permissions: ["finance.read"],
  },
  {
    name: "propose_client_update",
    description: "Propose a client update",
    permissions: ["opportunity.manage"],
  },
  {
    name: "propose_duplicate_merge",
    description: "Propose a duplicate merge",
    permissions: ["opportunity.manage"],
  },
  {
    name: "get_business_profile",
    description: "Canonical company profile",
    permissions: ["organization.read", "opportunity.read"],
  },
  {
    name: "get_business_registration",
    description: "Where the company is registered",
    permissions: ["organization.read", "opportunity.read"],
  },
  {
    name: "list_business_locations",
    description: "Offices and operating locations",
    permissions: ["organization.read", "opportunity.read"],
  },
  {
    name: "get_business_firmographics",
    description: "Agency size and market mix",
    permissions: ["organization.read", "opportunity.read"],
  },
  {
    name: "list_authorised_signatories",
    description: "Who can sign contracts",
    permissions: ["organization.read", "opportunity.read"],
  },
  {
    name: "list_expiring_business_documents",
    description: "Documents due for renewal",
    permissions: ["organization.read", "opportunity.read"],
  },
  {
    name: "list_compliance_obligations",
    description: "Compliance owners and obligations",
    permissions: ["organization.read", "opportunity.read"],
  },
  {
    name: "explain_business_structure",
    description: "Ownership and legal structure",
    permissions: ["organization.read", "opportunity.read"],
  },
  {
    name: "propose_business_profile_update",
    description: "Propose a company profile change",
    permissions: ["organization.update_profile", "opportunity.manage"],
  },
  {
    name: "propose_location_change",
    description: "Propose a location change",
    permissions: ["location.manage", "opportunity.manage"],
  },
  {
    name: "commercial.generate_proposal",
    description: "Generate a proposal from an approved intake",
    permissions: ["commercial.generate_proposal"],
  },
  {
    name: "delivery.create_project_from_contract",
    description: "Create a project from an executed contract",
    permissions: ["delivery.create_project_from_contract"],
  },
  {
    name: "delivery.complete_task",
    description: "Complete a delivery task with actuals and quality",
    permissions: ["delivery.complete_task"],
  },
];

const AS_OF = "Today, 08:12";

function allowed(
  permissions: readonly string[],
  needed: readonly string[],
): boolean {
  if (permissions.includes("workspace.mission_control")) return true;
  return needed.some((scope) => permissions.includes(scope));
}

function deny(
  name: AskToolName,
  workspaceId: string,
  code: NonNullable<AskToolResult["error"]>["code"],
  message: string,
): AskToolResult {
  return {
    ok: false,
    name,
    workspaceId,
    recordIds: [],
    asOf: AS_OF,
    values: {},
    evidence: [],
    related: [],
    actions: [],
    error: { code, message },
  };
}

function snapshotOf(context: AskApplicationContext) {
  return snapshotForState(context.missionStateKind ?? "populated");
}

function viewOf(context: AskApplicationContext) {
  return missionViewForState(context.missionStateKind ?? "populated");
}

export function runAskTool(
  call: AskToolCall,
  context: AskApplicationContext,
): AskToolResult {
  const workspaceId = context.workspaceId || NORTHSTAR_SLUG;
  if (workspaceId !== NORTHSTAR_SLUG) {
    return deny(
      call.name,
      context.workspaceId,
      "cross_workspace",
      "That workspace is not available to this session. Ask Flow only reads the workspace you are signed into.",
    );
  }

  const definition = ASK_TOOL_DEFINITIONS.find((row) => row.name === call.name);
  if (!definition) {
    return deny(
      call.name,
      context.workspaceId,
      "unavailable",
      "That tool is not registered.",
    );
  }
  if (!allowed(context.permissions, definition.permissions)) {
    return deny(
      call.name,
      context.workspaceId,
      "permission_denied",
      `Your role (${context.role}) cannot read the ${humanToolLabel(call.name)} records.`,
    );
  }

  const snapshot = snapshotOf(context);
  const view = viewOf(context);
  const href = `/${workspaceId}/admin`;

  const crm = runCrmAskTool(call, context);
  if (crm) return crm;
  const registry = runRegistryAskTool(call, context);
  if (registry) return registry;

  if (call.name === "get_workspace_summary") {
    const ready = view.kind === "ready" ? view.data : null;
    return {
      ok: true,
      name: call.name,
      workspaceId,
      recordIds: snapshot.recordIds,
      asOf: AS_OF,
      values: {
        greet: call.args.greet === "1",
        workspaceName: "Northstar Creative",
        ready: snapshot.ready,
        decisionCount: snapshot.decisionCount,
        exposure: snapshot.exposure ? formatMoney(snapshot.exposure) : null,
        overdueInvoices: snapshot.invoices.filter(
          (row) => row.state === "overdue",
        ).length,
        headline: ready?.headline.answer ?? "Bird Eye View is not ready",
      },
      evidence: ready?.headline.evidence ? [ready.headline.evidence] : [],
      related: [],
      actions: [],
    };
  }

  if (call.name === "get_today_sales_update") {
    if (view.kind !== "ready") {
      return deny(
        call.name,
        workspaceId,
        "empty",
        "Sales records are not available in this state.",
      );
    }
    const today = view.data.activity.filter(
      (row) => !/yesterday|aug/i.test(row.timeLabel),
    );
    const stages = view.data.pipelineStages;
    const pipelineMinor = stages.reduce(
      (sum, row) => sum + BigInt(row.value.minor),
      0n,
    );
    return {
      ok: true,
      name: call.name,
      workspaceId,
      recordIds: [
        ...today.map((row) => row.id),
        ...stages.map((row) => row.id),
      ],
      asOf: AS_OF,
      values: {
        todayEvents: today.map((row) => ({
          id: row.id,
          time: row.timeLabel,
          summary: row.summary,
          category: row.category,
        })),
        stages: stages.map((row) => ({
          id: row.id,
          label: row.label,
          count: row.count,
          value: formatMoney(row.value),
        })),
        pipelineTotal: formatMoney({
          minor: pipelineMinor.toString(),
          currency: "USD",
        }),
        followUps: view.data.clientActions.map((row) => ({
          client: row.clientName,
          request: row.request,
          waiting: row.waitingLabel,
        })),
        newOpportunities: view.data.opportunities.filter((row) =>
          /discovery|brief/i.test(row.stageLabel),
        ).length,
        wonOrContract: view.data.opportunities.filter((row) =>
          /contract|won|executed/i.test(row.stageLabel),
        ).length,
      },
      evidence: today[0]?.evidence ? [today[0].evidence] : [],
      related: today.slice(0, 3).map((row) => ({
        id: row.id,
        label: row.summary,
        href: row.href,
      })),
      actions: [
        {
          id: "open-pipeline",
          label: "Open pipeline",
          href: `${href}/opportunities`,
        },
      ],
    };
  }

  if (call.name === "list_projects" || call.name === "get_project_health") {
    if (view.kind !== "ready") {
      return deny(
        call.name,
        workspaceId,
        "empty",
        "No project records are available in this state.",
      );
    }
    let rows = view.data.projects;
    if (call.args.scope === "active") {
      rows = rows.filter((row) => /active/i.test(row.statusLabel));
    } else if (call.args.scope === "risk") {
      rows = rows.filter((row) =>
        ["critical", "caution"].includes(row.healthTone),
      );
    }
    if (call.name === "get_project_health" || call.args.focus === "urgent") {
      rows = [...rows].sort((a, b) => {
        const rank = { critical: 0, caution: 1, neutral: 2, positive: 3 };
        return (rank[a.healthTone] ?? 9) - (rank[b.healthTone] ?? 9);
      });
    }
    const risks = view.data.risks;
    return {
      ok: true,
      name: call.name,
      workspaceId,
      recordIds: rows.map((row) => row.id),
      asOf: AS_OF,
      values: {
        scope: call.args.scope ?? "all",
        count: rows.length,
        projects: rows.map((row) => ({
          id: row.id,
          name: row.name,
          client: row.clientName,
          status: row.statusLabel,
          health: row.healthTone,
          progress: `${(row.progressBps / 100).toFixed(0)}%`,
          value: formatMoney(row.contractValue),
          due: row.dueLabel,
        })),
        risks: risks.map((row) => ({
          project: row.projectName,
          statement: row.statement,
          severity: row.severity,
        })),
      },
      evidence: risks[0] ? [risks[0].evidence] : [],
      related: rows.map((row) => ({
        id: row.id,
        label: `${row.clientName} · ${row.name}`,
        href: row.href,
      })),
      actions: [
        {
          id: "open-projects",
          label: "Open projects",
          href: `${href}/lifecycle/projects`,
        },
      ],
    };
  }

  if (call.name === "analyze_client_payment_behavior") {
    const overdue = snapshot.invoices.filter((row) => row.state === "overdue");
    const worsening = overdue
      .filter((row) => row.ageDays >= 12)
      .map((row) => ({
        client: row.clientName,
        invoice: row.reference,
        overdueAmount: formatMoney(row.amount),
        overdueDays: row.ageDays,
        comparisonPeriod: "current ageing vs on-time baseline, last 30 days",
        change: `Deteriorated from on-time to ${row.ageDays} days overdue`,
      }));
    const terms =
      view.kind === "ready"
        ? view.data.activity.filter((row) =>
            /net 60|payment terms/i.test(row.summary),
          )
        : [];
    return {
      ok: true,
      name: call.name,
      workspaceId,
      recordIds: [
        ...overdue.map((row) => row.id),
        ...terms.map((row) => row.id),
      ],
      asOf: AS_OF,
      values: {
        comparisonPeriod: "last 30 days vs on-time baseline",
        clients: worsening,
        termChanges: terms.map((row) => row.summary),
      },
      evidence: [
        {
          id: "ev-receivables-ledger",
          kind: "system-record",
          label: "Receivables ledger",
          source: `${overdue.length} overdue invoices`,
          capturedAtLabel: AS_OF,
          claim: "FACT",
          trust: "high",
          href: `${href}/lifecycle/reporting`,
        },
      ],
      related: overdue.map((row) => ({
        id: row.id,
        label: `${row.clientName} · ${row.reference}`,
        href: row.href,
      })),
      actions: [],
    };
  }

  if (call.name === "list_overdue_invoices") {
    const overdue = snapshot.invoices.filter((row) => row.state === "overdue");
    const total = overdue.reduce(
      (sum, row) => sum + BigInt(row.amount.minor),
      0n,
    );
    return {
      ok: true,
      name: call.name,
      workspaceId,
      recordIds: overdue.map((row) => row.id),
      asOf: AS_OF,
      values: {
        count: overdue.length,
        total: overdue.length
          ? formatMoney({ minor: total.toString(), currency: "USD" })
          : null,
        invoices: overdue.map((row) => ({
          id: row.id,
          client: row.clientName,
          reference: row.reference,
          amount: formatMoney(row.amount),
          days: row.ageDays,
        })),
      },
      evidence: overdue.length
        ? [
            {
              id: "ev-receivables-ledger",
              kind: "system-record",
              label: "Receivables ledger",
              source: `${overdue.length} overdue invoices`,
              capturedAtLabel: AS_OF,
              claim: "FACT",
              trust: "high",
              href: `${href}/lifecycle/reporting`,
            },
          ]
        : [],
      related: overdue.map((row) => ({
        id: row.id,
        label: `${row.clientName} · ${row.reference}`,
        href: row.href,
      })),
      actions: [],
    };
  }

  if (call.name === "get_pipeline_summary") {
    if (view.kind !== "ready") {
      return deny(
        call.name,
        workspaceId,
        "empty",
        "Pipeline records are not available in this state.",
      );
    }
    const stages = view.data.pipelineStages;
    const total = stages.reduce(
      (sum, row) => sum + BigInt(row.value.minor),
      0n,
    );
    return {
      ok: true,
      name: call.name,
      workspaceId,
      recordIds: stages.map((row) => row.id),
      asOf: AS_OF,
      values: {
        stages: stages.map((row) => ({
          label: row.label,
          count: row.count,
          value: formatMoney(row.value),
        })),
        total: formatMoney({ minor: total.toString(), currency: "USD" }),
        opportunities: view.data.opportunities.length,
      },
      evidence: view.data.metrics[0]?.evidence
        ? [view.data.metrics[0].evidence]
        : [],
      related: stages.map((row) => ({
        id: row.id,
        label: row.label,
        href: row.href,
      })),
      actions: [],
    };
  }

  if (call.name === "list_pending_approvals") {
    let decisions = [...snapshot.decisions];
    if (call.args.focus === "urgent") {
      decisions = decisions.sort((a, b) => {
        const rank = { critical: 0, high: 1, normal: 2 };
        return (rank[a.urgency] ?? 9) - (rank[b.urgency] ?? 9);
      });
    }
    return {
      ok: true,
      name: call.name,
      workspaceId,
      recordIds: decisions.map((row) => row.id),
      asOf: AS_OF,
      values: {
        count: decisions.length,
        decisions: decisions.map((row) => ({
          id: row.id,
          title: row.title,
          client: row.clientName,
          urgency: row.urgency,
        })),
      },
      evidence: decisions[0]?.evidence[0] ? [decisions[0].evidence[0]] : [],
      related: decisions.map((row) => ({
        id: row.id,
        label: row.title,
        href: row.href,
      })),
      actions: [{ id: "open-queue", label: "Open decisions" }],
    };
  }

  if (call.name === "get_team_capacity") {
    const rows = snapshot.capacity;
    const absorb = rows.find((row) => /absorb strategy/i.test(row.noteLabel));
    const over = rows.find((row) => row.utilizationBps > 10000);
    return {
      ok: true,
      name: call.name,
      workspaceId,
      recordIds: rows.map((row) => row.id),
      asOf: AS_OF,
      values: {
        tradeoff: call.args.tradeoff ?? "",
        absorbName: absorb?.personName ?? "",
        overName: over?.personName ?? "",
        people: rows.map((row) => ({
          name: row.personName,
          role: row.roleLabel,
          utilization: `${(row.utilizationBps / 100).toFixed(0)}%`,
          note: row.noteLabel,
        })),
      },
      evidence: rows.length
        ? [
            {
              id: "ev-capacity-week",
              kind: "calculation",
              label: "Team capacity engine",
              source: `${rows.length} resources · week of 31 Aug`,
              capturedAtLabel: AS_OF,
              claim: "FACT",
              trust: "high",
              href: `${href}/team`,
            },
          ]
        : [],
      related: rows.slice(0, 3).map((row) => ({
        id: row.id,
        label: row.personName,
        href: `${href}/team`,
      })),
      actions: [{ id: "open-team", label: "Open team", href: `${href}/team` }],
    };
  }

  if (call.name === "explain_open_exposure") {
    let decisions = [...snapshot.decisions];
    if (call.args.focus === "urgent") {
      decisions = decisions.slice(0, 1);
    }
    return {
      ok: true,
      name: call.name,
      workspaceId,
      recordIds: decisions.map((row) => row.id),
      asOf: AS_OF,
      values: {
        decisionCount: snapshot.decisionCount,
        exposure: snapshot.exposure ? formatMoney(snapshot.exposure) : null,
        decisions: decisions.map((row) => ({
          id: row.id,
          client: row.clientName,
          title: row.title,
        })),
      },
      evidence: decisions[0]?.evidence[0] ? [decisions[0].evidence[0]] : [],
      related: decisions.map((row) => ({
        id: row.id,
        label: row.clientName,
        href: row.href,
      })),
      actions: [],
    };
  }

  if (
    call.name === "search_clients" ||
    call.name === "search_business_records"
  ) {
    if (view.kind !== "ready") {
      return deny(
        call.name,
        workspaceId,
        "empty",
        "No searchable records in this state.",
      );
    }
    const query = (call.args.query ?? "").toLowerCase();
    const clients = [
      ...new Set([
        ...view.data.opportunities.map((row) => row.clientName),
        ...view.data.projects.map((row) => row.clientName),
        ...view.data.invoices.map((row) => row.clientName),
      ]),
    ].filter((name) => !query || name.toLowerCase().includes(query));
    const records = [
      ...view.data.projects.map((row) => ({
        id: row.id,
        label: row.name,
        href: row.href,
      })),
      ...view.data.invoices.map((row) => ({
        id: row.id,
        label: `${row.clientName} ${row.reference}`,
        href: row.href,
      })),
      ...view.data.clientActions.map((row) => ({
        id: row.id,
        label: `${row.clientName} ${row.request}`,
        href: row.href,
      })),
      ...view.data.activity.map((row) => ({
        id: row.id,
        label: row.summary,
        href: row.href,
      })),
      ...view.data.risks.map((row) => ({
        id: row.id,
        label: `${row.projectName} ${row.statement}`,
        href: row.href,
      })),
    ].filter((row) => !query || row.label.toLowerCase().includes(query));
    return {
      ok: true,
      name: call.name,
      workspaceId,
      recordIds: records.map((row) => row.id),
      asOf: AS_OF,
      values: { clients, records: records.map((row) => row.label) },
      evidence: [],
      related: records.slice(0, 6),
      actions: [],
    };
  }

  return deny(
    call.name,
    workspaceId,
    "unavailable",
    "That tool cannot run in this runtime.",
  );
}
