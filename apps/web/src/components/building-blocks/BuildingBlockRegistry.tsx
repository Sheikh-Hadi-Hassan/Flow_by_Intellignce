"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { crmCoreManifest } from "../../lib/building-blocks/store";
import { useBuildingBlocks } from "../../lib/building-blocks/use-building-blocks";
import { CRM_CORE_DEFAULT_CONFIGURATION } from "@flow/contracts";
import { Button } from "../ui/Button";
import { SectionHeader, StatusBadge } from "../ui/Display";

const EVIDENCE_COPY: Readonly<Record<string, string>> = {
  "industry:agency": "Agency and studio work with named clients",
  "problem:client-tracking": "Needs a governed client record, not a spreadsheet",
  "sales-process:relationship": "Sells through relationships and proposals",
  "verified-fact:has-clients": "Discovery already named existing clients",
  "goal:client-retention": "Goal includes keeping and growing accounts",
};

const ENTITY_COPY: Readonly<Record<string, string>> = {
  "crm.client": "Client organisations",
  "crm.contact": "Contacts",
  "crm.interaction": "Interaction history",
  "crm.segment_membership": "Segments",
  "crm.duplicate_candidate": "Duplicate candidates",
};

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function BuildingBlockRegistryScreen({
  workspace,
}: {
  workspace: string;
}) {
  const blocks = useBuildingBlocks();
  const recommendation = blocks.recommendations[0];
  const status = blocks.installation?.status ?? "available";
  const listedElsewhere =
    status !== "available" && status !== "deprecated";
  const [threshold, setThreshold] = useState(
    Number(blocks.installation?.configuration.duplicateThreshold ?? 80),
  );
  const outcome = useMemo(
    () =>
      "A governed client directory, relationship owners, and duplicate review — without a second CRM database.",
    [],
  );
  const evidence = (recommendation?.requirementEvidence ?? []).map(
    (row) => EVIDENCE_COPY[row] ?? row,
  );
  const entities = crmCoreManifest.ownedEntities.map(
    (row) => ENTITY_COPY[row] ?? row,
  );

  return (
    <div className="flow-bb">
      <SectionHeader
        eyebrow="Building blocks"
        title="Compose this business"
        description="AI can recommend and prepare configuration. A founder still approves activation."
      />

      <section className="flow-bb-section" aria-labelledby="bb-recommended">
        <div className="flow-bb-section__head">
          <h2 id="bb-recommended">Recommended for your business</h2>
          <span className="flow-bb-section__meta">
            {recommendation ? "1 block" : "None"}
          </span>
        </div>
        {recommendation ? (
          <article className="flow-bb-row" data-testid="bb-recommended-crm">
            <p className="flow-bb-row__kicker">Commercial</p>
            <h3>{crmCoreManifest.name}</h3>
            <p className="flow-bb-row__reason">{recommendation.reason}</p>
            <p className="flow-bb-row__status">
              Status <StatusBadge>{titleCase(status)}</StatusBadge>
            </p>
            {status === "recommended" || status === "configuring" ? (
              <div className="flow-bb-config">
                <label htmlFor="dup-threshold">
                  Duplicate detection threshold
                </label>
                <input
                  id="dup-threshold"
                  type="number"
                  min={50}
                  max={100}
                  value={threshold}
                  onChange={(event) =>
                    setThreshold(Number(event.target.value))
                  }
                />
                <Button
                  onClick={() =>
                    blocks.configure({
                      ...CRM_CORE_DEFAULT_CONFIGURATION,
                      duplicateThreshold: threshold,
                    })
                  }
                >
                  Save configuration
                </Button>
                <Button
                  onClick={() =>
                    blocks.submit({
                      ...CRM_CORE_DEFAULT_CONFIGURATION,
                      duplicateThreshold: threshold,
                    })
                  }
                >
                  Submit for approval
                </Button>
              </div>
            ) : null}
            {status === "awaiting_approval" ? (
              <Button onClick={blocks.approve}>Approve activation</Button>
            ) : null}
            {status === "active" ? (
              <div className="flow-bb-actions">
                <Link href={`/${workspace}/admin/clients`}>
                  Open client directory
                </Link>
                <Button variant="secondary" onClick={blocks.suspend}>
                  Suspend
                </Button>
              </div>
            ) : null}
            <dl className="flow-bb-facts">
              <div>
                <dt>Why this business needs it</dt>
                <dd>{recommendation.reason}</dd>
              </div>
              <div>
                <dt>Verified requirement</dt>
                <dd>{evidence.join(". ")}.</dd>
              </div>
              <div>
                <dt>Data it creates or accesses</dt>
                <dd>{entities.join(", ")}</dd>
              </div>
              <div>
                <dt>Roles that can use it</dt>
                <dd>Founder and operators who can read or manage clients</dd>
              </div>
              <div>
                <dt>Ask Flow after activation</dt>
                <dd>
                  Search clients, open a client 360, list inactive accounts,
                  and find likely duplicates — with record references on every
                  answer.
                </dd>
              </div>
              <div>
                <dt>Dependencies</dt>
                <dd>
                  {recommendation.dependencies.length > 0
                    ? recommendation.dependencies.join(", ")
                    : "None. CRM Core can activate on its own."}
                </dd>
              </div>
              <div>
                <dt>Dependency or risk</dt>
                <dd>{recommendation.risks[0]}</dd>
              </div>
              <div>
                <dt>Expected outcome</dt>
                <dd>{outcome}</dd>
              </div>
              <div>
                <dt>Permissions introduced</dt>
                <dd>
                  Propose a duplicate merge, and approve a merge. Existing
                  client permissions are unchanged.
                </dd>
              </div>
            </dl>
            {status === "suspended" ? (
              <p className="flow-bb-row__note">
                CRM Core is suspended. Historical client records are retained
                and hidden from the operating surface.
              </p>
            ) : null}
          </article>
        ) : null}
      </section>

      <section className="flow-bb-section" aria-labelledby="bb-active">
        <div className="flow-bb-section__head">
          <h2 id="bb-active">Active building blocks</h2>
        </div>
        <p className="flow-bb-empty">
          {status === "active"
            ? "CRM Core is active in this workspace."
            : "No building blocks are active."}
        </p>
      </section>

      <section className="flow-bb-section" aria-labelledby="bb-config">
        <div className="flow-bb-section__head">
          <h2 id="bb-config">Configuration required</h2>
        </div>
        <p className="flow-bb-empty">
          {status === "recommended" || status === "configuring"
            ? "Set the duplicate threshold, then submit for founder approval."
            : status === "awaiting_approval"
              ? "Configuration is prepared. Activation still needs founder approval."
              : "No further configuration is required for CRM Core."}
        </p>
      </section>

      <section className="flow-bb-section" aria-labelledby="bb-available">
        <div className="flow-bb-section__head">
          <h2 id="bb-available">Available building blocks</h2>
        </div>
        {listedElsewhere ? (
          <p className="flow-bb-empty">
            No other first-party blocks are published yet. Sales Pipeline and
            later blocks are out of scope for this workspace.
          </p>
        ) : (
          <div className="flow-bb-row">
            <p className="flow-bb-row__kicker">Commercial</p>
            <h3>{crmCoreManifest.name}</h3>
            <p>{crmCoreManifest.description}</p>
          </div>
        )}
      </section>
    </div>
  );
}
