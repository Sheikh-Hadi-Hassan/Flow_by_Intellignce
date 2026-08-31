"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { CommercialRoute } from "../../../../../components/commercial/CommercialRoute";
import { MissionScreen } from "../../../../../components/os/MissionScreen";

function ReportingHub() {
  const workspace = useParams().workspace as string;

  return (
    <MissionScreen
      lifecycle="Reporting"
      title="Business performance"
      why="See revenue, pipeline health, and delivery velocity in one place."
      decision="Choose which metric period to review."
      next="Deeper analytics connect as your pipeline grows."
      copilot={{
        changed: "Reporting aggregates data across Sales through Projects.",
        recommended: "Start with pipeline conversion before delivery metrics.",
      }}
    >
      <div className="flow-priority-card">
        <span className="flow-priority-card__label">Coming soon</span>
        <p className="flow-priority-card__title">Pipeline & delivery reports</p>
        <p className="flow-priority-card__meta">
          Revenue, win rate, and milestone health will surface here. For now,
          use Mission Control for priorities.
        </p>
        <Link
          href={`/${workspace}/admin`}
          className="flow-btn flow-btn--secondary flow-btn--sm"
          style={{ marginTop: "var(--space-3)", alignSelf: "flex-start" }}
        >
          Back to Mission Control
        </Link>
      </div>
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
