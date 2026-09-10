"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BriefcaseBusiness,
  ChevronRight,
  Clock3,
  Mail,
  Search,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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

function CrmNavigation({
  workspace,
  active,
}: {
  workspace: string;
  active: "companies" | "segments" | "duplicates";
}) {
  return (
    <nav className="flow-crm-nav" aria-label="Flow CRM">
      <Link
        href={`/${workspace}/admin/clients`}
        aria-current={active === "companies" ? "page" : undefined}
      >
        Companies
      </Link>
      <Link href={`/${workspace}/admin/opportunities`}>Opportunities</Link>
      <Link
        href={`/${workspace}/admin/clients/segments`}
        aria-current={active === "segments" ? "page" : undefined}
      >
        Segments
      </Link>
      <Link
        href={`/${workspace}/admin/clients/duplicates`}
        aria-current={active === "duplicates" ? "page" : undefined}
      >
        Duplicates
      </Link>
    </nav>
  );
}

export function CrmCoreDirectory({ workspace }: { workspace: string }) {
  const blocks = useBuildingBlocks();
  const params = useSearchParams();
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("all");
  const [sort, setSort] = useState("name");
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
        <p>
          The CRM snapshot is unavailable. Historical records were not deleted.
        </p>
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
  const visibleClients = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...clients]
      .filter(
        (client) =>
          (stage === "all" || client.lifecycleStage === stage) &&
          (!query ||
            client.name.toLowerCase().includes(query) ||
            client.industry.toLowerCase().includes(query) ||
            client.owner.name.toLowerCase().includes(query)),
      )
      .sort((left, right) => {
        if (sort === "health") return right.healthScore - left.healthScore;
        if (sort === "recent") {
          return left.daysSinceInteraction - right.daysSinceInteraction;
        }
        return left.name.localeCompare(right.name);
      });
  }, [clients, search, sort, stage]);
  const activeCount = clients.filter(
    (client) => client.lifecycleStage === "active",
  ).length;
  const attentionCount = clients.filter(
    (client) =>
      client.lifecycleStage === "at_risk" ||
      client.lifecycleStage === "dormant",
  ).length;
  const contactCount = clients.reduce(
    (count, client) => count + client.contacts.length,
    0,
  );

  return (
    <div className="flow-bb flow-crm">
      <div className="flow-crm-heading">
        <SectionHeader
          eyebrow="Flow CRM"
          title="Companies"
          description="Customer relationships, ownership, and activity in one workspace-scoped view."
        />
        <span className="flow-crm-heading__status">
          Verified workspace records
        </span>
      </div>
      <CrmNavigation workspace={workspace} active="companies" />
      {clients.length === 0 ? (
        <div className="flow-crm-empty" data-testid="crm-state-empty">
          <BriefcaseBusiness size={22} aria-hidden />
          <h2>No companies yet</h2>
          <p>Authorized company records will appear here when available.</p>
        </div>
      ) : (
        <>
          <dl className="flow-crm-summary" aria-label="CRM summary">
            <div>
              <dt>Companies</dt>
              <dd>{clients.length}</dd>
            </div>
            <div>
              <dt>Active</dt>
              <dd>{activeCount}</dd>
            </div>
            <div>
              <dt>Needs attention</dt>
              <dd>{attentionCount}</dd>
            </div>
            <div>
              <dt>Contacts</dt>
              <dd>{contactCount}</dd>
            </div>
          </dl>
          <div className="flow-crm-toolbar">
            <label className="flow-crm-search">
              <span className="sr-only">Search companies</span>
              <Search size={16} aria-hidden />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search companies, industries, or owners"
              />
            </label>
            <label className="flow-crm-select">
              <span>Relationship</span>
              <select
                aria-label="Relationship"
                value={stage}
                onChange={(event) => setStage(event.target.value)}
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="lead">Lead</option>
                <option value="at_risk">At risk</option>
                <option value="dormant">Dormant</option>
                <option value="former">Former</option>
              </select>
            </label>
            <label className="flow-crm-select">
              <span>Sort</span>
              <select
                aria-label="Sort"
                value={sort}
                onChange={(event) => setSort(event.target.value)}
              >
                <option value="name">Company name</option>
                <option value="health">Relationship health</option>
                <option value="recent">Recent contact</option>
              </select>
            </label>
          </div>
          <p className="flow-crm-result-count" aria-live="polite">
            Showing {visibleClients.length} of {clients.length} companies
          </p>
          <div className="flow-bb-directory__head" aria-hidden>
            <span>Company</span>
            <span>Relationship</span>
            <span>Health</span>
            <span>Owner</span>
            <span>Last contact</span>
            <span />
          </div>
          <ul
            className="flow-bb-list flow-bb-directory"
            data-testid="crm-directory"
          >
            {visibleClients.map((client) => (
              <li key={client.id}>
                <Link href={`/${workspace}/admin/clients/${client.id}`}>
                  <span className="flow-crm-company">
                    <span className="flow-crm-company__mark" aria-hidden>
                      {client.name.charAt(0)}
                    </span>
                    <span>
                      <strong>{client.name}</strong>
                      <small>{titleCase(client.industry)}</small>
                    </span>
                  </span>
                  <span>
                    <StatusBadge variant={stageVariant(client.lifecycleStage)}>
                      {titleCase(client.lifecycleStage)}
                    </StatusBadge>
                  </span>
                  <span className="flow-crm-health">
                    <span aria-hidden>
                      <i style={{ width: `${client.healthScore}%` }} />
                    </span>
                    <b>{client.healthScore}</b>
                  </span>
                  <span className="flow-crm-owner">
                    <span aria-hidden>{client.owner.name.charAt(0)}</span>
                    {client.owner.name}
                  </span>
                  <span className="flow-crm-last-contact">
                    {client.lastInteractionLabel}
                  </span>
                  <ChevronRight size={16} aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
          {visibleClients.length === 0 ? (
            <div className="flow-crm-no-results">
              No companies match the current view.
            </div>
          ) : null}
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
    <div className="flow-bb flow-crm flow-crm-record" data-testid="crm-360">
      <Link className="flow-crm-back" href={`/${workspace}/admin/clients`}>
        <ArrowLeft size={15} aria-hidden /> Companies
      </Link>
      <div className="flow-crm-record__heading">
        <div className="flow-crm-record__identity">
          <span className="flow-crm-record__mark" aria-hidden>
            {client.name.charAt(0)}
          </span>
          <SectionHeader
            eyebrow="Flow CRM · Company"
            title={client.name}
            description={`${titleCase(client.industry)} · ${client.website.replace("https://", "")}`}
          />
        </div>
        <StatusBadge variant={stageVariant(client.lifecycleStage)}>
          {titleCase(client.lifecycleStage)}
        </StatusBadge>
      </div>
      <dl className="flow-crm-record__facts">
        <div>
          <dt>Relationship health</dt>
          <dd>{client.healthScore} / 100</dd>
        </div>
        <div>
          <dt>Relationship owner</dt>
          <dd>{client.owner.name}</dd>
        </div>
        <div>
          <dt>Last contact</dt>
          <dd>{client.lastInteractionLabel}</dd>
        </div>
        <div>
          <dt>Company type</dt>
          <dd>{titleCase(client.clientType)}</dd>
        </div>
      </dl>
      <div className="flow-crm-record__grid">
        <section className="flow-crm-record__section">
          <header>
            <Users size={17} aria-hidden />
            <div>
              <h2>Contacts</h2>
              <p>{client.contacts.length} people linked to this company</p>
            </div>
          </header>
          <ul className="flow-bb-list flow-crm-contact-list">
            {client.contacts.map((contact) => (
              <li key={contact.id}>
                <span className="flow-crm-contact-list__mark" aria-hidden>
                  {contact.firstName.charAt(0)}
                  {contact.lastName.charAt(0)}
                </span>
                <span>
                  <strong>
                    {contact.firstName} {contact.lastName}
                  </strong>
                  <small>{contact.title}</small>
                </span>
                <a
                  href={`mailto:${contact.email}`}
                  aria-label={`Email ${contact.firstName} ${contact.lastName}`}
                >
                  <Mail size={15} aria-hidden />
                </a>
              </li>
            ))}
          </ul>
        </section>
        <section className="flow-crm-record__section">
          <header>
            <Clock3 size={17} aria-hidden />
            <div>
              <h2>Recent activity</h2>
              <p>Verified relationship history</p>
            </div>
          </header>
          <ol className="flow-bb-list flow-crm-activity-list">
            {client.interactions.map((event) => (
              <li key={event.id}>
                <span>{event.atLabel}</span>
                <strong>{event.summary}</strong>
                <small>
                  {event.actorName} · {titleCase(event.kind)}
                </small>
              </li>
            ))}
          </ol>
        </section>
      </div>
      <section className="flow-crm-record__section flow-crm-record__section--related">
        <header>
          <BriefcaseBusiness size={17} aria-hidden />
          <div>
            <h2>Connected work</h2>
            <p>Flow-owned lifecycle records linked to this company</p>
          </div>
        </header>
        {client.related.length === 0 ? (
          <p className="flow-crm-record__empty">
            No linked opportunities, projects, contracts, or invoices.
          </p>
        ) : (
          <ul className="flow-bb-list flow-crm-related-list">
            {client.related.map((row) => (
              <li key={row.id}>
                <Link href={row.href}>
                  <span>
                    <small>{titleCase(row.kind)}</small>
                    <strong>{row.label}</strong>
                  </span>
                  <ChevronRight size={16} aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
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
    <div className="flow-bb flow-crm">
      <SectionHeader eyebrow="Flow CRM" title="Company segments" />
      <CrmNavigation workspace={workspace} active="segments" />
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
    <div className="flow-bb flow-crm">
      <SectionHeader
        eyebrow="Flow CRM · Data quality"
        title="Potential duplicates"
        description="Merging is a protected action. Ask Flow can only propose it."
      />
      <CrmNavigation workspace={workspace} active="duplicates" />
      <ul className="flow-bb-list flow-bb-plain" data-testid="crm-duplicates">
        {blocks.duplicates.map((row) => {
          const left = blocks.clients.find(
            (client) => client.id === row.leftId,
          );
          const right = blocks.clients.find(
            (client) => client.id === row.rightId,
          );
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
              <Button disabled>Merge requires approval</Button>
            </li>
          );
        })}
      </ul>
      <Link href={`/${workspace}/admin/clients`}>Back to directory</Link>
    </div>
  );
}
