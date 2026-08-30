"use client";
/* eslint-disable @typescript-eslint/no-misused-promises */

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { CommercialRoute } from "../../../../../../components/commercial/CommercialRoute";
import {
  factBadge,
  OpportunityNav,
} from "../../../../../../components/commercial/Status";
import { Button } from "../../../../../../components/ui/Button";
import { FormField, TextArea } from "../../../../../../components/ui/FormField";
import {
  ProofLabel,
  SectionHeader,
  StatusBadge,
} from "../../../../../../components/ui/Display";
import { NORTHSTAR_ACME_NOTES } from "../../../../../../content/demo/northstar-commercial";
import { useCommercialClient } from "../../../../../../lib/commercial/use-commercial";
import type { OpportunityBundle } from "../../../../../../lib/commercial/api";

function Discovery() {
  const workspace = useParams().workspace as string;
  const opportunityId = useParams().id as string;
  const api = useCommercialClient(workspace);
  const [bundle, setBundle] = useState<OpportunityBundle | null>(null);
  const [notes, setNotes] = useState(NORTHSTAR_ACME_NOTES);

  useEffect(() => {
    if (!api) return;
    void api.getOpportunity(opportunityId).then((next) => {
      setBundle(next);
      if (next.sources[0]?.originalText) {
        setNotes(next.sources[0].originalText);
      }
    });
  }, [api, opportunityId]);

  if (!bundle) return null;
  return (
    <>
      <SectionHeader
        eyebrow="Discovery"
        title="Meeting notes and extracted facts"
        description="Original notes are retained. Extraction stays draft until a person verifies it."
      />
      <OpportunityNav workspace={workspace} opportunityId={opportunityId} />
      <FormField label="Meeting notes" htmlFor="notes">
        <TextArea
          id="notes"
          rows={10}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </FormField>
      <Button
        onClick={async () => {
          if (!api) return;
          setBundle(await api.addNotes(opportunityId, notes));
        }}
      >
        Save notes and extract drafts
      </Button>
      <ul className="flow-compact-list">
        {bundle.facts.map((fact) => (
          <li key={fact.id}>
            <ProofLabel
              type={fact.status === "verified" ? "fact" : "inference"}
            >
              {fact.category}
            </ProofLabel>{" "}
            {fact.candidateFact}{" "}
            <StatusBadge variant={factBadge(fact.status)}>
              {fact.status}
            </StatusBadge>
            {fact.status === "draft" && (
              <>
                <Button
                  size="sm"
                  onClick={async () => {
                    if (!api) return;
                    await api.verifyFact(fact.id, "verified");
                    setBundle(await api.getOpportunity(opportunityId));
                  }}
                >
                  Verify
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    if (!api) return;
                    await api.verifyFact(fact.id, "rejected");
                    setBundle(await api.getOpportunity(opportunityId));
                  }}
                >
                  Reject
                </Button>
              </>
            )}
          </li>
        ))}
      </ul>
      <section className="flow-panel">
        <h2>Structured scope</h2>
        <p>
          {bundle.timeline?.notes
            ? `Timeline: ${bundle.timeline.notes}`
            : "Timeline not confirmed."}
        </p>
        <ul className="flow-compact-list">
          {bundle.risks.map((row) => (
            <li key={row.id}>
              Risk: {row.statement}{" "}
              <StatusBadge variant={row.blocking ? "warning" : "default"}>
                {row.blocking ? "Blocking" : "Non-blocking"}
              </StatusBadge>
              {row.blocking && !row.handled && (
                <Button
                  size="sm"
                  onClick={async () => {
                    if (!api) return;
                    await api.handleRisk(row.id);
                    setBundle(await api.getOpportunity(opportunityId));
                  }}
                >
                  Mark handled
                </Button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

export default function Page() {
  return (
    <CommercialRoute>
      <Discovery />
    </CommercialRoute>
  );
}
