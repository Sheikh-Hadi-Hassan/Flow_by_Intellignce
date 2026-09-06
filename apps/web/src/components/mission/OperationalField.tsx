"use client";

import Link from "next/link";

import {
  formatBps,
  formatHours,
  formatMoney,
  formatMoneyCompact,
} from "../../lib/mission-control/format";
import type {
  ActivityEvent,
  CapacityRow,
  ClientAction,
  DeliveryRisk,
  DecisionImpact,
  InvoiceSignal,
  MissionControlData,
  MissionDecision,
  MissionProject,
  PulsePoint,
} from "../../lib/mission-control/types";
import { StatusBadge } from "../ui/Display";
import { AuthorityNote, ContextReceipt } from "./ContextReceipt";

function Block({
  title,
  meta,
  metaHref,
  children,
}: {
  title: string;
  meta?: string;
  metaHref?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flow-mc-block" aria-label={title}>
      <div className="flow-mc-block__head">
        <h2 className="flow-mc-block__title">{title}</h2>
        {meta ? (
          metaHref ? (
            <Link href={metaHref} className="flow-mc-block__meta">
              {meta}
            </Link>
          ) : (
            <span className="flow-mc-block__meta">{meta}</span>
          )
        ) : null}
      </div>
      {children}
    </section>
  );
}

function impactText(impact: DecisionImpact): string {
  if (impact.amount) return formatMoney(impact.amount);
  if (impact.deltaDays !== undefined) return `${impact.deltaDays} days`;
  return impact.valueLabel ?? impact.label;
}

function Decision({ decision }: { decision: MissionDecision }) {
  return (
    <article className="flow-mc-decision">
      <div>
        <div className="flow-mc-decision__head">
          <span className="flow-mc-decision__client">{decision.clientName}</span>
          <StatusBadge
            variant={decision.urgency === "critical" ? "danger" : "warning"}
          >
            {decision.dueLabel}
          </StatusBadge>
        </div>
        <h3 className="flow-mc-decision__title">{decision.title}</h3>
        <p className="flow-mc-decision__body">{decision.whatHappened}</p>
        <p className="flow-mc-decision__why">{decision.whyItMatters}</p>

        <ul className="flow-mc-decision__impacts">
          {decision.impacts.map((impact) => (
            <li key={impact.id} className="flow-mc-impact">
              <span
                className={`flow-mc-impact__value flow-mc-impact__value--${impact.direction} tabular-nums`}
              >
                {impactText(impact)}
              </span>
              <span className="flow-mc-impact__label">
                {impact.label} · {impact.detail}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <aside className="flow-mc-decision__aside">
        <div className="flow-mc-decision__owner">
          <span className="flow-mc-decision__owner-avatar" aria-hidden>
            {decision.owner.initials}
          </span>
          <span className="flow-mc-decision__owner-name">
            {decision.owner.name}
            <br />
            {decision.owner.role}
          </span>
        </div>

        <div>
          <p className="flow-mc-decision__rec">
            {decision.recommendation.summary}
          </p>
          <p className="flow-mc-decision__rec-why">
            {decision.recommendation.rationale}
          </p>
        </div>

        <AuthorityNote authority={decision.recommendation.authority} />
        <ContextReceipt evidence={decision.evidence} />
      </aside>
    </article>
  );
}

/**
 * One zero-based axis shared by both series, so bar height is proportional to
 * value. Scaling each series to its own min and max made a 10% move read as a
 * fourfold one.
 */
function scaleFromZero(...series: readonly (readonly number[])[]) {
  const max = Math.max(...series.flat(), 1);
  return (value: number) => (value / max) * 100;
}

function Pulse({ points }: { points: readonly PulsePoint[] }) {
  if (points.length === 0) return null;

  const pipelineValues = points.map((point) =>
    Number(BigInt(point.pipelineValue.minor)),
  );
  const deliveryValues = points.map((point) =>
    Number(BigInt(point.deliveryValue.minor)),
  );
  const scale = scaleFromZero(pipelineValues, deliveryValues);

  const first = points[0];
  const last = points[points.length - 1];
  const axisMax = {
    minor: String(Math.max(...pipelineValues, ...deliveryValues)),
    currency: points[0]!.pipelineValue.currency,
  };

  return (
    <>
      <div className="flow-mc-pulse">
        {points.map((point, index) => (
          <div key={point.id} className="flow-mc-pulse__col">
            <div
              className="flow-mc-pulse__pair"
              title={`${point.label} ${point.dateLabel} — pipeline ${formatMoneyCompact(
                point.pipelineValue,
              )}, delivery ${formatMoneyCompact(point.deliveryValue)}${
                point.note ? ` — ${point.note}` : ""
              }`}
            >
              <span
                className="flow-mc-pulse__bar flow-mc-pulse__bar--pipeline"
                style={{ height: `${scale(pipelineValues[index]!)}%` }}
              />
              <span
                className="flow-mc-pulse__bar flow-mc-pulse__bar--delivery"
                style={{ height: `${scale(deliveryValues[index]!)}%` }}
              />
            </div>
            <span className="flow-mc-pulse__label">{point.dateLabel}</span>
            {point.note ? (
              <span className="flow-mc-pulse__note" title={point.note}>
                <span className="sr-only">{point.note}</span>
              </span>
            ) : null}
          </div>
        ))}
      </div>
      <div className="flow-mc-pulse__legend">
        <span className="flow-mc-pulse__key">
          <span
            className="flow-mc-pulse__swatch flow-mc-pulse__swatch--muted"
            aria-hidden
          />
          Weighted pipeline {first ? formatMoneyCompact(first.pipelineValue) : ""}{" "}
          → {last ? formatMoneyCompact(last.pipelineValue) : ""}
        </span>
        <span className="flow-mc-pulse__key">
          <span className="flow-mc-pulse__swatch" aria-hidden />
          Active delivery {first ? formatMoneyCompact(first.deliveryValue) : ""} →{" "}
          {last ? formatMoneyCompact(last.deliveryValue) : ""}
        </span>
        <span className="flow-mc-pulse__key">
          <span className="flow-mc-pulse__note-swatch" aria-hidden />
          Marked days carry a notable event · bars scale to{" "}
          {formatMoneyCompact(axisMax)}
        </span>
      </div>
    </>
  );
}

function Activity({ events }: { events: readonly ActivityEvent[] }) {
  return (
    <ul className="flow-mc-activity">
      {events.map((event) => (
        <li key={event.id}>
          <Link href={event.href} className="flow-mc-activity__row">
            <span className="flow-mc-activity__time">{event.timeLabel}</span>
            <span>
              <span className="flow-mc-activity__summary">{event.summary}</span>
              <span className="flow-mc-activity__meta">
                <span
                  className={`flow-mc-activity__marker flow-mc-activity__marker--${event.tone}`}
                  aria-hidden
                />
                {event.actorName}
                {event.evidence ? ` · ${event.evidence.label}` : ""}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Projects({ projects }: { projects: readonly MissionProject[] }) {
  return (
    <ul className="flow-mc-rows">
      {projects.map((project) => (
        <li key={project.id}>
          <Link href={project.href} className="flow-mc-row">
            <span className="flow-mc-row__main">
              <span className="flow-mc-row__name">
                {project.clientName} · {project.name}
              </span>
              <span className="flow-mc-row__sub">
                {project.nextMilestone} · {project.leadName}
              </span>
            </span>
            <span className="flow-mc-row__side">
              <span className="flow-mc-row__value tabular-nums">
                {formatMoneyCompact(project.contractValue)}
              </span>
              <span
                className={`flow-mc-row__note flow-mc-row__note--${project.healthTone}`}
              >
                {project.dueLabel}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Risks({ risks }: { risks: readonly DeliveryRisk[] }) {
  return (
    <ul className="flow-mc-rows">
      {risks.map((risk) => (
        <li key={risk.id}>
          <Link href={risk.href} className="flow-mc-row flow-mc-row--stacked">
            <span className="flow-mc-row__main">
              <span className="flow-mc-row__name">{risk.projectName}</span>
              <span className="flow-mc-row__sub">{risk.statement}</span>
              <span className="flow-mc-row__sub">
                {risk.ownerName} · {risk.evidence.source}
              </span>
            </span>
            <span className="flow-mc-row__side">
              <StatusBadge
                variant={risk.severity === "blocking" ? "danger" : "warning"}
              >
                {risk.severity === "blocking" ? "Blocking" : "Elevated"}
              </StatusBadge>
              <span className="flow-mc-row__note flow-mc-row__note--critical">
                {risk.impactLabel}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ClientActions({ actions }: { actions: readonly ClientAction[] }) {
  return (
    <ul className="flow-mc-rows">
      {actions.map((action) => (
        <li key={action.id}>
          <Link href={action.href} className="flow-mc-row">
            <span className="flow-mc-row__main">
              <span className="flow-mc-row__name">{action.clientName}</span>
              <span className="flow-mc-row__sub">{action.request}</span>
            </span>
            <span className="flow-mc-row__side">
              <span className="flow-mc-row__value tabular-nums">
                {formatMoneyCompact(action.value)}
              </span>
              <span className={`flow-mc-row__note flow-mc-row__note--${action.tone}`}>
                {action.waitingLabel}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Invoices({ invoices }: { invoices: readonly InvoiceSignal[] }) {
  return (
    <ul className="flow-mc-rows">
      {invoices.map((invoice) => (
        <li key={invoice.id}>
          <Link href={invoice.href} className="flow-mc-row">
            <span className="flow-mc-row__main">
              <span className="flow-mc-row__name">{invoice.clientName}</span>
              <span className="flow-mc-row__sub">{invoice.reference}</span>
            </span>
            <span className="flow-mc-row__side">
              <span className="flow-mc-row__value tabular-nums">
                {formatMoney(invoice.amount)}
              </span>
              <span
                className={`flow-mc-row__note flow-mc-row__note--${
                  invoice.state === "overdue" ? "critical" : "caution"
                }`}
              >
                {invoice.dueLabel}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Capacity({ rows }: { rows: readonly CapacityRow[] }) {
  return (
    <ul className="flow-mc-rows">
      {rows.map((row) => (
        <li key={row.id}>
          <div className="flow-mc-row" style={{ display: "block" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "var(--space-3)",
                alignItems: "baseline",
              }}
            >
              <span className="flow-mc-row__main">
                <span className="flow-mc-row__name">{row.personName}</span>
                <span className="flow-mc-row__sub">{row.noteLabel}</span>
              </span>
              <span className="flow-mc-row__side">
                <span className="flow-mc-row__value tabular-nums">
                  {formatBps(row.utilizationBps)}
                </span>
                <span className="flow-mc-row__note">
                  {formatHours(row.allocatedMinutes)} /{" "}
                  {formatHours(row.availableMinutes)}
                </span>
              </span>
            </div>
            <span className="flow-mc-meter">
              <span
                className={`flow-mc-meter__fill flow-mc-meter__fill--${row.tone}`}
                style={{
                  width: `${Math.min(100, row.utilizationBps / 100)}%`,
                }}
              />
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * One continuous operational field: decisions and activity carry the width,
 * with pipeline, delivery, finance and capacity signals alongside. Sections are
 * divided by hairlines instead of being boxed into a card grid.
 */
export function OperationalField({ data }: { data: MissionControlData }) {
  const overdue = data.invoices.filter((row) => row.state === "overdue").length;
  const overCapacity = data.capacity.filter(
    (row) => row.utilizationBps > 10000,
  ).length;

  // Every block below is individually guarded, so an all-empty workspace would
  // otherwise render the field's rules and gutters around nothing.
  const hasContent = [
    data.decisions,
    data.pulse,
    data.activity,
    data.risks,
    data.clientActions,
    data.invoices,
    data.projects,
    data.capacity,
  ].some((rows) => rows.length > 0);
  if (!hasContent) return null;

  return (
    <div className="flow-mc-field">
      <div className="flow-mc-col">
        {data.decisions.length > 0 ? (
          <Block
            title="Decisions waiting on you"
            meta={`${data.decisions.length} open`}
          >
            <div className="flow-mc-decisions">
              {data.decisions.map((decision) => (
                <Decision key={decision.id} decision={decision} />
              ))}
            </div>
          </Block>
        ) : null}

        {data.pulse.length > 0 ? (
          <Block
            title="Business activity"
            meta={`${data.pulse.reduce((sum, point) => sum + point.eventCount, 0)} events this week`}
          >
            <Pulse points={data.pulse} />
          </Block>
        ) : null}

        {data.activity.length > 0 ? (
          <Block
            title="Recent operations"
            meta="Open pipeline"
            metaHref={`/${data.viewer.workspaceSlug}/admin/opportunities`}
          >
            <Activity events={data.activity} />
          </Block>
        ) : null}
      </div>

      <div className="flow-mc-col">
        {data.risks.length > 0 ? (
          <Block title="Delivery risk" meta={`${data.risks.length} open`}>
            <Risks risks={data.risks} />
          </Block>
        ) : null}

        {data.clientActions.length > 0 ? (
          <Block
            title="Waiting on clients"
            meta={`${data.clientActions.length} open`}
          >
            <ClientActions actions={data.clientActions} />
          </Block>
        ) : null}

        {data.invoices.length > 0 ? (
          <Block
            title="Receivables"
            meta={overdue > 0 ? `${overdue} overdue` : "All current"}
          >
            <Invoices invoices={data.invoices} />
          </Block>
        ) : null}

        {data.projects.length > 0 ? (
          <Block title="Active delivery" meta={`${data.projects.length} projects`}>
            <Projects projects={data.projects} />
          </Block>
        ) : null}

        {data.capacity.length > 0 ? (
          <Block
            title="Team capacity"
            meta={
              overCapacity > 0
                ? `${overCapacity} over-allocated`
                : "Within capacity"
            }
          >
            <Capacity rows={data.capacity} />
          </Block>
        ) : null}
      </div>
    </div>
  );
}
