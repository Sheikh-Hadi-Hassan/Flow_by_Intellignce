import { apiRequest } from "../api/client";
import type {
  BusinessLocationSeed,
  BusinessRegistrySeed,
  BusinessRegistryView,
} from "@flow/contracts";

export interface BusinessRegistryApi {
  get(): Promise<BusinessRegistryView>;
  seed(options?: { validateOnly?: boolean }): Promise<BusinessRegistrySeed>;
  updateProfile(input: {
    tradingName?: string;
    website?: string;
    reason?: string;
  }): Promise<BusinessRegistrySeed>;
  upsertLocation(
    location: BusinessLocationSeed,
    reason?: string,
  ): Promise<BusinessRegistrySeed>;
  archiveLocation(
    locationId: string,
    reason: string,
  ): Promise<BusinessRegistrySeed>;
  proposePrimary(locationId: string, reason: string): Promise<unknown>;
  confirmPrimary(
    locationId: string,
    reason: string,
  ): Promise<BusinessRegistrySeed>;
  addDocument(
    document: BusinessRegistrySeed["documents"][number],
  ): Promise<BusinessRegistrySeed>;
  assignComplianceOwner(input: {
    area: string;
    ownerName: string;
    ownerMemberId: string;
  }): Promise<BusinessRegistrySeed>;
  listEvents(): Promise<readonly { name: string; recordId: string }[]>;
}

function path(workspaceId: string, suffix = "") {
  return `/api/v1/workspaces/${workspaceId}/building-blocks/registry${suffix}`;
}

export function createBusinessRegistryApi(input: {
  readonly token: string;
  readonly workspaceId: string;
}): BusinessRegistryApi {
  const opts = {
    token: input.token,
    workspaceId: input.workspaceId,
  };
  return {
    get: () => apiRequest<BusinessRegistryView>(path(input.workspaceId), opts),
    seed: (options) =>
      apiRequest<BusinessRegistrySeed>(path(input.workspaceId, "/seed"), {
        ...opts,
        method: "POST",
        body: { validateOnly: options?.validateOnly ?? false },
      }),
    updateProfile: (body) =>
      apiRequest<BusinessRegistrySeed>(path(input.workspaceId), {
        ...opts,
        method: "PATCH",
        body,
      }),
    upsertLocation: (location, reason) =>
      apiRequest<BusinessRegistrySeed>(path(input.workspaceId, "/locations"), {
        ...opts,
        method: "POST",
        body: { location, ...(reason ? { reason } : {}) },
      }),
    archiveLocation: (locationId, reason) =>
      apiRequest<BusinessRegistrySeed>(
        path(input.workspaceId, `/locations/${locationId}/archive`),
        { ...opts, method: "POST", body: { reason } },
      ),
    proposePrimary: (locationId, reason) =>
      apiRequest(path(input.workspaceId, `/locations/${locationId}/primary`), {
        ...opts,
        method: "POST",
        body: { reason },
      }),
    confirmPrimary: (locationId, reason) =>
      apiRequest<BusinessRegistrySeed>(
        path(input.workspaceId, `/locations/${locationId}/primary/confirm`),
        { ...opts, method: "POST", body: { reason } },
      ),
    addDocument: (document) =>
      apiRequest<BusinessRegistrySeed>(
        path(input.workspaceId, "/documents"),
        { ...opts, method: "POST", body: { document } },
      ),
    assignComplianceOwner: (body) =>
      apiRequest<BusinessRegistrySeed>(
        path(input.workspaceId, "/compliance-owners"),
        { ...opts, method: "POST", body },
      ),
    listEvents: () =>
      apiRequest<readonly { name: string; recordId: string }[]>(
        path(input.workspaceId, "/events"),
        opts,
      ),
  };
}
