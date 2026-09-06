import type { AskToolResult } from "./types";

export type ResponseTone = "neutral" | "positive" | "warning" | "critical";

export interface ResponseMetric {
  readonly label: string;
  readonly value: string;
  readonly tone?: ResponseTone | undefined;
}

export interface ResponseEntity {
  readonly id: string;
  readonly label: string;
  readonly meta?: string | undefined;
  readonly tone?: ResponseTone | undefined;
  readonly href?: string | undefined;
}

export interface ResponseComparisonRow {
  readonly label: string;
  readonly current: string;
  readonly baseline?: string | undefined;
}

export interface ResponseAnalysisItem {
  readonly statement: string;
  readonly claim: "FACT" | "INFERENCE" | "RECOMMENDATION";
}

export type ResponseWidget =
  | { readonly type: "metrics"; readonly metrics: readonly ResponseMetric[] }
  | {
      readonly type: "entities";
      readonly title?: string | undefined;
      readonly entities: readonly ResponseEntity[];
    }
  | {
      readonly type: "comparison";
      readonly title?: string | undefined;
      readonly rows: readonly ResponseComparisonRow[];
    }
  | {
      readonly type: "analysis";
      readonly items: readonly ResponseAnalysisItem[];
    };

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function count(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function scalar(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function list<T>(value: unknown): readonly T[] {
  return Array.isArray(value) ? (value as readonly T[]) : [];
}

function meta(...parts: readonly unknown[]): string | undefined {
  const joined = parts
    .filter(
      (part): part is string =>
        typeof part === "string" && part.trim().length > 0,
    )
    .join(" · ");
  return joined.length > 0 ? joined : undefined;
}

function toneFromHealth(value: unknown): ResponseTone {
  const key = typeof value === "string" ? value.toLowerCase() : "";
  if (key === "critical") return "critical";
  if (key === "caution" || key === "warning") return "warning";
  if (key === "positive") return "positive";
  return "neutral";
}

function toneFromUrgency(value: unknown): ResponseTone {
  const key = typeof value === "string" ? value.toLowerCase() : "";
  if (key.includes("critical")) return "critical";
  if (key.includes("high") || key.includes("urgent") || key.includes("soon")) {
    return "warning";
  }
  return "neutral";
}

function toneFromUtilization(value: unknown): ResponseTone {
  const pct =
    typeof value === "string" ? Number.parseInt(value, 10) : Number.NaN;
  if (!Number.isFinite(pct)) return "neutral";
  if (pct > 100) return "critical";
  if (pct >= 85) return "warning";
  return "neutral";
}

function toneFromDays(days: unknown): ResponseTone {
  const value =
    typeof days === "number" && Number.isFinite(days) ? days : Number.NaN;
  if (!Number.isFinite(value)) return "neutral";
  if (value >= 30) return "critical";
  if (value > 0) return "warning";
  return "neutral";
}

/**
 * Derives a structured widget tree from a deterministic tool result.
 * Pure data only: never reads the DOM, never calls the model. Unknown or
 * degraded shapes return an empty tree so the prose answer stands alone.
 */
export function deriveResponseWidgets(
  result: AskToolResult,
): readonly ResponseWidget[] {
  if (!result.ok || result.error) return [];
  const values = result.values;
  if (values.incomplete === true) return [];

  const hrefOf = (id: string): string | undefined =>
    result.related.find((row) => row.id === id)?.href;
  const hrefOfLabel = (label: string): string | undefined =>
    result.related.find((row) => row.label === label)?.href;

  const name = result.name;

  if (name === "get_workspace_summary") {
    if (values.ready !== true) return [];
    const metrics: ResponseMetric[] = [];
    const decisions = count(values.decisionCount);
    if (decisions !== null) {
      metrics.push({
        label: "Open decisions",
        value: String(decisions),
        tone: decisions > 0 ? "warning" : "positive",
      });
    }
    const exposure = text(values.exposure);
    if (exposure)
      metrics.push({ label: "Exposure", value: exposure, tone: "warning" });
    const overdue = count(values.overdueInvoices);
    if (overdue !== null) {
      metrics.push({
        label: "Overdue invoices",
        value: String(overdue),
        tone: overdue > 0 ? "critical" : "positive",
      });
    }
    return metrics.length > 0 ? [{ type: "metrics", metrics }] : [];
  }

  if (name === "get_today_sales_update") {
    const metrics: ResponseMetric[] = [];
    const pipelineTotal = text(values.pipelineTotal);
    if (pipelineTotal)
      metrics.push({ label: "Pipeline", value: pipelineTotal });
    const newOpportunities = count(values.newOpportunities);
    if (newOpportunities !== null) {
      metrics.push({
        label: "New opportunities",
        value: String(newOpportunities),
      });
    }
    const wonOrContract = count(values.wonOrContract);
    if (wonOrContract !== null) {
      metrics.push({ label: "Won or executed", value: String(wonOrContract) });
    }
    const events = list<{
      id?: string;
      time?: string;
      summary?: string;
      category?: string;
    }>(values.todayEvents);
    const entities = events
      .filter((row) => text(row.summary))
      .map((row) => ({
        id: String(row.id ?? row.summary),
        label: String(row.summary),
        meta: meta(row.category, row.time),
        href: row.id ? hrefOf(String(row.id)) : undefined,
      }));
    const widgets: ResponseWidget[] = [];
    if (metrics.length > 0) widgets.push({ type: "metrics", metrics });
    if (entities.length > 0)
      widgets.push({ type: "entities", title: "Today", entities });
    return widgets;
  }

  if (name === "list_projects" || name === "get_project_health") {
    const projects = list<{
      id?: string;
      name?: string;
      client?: string;
      status?: string;
      health?: string;
      progress?: string;
      value?: string;
      due?: string;
    }>(values.projects);
    const entities = projects
      .filter((row) => text(row.name))
      .map((row) => ({
        id: String(row.id ?? row.name),
        label: String(row.name),
        meta: meta(
          row.client,
          row.status,
          row.progress,
          row.value,
          row.due ? `due ${String(row.due)}` : "",
        ),
        tone: toneFromHealth(row.health),
        href: row.id ? hrefOf(String(row.id)) : undefined,
      }));
    const risks = list<{ project?: string; statement?: string }>(values.risks)
      .map((row) => ({
        statement: [text(row.project), text(row.statement)]
          .filter(Boolean)
          .join(": "),
        claim: "FACT" as const,
      }))
      .filter((row) => row.statement.length > 0);
    const widgets: ResponseWidget[] = [];
    if (entities.length > 0) widgets.push({ type: "entities", entities });
    if (risks.length > 0) widgets.push({ type: "analysis", items: risks });
    return widgets;
  }

  if (name === "analyze_client_payment_behavior") {
    const clients = list<{
      client?: string;
      overdueAmount?: string;
      overdueDays?: number;
      change?: string;
    }>(values.clients);
    const comparisonTitle = text(values.comparisonPeriod);
    const comparison = {
      type: "comparison" as const,
      ...(comparisonTitle ? { title: comparisonTitle } : {}),
      rows: clients
        .filter((row) => text(row.client))
        .map((row) => ({
          label: String(row.client),
          current:
            meta(
              row.overdueAmount,
              count(row.overdueDays) !== null
                ? `${String(row.overdueDays)} days overdue`
                : "",
            ) ?? "",
          baseline: "on-time baseline",
        }))
        .filter((row) => row.current.length > 0),
    };
    const changes = clients
      .map((row) => ({
        statement: text(row.change) ?? "",
        claim: "FACT" as const,
      }))
      .filter((row) => row.statement.length > 0);
    const termChanges = list<unknown>(values.termChanges)
      .map((change) => ({
        statement: text(change) ?? "",
        claim: "FACT" as const,
      }))
      .filter((row) => row.statement.length > 0);
    const analysis = [...changes, ...termChanges];
    const widgets: ResponseWidget[] = [];
    if (comparison.rows.length > 0) widgets.push(comparison);
    if (analysis.length > 0)
      widgets.push({ type: "analysis", items: analysis });
    return widgets;
  }

  if (name === "list_overdue_invoices") {
    const invoices = list<{
      id?: string;
      client?: string;
      reference?: string;
      amount?: string;
      days?: number;
    }>(values.invoices);
    const total = count(values.count) ?? invoices.length;
    const metrics: ResponseMetric[] = [
      {
        label: "Overdue invoices",
        value: String(total),
        tone: total > 0 ? "critical" : "positive",
      },
    ];
    const amountTotal = text(values.total);
    if (amountTotal) {
      metrics.push({
        label: "Total overdue",
        value: amountTotal,
        tone: "critical",
      });
    }
    const entities = invoices
      .filter((row) => text(row.client) || text(row.reference))
      .map((row) => ({
        id: String(row.id ?? row.reference),
        label: [text(row.client), text(row.reference)]
          .filter(Boolean)
          .join(" "),
        meta: meta(
          row.amount,
          count(row.days) !== null ? `${String(row.days)} days` : "",
        ),
        tone: toneFromDays(row.days),
        href: row.id ? hrefOf(String(row.id)) : undefined,
      }));
    const widgets: ResponseWidget[] = [{ type: "metrics", metrics }];
    if (entities.length > 0) widgets.push({ type: "entities", entities });
    return widgets;
  }

  if (name === "get_pipeline_summary") {
    const metrics: ResponseMetric[] = [];
    const total = text(values.total);
    if (total) metrics.push({ label: "Pipeline", value: total });
    const opportunities = count(values.opportunities);
    if (opportunities !== null) {
      metrics.push({ label: "Opportunities", value: String(opportunities) });
    }
    const stages = list<{ label?: string; count?: number; value?: string }>(
      values.stages,
    );
    const rows = stages
      .filter((row) => text(row.label))
      .map((row) => ({
        label: String(row.label),
        current:
          meta(count(row.count) !== null ? String(row.count) : "", row.value) ??
          "",
      }))
      .filter((row) => row.current.length > 0);
    const widgets: ResponseWidget[] = [];
    if (metrics.length > 0) widgets.push({ type: "metrics", metrics });
    if (rows.length > 0) widgets.push({ type: "comparison", rows });
    return widgets;
  }

  if (name === "list_pending_approvals") {
    const decisions = list<{
      id?: string;
      title?: string;
      client?: string;
      urgency?: string;
    }>(values.decisions);
    const total = count(values.count) ?? decisions.length;
    const entities = decisions
      .filter((row) => text(row.title))
      .map((row) => ({
        id: String(row.id ?? row.title),
        label: String(row.title),
        meta: meta(row.client, row.urgency),
        tone: toneFromUrgency(row.urgency),
        href: row.id ? hrefOf(String(row.id)) : undefined,
      }));
    const widgets: ResponseWidget[] = [
      {
        type: "metrics",
        metrics: [
          {
            label: "Pending approvals",
            value: String(total),
            tone: total > 0 ? "warning" : "positive",
          },
        ],
      },
    ];
    if (entities.length > 0) widgets.push({ type: "entities", entities });
    return widgets;
  }

  if (name === "get_team_capacity") {
    const people = list<{
      name?: string;
      role?: string;
      utilization?: string;
      note?: string;
    }>(values.people);
    const entities = people
      .filter((row) => text(row.name))
      .map((row) => ({
        id: String(row.name),
        label: String(row.name),
        meta: meta(row.role, row.utilization, row.note),
        tone: toneFromUtilization(row.utilization),
        href: hrefOfLabel(String(row.name)),
      }));
    const widgets: ResponseWidget[] = [];
    if (entities.length > 0) widgets.push({ type: "entities", entities });
    const tradeoff = text(values.tradeoff);
    const absorbName = text(values.absorbName);
    const overName = text(values.overName);
    if (tradeoff === "deadline" && absorbName) {
      widgets.push({
        type: "analysis",
        items: [
          {
            statement: `${absorbName} can absorb the work while protecting the deadline`,
            claim: "RECOMMENDATION",
          },
          {
            statement:
              "Margin on that path holds near the current level until pricing reopens",
            claim: "INFERENCE",
          },
        ],
      });
    } else if (tradeoff === "margin" && overName) {
      widgets.push({
        type: "analysis",
        items: [
          {
            statement: `Keeping ${overName} on the current assignment protects margin`,
            claim: "RECOMMENDATION",
          },
          {
            statement:
              "Slipping the checkpoint avoids overtime against the rate floor",
            claim: "INFERENCE",
          },
        ],
      });
    }
    return widgets;
  }

  if (name === "explain_open_exposure") {
    const metrics: ResponseMetric[] = [];
    const exposure = text(values.exposure);
    if (exposure)
      metrics.push({ label: "Exposure", value: exposure, tone: "warning" });
    const decisionCount = count(values.decisionCount);
    if (decisionCount !== null) {
      metrics.push({ label: "Open decisions", value: String(decisionCount) });
    }
    const decisions = list<{ id?: string; client?: string; title?: string }>(
      values.decisions,
    );
    const entities = decisions
      .filter((row) => text(row.title))
      .map((row) => ({
        id: String(row.id ?? row.title),
        label: String(row.title),
        meta: text(row.client) ?? undefined,
        href: row.id ? hrefOf(String(row.id)) : undefined,
      }));
    const widgets: ResponseWidget[] = [];
    if (metrics.length > 0) widgets.push({ type: "metrics", metrics });
    if (entities.length > 0) widgets.push({ type: "entities", entities });
    return widgets;
  }

  if (name === "list_clients") {
    const clients = list<{
      id?: string;
      name?: string;
      industry?: string;
      lifecycleStage?: string;
      ownerName?: string;
      href?: string;
    }>(values.clients);
    const entities = clients
      .filter((row) => text(row.id) && text(row.name))
      .map((row) => ({
        id: String(row.id),
        label: String(row.name),
        meta: meta(row.industry, row.lifecycleStage, row.ownerName),
        href: row.href,
      }));
    return [
      {
        type: "metrics",
        metrics: [
          { label: "Clients", value: String(count(values.count) ?? 0) },
        ],
      },
      ...(entities.length > 0
        ? [{ type: "entities" as const, title: "Client list", entities }]
        : []),
    ];
  }

  if (name === "search_clients" || name === "search_business_records") {
    const entities = result.related.map((row) => ({
      id: row.id,
      label: row.label,
      href: row.href,
    }));
    const clients = list<unknown>(values.clients);
    const widgets: ResponseWidget[] = [];
    if (clients.length > 0) {
      widgets.push({
        type: "metrics",
        metrics: [{ label: "Client matches", value: String(clients.length) }],
      });
    }
    if (entities.length > 0)
      widgets.push({ type: "entities", title: "Matches", entities });
    return widgets;
  }

  if (
    name === "get_client_360" ||
    name === "summarize_client_relationship" ||
    name === "explain_client_health" ||
    name.startsWith("list_client_")
  ) {
    const clientName = text(values.name);
    if (!clientName) return [];
    const record = result.related[0];
    const entity = {
      id: record?.id ?? clientName,
      label: clientName,
      meta: meta(
        values.stage,
        text(values.owner) ? `owner ${text(values.owner)}` : "",
        scalar(values.health) ? `health ${scalar(values.health)}` : "",
        text(values.lastInteraction)
          ? `last interaction ${text(values.lastInteraction)}`
          : "",
      ),
      href: record?.href,
    };
    return [{ type: "entities", entities: [entity] }];
  }

  if (name === "list_clients_by_segment" || name === "list_inactive_clients") {
    const clients = list<unknown>(values.clients);
    const entities = clients
      .map((entry) => {
        const label = scalar(entry) ?? "";
        const parsed = /^(.*?)\s*\((.+)\)$/.exec(label);
        const clientName = parsed?.[1]?.trim() || label;
        const segment = parsed?.[2]?.trim();
        return {
          id: clientName,
          label: clientName,
          ...(segment ? { meta: segment } : {}),
          href: hrefOfLabel(clientName),
        };
      })
      .filter((entity) => entity.label.length > 0);
    return entities.length > 0 ? [{ type: "entities", entities }] : [];
  }

  if (name === "find_duplicate_clients") {
    const widgets: ResponseWidget[] = [];
    const score = scalar(values.score);
    if (score)
      widgets.push({
        type: "metrics",
        metrics: [{ label: "Match score", value: score }],
      });
    const entities = result.related.map((row) => ({
      id: row.id,
      label: row.label,
      href: row.href,
    }));
    if (entities.length > 0) widgets.push({ type: "entities", entities });
    const reason = text(values.reason);
    if (reason)
      widgets.push({
        type: "analysis",
        items: [{ statement: reason, claim: "FACT" }],
      });
    return widgets;
  }

  if (
    name === "propose_client_update" ||
    name === "propose_duplicate_merge" ||
    name === "propose_business_profile_update" ||
    name === "propose_location_change"
  ) {
    return [];
  }

  if (name === "list_business_locations") {
    const locations = list<{
      name?: string;
      city?: string;
      timezone?: string;
      primary?: boolean;
    }>(values.locations);
    const entities = locations
      .map((row, index) => ({
        id: `${String(row.name ?? "location")}-${index}`,
        label: String(row.name ?? "Location"),
        meta: meta(
          row.city,
          row.timezone,
          row.primary === true ? "primary" : "",
        ),
      }))
      .filter((entity) => entity.label.length > 0);
    return entities.length > 0 ? [{ type: "entities", entities }] : [];
  }

  if (name === "list_authorised_signatories") {
    const signatories = list<{
      name?: string;
      title?: string;
      authority?: string;
    }>(values.signatories);
    const entities = signatories
      .filter((row) => text(row.name))
      .map((row, index) => ({
        id: `${String(row.name)}-${index}`,
        label: String(row.name),
        meta: meta(row.title, row.authority),
      }));
    return entities.length > 0 ? [{ type: "entities", entities }] : [];
  }

  if (
    name === "list_expiring_business_documents" ||
    name === "list_compliance_obligations"
  ) {
    const documents = list<{
      title?: string;
      reference?: string;
      expiry?: string;
      urgency?: string;
      owner?: string;
    }>(values.documents);
    const entities = documents
      .filter((row) => text(row.title))
      .map((row, index) => ({
        id: `${String(row.title)}-${index}`,
        label: String(row.title),
        meta: meta(
          row.reference,
          row.expiry,
          text(row.urgency)?.replaceAll("_", " "),
          text(row.owner) ? `owner ${String(row.owner)}` : "",
        ),
        tone: toneFromUrgency(row.urgency),
      }));
    return entities.length > 0 ? [{ type: "entities", entities }] : [];
  }

  if (name === "get_business_firmographics") {
    const widgets: ResponseWidget[] = [];
    const target = scalar(values.employeeTarget);
    const actual = scalar(values.employeeActual);
    if (target !== null || actual !== null) {
      widgets.push({
        type: "comparison",
        rows: [
          {
            label: "Employees",
            current: actual !== null ? `actual ${actual}` : "declared only",
            baseline: target !== null ? `declared ${target}` : undefined,
          },
        ],
      });
    }
    const revenueBand = text(values.revenueBand);
    if (revenueBand) {
      widgets.push({
        type: "metrics",
        metrics: [{ label: "Revenue band", value: revenueBand }],
      });
    }
    return widgets;
  }

  return [];
}
