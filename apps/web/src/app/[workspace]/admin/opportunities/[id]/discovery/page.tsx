"use client";
/* eslint-disable @typescript-eslint/no-misused-promises */

import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

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
import { isDemoWorkspaceSlug } from "../../../../../../lib/workspace/demo";
import type { OpportunityBundle } from "../../../../../../lib/commercial/api";

function Discovery() {
  const workspace = useParams().workspace as string;
  const opportunityId = useParams().id as string;
  const api = useCommercialClient(workspace);
  const [bundle, setBundle] = useState<OpportunityBundle | null>(null);
  const [notes, setNotes] = useState(NORTHSTAR_ACME_NOTES);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const isDemo = isDemoWorkspaceSlug(workspace);

  useEffect(() => {
    if (!api) return;
    void api.getOpportunity(opportunityId).then((next) => {
      setBundle(next);
      if (next.sources[0]?.originalText) {
        setNotes(next.sources[0].originalText);
      }
    });
  }, [api, opportunityId]);

  const latestRun = bundle?.extractionRuns?.[0];
  const providerLabel = useMemo(() => {
    if (isDemo) return "Deterministic fixture (demo mode)";
    if (!latestRun) return "Not analyzed yet";
    return `${latestRun.provider} / ${latestRun.model}`;
  }, [isDemo, latestRun]);

  if (!bundle) return null;
  return (
    <>
      <SectionHeader
        eyebrow="Discovery"
        title="Meeting notes and extracted facts"
        description="Save notes first, then analyze. Extraction stays draft until a person verifies it."
      />
      <OpportunityNav workspace={workspace} opportunityId={opportunityId} />
      <p className="flow-muted" role="status">
        Provider: {providerLabel}
      </p>
      <FormField label="Meeting notes" htmlFor="notes">
        <TextArea
          id="notes"
          ref={notesRef}
          rows={10}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </FormField>
      <div className="flow-button-row">
        <Button
          disabled={saving || !api}
          onClick={async () => {
            if (!api) return;
            setSaving(true);
            setError(null);
            try {
              setBundle(await api.addNotes(opportunityId, notes));
            } catch {
              setError("Could not save notes.");
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? "Saving…" : "Save notes"}
        </Button>
        <Button
          variant="secondary"
          disabled={analyzing || !api}
          onClick={async () => {
            if (!api) return;
            setAnalyzing(true);
            setError(null);
            try {
              setBundle(await api.analyzeNotes(opportunityId));
            } catch {
              setError("Analysis failed. Retry when ready.");
            } finally {
              setAnalyzing(false);
            }
          }}
        >
          {analyzing ? "Analyzing…" : "Analyze notes"}
        </Button>
      </div>
      {error ? (
        <p className="flow-error" role="alert">
          {error}
        </p>
      ) : null}
      {latestRun ? (
        <p className="flow-muted" role="status">
          Latest run:{" "}
          <StatusBadge
            variant={
              latestRun.status === "failed"
                ? "warning"
                : latestRun.status === "succeeded"
                  ? "success"
                  : "default"
            }
          >
            {latestRun.status}
          </StatusBadge>
          {latestRun.errorCode ? ` (${latestRun.errorCode})` : null}
        </p>
      ) : null}
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
            <span className="flow-muted">
              {" "}
              ({Math.round(fact.confidenceBps / 100)}%)
            </span>
            {fact.duplicateOfCandidateId ? (
              <StatusBadge variant="warning">duplicate</StatusBadge>
            ) : null}
            {fact.contradictionRef ? (
              <StatusBadge variant="warning">contradiction</StatusBadge>
            ) : null}
            {fact.characterStart != null && fact.characterEnd != null ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setHighlight({
                    start: fact.characterStart!,
                    end: fact.characterEnd!,
                  });
                  notesRef.current?.focus();
                }}
              >
                Show evidence
              </Button>
            ) : null}
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
      {highlight ? (
        <section className="flow-panel" aria-label="Evidence excerpt">
          <h2>Evidence excerpt</h2>
          <p>
            <mark>{notes.slice(highlight.start, highlight.end)}</mark>
          </p>
        </section>
      ) : null}
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
