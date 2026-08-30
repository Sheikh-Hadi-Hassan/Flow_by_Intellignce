"use client";
/* eslint-disable @typescript-eslint/no-misused-promises */

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { CommercialRoute } from "../../../../../../components/commercial/CommercialRoute";
import {
  journeyBadge,
  MoneyLine,
  OpportunityNav,
} from "../../../../../../components/commercial/Status";
import { Button } from "../../../../../../components/ui/Button";
import {
  SectionHeader,
  StatusBadge,
} from "../../../../../../components/ui/Display";
import { useCommercialClient } from "../../../../../../lib/commercial/use-commercial";
import type { OpportunityBundle } from "../../../../../../lib/commercial/api";

function Brief() {
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
  const approved = bundle.briefs.find((row) => row.status === "approved");

  return (
    <>
      <SectionHeader
        eyebrow="Brief"
        title="Versioned project brief"
        description="Approved versions are immutable. Changes create a new version."
      />
      <OpportunityNav workspace={workspace} opportunityId={opportunityId} />
      <StatusBadge variant={journeyBadge(bundle.opportunity.journeyStatus)}>
        {bundle.opportunity.journeyStatus.replaceAll("_", " ")}
      </StatusBadge>
      {error && <p role="alert">{error}</p>}
      {latest?.calculation && (
        <MoneyLine
          label="Recommended price"
          minor={
            typeof latest.calculation.recommendedPriceMinor === "string"
              ? latest.calculation.recommendedPriceMinor
              : undefined
          }
          currency={bundle.opportunity.currency}
        />
      )}
      <div className="flow-panel">
        <Button
          disabled={Boolean(approved)}
          onClick={async () => {
            if (!api) return;
            try {
              await api.generateBrief(opportunityId);
              setBundle(await api.getOpportunity(opportunityId));
            } catch (err) {
              setError(
                err instanceof Error
                  ? err.message
                  : "Unable to generate brief.",
              );
            }
          }}
        >
          Generate brief version
        </Button>
        {latest &&
          latest.status !== "approved" &&
          latest.status !== "superseded" && (
            <Button
              variant="secondary"
              onClick={async () => {
                if (!api) return;
                await api.submitReview(latest.id, latest.versionNumber);
                setBundle(await api.getOpportunity(opportunityId));
              }}
            >
              Request founder review
            </Button>
          )}
        {bundle.opportunity.journeyStatus === "changes_requested" && (
          <Button
            variant="secondary"
            onClick={async () => {
              if (!api) return;
              await api.generateBrief(opportunityId);
              setBundle(await api.getOpportunity(opportunityId));
            }}
          >
            Generate revised version
          </Button>
        )}
      </div>
      {bundle.briefs.map((version) => (
        <article key={version.id} className="flow-panel">
          <h2>
            Version {version.versionNumber}{" "}
            <StatusBadge
              variant={version.status === "approved" ? "success" : "default"}
            >
              {version.status}
            </StatusBadge>
          </h2>
          {version.sections.map((section) => (
            <section key={section.key}>
              <h3>{section.title}</h3>
              <p>{section.body}</p>
            </section>
          ))}
        </article>
      ))}
    </>
  );
}

export default function Page() {
  return (
    <CommercialRoute>
      <Brief />
    </CommercialRoute>
  );
}
