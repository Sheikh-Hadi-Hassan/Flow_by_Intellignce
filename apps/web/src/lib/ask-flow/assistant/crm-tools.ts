import { CRM_CORE_BLOCK_ID, northstarCrmSeed } from "@flow/contracts";
import { isCrmCoreActive } from "../../building-blocks/store";
import { executeBusinessQuery } from "../business-query/executor";
import { createBusinessEntityRegistry } from "../business-query/registry";
import type { BusinessQueryPlan } from "../business-query/types";
import type { AskApplicationContext } from "../types";
import type { AskToolCall, AskToolResult } from "./types";

const AS_OF = "Today, 08:12";

function deny(
  name: AskToolCall["name"],
  workspaceId: string,
  message: string,
): AskToolResult {
  return {
    ok: false,
    name,
    workspaceId,
    recordIds: [],
    asOf: AS_OF,
    values: {},
    evidence: [],
    related: [],
    actions: [],
    error: { code: "unavailable", message },
  };
}

export function runCrmAskTool(
  call: AskToolCall,
  context: AskApplicationContext,
  seed: ReturnType<typeof northstarCrmSeed> = northstarCrmSeed(),
): AskToolResult | null {
  const crmTools = new Set([
    "list_clients",
    "get_client_360",
    "list_clients_by_segment",
    "summarize_client_relationship",
    "list_inactive_clients",
    "find_duplicate_clients",
    "explain_client_health",
    "list_client_opportunities",
    "list_client_projects",
    "list_client_contracts",
    "list_client_invoices",
    "propose_client_update",
    "propose_duplicate_merge",
  ]);
  if (!crmTools.has(call.name) && call.name !== "search_clients") return null;
  const crmActive = Array.isArray(context.activeBuildingBlocks)
    ? context.activeBuildingBlocks.includes(CRM_CORE_BLOCK_ID)
    : isCrmCoreActive();
  if (!crmActive) {
    if (crmTools.has(call.name)) {
      return deny(
        call.name,
        context.workspaceId,
        "CRM Core is not active in this workspace.",
      );
    }
    return null;
  }
  const href = `/${context.workspaceId}/admin/clients`;
  const query = (call.args.query ?? "").toLowerCase();

  if (call.name === "list_clients") {
    const plan: BusinessQueryPlan = {
      version: 1,
      operation: "list",
      entity: "client",
      fields: [
        "id",
        "name",
        "industry",
        "lifecycleStage",
        "status",
        "ownerName",
        "href",
      ],
      filters: [],
      sort: [],
      limit: 100,
    };
    const query = executeBusinessQuery(
      plan,
      context,
      createBusinessEntityRegistry({ clients: seed.clients }),
    );
    if (!query.ok) {
      return deny(call.name, context.workspaceId, query.error.message);
    }
    return {
      ok: true,
      name: call.name,
      workspaceId: context.workspaceId,
      recordIds: query.recordIds,
      asOf: AS_OF,
      values: {
        count: query.count,
        clients: query.rows,
        queryPlan: {
          version: 1,
          operation: plan.operation,
          entity: plan.entity,
        },
        queryExecution: {
          executorCount: 1,
          adapterCount: query.adapterExecutions,
        },
      },
      evidence: query.evidence,
      related: [],
      actions: [],
    };
  }

  if (call.name === "search_clients") {
    const matches = seed.clients.filter(
      (row) => !query || row.name.toLowerCase().includes(query),
    );
    return {
      ok: true,
      name: call.name,
      workspaceId: context.workspaceId,
      recordIds: matches.map((row) => row.id),
      asOf: AS_OF,
      values: {
        clients: matches.slice(0, 8).map((row) => row.name),
        records: matches.slice(0, 8).map((row) => row.name),
      },
      evidence: [
        {
          id: "ev-crm-directory",
          kind: "system-record",
          label: "CRM Core directory",
          source: `${seed.clients.length} seeded clients`,
          capturedAtLabel: AS_OF,
          claim: "FACT",
          trust: "high",
          href,
        },
      ],
      related: matches.slice(0, 3).map((row) => ({
        id: row.id,
        label: row.name,
        href: `${href}/${row.id}`,
      })),
      actions: [],
    };
  }

  if (
    call.name === "get_client_360" ||
    call.name === "summarize_client_relationship" ||
    call.name === "explain_client_health" ||
    call.name.startsWith("list_client_")
  ) {
    const client =
      seed.clients.find((row) =>
        query
          ? row.name.toLowerCase().includes(query)
          : row.name === "Meridian Health",
      ) ?? seed.clients[1]!;
    return {
      ok: true,
      name: call.name,
      workspaceId: context.workspaceId,
      recordIds: [client.id],
      asOf: AS_OF,
      values: {
        name: client.name,
        stage: client.lifecycleStage,
        owner: client.owner.name,
        health: client.healthScore,
        lastInteraction: client.lastInteractionLabel,
        related: client.related.map((row) => row.label),
        contacts: client.contacts.map(
          (row) => `${row.firstName} ${row.lastName}`,
        ),
      },
      evidence: [
        {
          id: `ev-${client.demoKey}`,
          kind: "system-record",
          label: `${client.name} CRM record`,
          source: client.owner.name,
          capturedAtLabel: AS_OF,
          claim: "FACT",
          trust: "high",
          href: `${href}/${client.id}`,
        },
      ],
      related: [
        { id: client.id, label: client.name, href: `${href}/${client.id}` },
      ],
      actions: [],
    };
  }

  if (
    call.name === "list_clients_by_segment" ||
    call.name === "list_inactive_clients"
  ) {
    const rows = seed.clients.filter((row) =>
      call.name === "list_inactive_clients"
        ? row.lifecycleStage === "dormant" || row.lifecycleStage === "former"
        : true,
    );
    return {
      ok: true,
      name: call.name,
      workspaceId: context.workspaceId,
      recordIds: rows.map((row) => row.id),
      asOf: AS_OF,
      values: {
        clients: rows
          .slice(0, 8)
          .map((row) => `${row.name} (${row.lifecycleStage})`),
      },
      evidence: [
        {
          id: "ev-crm-segments",
          kind: "system-record",
          label: "CRM Core segments",
          source: "Deterministic lifecycle stages",
          capturedAtLabel: AS_OF,
          claim: "FACT",
          trust: "high",
          href: `${href}/segments`,
        },
      ],
      related: rows.slice(0, 3).map((row) => ({
        id: row.id,
        label: row.name,
        href: `${href}/${row.id}`,
      })),
      actions: [],
    };
  }

  if (call.name === "find_duplicate_clients") {
    const dup = seed.duplicates[0]!;
    const left = seed.clients.find((row) => row.id === dup.leftId);
    const right = seed.clients.find((row) => row.id === dup.rightId);
    return {
      ok: true,
      name: call.name,
      workspaceId: context.workspaceId,
      recordIds: [dup.id],
      asOf: AS_OF,
      values: {
        pair: `${left?.name} / ${right?.name}`,
        score: dup.score,
        reason: dup.reason,
      },
      evidence: [
        {
          id: "ev-crm-dup",
          kind: "calculation",
          label: "Duplicate score",
          source: dup.reason,
          capturedAtLabel: AS_OF,
          claim: "FACT",
          trust: "high",
          href: `${href}/duplicates`,
        },
      ],
      related: [left, right]
        .filter((row): row is NonNullable<typeof row> => Boolean(row))
        .map((row) => ({
          id: row.id,
          label: row.name,
          href: `${href}/${row.id}`,
        })),
      actions: [
        {
          id: "propose-merge",
          label: "Propose merge (requires approval)",
          href: `${href}/duplicates`,
        },
      ],
    };
  }

  if (
    call.name === "propose_client_update" ||
    call.name === "propose_duplicate_merge"
  ) {
    return {
      ok: true,
      name: call.name,
      workspaceId: context.workspaceId,
      recordIds: [],
      asOf: AS_OF,
      values: {
        status: "proposed",
        note: "This write is a proposal. A founder must approve it before CRM records change.",
      },
      evidence: [
        {
          id: "ev-crm-proposal",
          kind: "system-record",
          label: "Protected CRM write",
          source: "Action Wall",
          capturedAtLabel: AS_OF,
          claim: "FACT",
          trust: "high",
          href: `${href}/duplicates`,
        },
      ],
      related: [],
      actions: [
        { id: "review", label: "Review proposal", href: `${href}/duplicates` },
      ],
    };
  }

  return null;
}
