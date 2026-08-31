"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { journeyBadge } from "../commercial/Status";
import { MissionScreen } from "./MissionScreen";
import { StatusBadge } from "../ui/Display";
import { useCommercialClient } from "../../lib/commercial/use-commercial";
import type { OpportunityRecord } from "../../lib/commercial/api";

type HubStage = "proposal" | "contract" | "project" | "all";

function matchesStage(row: OpportunityRecord, stage: HubStage): boolean {
  const status = row.journeyStatus;
  if (stage === "all") return true;
  if (stage === "proposal") {
    return (
      status === "approved" ||
      status === "brief_draft" ||
      status === "founder_review" ||
      status === "changes_requested"
    );
  }
  if (stage === "contract") {
    return status === "approved" || status.includes("contract");
  }
  if (stage === "project") {
    return status === "approved" || status === "executed";
  }
  return true;
}

export function LifecycleHub({
  lifecycle,
  title,
  why,
  decision,
  next,
  emptyMessage,
  linkSuffix,
  stage = "all",
  copilot,
}: {
  lifecycle: string;
  title: string;
  why: string;
  decision: string;
  next: string;
  emptyMessage: string;
  linkSuffix: string;
  stage?: HubStage;
  copilot?: { changed?: string; recommended?: string; risk?: string };
}) {
  const workspace = useParams().workspace as string;
  const api = useCommercialClient(workspace);
  const [rows, setRows] = useState<OpportunityRecord[]>([]);

  useEffect(() => {
    if (!api) return;
    void api.listOpportunities().then((all) => {
      setRows(all.filter((row) => matchesStage(row, stage)));
    });
  }, [api, stage]);

  return (
    <MissionScreen
      lifecycle={lifecycle}
      title={title}
      why={why}
      decision={decision}
      next={next}
      {...(copilot ? { copilot } : {})}
    >
      {rows.length === 0 ? (
        <p className="flow-muted">{emptyMessage}</p>
      ) : (
        <ul className="flow-record-list">
          {rows.map((row) => (
            <li key={row.id} className="flow-record-list__item">
              <Link
                href={`/${workspace}/admin/opportunities/${row.id}${linkSuffix}`}
                className="flow-record-list__link"
              >
                <span className="flow-record-list__name">{row.name}</span>
                <StatusBadge variant={journeyBadge(row.journeyStatus)}>
                  {row.journeyStatus.replaceAll("_", " ")}
                </StatusBadge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </MissionScreen>
  );
}
