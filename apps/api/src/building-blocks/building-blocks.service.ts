import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CRM_CORE_BLOCK_ID,
  NORTHSTAR_COMPOSER_PROFILE,
  presentBusinessRegistry,
  registryBusinessManifest,
  crmCoreManifest,
  type BusinessComposerProfile,
  type BusinessLocationSeed,
  type BusinessRegistrySeed,
} from "@flow/contracts";
import type { BuildingBlockStore, FlowIdentityRepository } from "@flow/database";
import {
  BUILDING_BLOCK_STORE,
  IDENTITY_REPOSITORY,
} from "../database/persistence.providers.js";
import type { TrustedExecutionContext } from "../security/flow-auth-context.js";

@Injectable()
export class BuildingBlocksService {
  constructor(
    @Inject(BUILDING_BLOCK_STORE)
    private readonly store: BuildingBlockStore,
    @Inject(IDENTITY_REPOSITORY)
    private readonly identity: FlowIdentityRepository,
  ) {}

  private assert(identity: TrustedExecutionContext, permission: string) {
    if (!identity.permissionIds.includes(permission)) {
      throw new ForbiddenException("Missing required permission.");
    }
  }

  catalog() {
    return {
      manifests: [crmCoreManifest, registryBusinessManifest],
    };
  }

  async overview(identity: TrustedExecutionContext) {
    this.assert(identity, "building_block.read");
    const [installations, recommendations, audits] = await Promise.all([
      this.store.listInstallations(identity.workspaceId),
      this.store.compose({
        ...NORTHSTAR_COMPOSER_PROFILE,
        workspaceId: identity.workspaceId,
      }),
      this.store.listAudit(identity.workspaceId),
    ]);
    return {
      manifests: [crmCoreManifest, registryBusinessManifest],
      installations,
      recommendations,
      audits,
    };
  }

  async compose(
    identity: TrustedExecutionContext,
    profile: Partial<BusinessComposerProfile>,
  ) {
    this.assert(identity, "building_block.read");
    return this.store.compose({
      ...NORTHSTAR_COMPOSER_PROFILE,
      ...profile,
      workspaceId: identity.workspaceId,
    });
  }

  async configure(
    identity: TrustedExecutionContext,
    blockId: string,
    configuration: Readonly<Record<string, unknown>>,
  ) {
    this.assert(identity, "building_block.configure");
    return this.store.configure(
      identity.workspaceId,
      blockId,
      identity.actorId,
      configuration,
    );
  }

  async submit(
    identity: TrustedExecutionContext,
    blockId: string,
    configuration: Readonly<Record<string, unknown>>,
  ) {
    this.assert(identity, "building_block.configure");
    return this.store.submit(
      identity.workspaceId,
      blockId,
      identity.actorId,
      configuration,
    );
  }

  async approve(identity: TrustedExecutionContext, blockId: string) {
    this.assert(identity, "building_block.approve");
    return this.store.approve(
      identity.workspaceId,
      blockId,
      identity.actorId,
    );
  }

  async suspend(identity: TrustedExecutionContext, blockId: string) {
    this.assert(identity, "building_block.suspend");
    return this.store.suspend(
      identity.workspaceId,
      blockId,
      identity.actorId,
    );
  }

  async listClients(identity: TrustedExecutionContext) {
    this.assert(identity, "client.read");
    return this.store.listClients(identity.workspaceId);
  }

  async getClient(identity: TrustedExecutionContext, clientId: string) {
    this.assert(identity, "client.read");
    const client = await this.store.getClient(identity.workspaceId, clientId);
    if (!client) throw new NotFoundException("Client not found.");
    return client;
  }

  async listDuplicates(identity: TrustedExecutionContext) {
    this.assert(identity, "crm.duplicate.propose");
    return this.store.listDuplicates(identity.workspaceId);
  }

  async proposeWrite(
    identity: TrustedExecutionContext,
    toolName: string,
    payload: Readonly<Record<string, unknown>>,
  ) {
    const permission =
      toolName === "propose_duplicate_merge"
        ? "crm.duplicate.propose"
        : toolName === "propose_location_change"
          ? "location.manage"
          : toolName === "propose_business_profile_update"
            ? "organization.update_profile"
            : "client.manage";
    this.assert(identity, permission);
    return this.store.proposeWrite({
      id: crypto.randomUUID(),
      workspaceId: identity.workspaceId,
      toolName,
      payload,
      createdBy: identity.actorId,
    });
  }

  async approveWrite(
    identity: TrustedExecutionContext,
    proposalId: string,
  ) {
    if (
      identity.permissionIds.includes("crm.duplicate.merge") ||
      identity.permissionIds.includes("location.manage") ||
      identity.permissionIds.includes("organization.update_profile")
    ) {
      return this.store.approveWrite(
        identity.workspaceId,
        proposalId,
        identity.actorId,
      );
    }
    throw new ForbiddenException("Missing required permission.");
  }

  isCrmActive(identity: TrustedExecutionContext) {
    return this.store.getInstallation(identity.workspaceId, CRM_CORE_BLOCK_ID);
  }

  async getBusinessRegistry(identity: TrustedExecutionContext) {
    this.assert(identity, "organization.read");
    const seed = await this.store.getBusinessRegistry(identity.workspaceId);
    if (!seed) throw new NotFoundException("Business Registry is empty.");
    return presentBusinessRegistry(seed, identity.permissionIds);
  }

  async seedBusinessRegistry(
    identity: TrustedExecutionContext,
    options: { readonly validateOnly?: boolean } = {},
  ) {
    this.assert(identity, "building_block.approve");
    const workspace = await this.identity.findWorkspaceById(identity.workspaceId);
    if (!workspace) throw new NotFoundException("Workspace not found.");
    return this.store.seedBusinessRegistry({
      workspaceId: identity.workspaceId,
      workspaceSlug: workspace.slug,
      actorId: identity.actorId,
      ...(options.validateOnly !== undefined
        ? { validateOnly: options.validateOnly }
        : {}),
    });
  }

  async updateBusinessProfile(
    identity: TrustedExecutionContext,
    patch: Partial<Pick<BusinessRegistrySeed, "tradingName" | "website" | "firmographics">> & {
      readonly reason?: string;
    },
  ) {
    this.assert(identity, "organization.update_profile");
    return this.store.updateBusinessProfile({
      workspaceId: identity.workspaceId,
      actorId: identity.actorId,
      actorName: identity.actorId,
      patch,
    });
  }

  async upsertLocation(
    identity: TrustedExecutionContext,
    location: BusinessLocationSeed,
    reason?: string,
  ) {
    this.assert(identity, "location.manage");
    return this.store.upsertLocation({
      workspaceId: identity.workspaceId,
      actorId: identity.actorId,
      actorName: identity.actorId,
      location,
      ...(reason !== undefined ? { reason } : {}),
    });
  }

  async archiveLocation(
    identity: TrustedExecutionContext,
    locationId: string,
    reason: string,
  ) {
    this.assert(identity, "location.manage");
    return this.store.archiveLocation({
      workspaceId: identity.workspaceId,
      actorId: identity.actorId,
      actorName: identity.actorId,
      locationId,
      reason,
    });
  }

  async proposePrimaryLocation(
    identity: TrustedExecutionContext,
    locationId: string,
    reason: string,
  ) {
    this.assert(identity, "location.manage");
    return this.store.proposePrimaryLocationChange({
      workspaceId: identity.workspaceId,
      actorId: identity.actorId,
      locationId,
      reason,
    });
  }

  async applyPrimaryLocation(
    identity: TrustedExecutionContext,
    locationId: string,
    reason: string,
  ) {
    this.assert(identity, "location.manage");
    return this.store.applyPrimaryLocationChange({
      workspaceId: identity.workspaceId,
      actorId: identity.actorId,
      actorName: identity.actorId,
      locationId,
      reason,
    });
  }

  async addDocument(
    identity: TrustedExecutionContext,
    document: BusinessRegistrySeed["documents"][number],
  ) {
    this.assert(identity, "registry.document.manage");
    return this.store.addDocumentMetadata({
      workspaceId: identity.workspaceId,
      actorId: identity.actorId,
      actorName: identity.actorId,
      document,
    });
  }

  async assignComplianceOwner(
    identity: TrustedExecutionContext,
    input: {
      readonly area: string;
      readonly ownerName: string;
      readonly ownerMemberId: string;
    },
  ) {
    this.assert(identity, "registry.compliance.manage");
    return this.store.assignComplianceOwner({
      workspaceId: identity.workspaceId,
      actorId: identity.actorId,
      actorName: identity.actorId,
      ...input,
    });
  }

  async listRegistryEvents(identity: TrustedExecutionContext) {
    this.assert(identity, "organization.read");
    const events = await this.store.listEvents(identity.workspaceId);
    return events.filter((event) =>
      event.name.startsWith("business_profile.") ||
      event.name.startsWith("location.") ||
      event.name.startsWith("registration_record.") ||
      event.name.startsWith("document.") ||
      event.name.startsWith("compliance_owner.") ||
      event.name.startsWith("primary_location."),
    );
  }
}
