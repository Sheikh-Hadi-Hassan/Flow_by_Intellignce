"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { formatMoney, formatMoneyCompact } from "../../../lib/mission-control/format";
import {
  allocatedHoursLabel,
  atRiskProjects,
  availablePeople,
  formatMetricValue,
  freeHoursLabel,
  invoicesByState,
  metricById,
  overAllocated,
  projectsLedBy,
  utilizationLabel,
  waitingOnAgency,
  waitingOnClient,
} from "../../../lib/mission-control/selectors";
import type { MissionControlData } from "../../../lib/mission-control/types";

function Section({
  id,
  title,
  meta,
  children,
}: {
  id: string;
  title: string;
  meta?: string;
  children: ReactNode;
}) {
  return (
    <section className="flow-canvas-op" id={id} aria-labelledby={`${id}-title`}>
      <div className="flow-canvas-op__head">
        <h2 id={`${id}-title`} className="flow-canvas-op__title">
          {title}
        </h2>
        {meta ? <span className="flow-canvas-op__meta">{meta}</span> : null}
      </div>
      {children}
    </section>
  );
}

function Row({
  href,
  kicker,
  title,
  note,
  value,
}: {
  href?: string;
  kicker: string;
  title: string;
  note?: string;
  value?: string;
}) {
  const body = (
    <>
      <span className="flow-canvas-op__kicker">{kicker}</span>
      <span className="flow-canvas-op__name">{title}</span>
      {note ? <span className="flow-canvas-op__note">{note}</span> : null}
      {value ? (
        <span className="flow-canvas-op__value tabular-nums">{value}</span>
      ) : null}
    </>
  );
  if (!href) {
    return <div className="flow-canvas-op__row">{body}</div>;
  }
  return (
    <Link href={href} className="flow-canvas-op__row">
      {body}
    </Link>
  );
}

function Group({
  label,
  metricId,
  children,
}: {
  label: string;
  metricId?: string;
  children: ReactNode;
}) {
  return (
    <div className="flow-canvas-op__group" data-metric-id={metricId}>
      <p className="flow-canvas-microlabel">{label}</p>
      {children}
    </div>
  );
}

export function OperatingBody({ data }: { data: MissionControlData }) {
  const hasContent = [
    data.risks,
    data.clientActions,
    data.invoices,
    data.projects,
    data.capacity,
    data.pulse,
    data.activity,
    data.decisions,
  ].some((rows) => rows.length > 0);
  if (!hasContent) return null;

  const delivery = metricById(data, "met-delivery-value");
  const atRisk = metricById(data, "met-at-risk");
  const approvalMetric = metricById(data, "met-approvals");
  const onClient = waitingOnClient(data.clientActions);
  const onAgency = waitingOnAgency(data.clientActions);
  const overdue = invoicesByState(data.invoices, "overdue");
  const due = invoicesByState(data.invoices, "due");
  const scheduled = invoicesByState(data.invoices, "scheduled");
  const riskProjects = atRiskProjects(data.projects);
  const over = overAllocated(data.capacity);
  const open = availablePeople(data.capacity);
  const pulseMax = Math.max(
    ...data.pulse.flatMap((point) => [
      Number(BigInt(point.pipelineValue.minor)),
      Number(BigInt(point.deliveryValue.minor)),
    ]),
    1,
  );

  return (
    <div className="flow-canvas-body">
      <Section
        id="watch"
        title="Operating watch"
        meta={[
          data.risks.length ? `${data.risks.length} delivery risks` : null,
          atRisk ? formatMetricValue(atRisk) : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      >
        {data.risks.length > 0 ? (
          <Group label="Delivery risk">
            {data.risks.map((risk) => (
              <Row
                key={risk.id}
                href={risk.href}
                kicker={risk.severity === "blocking" ? "Blocking" : "Elevated"}
                title={risk.projectName}
                note={risk.statement}
                value={risk.impactLabel}
              />
            ))}
          </Group>
        ) : null}

        {riskProjects.length > 0 ? (
          <Group label="At-risk work" metricId="met-at-risk">
            {riskProjects.map((project) => (
              <Row
                key={project.id}
                href={project.href}
                kicker={project.statusLabel}
                title={`${project.clientName} · ${project.name}`}
                note={`${project.nextMilestone} · ${project.leadName}`}
                value={formatMoneyCompact(project.contractValue)}
              />
            ))}
          </Group>
        ) : null}

        {onAgency.length > 0 ? (
          <Group label="Clients waiting on the agency">
            {onAgency.map((row) => (
              <Row
                key={row.id}
                href={row.href}
                kicker={row.waitingLabel}
                title={row.clientName}
                note={row.request}
                value={formatMoneyCompact(row.value)}
              />
            ))}
          </Group>
        ) : null}

        {onClient.length > 0 ? (
          <Group label="Agency waiting on clients" metricId="met-client-actions">
            {onClient.map((row) => (
              <Row
                key={row.id}
                href={row.href}
                kicker={row.waitingLabel}
                title={row.clientName}
                note={row.request}
                value={formatMoneyCompact(row.value)}
              />
            ))}
          </Group>
        ) : null}

        {approvalMetric && data.decisions.length > 0 ? (
          <Group label="Approval queue" metricId="met-approvals">
            <Row
              href="#decisions"
              kicker="Founder queue"
              title={`${formatMetricValue(approvalMetric)} open`}
              note={approvalMetric.caption}
            />
          </Group>
        ) : null}
      </Section>

      <Section
        id="cash"
        title="Cash and commitments"
        meta={delivery ? formatMetricValue(delivery) : ""}
      >
        {overdue.length > 0 ? (
          <Group label="Overdue invoices">
            {overdue.map((invoice) => (
              <Row
                key={invoice.id}
                href={invoice.href}
                kicker={invoice.dueLabel}
                title={`${invoice.clientName} · ${invoice.reference}`}
                value={formatMoney(invoice.amount)}
              />
            ))}
          </Group>
        ) : null}

        {due.length > 0 ? (
          <Group label="Upcoming invoices">
            {due.map((invoice) => (
              <Row
                key={invoice.id}
                href={invoice.href}
                kicker={invoice.dueLabel}
                title={`${invoice.clientName} · ${invoice.reference}`}
                value={formatMoney(invoice.amount)}
              />
            ))}
          </Group>
        ) : null}

        {scheduled.length > 0 ? (
          <Group label="Scheduled">
            {scheduled.map((invoice) => (
              <Row
                key={invoice.id}
                href={invoice.href}
                kicker={invoice.dueLabel}
                title={`${invoice.clientName} · ${invoice.reference}`}
                value={formatMoney(invoice.amount)}
              />
            ))}
          </Group>
        ) : null}

        {data.projects.length > 0 ? (
          <Group label="Active delivery" metricId="met-delivery-value">
            {data.projects.map((project) => (
              <Row
                key={project.id}
                href={project.href}
                kicker={project.statusLabel}
                title={`${project.clientName} · ${project.name}`}
                note={project.dueLabel}
                value={formatMoneyCompact(project.contractValue)}
              />
            ))}
          </Group>
        ) : null}
      </Section>

      <Section
        id="people"
        title="People and capacity"
        meta={
          over.length > 0
            ? `${over.length} over-allocated`
            : "Within capacity"
        }
      >
        {over.length > 0 ? (
          <Group label="Over-allocated">
            {over.map((row) => (
              <CapacityRowView
                key={row.id}
                row={row}
                assignments={projectsLedBy(data.projects, row.personName)}
              />
            ))}
          </Group>
        ) : null}

        {open.length > 0 ? (
          <Group label="Available">
            {open.map((row) => (
              <CapacityRowView
                key={row.id}
                row={row}
                assignments={projectsLedBy(data.projects, row.personName)}
              />
            ))}
          </Group>
        ) : null}
      </Section>

      {data.pulse.length > 0 ? (
        <Section
          id="activity"
          title="Business activity"
          meta={`${data.pulse.reduce((sum, point) => sum + point.eventCount, 0)} events this week`}
        >
          <div className="flow-canvas-pulse" role="img" aria-label="Weekly pipeline and delivery">
            {data.pulse.map((point) => {
              const pipeline = Number(BigInt(point.pipelineValue.minor));
              const deliveryValue = Number(BigInt(point.deliveryValue.minor));
              return (
                <div key={point.id} className="flow-canvas-pulse__col">
                  <span
                    className="flow-canvas-pulse__bar flow-canvas-pulse__bar--pipeline"
                    style={{ height: `${(pipeline / pulseMax) * 72}px` }}
                  />
                  <span
                    className="flow-canvas-pulse__bar"
                    style={{ height: `${(deliveryValue / pulseMax) * 72}px` }}
                  />
                  <span className="flow-canvas-pulse__label">{point.dateLabel}</span>
                </div>
              );
            })}
          </div>
          <p className="flow-canvas-op__legend">
            Weighted pipeline {formatMoneyCompact(data.pulse[0]!.pipelineValue)} →{" "}
            {formatMoneyCompact(data.pulse[data.pulse.length - 1]!.pipelineValue)}
            {" · "}
            Active delivery {formatMoneyCompact(data.pulse[0]!.deliveryValue)} →{" "}
            {formatMoneyCompact(data.pulse[data.pulse.length - 1]!.deliveryValue)}
          </p>
        </Section>
      ) : null}

      {data.activity.length > 0 ? (
        <Section id="operations" title="Recent operations">
          <ol className="flow-canvas-ops">
            {data.activity.map((event) => (
              <li key={event.id}>
                <Link href={event.href} className="flow-canvas-ops__row">
                  <span className="flow-canvas-ops__time">{event.timeLabel}</span>
                  <span className="flow-canvas-ops__body">
                    <span className="flow-canvas-ops__summary">{event.summary}</span>
                    <span className="flow-canvas-ops__meta">
                      {event.actorName}
                      {event.evidence ? ` · ${event.evidence.label}` : ""}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </Section>
      ) : null}
    </div>
  );
}

function CapacityRowView({
  row,
  assignments,
}: {
  row: MissionControlData["capacity"][number];
  assignments: MissionControlData["projects"];
}) {
  const used = Math.min(100, row.utilizationBps / 100);
  return (
    <div className="flow-canvas-op__row flow-canvas-op__row--stack">
      <span className="flow-canvas-op__kicker">{row.roleLabel}</span>
      <span className="flow-canvas-op__name">{row.personName}</span>
      <span className="flow-canvas-op__note">
        {row.noteLabel}
        {assignments.length > 0
          ? ` · ${assignments.map((project) => project.name).join(", ")}`
          : ""}
        {row.allocatedMinutes < row.availableMinutes
          ? ` · ${freeHoursLabel(row)} free`
          : ""}
      </span>
      <span className="flow-canvas-op__value tabular-nums">
        {utilizationLabel(row)}
      </span>
      <span className="flow-canvas-meter" aria-hidden>
        <span className="flow-canvas-meter__fill" style={{ width: `${used}%` }} />
      </span>
      <span className="sr-only">{allocatedHoursLabel(row)}</span>
    </div>
  );
}
