"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { CommercialRoute } from "../../../../../components/commercial/CommercialRoute";
import { MissionScreen } from "../../../../../components/os/MissionScreen";

function ReportingHub() {
  const workspace = useParams().workspace as string;
  const base = `/${workspace}/admin`;

  return (
    <MissionScreen
      lifecycle="Reports"
      title="Operational reporting"
      why="Summaries and audit evidence live on the records that produced them."
      decision="Open the lifecycle area that matches the question you need answered."
      next="Detailed charts will appear when finance and delivery modules connect."
      primaryAction={
        <Link href={`${base}/lifecycle/projects`} className="flow-btn flow-btn--primary">
          View delivery
        </Link>
      }
      secondaryActions={
        <Link href={base} className="flow-btn flow-btn--secondary flow-btn--sm">
          Mission Control
        </Link>
      }
      copilot={{
        changed: "Flow does not show decorative charts without underlying data.",
        recommended: "Use project audit timelines and capacity evidence for now.",
      }}
    >
      <p className="flow-muted">
        Reports aggregate from real records — opportunities, contracts, projects,
        and capacity plans. No invented revenue or activity metrics are shown here.
      </p>
      <ul className="flow-record-list">
        <li className="flow-record-list__item">
          <Link href={`${base}/opportunities`} className="flow-record-list__link">
            <span className="flow-record-list__name">Pipeline summary</span>
            <span className="flow-priority-card__meta">Opportunities by stage</span>
          </Link>
        </li>
        <li className="flow-record-list__item">
          <Link href={`${base}/team`} className="flow-record-list__link">
            <span className="flow-record-list__name">Capacity overview</span>
            <span className="flow-priority-card__meta">Team allocation and conflicts</span>
          </Link>
        </li>
        <li className="flow-record-list__item">
          <Link href={`/${workspace}/work`} className="flow-record-list__link">
            <span className="flow-record-list__name">Personal workload</span>
            <span className="flow-priority-card__meta">Published assignments</span>
          </Link>
        </li>
        <li className="flow-record-list__item">
          <Link
            href={`${base}/finance/reports`}
            className="flow-record-list__link"
          >
            <span className="flow-record-list__name">Financial reports</span>
            <span className="flow-priority-card__meta">
              Receivables, aging, and summary
            </span>
          </Link>
        </li>
      </ul>
    </MissionScreen>
  );
}

export default function ReportingHubPage() {
  return (
    <CommercialRoute>
      <ReportingHub />
    </CommercialRoute>
  );
}
