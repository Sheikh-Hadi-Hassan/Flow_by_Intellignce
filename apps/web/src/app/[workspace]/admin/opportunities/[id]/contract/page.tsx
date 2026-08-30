"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { CommercialRoute } from "../../../../../../components/commercial/CommercialRoute";
import {
  contractBadge,
  MoneyLine,
  OpportunityNav,
} from "../../../../../../components/commercial/Status";
import { Button } from "../../../../../../components/ui/Button";
import {
  SectionHeader,
  StatusBadge,
} from "../../../../../../components/ui/Display";
import { useCommercialClient } from "../../../../../../lib/commercial/use-commercial";
import type { ContractVersionRecord } from "../../../../../../lib/commercial/api";

function ContractPage() {
  const workspace = useParams().workspace as string;
  const opportunityId = useParams().id as string;
  const api = useCommercialClient(workspace);
  const [contracts, setContracts] = useState<readonly ContractVersionRecord[]>(
    [],
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!api) return;
    void api.listContracts(opportunityId).then(setContracts);
  }, [api, opportunityId]);

  const latest = contracts.at(-1);

  async function generateContract() {
    if (!api) return;
    try {
      await api.generateContract(opportunityId);
      setContracts(await api.listContracts(opportunityId));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to generate contract.",
      );
    }
  }

  async function submitForReview() {
    if (!api || !latest) return;
    await api.submitContract(latest.id);
    setContracts(await api.listContracts(opportunityId));
  }

  async function approveForClient() {
    if (!api || !latest) return;
    await api.approveContract(latest.id);
    setContracts(await api.listContracts(opportunityId));
  }

  async function recordClientAcceptance() {
    if (!api || !latest) return;
    await api.acceptContract(latest.id, "Client representative");
    setContracts(await api.listContracts(opportunityId));
  }

  return (
    <>
      <SectionHeader
        eyebrow="Contract"
        title="Executed agreement"
        description="Generated from an accepted proposal. Executed contracts are immutable."
      />
      <OpportunityNav workspace={workspace} opportunityId={opportunityId} />
      {error && <p role="alert">{error}</p>}
      {latest && (
        <>
          <StatusBadge variant={contractBadge(latest.status)}>
            {latest.status.replaceAll("_", " ")}
          </StatusBadge>
          {latest.paymentSchedule[0] && (
            <MoneyLine
              label="First payment"
              minor={latest.paymentSchedule[0].amountMinor}
              currency="USD"
            />
          )}
          <div className="flow-panel">
            {latest.clauses.map((clause) => (
              <article key={clause.title}>
                <h3>{clause.title}</h3>
                <p>{clause.body}</p>
              </article>
            ))}
            <h3>Parties</h3>
            <ul>
              {latest.parties.map((party) => (
                <li key={party.legalName}>
                  {party.partyRole}: {party.legalName}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
      <div className="flow-action-row">
        <Button disabled={!api} onClick={() => void generateContract()}>
          Generate contract
        </Button>
        {latest && latest.status === "draft" && (
          <Button onClick={() => void submitForReview()}>
            Submit for review
          </Button>
        )}
        {latest && latest.status === "in_review" && (
          <Button onClick={() => void approveForClient()}>
            Approve for client
          </Button>
        )}
        {latest && latest.status === "pending_client_acceptance" && (
          <Button onClick={() => void recordClientAcceptance()}>
            Record client acceptance
          </Button>
        )}
      </div>
    </>
  );
}

export default function Page() {
  return (
    <CommercialRoute>
      <ContractPage />
    </CommercialRoute>
  );
}
