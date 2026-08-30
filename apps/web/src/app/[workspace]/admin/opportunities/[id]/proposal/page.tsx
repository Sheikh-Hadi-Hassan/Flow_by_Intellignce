"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { CommercialRoute } from "../../../../../../components/commercial/CommercialRoute";
import {
  MoneyLine,
  OpportunityNav,
  proposalBadge,
} from "../../../../../../components/commercial/Status";
import { Button } from "../../../../../../components/ui/Button";
import {
  SectionHeader,
  StatusBadge,
} from "../../../../../../components/ui/Display";
import { useCommercialClient } from "../../../../../../lib/commercial/use-commercial";
import type { ProposalVersionRecord } from "../../../../../../lib/commercial/api";

function ProposalPage() {
  const workspace = useParams().workspace as string;
  const opportunityId = useParams().id as string;
  const api = useCommercialClient(workspace);
  const [proposals, setProposals] = useState<readonly ProposalVersionRecord[]>(
    [],
  );
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!api) return;
    void api.listProposals(opportunityId).then(setProposals);
  }, [api, opportunityId]);

  const latest = proposals.at(-1);
  const totalMinor =
    typeof latest?.calculation?.totalMinor === "string"
      ? latest.calculation.totalMinor
      : undefined;

  async function generateProposal() {
    if (!api) return;
    try {
      await api.generateProposal(opportunityId);
      setProposals(await api.listProposals(opportunityId));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to generate proposal.",
      );
    }
  }

  async function submitForReview() {
    if (!api || !latest) return;
    await api.submitProposal(latest.id);
    setProposals(await api.listProposals(opportunityId));
  }

  async function approveProposal() {
    if (!api || !latest) return;
    await api.approveProposal(latest.id);
    setProposals(await api.listProposals(opportunityId));
  }

  async function shareWithClient() {
    if (!api || !latest) return;
    const share = await api.shareProposal(latest.id);
    setShareToken(share.token);
    setProposals(await api.listProposals(opportunityId));
  }

  return (
    <>
      <SectionHeader
        eyebrow="Proposal"
        title="Versioned client proposal"
        description="Generated from the approved brief. Approved versions are immutable."
      />
      <OpportunityNav workspace={workspace} opportunityId={opportunityId} />
      {error && <p role="alert">{error}</p>}
      {latest && (
        <>
          <StatusBadge variant={proposalBadge(latest.status)}>
            {latest.status.replaceAll("_", " ")}
          </StatusBadge>
          {totalMinor && (
            <MoneyLine label="Total" minor={totalMinor} currency="USD" />
          )}
          <div className="flow-panel">
            {latest.sections.map((section) => (
              <article key={section.sectionKey}>
                <h3>{section.title}</h3>
                <p>{section.body}</p>
              </article>
            ))}
          </div>
        </>
      )}
      <div className="flow-action-row">
        <Button disabled={!api} onClick={() => void generateProposal()}>
          Generate proposal
        </Button>
        {latest && latest.status === "draft" && (
          <Button onClick={() => void submitForReview()}>
            Submit for review
          </Button>
        )}
        {latest && latest.status === "in_review" && (
          <Button onClick={() => void approveProposal()}>Approve proposal</Button>
        )}
        {latest && latest.status === "approved" && (
          <Button onClick={() => void shareWithClient()}>
            Share with client
          </Button>
        )}
      </div>
      {shareToken && (
        <p>
          Client review link token (one-time):{" "}
          <code>/review/{shareToken}</code>
        </p>
      )}
    </>
  );
}

export default function Page() {
  return (
    <CommercialRoute>
      <ProposalPage />
    </CommercialRoute>
  );
}
