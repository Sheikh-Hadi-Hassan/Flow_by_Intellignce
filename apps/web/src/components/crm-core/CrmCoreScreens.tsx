"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";

import type { CrmClientSeed } from "@flow/contracts";
import { useBuildingBlocks } from "../../lib/building-blocks/use-building-blocks";
import { setCrmUiState } from "../../lib/building-blocks/store";
import { SectionHeader, StatusBadge } from "../ui/Display";
import { Button } from "../ui/Button";

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function stageVariant(
  stage: string,
): "default" | "warning" | "danger" | "success" {
  if (stage === "at_risk") return "warning";
  if (stage === "former" || stage === "dormant") return "danger";
  if (stage === "active") return "success";
  return "default";
}

export function CrmCoreDirectory({
  workspace,
}: {
  workspace: string;
}) {
  const blocks = useBuildingBlocks();
  const params = useSearchParams();
  const queried = params.get("state");
  useEffect(() => {
    if (
      queried === "empty" ||
      queried === "loading" ||
      queried === "populated" ||
      queried === "error" ||
      queried === "restricted" ||
      queried === "dense"
    ) {
      setCrmUiState(queried);
    }
  }, [queried]);
  const ui =
    queried === "empty" ||
    queried === "loading" ||
    queried === "populated" ||
    queried === "error" ||
    queried === "restricted" ||
    queried === "dense"
      ? queried
      : blocks.crmState;

  if (!blocks.active) {
    return (
      <div className="flow-bb">
        <SectionHeader
          eyebrow="CRM Core"
          title="Client directory is not active"
          description="Activate CRM Core from Building Blocks. Existing commercial records are not deleted."
        />
        <Link href={`/${workspace}/admin/building-blocks`}>
          Review CRM Core recommendation
        </Link>
      </div>
    );
  }

  if (ui === "loading") {
    return (
      <div className="flow-bb" data-testid="crm-state-loading">
        <p>Loading the client directory…</p>
      </div>
    );
  }
  if (ui === "error") {
    return (
      <div className="flow-bb" role="alert" data-testid="crm-state-error">
        <h1>Client directory could not load</h1>
        <p>The CRM snapshot is unavailable. Historical records were not deleted.</p>
      </div>
    );
  }
  if (ui === "restricted") {
    return (
      <div className="flow-bb" data-testid="crm-state-restricted">
        <h1>Client records are limited to founders</h1>
        <p>Your role cannot read CRM Core in this workspace.</p>
      </div>
    );
  }

  const clients = ui === "empty" ? [] : blocks.visibleClients;

  return (
    <div className="flow-bb">
      <SectionHeader
        eyebrow="CRM Core"
        title="Clients"
        description="Organisations, owners, and relationship health. Related opportunities stay on their own records."
      />
      <nav className="flow-bb-subnav" aria-label="CRM Core">
        <Link href={`/${workspace}/admin/clients`}>Directory</Link>
        <Link href={`/${workspace}/admin/clients/segments`}>Segments</Link>
        <Link href={`/${workspace}/admin/clients/duplicates`}>Duplicates</Link>
        <Link href={`/${workspace}/admin/building-blocks`}>Config</Link>
      </nav>
      {clients.length === 0 ? (
        <p data-testid="crm-state-empty">No clients in this directory yet.</p>
      ) : (
        <>
          <div className="flow-bb-directory__head" aria-hidden>
            <span>Client</span>
            <span>Industry</span>
            <span>Stage</span>
            <span>Owner</span>
          </div>
          <ul className="flow-bb-list flow-bb-directory" data-testid="crm-directory">
            {clients.map((client) => (
              <li key={client.id}>
                <Link href={`/${workspace}/admin/clients/${client.id}`}>
                  <span>{client.name}</span>
                  <span>{titleCase(client.industry)}</span>
                  <StatusBadge variant={stageVariant(client.lifecycleStage)}>
                    {titleCase(client.lifecycleStage)}
                  </StatusBadge>
                  <span>{client.owner.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export function CrmClient360({
  workspace,
  clientId,
}: {
  workspace: string;
  clientId: string;
}) {
  const blocks = useBuildingBlocks();
  const client = blocks.visibleClients.find((row) => row.id === clientId);
  if (!blocks.active) {
    return <p>CRM Core is not active.</p>;
  }
  if (!client) {
    return <p>Client not found in this workspace.</p>;
  }
  return (
    <div className="flow-bb" data-testid="crm-360">
      <SectionHeader
        eyebrow="Client 360"
        title={client.name}
        description={`${titleCase(client.industry)} · Owner ${client.owner.name}`}
      />
      <p className="flow-bb-360__lede">
        <StatusBadge variant={stageVariant(client.lifecycleStage)}>
          {titleCase(client.lifecycleStage)}
        </StatusBadge>{" "}
        Relationship health {client.healthScore}. Last contact{" "}
        {client.lastInteractionLabel.toLowerCase()}.
      </p>
      <h2>Contacts</h2>
      <ul className="flow-bb-list flow-bb-plain">
        {client.contacts.map((contact) => (
          <li key={contact.id}>
            {contact.firstName} {contact.lastName} · {contact.title}
            <br />
            {contact.email}
            {contact.isPrimary ? " · Primary" : ""}
          </li>
        ))}
      </ul>
      <h2>Relationship timeline</h2>
      <ol className="flow-bb-list flow-bb-plain">
        {client.interactions.map((event) => (
          <li key={event.id}>
            {event.atLabel} · {event.actorName} · {event.summary}
          </li>
        ))}
      </ol>
      <h2>Related records</h2>
      <ul className="flow-bb-list flow-bb-plain">
        {client.related.length === 0 ? (
          <li>No linked opportunities, projects, contracts, or invoices.</li>
        ) : (
          client.related.map((row) => (
            <li key={row.id}>
              <Link href={row.href}>
                {titleCase(row.kind)} · {row.label}
              </Link>
            </li>
          ))
        )}
      </ul>
      <p className="flow-bb-360__next">
        Next step: {client.owner.name} follows up on the open{" "}
        {client.related[0]?.label ?? "relationship"} before the account goes
        quiet again.
      </p>
    </div>
  );
}

export function CrmSegments({ workspace }: { workspace: string }) {
  const blocks = useBuildingBlocks();
  const groups = useMemo(() => {
    const map = new Map<string, CrmClientSeed[]>();
    for (const client of blocks.visibleClients) {
      const key = client.lifecycleStage;
      map.set(key, [...(map.get(key) ?? []), client]);
    }
    return map;
  }, [blocks.visibleClients]);
  if (!blocks.active) return <p>CRM Core is not active.</p>;
  return (
    <div className="flow-bb">
      <SectionHeader eyebrow="CRM Core" title="Segments" />
      <Link href={`/${workspace}/admin/clients`}>Back to directory</Link>
      {[...groups.entries()].map(([stage, rows]) => (
        <section key={stage}>
          <h2>{stage.replaceAll("_", " ")}</h2>
          <p>{rows.length} clients</p>
          <ul className="flow-bb-list flow-bb-plain">
            {rows.map((client) => (
              <li key={client.id}>
                <Link href={`/${workspace}/admin/clients/${client.id}`}>
                  {client.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function CrmDuplicates({ workspace }: { workspace: string }) {
  const blocks = useBuildingBlocks();
  if (!blocks.active) return <p>CRM Core is not active.</p>;
  return (
    <div className="flow-bb">
      <SectionHeader
        eyebrow="CRM Core"
        title="Duplicate review"
        description="Merging is a protected action. Ask Flow can only propose it."
      />
      <ul className="flow-bb-list flow-bb-plain" data-testid="crm-duplicates">
        {blocks.duplicates.map((row) => {
          const left = blocks.clients.find((client) => client.id === row.leftId);
          const right = blocks.clients.find((client) => client.id === row.rightId);
          return (
            <li key={row.id}>
              <p>
                Score {row.score} · {row.reason}
              </p>
              <StatusBadge>{titleCase(row.status)}</StatusBadge>
              <div className="flow-bb-compare">
                <dl>
                  <dt>Record A</dt>
                  <dd>
                    <Link href={`/${workspace}/admin/clients/${left?.id}`}>
                      {left?.name}
                    </Link>
                  </dd>
                  <dt>Industry</dt>
                  <dd>{titleCase(left?.industry ?? "")}</dd>
                  <dt>Stage</dt>
                  <dd>{titleCase(left?.lifecycleStage ?? "")}</dd>
                  <dt>Owner</dt>
                  <dd>{left?.owner.name}</dd>
                </dl>
                <dl>
                  <dt>Record B</dt>
                  <dd>
                    <Link href={`/${workspace}/admin/clients/${right?.id}`}>
                      {right?.name}
                    </Link>
                  </dd>
                  <dt>Industry</dt>
                  <dd>{titleCase(right?.industry ?? "")}</dd>
                  <dt>Stage</dt>
                  <dd>{titleCase(right?.lifecycleStage ?? "")}</dd>
                  <dt>Owner</dt>
                  <dd>{right?.owner.name}</dd>
                </dl>
              </div>
              <Button disabled>
                Merge requires approval
              </Button>
            </li>
          );
        })}
      </ul>
      <Link href={`/${workspace}/admin/clients`}>Back to directory</Link>
    </div>
  );
}
