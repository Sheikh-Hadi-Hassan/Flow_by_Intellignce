"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { DEMO_FOUNDER_FIRST_NAME } from "../../content/demo/northstar";
import { buildPriorities } from "../../lib/experience/mission-control";
import { LIFECYCLE_PIPELINE_STAGES } from "../../lib/navigation/lifecycle-nav";
import { useCommercialClient } from "../../lib/commercial/use-commercial";
import type { OpportunityRecord } from "../../lib/commercial/api";
import type { PrototypeSession } from "../../lib/prototype/types";
import { MissionScreen } from "./MissionScreen";
import { StatusBadge } from "../ui/Display";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

function pipelineHref(workspace: string, stageId: string): string {
  const base = `/${workspace}/admin`;
  switch (stageId) {
    case "discovery":
      return `${base}/opportunities`;
    case "brief":
      return `${base}/opportunities`;
    case "proposal":
      return `${base}/lifecycle/proposals`;
    case "contract":
      return `${base}/lifecycle/contracts`;
    case "project":
    case "staffing":
    case "delivery":
      return `${base}/lifecycle/projects`;
    default:
      return `${base}/opportunities`;
  }
}

export function MissionControl({ session }: { session: PrototypeSession }) {
  const workspace = useParams().workspace as string;
  const api = useCommercialClient(workspace);
  const [rows, setRows] = useState<OpportunityRecord[]>([]);
  const [greeting, setGreeting] = useState("there");

  useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  useEffect(() => {
    if (!api) return;
    void api.listOpportunities().then(setRows);
  }, [api]);

  const founderName =
    session.mode === "demo"
      ? DEMO_FOUNDER_FIRST_NAME
      : session.founderFirstName || "founder";

  const priorities = useMemo(
    () => buildPriorities(workspace, rows),
    [workspace, rows],
  );
  const pendingApprovals = priorities.filter((p) => p.tone === "urgent").length;
  const inDiscovery = rows.filter(
    (r) =>
      r.journeyStatus === "collecting_information" ||
      r.journeyStatus === "information_missing",
  ).length;

  const primaryHref =
    priorities[0]?.href ?? `/${workspace}/admin/opportunities`;

  const pipelineCounts = useMemo(
    () =>
      LIFECYCLE_PIPELINE_STAGES.map((stage) => ({
        ...stage,
        count: rows.filter((row) => stage.match(row.journeyStatus)).length,
      })),
    [rows],
  );

  return (
    <MissionScreen
      lifecycle="Mission Control"
      title={`Good ${greeting}, ${founderName}`}
      why="Your operating picture for today — what needs a decision before anything else."
      decision={
        priorities.length > 0
          ? `You have ${priorities.length} active item${priorities.length === 1 ? "" : "s"} across the pipeline.`
          : "Start or advance a client engagement."
      }
      next={
        priorities[0]
          ? `Next: ${priorities[0].title} — ${priorities[0].meta}`
          : "Create a client, then open a discovery opportunity."
      }
      primaryAction={
        <Link href={primaryHref} className="flow-btn flow-btn--primary">
          {priorities.length > 0 ? "Act on top priority" : "Open pipeline"}
        </Link>
      }
      secondaryActions={
        <>
          <Link
            href={`/${workspace}/admin/clients`}
            className="flow-btn flow-btn--secondary flow-btn--sm"
          >
            Clients
          </Link>
          <Link
            href={`/${workspace}/admin/lifecycle/projects`}
            className="flow-btn flow-btn--secondary flow-btn--sm"
          >
            Delivery
          </Link>
        </>
      }
      copilot={{
        changed:
          rows.length > 0
            ? `${rows.length} opportunit${rows.length === 1 ? "y" : "ies"} in your pipeline.`
            : "No active opportunities yet.",
        recommended:
          pendingApprovals > 0
            ? `Clear ${pendingApprovals} pending approval${pendingApprovals === 1 ? "" : "s"} first — they block downstream proposal work.`
            : inDiscovery > 0
              ? `Finish discovery on ${inDiscovery} engagement${inDiscovery === 1 ? "" : "s"} to unlock brief generation.`
              : "Advance your highest-value opportunity to proposal.",
        ...(pendingApprovals > 0
          ? { risk: "Delayed approvals push delivery dates and client confidence." }
          : {}),
      }}
    >
      <div className="flow-mission-grid flow-mission-grid--3">
        <article className="flow-priority-card">
          <span className="flow-priority-card__label">Approvals</span>
          <p className="flow-priority-card__title">{pendingApprovals}</p>
          <p className="flow-priority-card__meta">Waiting on you</p>
        </article>
        <article className="flow-priority-card">
          <span className="flow-priority-card__label">Discovery</span>
          <p className="flow-priority-card__title">{inDiscovery}</p>
          <p className="flow-priority-card__meta">Needs client context</p>
        </article>
        <article className="flow-priority-card">
          <span className="flow-priority-card__label">Pipeline</span>
          <p className="flow-priority-card__title">{rows.length}</p>
          <p className="flow-priority-card__meta">Active opportunities</p>
        </article>
      </div>

      <section aria-label="Lifecycle pipeline">
        <h2 className="flow-priority-card__label">Lifecycle pipeline</h2>
        <nav className="flow-journey-rail" aria-label="Pipeline stages">
          {pipelineCounts.map((stage) => (
            <Link
              key={stage.id}
              href={pipelineHref(workspace, stage.id)}
              className="flow-journey-rail__link"
            >
              {stage.label}
              {stage.count > 0 ? ` (${stage.count})` : ""}
            </Link>
          ))}
        </nav>
      </section>

      {priorities.length > 0 ? (
        <section>
          <h2 className="flow-priority-card__label">What needs your attention</h2>
          <ul className="flow-record-list" style={{ marginTop: "var(--space-3)" }}>
            {priorities.map((item) => (
              <li key={item.id} className="flow-record-list__item">
                <Link href={item.href} className="flow-record-list__link">
                  <span>
                    <span className="flow-record-list__name">{item.title}</span>
                    <span className="flow-priority-card__meta">{item.meta}</span>
                  </span>
                  <StatusBadge
                    variant={
                      item.tone === "urgent"
                        ? "essential"
                        : item.tone === "ready"
                          ? "success"
                          : "default"
                    }
                  >
                    {item.label}
                  </StatusBadge>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="flow-muted">
          No pipeline activity yet. Add a client, then start discovery.
        </p>
      )}

      {session.twin ? (
        <section className="flow-priority-card">
          <span className="flow-priority-card__label">Business Twin</span>
          <p className="flow-priority-card__title">{session.twin.businessName}</p>
          <p className="flow-priority-card__meta">
            {session.twin.classification} · {session.twin.services.length} services
            · {session.twin.completeness}% completeness
          </p>
          <Link
            href={`/${workspace}/admin/twin`}
            className="flow-btn flow-btn--ghost flow-btn--sm"
            style={{ alignSelf: "flex-start", marginTop: "var(--space-2)" }}
          >
            View Twin
          </Link>
        </section>
      ) : null}
    </MissionScreen>
  );
}
