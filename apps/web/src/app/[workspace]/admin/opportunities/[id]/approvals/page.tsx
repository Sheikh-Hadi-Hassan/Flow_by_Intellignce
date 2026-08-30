"use client";
/* eslint-disable @typescript-eslint/no-misused-promises */

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { CommercialRoute } from "../../../../../../components/commercial/CommercialRoute";
import { OpportunityNav } from "../../../../../../components/commercial/Status";
import { Button } from "../../../../../../components/ui/Button";
import {
  SectionHeader,
  StatusBadge,
} from "../../../../../../components/ui/Display";
import { useCommercialClient } from "../../../../../../lib/commercial/use-commercial";
import type { OpportunityBundle } from "../../../../../../lib/commercial/api";

function Approvals() {
  const workspace = useParams().workspace as string;
  const opportunityId = useParams().id as string;
  const api = useCommercialClient(workspace);
  const [bundle, setBundle] = useState<OpportunityBundle | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!api) return;
    void api.getOpportunity(opportunityId).then(setBundle);
  }, [api, opportunityId]);

  if (!bundle) return null;
  const latest = bundle.briefs.at(-1);

  return (
    <>
      <SectionHeader
        eyebrow="Approvals"
        title="Founder review"
        description="Approval writes an immutable version and a Guard decision."
      />
      <OpportunityNav workspace={workspace} opportunityId={opportunityId} />
      {error && <p role="alert">{error}</p>}
      {latest && (
        <section className="flow-panel">
          <p>
            Version {latest.versionNumber}{" "}
            <StatusBadge
              variant={latest.status === "approved" ? "success" : "essential"}
            >
              {latest.status === "approved" ? "Approved" : "Needs approval"}
            </StatusBadge>
          </p>
          <Button
            disabled={latest.status === "approved"}
            onClick={async () => {
              if (!api) return;
              try {
                await api.approve(latest.id, latest.versionNumber);
                setBundle(await api.getOpportunity(opportunityId));
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : "Approval failed.",
                );
              }
            }}
          >
            Approve immutable brief
          </Button>
          <Button
            variant="secondary"
            disabled={latest.status === "approved"}
            onClick={async () => {
              if (!api) return;
              await api.requestChanges(latest.id);
              setBundle(await api.getOpportunity(opportunityId));
            }}
          >
            Request changes
          </Button>
        </section>
      )}
      <h2>Guard history</h2>
      <ul className="flow-compact-list">
        {bundle.guards.map((row) => (
          <li key={row.id}>
            {row.action} · {row.outcome} · {row.reason}
          </li>
        ))}
      </ul>
    </>
  );
}

export default function Page() {
  return (
    <CommercialRoute>
      <Approvals />
    </CommercialRoute>
  );
}
