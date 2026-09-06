import type { AskClarification } from "../types";
import { tPhrase, type AnswerLanguage } from "./phrases";
import type { AskToolResult } from "./types";

function line(parts: readonly string[]): string {
  return parts.filter(Boolean).join(" ");
}

function sentence(parts: readonly string[]): string {
  const joined = line(parts).replace(/\s+/g, " ").trim();
  return joined ? `${joined}.` : "";
}

function str(value: unknown): string {
  if (typeof value === "string") return value;
  if (value == null) return "";
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }
  return "";
}

export function composeFromTool(
  result: AskToolResult,
  greet = false,
  language: AnswerLanguage = "en",
): string {
  if (!result.ok && result.error) return result.error.message;
  const values = result.values;
  const phrase = (key: string, params: Record<string, string | number> = {}) =>
    tPhrase(key, language, params);

  if (result.name === "get_workspace_summary") {
    const status = values.ready
      ? sentence([
          values.decisionCount
            ? phrase("summary.decisions", {
                count: str(values.decisionCount),
                plural: values.decisionCount === 1 ? "" : "s",
              })
            : phrase("summary.nothing"),
          values.exposure
            ? phrase("summary.exposed", { exposure: str(values.exposure) })
            : "",
        ])
      : str(values.headline);
    return greet ? phrase("summary.greet", { status }) : status;
  }

  if (result.name === "get_today_sales_update") {
    const events =
      (values.todayEvents as { time: string; summary: string }[]) ?? [];
    const stages =
      (values.stages as { label: string; count: number; value: string }[]) ??
      [];
    const follow =
      (values.followUps as { client: string; request: string }[]) ?? [];
    const eventText = events.length
      ? events.map((row) => `${row.time}: ${row.summary}`).join(" ")
      : phrase("sales.noEvents");
    const stageText = stages
      .map((row) =>
        phrase("pipeline.row", {
          label: row.label,
          count: row.count,
          value: row.value,
        }),
      )
      .join("; ");
    const followText = follow
      .map((row) => `${row.client}: ${row.request}`)
      .join("; ");
    return line([
      phrase("sales.today", { asOf: result.asOf }),
      eventText,
      phrase("sales.pipeline", {
        total: str(values.pipelineTotal),
        stages: stageText,
      }),
      phrase("sales.new", { count: str(values.newOpportunities) }),
      phrase("sales.won", { count: str(values.wonOrContract) }),
      phrase("sales.followups", { list: followText || phrase("common.none") }),
    ]);
  }

  if (result.name === "list_projects" || result.name === "get_project_health") {
    const projects =
      (values.projects as {
        name: string;
        client: string;
        status: string;
        health: string;
        due: string;
        value: string;
      }[]) ?? [];
    if (projects.length === 0) return phrase("projects.none");
    const list = projects
      .map((row) =>
        phrase("projects.row", {
          name: row.name,
          client: row.client,
          status: row.status,
          health: row.health,
          due: row.due,
          value: row.value,
        }),
      )
      .join(" ");
    const risks =
      (values.risks as { project: string; statement: string }[]) ?? [];
    const riskText = risks.length
      ? phrase("projects.risks", {
          list: risks
            .map((row) => `${row.project}: ${row.statement}`)
            .join(" "),
        })
      : "";
    return result.name === "get_project_health"
      ? `${phrase("projects.urgent")} ${list}.${riskText}`
      : `${phrase("projects.count", { count: str(values.count) })} ${list}.${riskText}`;
  }

  if (result.name === "analyze_client_payment_behavior") {
    const clients =
      (values.clients as {
        client: string;
        overdueAmount: string;
        overdueDays: number;
        comparisonPeriod: string;
        change: string;
      }[]) ?? [];
    const terms = (values.termChanges as string[]) ?? [];
    if (clients.length === 0 && terms.length === 0) {
      return phrase("payment.none");
    }
    const list = clients
      .map((row) =>
        phrase("payment.row", {
          client: row.client,
          amount: row.overdueAmount,
          days: row.overdueDays,
          change: row.change,
          period: row.comparisonPeriod,
        }),
      )
      .join(" ");
    const termText = terms.length
      ? phrase("payment.also", { terms: terms.join(" ") })
      : "";
    return `${phrase("payment.header", { period: str(values.comparisonPeriod) })} ${list}.${termText}`;
  }

  if (result.name === "list_overdue_invoices") {
    const invoices =
      (values.invoices as {
        client: string;
        reference: string;
        amount: string;
        days: number;
      }[]) ?? [];
    if (invoices.length === 0) return phrase("invoices.none");
    return phrase("invoices.count", {
      count: str(values.count),
      total: str(values.total),
      list: invoices
        .map((row) =>
          phrase("invoices.row", {
            client: row.client,
            reference: row.reference,
            amount: row.amount,
            days: row.days,
          }),
        )
        .join("; "),
    });
  }

  if (result.name === "get_pipeline_summary") {
    const stages =
      (values.stages as { label: string; count: number; value: string }[]) ??
      [];
    return phrase("pipeline.summary", {
      total: str(values.total),
      count: str(values.opportunities),
      stages: stages
        .map((row) =>
          phrase("pipeline.row", {
            label: row.label,
            count: row.count,
            value: row.value,
          }),
        )
        .join("; "),
    });
  }

  if (result.name === "list_pending_approvals") {
    const decisions =
      (values.decisions as {
        title: string;
        client: string;
        urgency: string;
      }[]) ?? [];
    if (decisions.length === 0) return phrase("approvals.none");
    return phrase("approvals.count", {
      count: str(values.count),
      plural: values.count === 1 ? "" : "s",
      list: decisions
        .map((row) =>
          phrase("approvals.row", {
            title: row.title,
            client: row.client,
            urgency: row.urgency,
          }),
        )
        .join(" "),
    });
  }

  if (result.name === "get_team_capacity") {
    const people =
      (values.people as {
        name: string;
        utilization: string;
        note: string;
      }[]) ?? [];
    if (people.length === 0) return phrase("capacity.none");
    if (values.tradeoff === "deadline") {
      return phrase("capacity.deadline", {
        name: str(values.absorbName) || "a teammate with spare hours",
      });
    }
    if (values.tradeoff === "margin") {
      const keep =
        (str(values.overName) || "the current owner").split(" ")[0] ?? "";
      return phrase("capacity.margin", { name: keep });
    }
    return people
      .map((row) =>
        phrase("capacity.row", {
          name: row.name,
          utilization: row.utilization,
          note: row.note,
        }),
      )
      .join(" ");
  }

  if (result.name === "explain_open_exposure") {
    if (!values.exposure) return phrase("exposure.none");
    const decisions =
      (values.decisions as { client: string; title: string }[]) ?? [];
    return phrase("exposure.count", {
      count: str(values.decisionCount),
      plural: values.decisionCount === 1 ? "" : "s",
      exposure: str(values.exposure),
      list: decisions
        .map((row) =>
          phrase("exposure.row", { client: row.client, title: row.title }),
        )
        .join(" "),
    });
  }

  if (result.name === "list_clients") {
    const clients = (values.clients as unknown[]) ?? [];
    return clients.length > 0
      ? phrase("clients.count", { count: str(values.count) })
      : phrase("clients.empty");
  }

  if (
    result.name === "search_clients" ||
    result.name === "search_business_records"
  ) {
    const clients = (values.clients as string[]) ?? [];
    const records = (values.records as string[]) ?? [];
    return phrase("search.matches", {
      list: [...clients, ...records].join("; ") || phrase("common.none"),
    });
  }

  if (
    result.name === "get_client_360" ||
    result.name === "summarize_client_relationship" ||
    result.name === "explain_client_health" ||
    result.name.startsWith("list_client_")
  ) {
    return phrase("client360.summary", {
      name: str(values.name),
      stage: str(values.stage),
      owner: str(values.owner),
      health: str(values.health),
      last: str(values.lastInteraction),
    });
  }
  if (
    result.name === "list_inactive_clients" ||
    result.name === "list_clients_by_segment"
  ) {
    const clients = (values.clients as string[]) ?? [];
    return clients.join("; ") || phrase("clients.none");
  }
  if (result.name === "find_duplicate_clients") {
    return phrase("duplicates.found", {
      pair: str(values.pair),
      score: str(values.score),
      reason: str(values.reason),
    });
  }
  if (
    result.name === "propose_client_update" ||
    result.name === "propose_duplicate_merge"
  ) {
    return str(values.note) || phrase("propose.note");
  }

  if (values.incomplete && typeof values.answer === "string") {
    return values.answer;
  }

  if (
    result.name === "get_business_profile" ||
    result.name === "explain_business_structure"
  ) {
    return phrase("registry.profile", {
      fictional: str(values.fictional),
      legalName: str(values.legalName),
      tradingName: str(values.tradingName),
      organizationId: str(values.organizationId),
      demoKey: str(values.demoKey),
      structure: str(values.structure),
    }).trim();
  }
  if (result.name === "get_business_registration") {
    return phrase("registry.registration", {
      fictional: str(values.fictional),
      legalName: str(values.legalName),
      registrationNumber: str(values.registrationNumber),
      jurisdiction: str(values.jurisdiction),
      office: str(values.office),
    });
  }
  if (result.name === "list_business_locations") {
    const locations =
      (values.locations as {
        name: string;
        city: string;
        timezone: string;
        primary: boolean;
      }[]) ?? [];
    return phrase("registry.locations", {
      fictional: str(values.fictional),
      locations: locations
        .map((row) =>
          phrase("registry.locationRow", {
            name: row.name,
            city: row.city,
            timezone: row.timezone,
            primary: row.primary ? ", primary" : "",
          }),
        )
        .join("; "),
    });
  }
  if (result.name === "get_business_firmographics") {
    return phrase("registry.firmographics", {
      fictional: str(values.fictional),
      industry: str(values.industry),
      employeeTarget: str(values.employeeTarget),
      employeeActual: str(values.employeeActual),
      revenueBand: str(values.revenueBand),
    });
  }
  if (result.name === "list_authorised_signatories") {
    const rows =
      (values.signatories as {
        name: string;
        title: string;
        authority: string;
      }[]) ?? [];
    return phrase("registry.signatories", {
      fictional: str(values.fictional),
      list: rows
        .map((row) =>
          phrase("registry.signatoryRow", {
            name: row.name,
            title: row.title,
            authority: row.authority,
          }),
        )
        .join("; "),
    });
  }
  if (
    result.name === "list_expiring_business_documents" ||
    result.name === "list_compliance_obligations"
  ) {
    const rows =
      (values.documents as {
        title: string;
        reference: string;
        expiry: string;
        urgency: string;
        owner: string;
      }[]) ?? [];
    return phrase("registry.documents", {
      fictional: str(values.fictional),
      list: rows
        .map((row) =>
          phrase("registry.documentRow", {
            title: row.title,
            reference: row.reference,
            expiry: row.expiry,
            urgency: row.urgency.replaceAll("_", " "),
            owner: row.owner,
          }),
        )
        .join("; "),
    });
  }
  if (
    result.name === "propose_business_profile_update" ||
    result.name === "propose_location_change"
  ) {
    return str(values.note) || phrase("propose.noteCompany");
  }

  return phrase("fallback.unknown");
}

export function clarificationAnswer(question: string, body: AskClarification) {
  return body.question;
}
