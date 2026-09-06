import {
  missingRegistrationFields,
  northstarBusinessRegistrySeed,
  permissionsForRegistryRole,
  presentBusinessRegistry,
  registryBusinessManifest,
  type BusinessLocationSeed,
  type BusinessRegistryRole,
  type BusinessRegistrySeed,
  type BusinessRegistryView,
} from "@flow/contracts";

export const BUSINESS_REGISTRY_STORAGE_KEY = "flow-business-registry-v1";

export type BusinessRegistryUiState =
  | "empty"
  | "loading"
  | "populated"
  | "partial"
  | "error"
  | "restricted"
  | "dense";

export type BusinessRegistrySource = "local" | "api";

export interface BusinessRegistryDemoState {
  readonly seed: BusinessRegistrySeed | null;
  readonly role: BusinessRegistryRole;
  readonly ui: BusinessRegistryUiState;
  readonly source: BusinessRegistrySource;
  readonly lastError: string | null;
  readonly dirty: boolean;
  readonly drafts: {
    readonly tradingName: string;
    readonly locationName: string;
  };
}

const listeners = new Set<() => void>();
let memory: BusinessRegistryDemoState | null = null;

function seeded(): BusinessRegistrySeed {
  return northstarBusinessRegistrySeed();
}

function initial(): BusinessRegistryDemoState {
  const seed = seeded();
  return {
    seed,
    role: "founder",
    ui: "populated",
    source: "local",
    lastError: null,
    dirty: false,
    drafts: { tradingName: seed.tradingName, locationName: "" },
  };
}

function persist(next: BusinessRegistryDemoState) {
  memory = next;
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(BUSINESS_REGISTRY_STORAGE_KEY, JSON.stringify(next));
  }
  for (const listener of listeners) listener();
}

function withSeed(
  current: BusinessRegistryDemoState,
  seed: BusinessRegistrySeed,
  extras: Partial<BusinessRegistryDemoState> = {},
): BusinessRegistryDemoState {
  return {
    ...current,
    seed,
    dirty: false,
    lastError: null,
    drafts: { ...current.drafts, tradingName: seed.tradingName },
    ...extras,
  };
}

function pushAudit(
  seed: BusinessRegistrySeed,
  action: string,
  recordType: string,
  recordId: string,
  newValue: string,
  reason: string,
  previousValue?: string,
): BusinessRegistrySeed {
  return {
    ...seed,
    audits: [
      {
        id: `ui-audit-${seed.audits.length + 1}`,
        workspaceSlug: seed.workspaceSlug,
        actorId: "ns-res-maya",
        actorName: "Maya Chen",
        action,
        recordType,
        recordId,
        occurredAt: seed.audits[0]?.occurredAt ?? seed.formationDate,
        ...(previousValue !== undefined ? { previousValue } : {}),
        newValue,
        reason,
      },
      ...seed.audits,
    ],
  };
}

export function readBusinessRegistryState(): BusinessRegistryDemoState {
  if (memory) return memory;
  if (typeof window === "undefined") return initial();
  const raw = sessionStorage.getItem(BUSINESS_REGISTRY_STORAGE_KEY);
  if (!raw) {
    persist(initial());
    return memory!;
  }
  try {
    const parsed = JSON.parse(raw) as BusinessRegistryDemoState;
    memory = {
      ...initial(),
      ...parsed,
      source: parsed.source ?? "local",
      lastError: parsed.lastError ?? null,
      dirty: parsed.dirty ?? false,
    };
    return memory;
  } catch {
    persist(initial());
    return memory!;
  }
}

export function subscribeBusinessRegistry(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isBusinessRegistryActive(): boolean {
  return readBusinessRegistryState().seed !== null;
}

export function businessRegistryView(): BusinessRegistryView | null {
  const state = readBusinessRegistryState();
  if (!state.seed) return null;
  return presentBusinessRegistry(
    state.seed,
    permissionsForRegistryRole(state.role),
  );
}

export function setBusinessRegistryUi(ui: BusinessRegistryUiState) {
  persist({ ...readBusinessRegistryState(), ui });
}

export function setBusinessRegistryRole(role: BusinessRegistryRole) {
  persist({ ...readBusinessRegistryState(), role });
}

export function setBusinessRegistryError(message: string | null) {
  persist({
    ...readBusinessRegistryState(),
    lastError: message,
    ...(message ? { ui: "error" as const } : {}),
  });
}

export function setBusinessRegistryLoading() {
  persist({ ...readBusinessRegistryState(), ui: "loading", lastError: null });
}

export function applyBusinessRegistrySeed(
  seed: BusinessRegistrySeed,
  source: BusinessRegistrySource = "local",
) {
  persist(
    withSeed(readBusinessRegistryState(), seed, {
      source,
      ui: "populated",
    }),
  );
}

export function clearBusinessRegistrySeed() {
  const current = readBusinessRegistryState();
  persist({
    ...current,
    seed: null,
    ui: "empty",
    dirty: false,
    drafts: { tradingName: "", locationName: "" },
  });
}

export function setTradingNameDraft(tradingName: string) {
  const current = readBusinessRegistryState();
  persist({
    ...current,
    dirty: tradingName !== (current.seed?.tradingName ?? ""),
    drafts: { ...current.drafts, tradingName },
  });
}

export function updateTradingName(tradingName: string, reason: string) {
  const current = readBusinessRegistryState();
  if (!current.seed) return;
  if (!tradingName.trim()) {
    persist({
      ...current,
      lastError: "Trading name is required.",
    });
    return;
  }
  const seed = pushAudit(
    { ...current.seed, tradingName: tradingName.trim() },
    "business_profile.updated",
    "organization",
    current.seed.organizationId,
    tradingName.trim(),
    reason,
    current.seed.tradingName,
  );
  persist(withSeed(current, seed));
}

export function upsertDemoLocation(location: BusinessLocationSeed, reason: string) {
  const current = readBusinessRegistryState();
  if (!current.seed) return;
  if (location.organizationId !== current.seed.organizationId) {
    persist({
      ...current,
      lastError: "Location must reference the canonical organisation.",
    });
    return;
  }
  const exists = current.seed.locations.some((row) => row.id === location.id);
  const locations = exists
    ? current.seed.locations.map((row) => (row.id === location.id ? location : row))
    : [...current.seed.locations, location];
  const seed = pushAudit(
    { ...current.seed, locations },
    exists ? "location.updated" : "location.created",
    "organization_location",
    location.id,
    location.name,
    reason,
    exists ? location.name : undefined,
  );
  persist(withSeed(current, seed));
}

export function archiveDemoLocation(locationId: string, reason: string) {
  const current = readBusinessRegistryState();
  if (!current.seed) return;
  const location = current.seed.locations.find((row) => row.id === locationId);
  if (!location) {
    persist({ ...current, lastError: "Location not found." });
    return;
  }
  if (location.isPrimary) {
    persist({
      ...current,
      lastError: "The primary location cannot be archived.",
    });
    return;
  }
  const seed = pushAudit(
    {
      ...current.seed,
      locations: current.seed.locations.map((row) =>
        row.id === locationId ? { ...row, status: "ARCHIVED" as const } : row,
      ),
    },
    "location.archived",
    "organization_location",
    locationId,
    "ARCHIVED",
    reason,
    "ACTIVE",
  );
  persist(withSeed(current, seed));
}

export function changePrimaryLocation(locationId: string, reason: string) {
  const current = readBusinessRegistryState();
  if (!current.seed) return;
  if (!current.seed.locations.some((row) => row.id === locationId)) {
    persist({ ...current, lastError: "Location not found." });
    return;
  }
  const previous = current.seed.locations.find((row) => row.isPrimary);
  const seed = pushAudit(
    {
      ...current.seed,
      locations: current.seed.locations.map((row) => ({
        ...row,
        isPrimary: row.id === locationId,
        isRegistrationCorrespondence: row.id === locationId,
      })),
    },
    "location.updated",
    "organization_location",
    locationId,
    locationId,
    reason,
    previous?.id,
  );
  persist(withSeed(current, seed));
}

export function updateRenewalDate(
  documentId: string,
  expiryOrReviewDate: string,
  reason: string,
) {
  const current = readBusinessRegistryState();
  if (!current.seed) return;
  if (!expiryOrReviewDate.trim()) {
    persist({ ...current, lastError: "Renewal date is required." });
    return;
  }
  const seed = pushAudit(
    {
      ...current.seed,
      documents: current.seed.documents.map((row) =>
        row.id === documentId ? { ...row, expiryOrReviewDate } : row,
      ),
    },
    "registration_record.updated",
    "organization_compliance_record",
    documentId,
    expiryOrReviewDate,
    reason,
  );
  persist(withSeed(current, seed));
}

export function addDemoDocument(
  title: string,
  reference: string,
) {
  const current = readBusinessRegistryState();
  if (!current.seed) return;
  if (!title.trim()) {
    persist({ ...current, lastError: "Document title is required." });
    return;
  }
  if (!reference.startsWith("DEMO-")) {
    persist({
      ...current,
      lastError: "Document reference must be prefixed DEMO-.",
    });
    return;
  }
  const document: BusinessRegistrySeed["documents"][number] = {
    id: `ns-doc-ui-${current.seed.documents.length + 1}`,
    demoKey: `ns-doc-ui-${current.seed.documents.length + 1}`,
    type: "privacy_policy",
    title: title.trim(),
    status: "valid",
    issuedDate: current.seed.formationDate,
    effectiveDate: current.seed.formationDate,
    reference,
    ownerName: "Maya Chen",
    ownerMemberId: "ns-res-maya",
    reminderDate: current.seed.formationDate,
    evidenceNote: "Metadata only. Binary upload deferred.",
    version: "1",
    binaryDeferred: true,
    isDemo: true,
    urgency: "valid",
  };
  const seed = pushAudit(
    {
      ...current.seed,
      documents: [document, ...current.seed.documents],
    },
    "registration_record.created",
    "organization_compliance_record",
    document.id,
    document.reference,
    "Document metadata added",
  );
  persist(withSeed(current, seed));
}

export function assignDemoComplianceOwner(
  area: string,
  ownerName: string,
  ownerMemberId: string,
) {
  const current = readBusinessRegistryState();
  if (!current.seed) return;
  if (!area.trim()) {
    persist({ ...current, lastError: "Compliance area is required." });
    return;
  }
  const seed = pushAudit(
    {
      ...current.seed,
      complianceOwners: [
        { area: area.trim(), ownerName, ownerMemberId },
        ...current.seed.complianceOwners.filter((row) => row.area !== area.trim()),
      ],
    },
    "compliance_owner.assigned",
    "organization",
    current.seed.organizationId,
    `${area.trim()}: ${ownerName}`,
    "Compliance owner assigned",
  );
  persist(withSeed(current, seed));
}

export function missingBusinessRegistryFields() {
  return missingRegistrationFields(readBusinessRegistryState().seed);
}

export { registryBusinessManifest };
