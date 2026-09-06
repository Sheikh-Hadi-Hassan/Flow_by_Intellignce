import { northstarCrmSeed, type CrmClientSeed } from "@flow/contracts";

import type { BusinessQueryAdapter } from "./types";

export const CLIENT_READABLE_FIELDS = [
  "id",
  "name",
  "industry",
  "lifecycleStage",
  "status",
  "ownerName",
  "href",
] as const;

export const CLIENT_FILTER_FIELDS = [
  "id",
  "name",
  "industry",
  "lifecycleStage",
  "status",
  "ownerName",
] as const;

export function createClientBusinessQueryAdapter(
  clients: readonly CrmClientSeed[] = northstarCrmSeed().clients,
): BusinessQueryAdapter {
  return {
    load(context) {
      const href = `/${context.workspaceId}/admin/clients`;
      return clients.map((row) => ({
        id: row.id,
        name: row.name,
        industry: row.industry,
        lifecycleStage: row.lifecycleStage,
        status: row.status,
        ownerName: row.owner.name,
        href: `${href}/${row.id}`,
      }));
    },
  };
}
