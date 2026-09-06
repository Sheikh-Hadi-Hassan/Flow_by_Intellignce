import {
  BuildingBlockRegistry,
  CRM_CORE_BLOCK_ID,
  REGISTRY_BUSINESS_BLOCK_ID,
  composeBuildingBlockRecommendations,
  createDomainEvent,
  crmCoreManifest,
  northstarBusinessRegistrySeed,
  northstarCrmSeed,
  parseCrmCoreConfiguration,
  parseRegistryBusinessConfiguration,
  registryBusinessManifest,
  type BuildingBlockAuditEvent,
  type BuildingBlockRecommendation,
  type BusinessAuditSeed,
  type BusinessComposerProfile,
  type BusinessLocationSeed,
  type BusinessRegistrySeed,
  type CrmClientSeed,
  type CrmDuplicateSeed,
  type DomainEvent,
  type WorkspaceBuildingBlockInstallation,
} from "@flow/contracts";
import type { CommercialRepository } from "./commercial-persistence.js";

export interface CrmWriteProposal {
  readonly id: string;
  readonly workspaceId: string;
  readonly toolName: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly status: "proposed" | "approved" | "rejected";
  readonly createdBy: string;
  readonly approvedBy?: string;
}

export interface BuildingBlockStore {
  compose(
    profile: BusinessComposerProfile,
  ): Promise<readonly BuildingBlockRecommendation[]>;
  listInstallations(
    workspaceId: string,
  ): Promise<readonly WorkspaceBuildingBlockInstallation[]>;
  getInstallation(
    workspaceId: string,
    blockId: string,
  ): Promise<WorkspaceBuildingBlockInstallation | undefined>;
  recommend(
    workspaceId: string,
    blockId: string,
    actorId: string,
    configuration: Readonly<Record<string, unknown>>,
  ): Promise<WorkspaceBuildingBlockInstallation>;
  configure(
    workspaceId: string,
    blockId: string,
    actorId: string,
    configuration: Readonly<Record<string, unknown>>,
  ): Promise<WorkspaceBuildingBlockInstallation>;
  submit(
    workspaceId: string,
    blockId: string,
    actorId: string,
    configuration: Readonly<Record<string, unknown>>,
  ): Promise<WorkspaceBuildingBlockInstallation>;
  approve(
    workspaceId: string,
    blockId: string,
    actorId: string,
  ): Promise<WorkspaceBuildingBlockInstallation>;
  suspend(
    workspaceId: string,
    blockId: string,
    actorId: string,
  ): Promise<WorkspaceBuildingBlockInstallation>;
  listAudit(workspaceId: string): Promise<readonly BuildingBlockAuditEvent[]>;
  listEvents(workspaceId: string): Promise<readonly DomainEvent[]>;
  listClients(workspaceId: string): Promise<readonly CrmClientSeed[]>;
  getClient(
    workspaceId: string,
    clientId: string,
  ): Promise<CrmClientSeed | undefined>;
  listDuplicates(workspaceId: string): Promise<readonly CrmDuplicateSeed[]>;
  recordInteraction(
    workspaceId: string,
    clientId: string,
    summary: string,
    actorName: string,
  ): Promise<void>;
  proposeWrite(
    proposal: Omit<CrmWriteProposal, "status">,
  ): Promise<CrmWriteProposal>;
  approveWrite(
    workspaceId: string,
    proposalId: string,
    actorId: string,
  ): Promise<CrmWriteProposal>;
  seedIfActive(workspaceId: string): Promise<number>;
  getBusinessRegistry(
    workspaceId: string,
  ): Promise<BusinessRegistrySeed | undefined>;
  seedBusinessRegistry(input: {
    readonly workspaceId: string;
    readonly workspaceSlug: string;
    readonly actorId: string;
    readonly validateOnly?: boolean;
  }): Promise<BusinessRegistrySeed>;
  updateBusinessProfile(input: {
    readonly workspaceId: string;
    readonly actorId: string;
    readonly actorName: string;
    readonly patch: Partial<
      Pick<
        BusinessRegistrySeed,
        "tradingName" | "website" | "firmographics"
      >
    > & {
      readonly reason?: string;
    };
  }): Promise<BusinessRegistrySeed>;
  upsertLocation(input: {
    readonly workspaceId: string;
    readonly actorId: string;
    readonly actorName: string;
    readonly location: BusinessLocationSeed;
    readonly reason?: string;
  }): Promise<BusinessRegistrySeed>;
  archiveLocation(input: {
    readonly workspaceId: string;
    readonly actorId: string;
    readonly actorName: string;
    readonly locationId: string;
    readonly reason: string;
  }): Promise<BusinessRegistrySeed>;
  proposePrimaryLocationChange(input: {
    readonly workspaceId: string;
    readonly actorId: string;
    readonly locationId: string;
    readonly reason: string;
  }): Promise<CrmWriteProposal>;
  applyPrimaryLocationChange(input: {
    readonly workspaceId: string;
    readonly actorId: string;
    readonly actorName: string;
    readonly locationId: string;
    readonly reason: string;
  }): Promise<BusinessRegistrySeed>;
  addDocumentMetadata(input: {
    readonly workspaceId: string;
    readonly actorId: string;
    readonly actorName: string;
    readonly document: BusinessRegistrySeed["documents"][number];
  }): Promise<BusinessRegistrySeed>;
  assignComplianceOwner(input: {
    readonly workspaceId: string;
    readonly actorId: string;
    readonly actorName: string;
    readonly area: string;
    readonly ownerName: string;
    readonly ownerMemberId: string;
  }): Promise<BusinessRegistrySeed>;
}

export class InMemoryBuildingBlockStore implements BuildingBlockStore {
  private readonly registry = new BuildingBlockRegistry([
    crmCoreManifest,
    registryBusinessManifest,
  ]);
  private readonly clients = new Map<string, CrmClientSeed[]>();
  private readonly duplicates = new Map<string, CrmDuplicateSeed[]>();
  private readonly registries = new Map<string, BusinessRegistrySeed>();
  private readonly events: DomainEvent[] = [];
  private readonly proposals = new Map<string, CrmWriteProposal>();
  private readonly recommendations = new Map<
    string,
    readonly BuildingBlockRecommendation[]
  >();

  constructor(private readonly commercial?: CommercialRepository) {}

  async compose(profile: BusinessComposerProfile) {
    const rows = composeBuildingBlockRecommendations(profile, [
      crmCoreManifest,
      registryBusinessManifest,
    ]);
    this.recommendations.set(profile.workspaceId, rows);
    if (rows.some((row) => row.blockId === CRM_CORE_BLOCK_ID)) {
      const existing = this.registry.getInstallation(
        profile.workspaceId,
        CRM_CORE_BLOCK_ID,
      );
      if (!existing) {
        this.registry.recommend(
          profile.workspaceId,
          CRM_CORE_BLOCK_ID,
          "system.composer",
          rows.find((row) => row.blockId === CRM_CORE_BLOCK_ID)!
            .recommendedConfiguration,
        );
      }
    }
    if (rows.some((row) => row.blockId === REGISTRY_BUSINESS_BLOCK_ID)) {
      const existing = this.registry.getInstallation(
        profile.workspaceId,
        REGISTRY_BUSINESS_BLOCK_ID,
      );
      if (!existing) {
        this.registry.recommend(
          profile.workspaceId,
          REGISTRY_BUSINESS_BLOCK_ID,
          "system.composer",
          rows.find((row) => row.blockId === REGISTRY_BUSINESS_BLOCK_ID)!
            .recommendedConfiguration,
        );
      }
    }
    return rows;
  }

  listInstallations(workspaceId: string) {
    return Promise.resolve(this.registry.listInstallations(workspaceId));
  }

  getInstallation(workspaceId: string, blockId: string) {
    return Promise.resolve(this.registry.getInstallation(workspaceId, blockId));
  }

  recommend(
    workspaceId: string,
    blockId: string,
    actorId: string,
    configuration: Readonly<Record<string, unknown>>,
  ) {
    return Promise.resolve(
      this.registry.recommend(workspaceId, blockId, actorId, configuration),
    );
  }

  configure(
    workspaceId: string,
    blockId: string,
    actorId: string,
    configuration: Readonly<Record<string, unknown>>,
  ) {
    if (blockId === REGISTRY_BUSINESS_BLOCK_ID) {
      parseRegistryBusinessConfiguration(configuration);
    } else {
      parseCrmCoreConfiguration(configuration);
    }
    return Promise.resolve(
      this.registry.startConfigure(workspaceId, blockId, actorId, configuration),
    );
  }

  submit(
    workspaceId: string,
    blockId: string,
    actorId: string,
    configuration: Readonly<Record<string, unknown>>,
  ) {
    return Promise.resolve(
      this.registry.submitForApproval(
        workspaceId,
        blockId,
        actorId,
        configuration,
      ),
    );
  }

  async approve(workspaceId: string, blockId: string, actorId: string) {
    const installation = this.registry.approve(workspaceId, blockId, actorId);
    if (blockId === CRM_CORE_BLOCK_ID) {
      await this.seedIfActive(workspaceId);
    }
    if (blockId === REGISTRY_BUSINESS_BLOCK_ID) {
      await this.seedBusinessRegistry({
        workspaceId,
        workspaceSlug: workspaceId,
        actorId,
      }).catch(() => undefined);
    }
    this.events.push(
      createDomainEvent({
        name: "building_block.activated",
        workspaceId,
        recordId: blockId,
        payload: { version: installation.blockVersion },
      }),
    );
    return installation;
  }

  suspend(workspaceId: string, blockId: string, actorId: string) {
    return Promise.resolve(
      this.registry.suspend(workspaceId, blockId, actorId),
    );
  }

  listAudit(workspaceId: string) {
    return Promise.resolve(this.registry.listAudit(workspaceId));
  }

  listEvents(workspaceId: string) {
    return Promise.resolve(
      this.events.filter((event) => event.workspaceId === workspaceId),
    );
  }

  async listClients(workspaceId: string) {
    if (!this.registry.isActive(workspaceId, CRM_CORE_BLOCK_ID)) return [];
    return this.clients.get(workspaceId) ?? [];
  }

  async getClient(workspaceId: string, clientId: string) {
    const rows = await this.listClients(workspaceId);
    return rows.find((row) => row.id === clientId);
  }

  async listDuplicates(workspaceId: string) {
    if (!this.registry.isActive(workspaceId, CRM_CORE_BLOCK_ID)) return [];
    return this.duplicates.get(workspaceId) ?? [];
  }

  async recordInteraction(
    workspaceId: string,
    clientId: string,
    summary: string,
    actorName: string,
  ) {
    const rows = this.clients.get(workspaceId) ?? [];
    const next = rows.map((row) =>
      row.id === clientId
        ? {
            ...row,
            lastInteractionLabel: "Today",
            daysSinceInteraction: 0,
            interactions: [
              {
                id: `${clientId}-int-${row.interactions.length + 1}`,
                atLabel: "Today",
                daysAgo: 0,
                actorName,
                kind: "note" as const,
                summary,
              },
              ...row.interactions,
            ],
          }
        : row,
    );
    this.clients.set(workspaceId, next);
    this.events.push(
      createDomainEvent({
        name: "interaction.recorded",
        workspaceId,
        recordId: clientId,
        payload: { summary },
      }),
    );
  }

  proposeWrite(proposal: Omit<CrmWriteProposal, "status">) {
    const stored: CrmWriteProposal = { ...proposal, status: "proposed" };
    this.proposals.set(proposal.id, stored);
    this.events.push(
      createDomainEvent({
        name:
          proposal.toolName === "propose_duplicate_merge"
            ? "duplicate.merge_proposed"
            : "client.update_proposed",
        workspaceId: proposal.workspaceId,
        recordId: proposal.id,
        payload: proposal.payload,
      }),
    );
    return Promise.resolve(stored);
  }

  async approveWrite(
    workspaceId: string,
    proposalId: string,
    actorId: string,
  ) {
    const current = this.proposals.get(proposalId);
    if (!current || current.workspaceId !== workspaceId) {
      throw new Error("Write proposal not found.");
    }
    const approved: CrmWriteProposal = {
      ...current,
      status: "approved",
      approvedBy: actorId,
    };
    this.proposals.set(proposalId, approved);
    if (current.toolName === "propose_duplicate_merge") {
      const leftId = String(current.payload.leftId ?? "");
      const rows = this.duplicates.get(workspaceId) ?? [];
      this.duplicates.set(
        workspaceId,
        rows.map((row) =>
          row.leftId === leftId || row.id === String(current.payload.duplicateId ?? "")
            ? { ...row, status: "merged" }
            : row,
        ),
      );
      this.events.push(
        createDomainEvent({
          name: "duplicate.merged",
          workspaceId,
          recordId: proposalId,
          payload: current.payload,
        }),
      );
    }
    if (
      current.toolName === "propose_location_change" ||
      current.toolName === "propose_business_profile_update"
    ) {
      if (current.toolName === "propose_location_change") {
        const locationId = String(current.payload.locationId ?? "");
        if (locationId) {
          await this.applyPrimaryLocationChange({
            workspaceId,
            actorId,
            actorName: actorId,
            locationId,
            reason: String(current.payload.reason ?? "Approved location change"),
          });
        }
      }
      this.events.push(
        createDomainEvent({
          name:
            current.toolName === "propose_location_change"
              ? "location.updated"
              : "business_profile.updated",
          workspaceId,
          recordId: proposalId,
          payload: current.payload,
        }),
      );
    }
    return approved;
  }

  async seedIfActive(workspaceId: string) {
    if (!this.registry.isActive(workspaceId, CRM_CORE_BLOCK_ID)) return 0;
    const existing = this.clients.get(workspaceId) ?? [];
    if (existing.length > 0) return existing.length;
    const seed = northstarCrmSeed();
    this.clients.set(workspaceId, [...seed.clients]);
    this.duplicates.set(workspaceId, [...seed.duplicates]);
    if (this.commercial) {
      for (const client of seed.clients) {
        await this.commercial.createClient({
          id: client.id,
          workspaceId,
          name: client.name,
          industry: client.industry,
          website: client.website,
          status: client.status,
          revision: 1,
        });
        for (const contact of client.contacts) {
          await this.commercial.createContact({
            id: contact.id,
            workspaceId,
            clientId: client.id,
            firstName: contact.firstName,
            lastName: contact.lastName,
            title: contact.title,
            email: contact.email,
            isPrimary: contact.isPrimary,
          });
        }
      }
    }
    this.events.push(
      createDomainEvent({
        name: "duplicate.detected",
        workspaceId,
        recordId: seed.duplicates[0]!.id,
        payload: { count: seed.duplicates.length },
      }),
    );
    return seed.clients.length;
  }

  getBusinessRegistry(workspaceId: string) {
    return Promise.resolve(this.registries.get(workspaceId));
  }

  async seedBusinessRegistry(input: {
    readonly workspaceId: string;
    readonly workspaceSlug: string;
    readonly actorId: string;
    readonly validateOnly?: boolean;
  }) {
    const seed = northstarBusinessRegistrySeed({
      workspaceSlug: input.workspaceSlug,
      ...(input.validateOnly !== undefined
        ? { validateOnly: input.validateOnly }
        : {}),
    });
    if (input.validateOnly) return seed;
    const existing = this.registries.get(input.workspaceId);
    if (existing) {
      if (existing.organizationId !== seed.organizationId) {
        throw new Error("Refusing to create a second Northstar legal entity.");
      }
      return existing;
    }
    this.registries.set(input.workspaceId, seed);
    const occurredAt = seed.audits[0]?.occurredAt;
    this.events.push(
      createDomainEvent({
        name: "business_profile.created",
        workspaceId: input.workspaceId,
        recordId: seed.organizationId,
        payload: { demoKey: seed.demoKey },
        ...(occurredAt ? { occurredAt } : {}),
      }),
    );
    for (const location of seed.locations) {
      this.events.push(
        createDomainEvent({
          name: "location.created",
          workspaceId: input.workspaceId,
          recordId: location.id,
          payload: { demoKey: location.demoKey },
          ...(occurredAt ? { occurredAt } : {}),
        }),
      );
    }
    for (const document of seed.documents) {
      this.events.push(
        createDomainEvent({
          name: "registration_record.created",
          workspaceId: input.workspaceId,
          recordId: document.id,
          payload: { reference: document.reference },
          ...(occurredAt ? { occurredAt } : {}),
        }),
      );
      if (document.urgency === "due_30" || document.urgency === "due_90") {
        this.events.push(
          createDomainEvent({
            name: "document.renewal_due",
            workspaceId: input.workspaceId,
            recordId: document.id,
            payload: { urgency: document.urgency },
            ...(occurredAt ? { occurredAt } : {}),
          }),
        );
      }
    }
    void input.actorId;
    return seed;
  }

  private requireRegistry(workspaceId: string): BusinessRegistrySeed {
    const current = this.registries.get(workspaceId);
    if (!current) throw new Error("Business Registry is not seeded.");
    return current;
  }

  private writeAudit(
    workspaceId: string,
    action: string,
    recordId: string,
    previousValue: string | undefined,
    newValue: string,
    reason: string,
  ): BusinessRegistrySeed {
    const current = this.requireRegistry(workspaceId);
    const audit: BusinessAuditSeed = {
      id: `audit-${current.audits.length + 1}`,
      workspaceSlug: current.workspaceSlug,
      actorId: "api",
      actorName: "API",
      action,
      recordType: action.split(".")[0] ?? "organization",
      recordId,
      occurredAt: current.audits[0]?.occurredAt ?? new Date(0).toISOString(),
      ...(previousValue !== undefined ? { previousValue } : {}),
      newValue,
      reason,
    };
    const next: BusinessRegistrySeed = {
      ...current,
      audits: [audit, ...current.audits],
    };
    this.registries.set(workspaceId, next);
    this.events.push(
      createDomainEvent({
        name: action,
        workspaceId,
        recordId,
        payload: {
          ...(previousValue !== undefined ? { previousValue } : {}),
          newValue,
          reason,
        },
        occurredAt: audit.occurredAt,
      }),
    );
    return next;
  }

  updateBusinessProfile(input: {
    readonly workspaceId: string;
    readonly actorId: string;
    readonly actorName: string;
    readonly patch: Partial<
      Pick<BusinessRegistrySeed, "tradingName" | "website" | "firmographics">
    > & { readonly reason?: string };
  }) {
    const current = this.requireRegistry(input.workspaceId);
    const next: BusinessRegistrySeed = {
      ...current,
      tradingName: input.patch.tradingName ?? current.tradingName,
      website: input.patch.website ?? current.website,
      firmographics: input.patch.firmographics ?? current.firmographics,
    };
    this.registries.set(input.workspaceId, next);
    this.writeAudit(
      input.workspaceId,
      "business_profile.updated",
      current.organizationId,
      current.tradingName,
      next.tradingName,
      input.patch.reason ?? "Profile update",
    );
    void input.actorId;
    void input.actorName;
    return Promise.resolve(this.requireRegistry(input.workspaceId));
  }

  upsertLocation(input: {
    readonly workspaceId: string;
    readonly actorId: string;
    readonly actorName: string;
    readonly location: BusinessLocationSeed;
    readonly reason?: string;
  }) {
    const current = this.requireRegistry(input.workspaceId);
    if (input.location.organizationId !== current.organizationId) {
      throw new Error("Location must reference the canonical organisation.");
    }
    const exists = current.locations.some((row) => row.id === input.location.id);
    const locations = exists
      ? current.locations.map((row) =>
          row.id === input.location.id ? input.location : row,
        )
      : [...current.locations, input.location];
    this.registries.set(input.workspaceId, { ...current, locations });
    return Promise.resolve(
      this.writeAudit(
        input.workspaceId,
        exists ? "location.updated" : "location.created",
        input.location.id,
        exists ? input.location.name : undefined,
        input.location.name,
        input.reason ?? (exists ? "Location update" : "Location created"),
      ),
    );
  }

  archiveLocation(input: {
    readonly workspaceId: string;
    readonly actorId: string;
    readonly actorName: string;
    readonly locationId: string;
    readonly reason: string;
  }) {
    const current = this.requireRegistry(input.workspaceId);
    const location = current.locations.find((row) => row.id === input.locationId);
    if (!location) throw new Error("Location not found.");
    if (location.isPrimary) {
      throw new Error("The primary location cannot be archived.");
    }
    const locations = current.locations.map((row) =>
      row.id === input.locationId
        ? { ...row, status: "ARCHIVED" as const }
        : row,
    );
    this.registries.set(input.workspaceId, { ...current, locations });
    return Promise.resolve(
      this.writeAudit(
        input.workspaceId,
        "location.archived",
        input.locationId,
        "ACTIVE",
        "ARCHIVED",
        input.reason,
      ),
    );
  }

  proposePrimaryLocationChange(input: {
    readonly workspaceId: string;
    readonly actorId: string;
    readonly locationId: string;
    readonly reason: string;
  }) {
    this.requireRegistry(input.workspaceId);
    this.events.push(
      createDomainEvent({
        name: "primary_location.change_proposed",
        workspaceId: input.workspaceId,
        recordId: input.locationId,
        payload: { reason: input.reason },
      }),
    );
    return this.proposeWrite({
      id: `prop-loc-${input.locationId}`,
      workspaceId: input.workspaceId,
      toolName: "propose_location_change",
      payload: {
        locationId: input.locationId,
        reason: input.reason,
      },
      createdBy: input.actorId,
    });
  }

  applyPrimaryLocationChange(input: {
    readonly workspaceId: string;
    readonly actorId: string;
    readonly actorName: string;
    readonly locationId: string;
    readonly reason: string;
  }) {
    const current = this.requireRegistry(input.workspaceId);
    if (!current.locations.some((row) => row.id === input.locationId)) {
      throw new Error("Location not found.");
    }
    const previous = current.locations.find((row) => row.isPrimary);
    const locations = current.locations.map((row) => ({
      ...row,
      isPrimary: row.id === input.locationId,
      isRegistrationCorrespondence: row.id === input.locationId,
    }));
    this.registries.set(input.workspaceId, { ...current, locations });
    void input.actorId;
    void input.actorName;
    return Promise.resolve(
      this.writeAudit(
        input.workspaceId,
        "location.updated",
        input.locationId,
        previous?.id,
        input.locationId,
        input.reason,
      ),
    );
  }

  addDocumentMetadata(input: {
    readonly workspaceId: string;
    readonly actorId: string;
    readonly actorName: string;
    readonly document: BusinessRegistrySeed["documents"][number];
  }) {
    const current = this.requireRegistry(input.workspaceId);
    if (!input.document.reference.startsWith("DEMO-")) {
      throw new Error("Document reference must be prefixed DEMO-.");
    }
    const documents = [
      input.document,
      ...current.documents.filter((row) => row.id !== input.document.id),
    ];
    this.registries.set(input.workspaceId, { ...current, documents });
    void input.actorId;
    void input.actorName;
    return Promise.resolve(
      this.writeAudit(
        input.workspaceId,
        "registration_record.created",
        input.document.id,
        undefined,
        input.document.reference,
        "Document metadata added",
      ),
    );
  }

  assignComplianceOwner(input: {
    readonly workspaceId: string;
    readonly actorId: string;
    readonly actorName: string;
    readonly area: string;
    readonly ownerName: string;
    readonly ownerMemberId: string;
  }) {
    const current = this.requireRegistry(input.workspaceId);
    const owners = [
      {
        area: input.area,
        ownerName: input.ownerName,
        ownerMemberId: input.ownerMemberId,
      },
      ...current.complianceOwners.filter((row) => row.area !== input.area),
    ];
    this.registries.set(input.workspaceId, {
      ...current,
      complianceOwners: owners,
    });
    void input.actorId;
    void input.actorName;
    return Promise.resolve(
      this.writeAudit(
        input.workspaceId,
        "compliance_owner.assigned",
        input.ownerMemberId,
        undefined,
        `${input.area}: ${input.ownerName}`,
        "Compliance owner assigned",
      ),
    );
  }
}
