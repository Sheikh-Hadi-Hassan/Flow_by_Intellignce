import { createHash, randomBytes } from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import {
  calculatePackagePricing,
  generateProposalSections,
  missingProposalSections,
  nextContractStatus,
  nextProposalStatus,
  splitPaymentSchedule,
  validatePaymentSchedule,
} from "@flow/commercial";
import type { CommercialRepository } from "@flow/database";
import type { ProposalContractRepository } from "@flow/database";
import {
  COMMERCIAL_REPOSITORY,
  PROPOSAL_CONTRACT_REPOSITORY,
} from "../database/persistence.providers.js";
import type { TrustedExecutionContext } from "../security/flow-auth-context.js";

const CLIENT_CONSENT =
  "I have reviewed this document and agree to proceed on the terms shown.";

@Injectable()
export class ProposalContractService {
  constructor(
    @Inject(COMMERCIAL_REPOSITORY)
    private readonly commercial: CommercialRepository,
    @Inject(PROPOSAL_CONTRACT_REPOSITORY)
    private readonly repo: ProposalContractRepository,
  ) {}

  private assert(identity: TrustedExecutionContext, permission: string) {
    if (!identity.permissionIds.includes(permission)) {
      throw new ForbiddenException("Missing required permission.");
    }
  }

  private hashDocument(payload: unknown): string {
    return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  }

  private async audit(
    identity: TrustedExecutionContext,
    eventType: string,
    targetType: string,
    targetId: string,
    metadata: Record<string, unknown>,
  ) {
    await this.commercial.recordAudit({
      eventId: crypto.randomUUID(),
      workspaceId: identity.workspaceId,
      actorId: identity.userId,
      eventType,
      targetType,
      targetId,
      metadata,
    });
  }

  async generateProposal(
    identity: TrustedExecutionContext,
    opportunityId: string,
  ) {
    this.assert(identity, "proposal.manage");
    const opportunity = await this.commercial.getOpportunity(
      identity.workspaceId,
      opportunityId,
    );
    if (!opportunity) throw new NotFoundException("Opportunity not found.");
    if (opportunity.journeyStatus !== "approved") {
      throw new BadRequestException(
        "Proposal requires an approved brief first.",
      );
    }
    const briefs = await this.commercial.listBriefVersions(
      identity.workspaceId,
      opportunityId,
    );
    const approvedBrief = briefs.find((row) => row.status === "approved");
    if (!approvedBrief) {
      throw new BadRequestException("Approved brief version not found.");
    }
    let proposal = await this.repo.getProposalByOpportunity(
      identity.workspaceId,
      opportunityId,
    );
    if (!proposal) {
      proposal = await this.repo.createProposal({
        id: crypto.randomUUID(),
        workspaceId: identity.workspaceId,
        opportunityId,
        briefVersionId: approvedBrief.id,
        currency: opportunity.currency,
        revision: 1,
      });
    }
    const existing = await this.repo.listProposalVersions(
      identity.workspaceId,
      proposal.id,
    );
    const active = existing.find(
      (row) => !["superseded", "expired", "declined"].includes(row.status),
    );
    if (active && active.status !== "draft" && active.status !== "changes_requested") {
      throw new ConflictException("Active proposal already exists.");
    }
    const client = await this.commercial.getClient(
      identity.workspaceId,
      opportunity.clientId,
    );
    const service = await this.commercial.getService(
      identity.workspaceId,
      opportunity.serviceId,
    );
    const deliverables = await this.commercial.listDeliverables(
      identity.workspaceId,
      opportunityId,
    );
    const recommended =
      approvedBrief.calculation?.recommendedPriceMinor ??
      opportunity.latestCalculation?.recommendedPriceMinor ??
      "0";
    const deliveryCost =
      approvedBrief.calculation?.totalDeliveryCostMinor ?? "0";
    const sections = generateProposalSections({
      clientName: client?.name ?? "Client",
      opportunityName: opportunity.name,
      currency: opportunity.currency,
      briefSections: approvedBrief.sections,
      deliverables,
      recommendedPriceMinor: recommended,
      pricingModel: service?.pricingModel ?? "project",
    });
    const lineItem = {
      description: "Core engagement",
      quantity: 1,
      unitPriceMinor: recommended,
      lineTotalMinor: recommended,
      sortOrder: 0,
    };
    const pricing = calculatePackagePricing({
      lineItems: [{ quantity: 1, unitPriceMinor: BigInt(recommended) }],
      discountBps: 0,
      taxBps: 0,
      contingencyBps: service?.defaultContingencyBps ?? 1000,
      deliveryCostMinor: BigInt(deliveryCost),
    });
    const versionNumber = existing.length + 1;
    const versionId = crypto.randomUUID();
    const version = await this.repo.createProposalVersion({
      id: versionId,
      workspaceId: identity.workspaceId,
      proposalId: proposal.id,
      versionNumber,
      status: "draft",
      pricingModel: service?.pricingModel ?? "project",
      calculation: {
        subtotalMinor: pricing.subtotalMinor.toString(),
        totalMinor: pricing.totalMinor.toString(),
        grossProfitMinor: pricing.grossProfitMinor.toString(),
        marginBps: pricing.marginBps,
      },
      sections: sections.map((section, index) => ({
        sectionKey: section.sectionKey,
        title: section.title,
        body: section.body,
        sortOrder: index,
      })),
      packages: [
        {
          name: "Recommended package",
          pricingModel: service?.pricingModel ?? "project",
          subtotalMinor: pricing.subtotalMinor.toString(),
          discountBps: 0,
          taxBps: 0,
          contingencyBps: service?.defaultContingencyBps ?? 1000,
          totalMinor: pricing.totalMinor.toString(),
          isRecommended: true,
          lineItems: [lineItem],
        },
      ],
    });
    await this.commercial.updateOpportunity(
      identity.workspaceId,
      opportunityId,
      opportunity.revision,
      { journeyStatus: "proposal_in_progress" },
    );
    await this.audit(identity, "proposal.generate", "proposal_version", versionId, {
      opportunityId,
      versionNumber,
    });
    return version;
  }

  async listProposals(identity: TrustedExecutionContext, opportunityId: string) {
    this.assert(identity, "opportunity.read");
    const proposal = await this.repo.getProposalByOpportunity(
      identity.workspaceId,
      opportunityId,
    );
    if (!proposal) return [];
    return this.repo.listProposalVersions(identity.workspaceId, proposal.id);
  }

  async getProposalVersion(identity: TrustedExecutionContext, versionId: string) {
    this.assert(identity, "opportunity.read");
    const version = await this.repo.getProposalVersion(
      identity.workspaceId,
      versionId,
    );
    if (!version) throw new NotFoundException("Proposal version not found.");
    return version;
  }

  async submitProposal(identity: TrustedExecutionContext, versionId: string) {
    this.assert(identity, "proposal.manage");
    const version = await this.getProposalVersion(identity, versionId);
    const gaps = missingProposalSections(
      version.sections.map((row) => row.sectionKey),
    );
    if (gaps.length > 0) {
      throw new BadRequestException(
        `Missing sections: ${gaps.join(", ").replaceAll("_", " ")}`,
      );
    }
    const context = {
      sectionsComplete: gaps.length === 0,
      pricingValid: version.packages.some((row) => BigInt(row.totalMinor) > 0n),
      actorCanApprove: false,
      actorCanShare: false,
      hasValidShare: false,
    };
    const next = nextProposalStatus(version.status, "SUBMIT_FOR_REVIEW", context);
    if (next === version.status) {
      throw new BadRequestException("Cannot submit proposal in current state.");
    }
    return this.repo.updateProposalVersionStatus(
      identity.workspaceId,
      versionId,
      next,
      { documentHash: this.hashDocument(version) },
    );
  }

  async requestProposalChanges(
    identity: TrustedExecutionContext,
    versionId: string,
  ) {
    this.assert(identity, "proposal.approve");
    const version = await this.getProposalVersion(identity, versionId);
    const next = nextProposalStatus(version.status, "REQUEST_CHANGES", {
      sectionsComplete: true,
      pricingValid: true,
      actorCanApprove: true,
      actorCanShare: false,
      hasValidShare: false,
    });
    if (next !== "changes_requested") {
      throw new BadRequestException("Cannot request changes in current state.");
    }
    return this.repo.updateProposalVersionStatus(
      identity.workspaceId,
      versionId,
      next,
    );
  }

  async approveProposal(
    identity: TrustedExecutionContext,
    versionId: string,
    idempotencyKey?: string,
  ) {
    this.assert(identity, "proposal.approve");
    if (idempotencyKey) {
      const replay = await this.commercial.consumeIdempotency({
        workspaceId: identity.workspaceId,
        key: idempotencyKey,
        requestClass: "proposal.approve",
        fingerprint: versionId,
      });
      if (replay === "replay") {
        return this.getProposalVersion(identity, versionId);
      }
    }
    const version = await this.getProposalVersion(identity, versionId);
    const context = {
      sectionsComplete: true,
      pricingValid: true,
      actorCanApprove: true,
      actorCanShare: false,
      hasValidShare: false,
    };
    const next = nextProposalStatus(version.status, "APPROVE", context);
    if (next !== "approved") {
      throw new ForbiddenException("Proposal cannot be approved.");
    }
    const approved = await this.repo.updateProposalVersionStatus(
      identity.workspaceId,
      versionId,
      "approved",
      {
        documentHash: this.hashDocument(version),
      },
    );
    await this.audit(identity, "proposal.approve", "proposal_version", versionId, {});
    return approved;
  }

  async shareProposal(identity: TrustedExecutionContext, versionId: string) {
    this.assert(identity, "proposal.share");
    const version = await this.getProposalVersion(identity, versionId);
    const context = {
      sectionsComplete: true,
      pricingValid: true,
      actorCanApprove: false,
      actorCanShare: true,
      hasValidShare: false,
    };
    const next = nextProposalStatus(version.status, "CREATE_SHARE", context);
    if (next !== "sent") {
      throw new BadRequestException("Proposal must be approved before sharing.");
    }
    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const share = await this.repo.createProposalShare({
      id: crypto.randomUUID(),
      workspaceId: identity.workspaceId,
      proposalVersionId: versionId,
      tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
    await this.repo.updateProposalVersionStatus(
      identity.workspaceId,
      versionId,
      "sent",
    );
    await this.audit(identity, "proposal.share", "proposal_share", share.id, {});
    return { shareId: share.id, token, expiresAt: share.expiresAt };
  }

  async respondToProposalShare(input: {
    readonly token: string;
    readonly response: "accepted" | "declined" | "changes_requested";
    readonly message?: string;
    readonly actorLabel: string;
  }) {
    const tokenHash = createHash("sha256").update(input.token).digest("hex");
    const share = await this.repo.getProposalShareByTokenHash(tokenHash);
    if (!share) throw new NotFoundException("Review link not found or expired.");
    const version = share.proposalVersion;
    let status = version.status;
    if (status === "sent") {
      status = nextProposalStatus(status, "CLIENT_OPEN", {
        sectionsComplete: true,
        pricingValid: true,
        actorCanApprove: false,
        actorCanShare: false,
        hasValidShare: true,
      });
      await this.repo.updateProposalVersionStatus(
        share.workspaceId,
        version.id,
        status,
      );
    }
    const event =
      input.response === "accepted"
        ? "CLIENT_ACCEPT"
        : input.response === "declined"
          ? "CLIENT_DECLINE"
          : "CLIENT_REQUEST_CHANGES";
    const next = nextProposalStatus(status, event, {
      sectionsComplete: true,
      pricingValid: true,
      actorCanApprove: false,
      actorCanShare: false,
      hasValidShare: true,
    });
    const documentHash = this.hashDocument(version);
    await this.repo.recordProposalClientResponse({
      id: crypto.randomUUID(),
      workspaceId: share.workspaceId,
      proposalVersionId: version.id,
      response: input.response,
      ...(input.message ? { message: input.message } : {}),
      consentText: CLIENT_CONSENT,
      documentHash,
      actorLabel: input.actorLabel,
    });
    const updated = await this.repo.updateProposalVersionStatus(
      share.workspaceId,
      version.id,
      next,
      next === "accepted"
        ? { immutableAt: new Date().toISOString() }
        : undefined,
    );
    if (next === "accepted") {
      const parent = await this.repo.getProposal(
        share.workspaceId,
        version.proposalId,
      );
      if (parent) {
        const opportunity = await this.commercial.getOpportunity(
          share.workspaceId,
          parent.opportunityId,
        );
        if (opportunity) {
          await this.commercial.updateOpportunity(
            share.workspaceId,
            parent.opportunityId,
            opportunity.revision,
            { journeyStatus: "proposal_accepted" },
          );
        }
      }
    }
    return updated;
  }

  async getProposalByShareToken(token: string) {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const share = await this.repo.getProposalShareByTokenHash(tokenHash);
    if (!share) throw new NotFoundException("Review link not found or expired.");
    return {
      proposal: share.proposalVersion,
      expiresAt: share.expiresAt,
    };
  }

  async generateContract(
    identity: TrustedExecutionContext,
    opportunityId: string,
  ) {
    this.assert(identity, "contract.manage");
    if (
      await this.repo.hasExecutedContract(identity.workspaceId, opportunityId)
    ) {
      throw new ConflictException("Executed contract already exists.");
    }
    const proposal = await this.repo.getProposalByOpportunity(
      identity.workspaceId,
      opportunityId,
    );
    if (!proposal) throw new NotFoundException("Proposal not found.");
    const versions = await this.repo.listProposalVersions(
      identity.workspaceId,
      proposal.id,
    );
    const accepted = versions.find((row) => row.status === "accepted");
    if (!accepted) {
      throw new BadRequestException("Accepted proposal required.");
    }
    let contract = await this.repo.getContractByOpportunity(
      identity.workspaceId,
      opportunityId,
    );
    if (!contract) {
      contract = await this.repo.createContract({
        id: crypto.randomUUID(),
        workspaceId: identity.workspaceId,
        opportunityId,
        proposalVersionId: accepted.id,
        currency: proposal.currency,
        revision: 1,
      });
    }
    const pkg = accepted.packages.find((row) => row.isRecommended) ?? accepted.packages[0];
    if (!pkg) throw new BadRequestException("Proposal pricing missing.");
    const totalMinor = BigInt(pkg.totalMinor);
    const schedule = splitPaymentSchedule(totalMinor, [
      "Deposit on execution",
      "Final on delivery",
    ]);
    const versionId = crypto.randomUUID();
    const version = await this.repo.createContractVersion({
      id: versionId,
      workspaceId: identity.workspaceId,
      contractId: contract.id,
      versionNumber: 1,
      status: "draft",
      calculation: accepted.calculation,
      clauses: [
        {
          clauseKey: "scope",
          title: "Scope of work",
          body:
            accepted.sections.find((s) => s.sectionKey === "scope_deliverables")
              ?.body ?? "",
          sortOrder: 0,
        },
        {
          clauseKey: "terms",
          title: "Terms",
          body:
            accepted.sections.find((s) => s.sectionKey === "terms")?.body ?? "",
          sortOrder: 1,
        },
      ],
      parties: [
        { partyRole: "provider", legalName: "Agency" },
        { partyRole: "client", legalName: "Client" },
      ],
      paymentSchedule: schedule.map((item, index) => ({
        label: item.label,
        dueDescription: "As described in proposal",
        amountMinor: item.amountMinor.toString(),
        sortOrder: index,
      })),
    });
    if (!validatePaymentSchedule(schedule, totalMinor)) {
      throw new BadRequestException("Invalid payment schedule.");
    }
    await this.audit(identity, "contract.generate", "contract_version", versionId, {
      opportunityId,
    });
    return version;
  }

  async listContracts(identity: TrustedExecutionContext, opportunityId: string) {
    this.assert(identity, "opportunity.read");
    const contract = await this.repo.getContractByOpportunity(
      identity.workspaceId,
      opportunityId,
    );
    if (!contract) return [];
    return this.repo.listContractVersions(identity.workspaceId, contract.id);
  }

  async getContractVersion(identity: TrustedExecutionContext, versionId: string) {
    this.assert(identity, "opportunity.read");
    const version = await this.repo.getContractVersion(
      identity.workspaceId,
      versionId,
    );
    if (!version) throw new NotFoundException("Contract version not found.");
    return version;
  }

  async submitContract(identity: TrustedExecutionContext, versionId: string) {
    this.assert(identity, "contract.manage");
    const version = await this.getContractVersion(identity, versionId);
    const total = version.paymentSchedule.reduce(
      (sum, row) => sum + BigInt(row.amountMinor),
      0n,
    );
    const context = {
      clausesComplete: version.clauses.length > 0,
      partiesComplete: version.parties.length >= 2,
      paymentScheduleValid: validatePaymentSchedule(
        version.paymentSchedule.map((row) => ({
          label: row.label,
          amountMinor: BigInt(row.amountMinor),
        })),
        total,
      ),
      actorCanApprove: false,
      acceptanceEvidencePresent: false,
    };
    const next = nextContractStatus(version.status, "SUBMIT_FOR_REVIEW", context);
    if (next === version.status) {
      throw new BadRequestException("Cannot submit contract.");
    }
    return this.repo.updateContractVersionStatus(
      identity.workspaceId,
      versionId,
      next,
      { documentHash: this.hashDocument(version) },
    );
  }

  async approveContract(
    identity: TrustedExecutionContext,
    versionId: string,
    idempotencyKey?: string,
  ) {
    this.assert(identity, "contract.approve");
    if (idempotencyKey) {
      const replay = await this.commercial.consumeIdempotency({
        workspaceId: identity.workspaceId,
        key: idempotencyKey,
        requestClass: "contract.approve",
        fingerprint: versionId,
      });
      if (replay === "replay") {
        return this.repo.getContractVersion(identity.workspaceId, versionId);
      }
    }
    const version = await this.getContractVersion(identity, versionId);
    const total = version.paymentSchedule.reduce(
      (sum, row) => sum + BigInt(row.amountMinor),
      0n,
    );
    const context = {
      clausesComplete: true,
      partiesComplete: true,
      paymentScheduleValid: validatePaymentSchedule(
        version.paymentSchedule.map((row) => ({
          label: row.label,
          amountMinor: BigInt(row.amountMinor),
        })),
        total,
      ),
      actorCanApprove: true,
      acceptanceEvidencePresent: false,
    };
    const next = nextContractStatus(version.status, "APPROVE", context);
    if (next !== "pending_client_acceptance") {
      throw new ForbiddenException("Contract cannot be approved.");
    }
    return this.repo.updateContractVersionStatus(
      identity.workspaceId,
      versionId,
      next,
      { documentHash: this.hashDocument(version) },
    );
  }

  async acceptContract(
    identity: TrustedExecutionContext,
    versionId: string,
    actorLabel: string,
    idempotencyKey?: string,
  ) {
    this.assert(identity, "contract.execute");
    if (idempotencyKey) {
      const replay = await this.commercial.consumeIdempotency({
        workspaceId: identity.workspaceId,
        key: idempotencyKey,
        requestClass: "contract.execute",
        fingerprint: versionId,
      });
      if (replay === "replay") {
        return this.repo.getContractVersion(identity.workspaceId, versionId);
      }
    }
    const version = await this.getContractVersion(identity, versionId);
    const context = {
      clausesComplete: true,
      partiesComplete: true,
      paymentScheduleValid: true,
      actorCanApprove: false,
      acceptanceEvidencePresent: true,
    };
    const next = nextContractStatus(version.status, "CLIENT_ACCEPT", context);
    if (next !== "executed") {
      throw new BadRequestException("Contract is not ready for execution.");
    }
    const documentHash = this.hashDocument(version);
    await this.repo.recordContractAcceptance({
      id: crypto.randomUUID(),
      workspaceId: identity.workspaceId,
      contractVersionId: versionId,
      consentText: CLIENT_CONSENT,
      documentHash,
      actorLabel,
    });
    const executed = await this.repo.updateContractVersionStatus(
      identity.workspaceId,
      versionId,
      "executed",
      {
        documentHash,
        executedAt: new Date().toISOString(),
      },
    );
    const contract = await this.repo.getContract(
      identity.workspaceId,
      version.contractId,
    );
    if (contract) {
      const opportunity = await this.commercial.getOpportunity(
        identity.workspaceId,
        contract.opportunityId,
      );
      if (opportunity) {
        await this.commercial.updateOpportunity(
          identity.workspaceId,
          contract.opportunityId,
          opportunity.revision,
          { journeyStatus: "contract_executed" },
        );
      }
    }
    await this.audit(identity, "contract.execute", "contract_version", versionId, {
      actorLabel,
    });
    return executed;
  }
}
