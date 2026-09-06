import { ModuleRegistry, type ModuleDefinition } from "../module-registry.js";
import { parseCrmCoreConfiguration } from "./crm-core/config.js";
import { CRM_CORE_BLOCK_ID } from "./crm-core/config.js";
import { validateBuildingBlockManifest } from "./schema.js";
import type {
  BuildingBlockAuditEvent,
  BuildingBlockLifecycle,
  BuildingBlockManifest,
  WorkspaceBuildingBlockInstallation,
} from "./types.js";

const ALLOWED: Record<BuildingBlockLifecycle, readonly BuildingBlockLifecycle[]> = {
  available: ["recommended", "deprecated"],
  recommended: ["configuring", "deprecated"],
  configuring: ["awaiting_approval", "recommended", "deprecated"],
  awaiting_approval: ["active", "configuring", "deprecated"],
  active: ["suspended", "deprecated"],
  suspended: ["active", "deprecated"],
  deprecated: [],
};

function asModule(manifest: BuildingBlockManifest): ModuleDefinition {
  return {
    key: manifest.id,
    name: manifest.name,
    version: manifest.version,
    description: manifest.description,
    category: manifest.category,
    status: manifest.lifecycleStatus === "deprecated" ? "DEPRECATED" : "ACTIVE",
    capabilities: [...manifest.ownedEntities, ...manifest.kpis],
    dependencies: manifest.dependencies,
    entityTypes: manifest.ownedEntities,
    actions: manifest.permissions,
  };
}

export class BuildingBlockRegistry {
  private readonly modules = new ModuleRegistry();
  private readonly manifests = new Map<string, BuildingBlockManifest>();
  private readonly installations = new Map<
    string,
    WorkspaceBuildingBlockInstallation
  >();
  private readonly audits: BuildingBlockAuditEvent[] = [];

  constructor(manifests: readonly BuildingBlockManifest[] = []) {
    for (const manifest of manifests) {
      this.register(manifest);
    }
  }

  register(manifest: BuildingBlockManifest): void {
    validateBuildingBlockManifest(manifest);
    if (this.manifests.has(manifest.id)) {
      throw new Error(`Building block already registered: ${manifest.id}`);
    }
    this.modules.register(asModule(manifest));
    this.manifests.set(manifest.id, manifest);
  }

  listManifests(): readonly BuildingBlockManifest[] {
    return [...this.manifests.values()];
  }

  getManifest(id: string): BuildingBlockManifest | undefined {
    return this.manifests.get(id);
  }

  getInstallation(
    workspaceId: string,
    blockId: string,
  ): WorkspaceBuildingBlockInstallation | undefined {
    return this.installations.get(`${workspaceId}:${blockId}`);
  }

  listInstallations(
    workspaceId: string,
  ): readonly WorkspaceBuildingBlockInstallation[] {
    return [...this.installations.values()].filter(
      (row) => row.workspaceId === workspaceId,
    );
  }

  isActive(workspaceId: string, blockId: string): boolean {
    return this.getInstallation(workspaceId, blockId)?.status === "active";
  }

  listAudit(workspaceId: string): readonly BuildingBlockAuditEvent[] {
    return this.audits.filter((row) => row.workspaceId === workspaceId);
  }

  recommend(
    workspaceId: string,
    blockId: string,
    actorId: string,
    configuration: Readonly<Record<string, unknown>>,
  ): WorkspaceBuildingBlockInstallation {
    return this.transition({
      workspaceId,
      blockId,
      actorId,
      to: "recommended",
      reason: "Deterministic eligibility recommended this block.",
      configuration,
    });
  }

  startConfigure(
    workspaceId: string,
    blockId: string,
    actorId: string,
    configuration: Readonly<Record<string, unknown>>,
  ): WorkspaceBuildingBlockInstallation {
    return this.transition({
      workspaceId,
      blockId,
      actorId,
      to: "configuring",
      reason: "Founder started configuration.",
      configuration,
    });
  }

  submitForApproval(
    workspaceId: string,
    blockId: string,
    actorId: string,
    configuration: Readonly<Record<string, unknown>>,
  ): WorkspaceBuildingBlockInstallation {
    return this.transition({
      workspaceId,
      blockId,
      actorId,
      to: "awaiting_approval",
      reason: "Configuration submitted for human approval.",
      configuration,
      proposedBy: actorId,
    });
  }

  approve(
    workspaceId: string,
    blockId: string,
    actorId: string,
  ): WorkspaceBuildingBlockInstallation {
    return this.transition({
      workspaceId,
      blockId,
      actorId,
      to: "active",
      reason: "Founder approved activation.",
      approvedBy: actorId,
    });
  }

  suspend(
    workspaceId: string,
    blockId: string,
    actorId: string,
  ): WorkspaceBuildingBlockInstallation {
    return this.transition({
      workspaceId,
      blockId,
      actorId,
      to: "suspended",
      reason: "Building block suspended. Historical records are retained.",
    });
  }

  reactivate(
    workspaceId: string,
    blockId: string,
    actorId: string,
  ): WorkspaceBuildingBlockInstallation {
    return this.transition({
      workspaceId,
      blockId,
      actorId,
      to: "active",
      reason: "Suspended building block reactivated.",
      approvedBy: actorId,
    });
  }

  private transition(input: {
    readonly workspaceId: string;
    readonly blockId: string;
    readonly actorId: string;
    readonly to: BuildingBlockLifecycle;
    readonly reason: string;
    readonly configuration?: Readonly<Record<string, unknown>>;
    readonly proposedBy?: string;
    readonly approvedBy?: string;
  }): WorkspaceBuildingBlockInstallation {
    const manifest = this.manifests.get(input.blockId);
    if (!manifest || manifest.lifecycleStatus !== "available") {
      throw new Error("Building block is not available.");
    }
    const key = `${input.workspaceId}:${input.blockId}`;
    const current = this.installations.get(key);
    const from: BuildingBlockLifecycle = current?.status ?? "available";
    if (from !== input.to && !ALLOWED[from].includes(input.to)) {
      throw new Error(`Cannot move ${input.blockId} from ${from} to ${input.to}.`);
    }
    const configuration = parseBlockConfiguration(
      input.blockId,
      input.configuration ?? current?.configuration ?? {},
    );
    if (input.to === "active" || input.to === "awaiting_approval") {
      for (const dependency of manifest.dependencies) {
        if (!this.isActive(input.workspaceId, dependency)) {
          throw new Error(`Missing required building-block dependency: ${dependency}`);
        }
      }
      for (const other of this.listInstallations(input.workspaceId)) {
        if (
          other.blockId !== input.blockId &&
          other.status === "active" &&
          manifest.incompatibleBlocks.includes(other.blockId)
        ) {
          throw new Error(`Incompatible with active block: ${other.blockId}`);
        }
      }
    }
    const now = new Date(0).toISOString();
    const proposedBy = input.proposedBy ?? current?.proposedBy;
    const approvedBy = input.approvedBy ?? current?.approvedBy;
    const proposedAt =
      input.to === "awaiting_approval" ? now : current?.proposedAt;
    const approvedAt =
      input.to === "active" && input.approvedBy ? now : current?.approvedAt;
    const activatedAt = input.to === "active" ? now : current?.activatedAt;
    const suspendedAt = input.to === "suspended" ? now : current?.suspendedAt;
    const next: WorkspaceBuildingBlockInstallation = {
      workspaceId: input.workspaceId,
      blockId: input.blockId,
      blockVersion: manifest.version,
      status: input.to,
      configuration,
      ...(proposedBy ? { proposedBy } : {}),
      ...(approvedBy ? { approvedBy } : {}),
      ...(proposedAt ? { proposedAt } : {}),
      ...(approvedAt ? { approvedAt } : {}),
      ...(activatedAt ? { activatedAt } : {}),
      ...(suspendedAt ? { suspendedAt } : {}),
    };
    this.installations.set(key, next);
    if (input.to === "active" && !this.modules.isModuleEnabled(input.workspaceId, input.blockId)) {
      this.modules.enableModule({
        workspaceId: input.workspaceId,
        moduleKey: input.blockId,
        version: manifest.version,
        enabledBy: input.actorId,
      });
    }
    if (input.to === "suspended" && this.modules.isModuleEnabled(input.workspaceId, input.blockId)) {
      this.modules.disableModule({
        workspaceId: input.workspaceId,
        moduleKey: input.blockId,
      });
    }
    this.audits.push({
      id: `${key}:${this.audits.length + 1}`,
      workspaceId: input.workspaceId,
      blockId: input.blockId,
      action: `building_block.${input.to}`,
      actorId: input.actorId,
      ...(current?.status ? { previousStatus: current.status } : {}),
      resultingStatus: input.to,
      reason: input.reason,
      occurredAt: now,
    });
    return next;
  }
}

function parseBlockConfiguration(
  blockId: string,
  configuration: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  if (blockId === CRM_CORE_BLOCK_ID) {
    return parseCrmCoreConfiguration(configuration) as unknown as Readonly<
      Record<string, unknown>
    >;
  }
  return configuration;
}
