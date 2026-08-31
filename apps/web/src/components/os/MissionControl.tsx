"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { DEMO_FOUNDER_FIRST_NAME } from "../../content/demo/northstar";
import { MissionScreen } from "./MissionScreen";
import { StatusBadge } from "../ui/Display";
import { useCommercialClient } from "../../lib/commercial/use-commercial";
import type { OpportunityRecord } from "../../lib/commercial/api";
import type { PrototypeSession } from "../../lib/prototype/types";

interface PriorityItem {
  readonly id: string;
  readonly label: string;
  readonly title: string;
  readonly meta: string;
  readonly href: string;
  readonly tone: "urgent" | "attention" | "ready";
}

function buildPriorities(
  workspace: string,
  rows: OpportunityRecord[],
): PriorityItem[] {
  const items: PriorityItem[] = [];

  for (const row of rows) {
    const base = `/${workspace}/admin/opportunities/${row.id}`;
    const status = row.journeyStatus;

    if (status === "founder_review") {
      items.push({
        id: `${row.id}-approval`,
        label: "Approval needed",
        title: row.name,
        meta: "Brief ready for your sign-off",
        href: `${base}/approvals`,
        tone: "urgent",
      });
    } else if (
      status === "collecting_information" ||
      status === "information_missing"
    ) {
      items.push({
        id: `${row.id}-discovery`,
        label: "Discovery",
        title: row.name,
        meta: "Client context still incomplete",
        href: `${base}/discovery`,
        tone: "attention",
      });
    } else if (status === "changes_requested") {
      items.push({
        id: `${row.id}-changes`,
        label: "Changes requested",
        title: row.name,
        meta: "Revision needed before next send",
        href: base,
        tone: "attention",
      });
    } else if (status === "approved") {
      items.push({
        id: `${row.id}-proposal`,
        label: "Ready to propose",
        title: row.name,
        meta: "Brief approved — build the proposal",
        href: `${base}/proposal`,
        tone: "ready",
      });
    }
  }

  return items.slice(0, 6);
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
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

  const priorities = useMemo(() => buildPriorities(workspace, rows), [workspace, rows]);
  const pendingApprovals = priorities.filter((p) => p.tone === "urgent").length;
  const inDiscovery = rows.filter(
    (r) =>
      r.journeyStatus === "collecting_information" ||
      r.journeyStatus === "information_missing",
  ).length;

  const primaryHref =
    priorities[0]?.href ?? `/${workspace}/admin/opportunities`;

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
          {priorities.length > 0 ? "Act on top priority" : "Open discovery"}
        </Link>
      }
      secondaryActions={
        <Link
          href={`/${workspace}/admin/clients`}
          className="flow-btn flow-btn--secondary flow-btn--sm"
        >
          Sales pipeline
        </Link>
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

      {priorities.length > 0 ? (
        <section>
          <h2 className="flow-priority-card__label">Today&apos;s priorities</h2>
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
          No pipeline activity yet. Add a client under Sales, then start discovery.
        </p>
      )}

      {session.twin ? (
        <section className="flow-priority-card">
          <span className="flow-priority-card__label">Business context</span>
          <p className="flow-priority-card__title">{session.twin.businessName}</p>
          <p className="flow-priority-card__meta">
            {session.twin.classification} · {session.twin.services.length} services
            in catalog
          </p>
        </section>
      ) : null}
    </MissionScreen>
  );
}
