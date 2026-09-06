import {
  BuildingBlockRegistry,
  CRM_CORE_BLOCK_ID,
  NORTHSTAR_COMPOSER_PROFILE,
  composeBuildingBlockRecommendations,
  crmCoreManifest,
  northstarCrmSeed,
  type BuildingBlockAuditEvent,
  type BuildingBlockRecommendation,
  type CrmClientSeed,
  type CrmDuplicateSeed,
  type WorkspaceBuildingBlockInstallation,
} from "@flow/contracts";

import { NORTHSTAR_SLUG } from "../prototype/defaults";

export const BUILDING_BLOCK_STORAGE_KEY = "flow-building-blocks-v1";

export interface BuildingBlockDemoState {
  readonly installation: WorkspaceBuildingBlockInstallation | null;
  readonly recommendations: readonly BuildingBlockRecommendation[];
  readonly audits: readonly BuildingBlockAuditEvent[];
  readonly clients: readonly CrmClientSeed[];
  readonly duplicates: readonly CrmDuplicateSeed[];
  readonly crmState:
    | "empty"
    | "loading"
    | "populated"
    | "error"
    | "restricted"
    | "dense";
}

const listeners = new Set<() => void>();
let memory: BuildingBlockDemoState | null = null;

function recommendations() {
  return composeBuildingBlockRecommendations(NORTHSTAR_COMPOSER_PROFILE, [
    crmCoreManifest,
  ]);
}

function registryFor(
  status: WorkspaceBuildingBlockInstallation["status"],
  configuration: Readonly<Record<string, unknown>>,
): BuildingBlockRegistry {
  const registry = new BuildingBlockRegistry([crmCoreManifest]);
  const actor = "ns-res-maya";
  registry.recommend(NORTHSTAR_SLUG, CRM_CORE_BLOCK_ID, actor, configuration);
  if (status === "recommended") return registry;
  registry.startConfigure(
    NORTHSTAR_SLUG,
    CRM_CORE_BLOCK_ID,
    actor,
    configuration,
  );
  if (status === "configuring") return registry;
  registry.submitForApproval(
    NORTHSTAR_SLUG,
    CRM_CORE_BLOCK_ID,
    actor,
    configuration,
  );
  if (status === "awaiting_approval") return registry;
  registry.approve(NORTHSTAR_SLUG, CRM_CORE_BLOCK_ID, actor);
  if (status === "active") return registry;
  registry.suspend(NORTHSTAR_SLUG, CRM_CORE_BLOCK_ID, actor);
  return registry;
}

function snapshot(
  registry: BuildingBlockRegistry,
  clients: readonly CrmClientSeed[],
  duplicates: readonly CrmDuplicateSeed[],
  crmState: BuildingBlockDemoState["crmState"],
): BuildingBlockDemoState {
  return {
    installation:
      registry.getInstallation(NORTHSTAR_SLUG, CRM_CORE_BLOCK_ID) ?? null,
    recommendations: recommendations(),
    audits: registry.listAudit(NORTHSTAR_SLUG),
    clients,
    duplicates,
    crmState,
  };
}

function persist(next: BuildingBlockDemoState) {
  memory = next;
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(BUILDING_BLOCK_STORAGE_KEY, JSON.stringify(next));
  }
  for (const listener of listeners) listener();
}

function initial(): BuildingBlockDemoState {
  const registry = registryFor("recommended", {});
  return snapshot(registry, [], [], "populated");
}

export function readBuildingBlockState(): BuildingBlockDemoState {
  if (memory) return memory;
  if (typeof window === "undefined") {
    return initial();
  }
  const raw = sessionStorage.getItem(BUILDING_BLOCK_STORAGE_KEY);
  if (!raw) {
    persist(initial());
    return memory!;
  }
  try {
    memory = JSON.parse(raw) as BuildingBlockDemoState;
    return memory;
  } catch {
    persist(initial());
    return memory!;
  }
}

export function subscribeBuildingBlocks(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isCrmCoreActive(): boolean {
  return readBuildingBlockState().installation?.status === "active";
}

function apply(
  nextStatus: WorkspaceBuildingBlockInstallation["status"],
  configuration?: Readonly<Record<string, unknown>>,
) {
  const current = readBuildingBlockState();
  const config = configuration ?? current.installation?.configuration ?? {};
  const registry = registryFor(nextStatus, config);
  let clients = current.clients;
  let duplicates = current.duplicates;
  if (nextStatus === "active" && clients.length === 0) {
    const seed = northstarCrmSeed();
    clients = seed.clients;
    duplicates = seed.duplicates;
  }
  persist(snapshot(registry, clients, duplicates, current.crmState));
}

export function configureCrmCore(
  configuration: Readonly<Record<string, unknown>>,
) {
  apply("configuring", configuration);
}

export function submitCrmCore(
  configuration: Readonly<Record<string, unknown>>,
) {
  apply("awaiting_approval", configuration);
}

export function approveCrmCore() {
  apply("active");
}

export function suspendCrmCore() {
  apply("suspended");
}

export function setCrmUiState(crmState: BuildingBlockDemoState["crmState"]) {
  persist({ ...readBuildingBlockState(), crmState });
}

export function crmClientsVisible(): readonly CrmClientSeed[] {
  const state = readBuildingBlockState();
  if (state.installation?.status !== "active") return [];
  if (state.crmState === "empty" || state.crmState === "error") return [];
  return state.clients;
}

export { crmCoreManifest, CRM_CORE_BLOCK_ID };
