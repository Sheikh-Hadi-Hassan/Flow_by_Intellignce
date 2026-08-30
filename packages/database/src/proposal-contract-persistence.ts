import type {
  ContractVersionStatus,
  ProposalVersionStatus,
} from "@flow/commercial";
import type { SqlExecutor } from "./business-persistence.js";

type CreateProposalVersionInput = Parameters<
  ProposalContractRepository["createProposalVersion"]
>[0];
type CreateContractVersionInput = Parameters<
  ProposalContractRepository["createContractVersion"]
>[0];
type ProposalStatusPatch = Parameters<
  ProposalContractRepository["updateProposalVersionStatus"]
>[3];
type ContractStatusPatch = Parameters<
  ProposalContractRepository["updateContractVersionStatus"]
>[3];
type ProposalClientResponseInput = Parameters<
  ProposalContractRepository["recordProposalClientResponse"]
>[0];
type ContractAcceptanceInput = Parameters<
  ProposalContractRepository["recordContractAcceptance"]
>[0];

export interface ProposalRecord {
  readonly id: string;
  readonly workspaceId: string;
  readonly opportunityId: string;
  readonly briefVersionId: string;
  readonly currency: string;
  readonly revision: number;
}

export interface ProposalSectionRecord {
  readonly id: string;
  readonly sectionKey: string;
  readonly title: string;
  readonly body: string;
  readonly sortOrder: number;
}

export interface ProposalLineItemRecord {
  readonly id: string;
  readonly description: string;
  readonly quantity: number;
  readonly unitPriceMinor: string;
  readonly lineTotalMinor: string;
  readonly sortOrder: number;
}

export interface ProposalPackageRecord {
  readonly id: string;
  readonly name: string;
  readonly pricingModel: string;
  readonly subtotalMinor: string;
  readonly discountBps: number;
  readonly taxBps: number;
  readonly contingencyBps: number;
  readonly totalMinor: string;
  readonly isRecommended: boolean;
  readonly lineItems: readonly ProposalLineItemRecord[];
}

export interface ProposalVersionRecord {
  readonly id: string;
  readonly workspaceId: string;
  readonly proposalId: string;
  readonly versionNumber: number;
  readonly status: ProposalVersionStatus;
  readonly pricingModel: string;
  readonly calculation: Record<string, unknown>;
  readonly documentHash?: string;
  readonly sections: readonly ProposalSectionRecord[];
  readonly packages: readonly ProposalPackageRecord[];
  readonly immutableAt?: string;
}

export interface ProposalShareRecord {
  readonly id: string;
  readonly workspaceId: string;
  readonly proposalVersionId: string;
  readonly tokenHash: string;
  readonly expiresAt: string;
  readonly revokedAt?: string;
}

export interface ContractRecord {
  readonly id: string;
  readonly workspaceId: string;
  readonly opportunityId: string;
  readonly proposalVersionId: string;
  readonly currency: string;
  readonly revision: number;
}

export interface ContractClauseRecord {
  readonly id: string;
  readonly clauseKey: string;
  readonly title: string;
  readonly body: string;
  readonly sortOrder: number;
}

export interface ContractPartyRecord {
  readonly id: string;
  readonly partyRole: string;
  readonly legalName: string;
  readonly email?: string;
}

export interface ContractPaymentRecord {
  readonly id: string;
  readonly label: string;
  readonly dueDescription: string;
  readonly amountMinor: string;
  readonly sortOrder: number;
}

export interface ContractVersionRecord {
  readonly id: string;
  readonly workspaceId: string;
  readonly contractId: string;
  readonly versionNumber: number;
  readonly status: ContractVersionStatus;
  readonly calculation: Record<string, unknown>;
  readonly documentHash?: string;
  readonly clauses: readonly ContractClauseRecord[];
  readonly parties: readonly ContractPartyRecord[];
  readonly paymentSchedule: readonly ContractPaymentRecord[];
  readonly executedAt?: string;
}

export interface ProposalContractRepository {
  createProposal(record: ProposalRecord): Promise<ProposalRecord>;
  getProposalByOpportunity(
    workspaceId: string,
    opportunityId: string,
  ): Promise<ProposalRecord | undefined>;
  getProposal(
    workspaceId: string,
    proposalId: string,
  ): Promise<ProposalRecord | undefined>;
  getContract(
    workspaceId: string,
    contractId: string,
  ): Promise<ContractRecord | undefined>;
  createProposalVersion(
    record: Omit<ProposalVersionRecord, "sections" | "packages"> & {
      readonly sections: readonly Omit<ProposalSectionRecord, "id">[];
      readonly packages: readonly (Omit<ProposalPackageRecord, "id" | "lineItems"> & {
        readonly lineItems: readonly Omit<ProposalLineItemRecord, "id">[];
      })[];
    },
  ): Promise<ProposalVersionRecord>;
  listProposalVersions(
    workspaceId: string,
    proposalId: string,
  ): Promise<readonly ProposalVersionRecord[]>;
  getProposalVersion(
    workspaceId: string,
    versionId: string,
  ): Promise<ProposalVersionRecord | undefined>;
  updateProposalVersionStatus(
    workspaceId: string,
    versionId: string,
    status: ProposalVersionStatus,
    patch?: {
      readonly documentHash?: string;
      readonly calculation?: Record<string, unknown>;
      readonly immutableAt?: string;
    },
  ): Promise<ProposalVersionRecord>;
  createProposalShare(record: ProposalShareRecord): Promise<ProposalShareRecord>;
  getProposalShareByTokenHash(
    tokenHash: string,
  ): Promise<
    (ProposalShareRecord & { readonly proposalVersion: ProposalVersionRecord }) | undefined
  >;
  revokeProposalShare(workspaceId: string, shareId: string): Promise<void>;
  recordProposalClientResponse(input: {
    readonly id: string;
    readonly workspaceId: string;
    readonly proposalVersionId: string;
    readonly response: "accepted" | "declined" | "changes_requested";
    readonly message?: string;
    readonly consentText: string;
    readonly documentHash: string;
    readonly actorLabel: string;
  }): Promise<void>;
  createContract(record: ContractRecord): Promise<ContractRecord>;
  getContractByOpportunity(
    workspaceId: string,
    opportunityId: string,
  ): Promise<ContractRecord | undefined>;
  createContractVersion(
    record: Omit<ContractVersionRecord, "clauses" | "parties" | "paymentSchedule"> & {
      readonly clauses: readonly Omit<ContractClauseRecord, "id">[];
      readonly parties: readonly Omit<ContractPartyRecord, "id">[];
      readonly paymentSchedule: readonly Omit<ContractPaymentRecord, "id">[];
    },
  ): Promise<ContractVersionRecord>;
  getContractVersion(
    workspaceId: string,
    versionId: string,
  ): Promise<ContractVersionRecord | undefined>;
  listContractVersions(
    workspaceId: string,
    contractId: string,
  ): Promise<readonly ContractVersionRecord[]>;
  updateContractVersionStatus(
    workspaceId: string,
    versionId: string,
    status: ContractVersionStatus,
    patch?: {
      readonly documentHash?: string;
      readonly calculation?: Record<string, unknown>;
      readonly executedAt?: string;
    },
  ): Promise<ContractVersionRecord>;
  recordContractAcceptance(input: {
    readonly id: string;
    readonly workspaceId: string;
    readonly contractVersionId: string;
    readonly consentText: string;
    readonly documentHash: string;
    readonly actorLabel: string;
  }): Promise<void>;
  hasExecutedContract(workspaceId: string, opportunityId: string): Promise<boolean>;
}

/* eslint-disable @typescript-eslint/require-await -- in-memory store matches the async repository contract */
export class InMemoryProposalContractRepository
  implements ProposalContractRepository
{
  private readonly proposals = new Map<string, ProposalRecord>();
  private readonly versions = new Map<string, ProposalVersionRecord>();
  private readonly shares = new Map<string, ProposalShareRecord>();
  private readonly contracts = new Map<string, ContractRecord>();
  private readonly contractVersions = new Map<string, ContractVersionRecord>();

  async createProposal(record: ProposalRecord) {
    this.proposals.set(record.id, record);
    return record;
  }

  async getProposalByOpportunity(workspaceId: string, opportunityId: string) {
    return [...this.proposals.values()].find(
      (row) =>
        row.workspaceId === workspaceId && row.opportunityId === opportunityId,
    );
  }

  async getProposal(workspaceId: string, proposalId: string) {
    const row = this.proposals.get(proposalId);
    return row?.workspaceId === workspaceId ? row : undefined;
  }

  async getContract(workspaceId: string, contractId: string) {
    const row = this.contracts.get(contractId);
    return row?.workspaceId === workspaceId ? row : undefined;
  }

  async createProposalVersion(
    record: CreateProposalVersionInput,
  ): Promise<ProposalVersionRecord> {
    const version: ProposalVersionRecord = {
      id: record.id,
      workspaceId: record.workspaceId,
      proposalId: record.proposalId,
      versionNumber: record.versionNumber,
      status: record.status,
      pricingModel: record.pricingModel,
      calculation: record.calculation,
      ...(record.documentHash ? { documentHash: record.documentHash } : {}),
      sections: record.sections.map((section, index) => ({
        id: `${record.id}-sec-${index}`,
        ...section,
      })),
      packages: record.packages.map((pkg, pkgIndex) => ({
        id: `${record.id}-pkg-${pkgIndex}`,
        name: pkg.name,
        pricingModel: pkg.pricingModel,
        subtotalMinor: pkg.subtotalMinor,
        discountBps: pkg.discountBps,
        taxBps: pkg.taxBps,
        contingencyBps: pkg.contingencyBps,
        totalMinor: pkg.totalMinor,
        isRecommended: pkg.isRecommended,
        lineItems: pkg.lineItems.map((line, lineIndex) => ({
          id: `${record.id}-line-${pkgIndex}-${lineIndex}`,
          ...line,
        })),
      })),
    };
    this.versions.set(record.id, version);
    return version;
  }

  async listProposalVersions(workspaceId: string, proposalId: string) {
    return [...this.versions.values()].filter(
      (row) => row.workspaceId === workspaceId && row.proposalId === proposalId,
    );
  }

  async getProposalVersion(workspaceId: string, versionId: string) {
    const row = this.versions.get(versionId);
    return row?.workspaceId === workspaceId ? row : undefined;
  }

  async updateProposalVersionStatus(
    workspaceId: string,
    versionId: string,
    status: ProposalVersionStatus,
    patch?: ProposalStatusPatch,
  ): Promise<ProposalVersionRecord> {
    const current = await this.getProposalVersion(workspaceId, versionId);
    if (!current) throw new Error("Proposal version not found.");
    if (current.status === "accepted" || current.status === "declined") {
      throw new Error("final proposal versions cannot be updated");
    }
    const next: ProposalVersionRecord = {
      ...current,
      status,
      ...(patch?.documentHash ? { documentHash: patch.documentHash } : {}),
      ...(patch?.calculation ? { calculation: patch.calculation } : {}),
      ...(patch?.immutableAt ? { immutableAt: patch.immutableAt } : {}),
    };
    this.versions.set(versionId, next);
    return next;
  }

  async createProposalShare(record: ProposalShareRecord) {
    this.shares.set(record.id, record);
    return record;
  }

  async getProposalShareByTokenHash(tokenHash: string) {
    const share = [...this.shares.values()].find(
      (row) => row.tokenHash === tokenHash && !row.revokedAt,
    );
    if (!share) return undefined;
    const proposalVersion = [...this.versions.values()].find(
      (row) => row.id === share.proposalVersionId,
    );
    if (!proposalVersion) return undefined;
    if (new Date(share.expiresAt).getTime() < Date.now()) return undefined;
    return { ...share, proposalVersion };
  }

  async revokeProposalShare(workspaceId: string, shareId: string) {
    const share = this.shares.get(shareId);
    if (!share || share.workspaceId !== workspaceId) {
      throw new Error("Share not found.");
    }
    this.shares.set(shareId, {
      ...share,
      revokedAt: new Date().toISOString(),
    });
  }

  async recordProposalClientResponse(input: ProposalClientResponseInput) {
    void input;
  }

  async createContract(record: ContractRecord) {
    this.contracts.set(record.id, record);
    return record;
  }

  async getContractByOpportunity(workspaceId: string, opportunityId: string) {
    return [...this.contracts.values()].find(
      (row) =>
        row.workspaceId === workspaceId && row.opportunityId === opportunityId,
    );
  }

  async createContractVersion(
    record: Parameters<ProposalContractRepository["createContractVersion"]>[0],
  ) {
    const version: ContractVersionRecord = {
      id: record.id,
      workspaceId: record.workspaceId,
      contractId: record.contractId,
      versionNumber: record.versionNumber,
      status: record.status,
      calculation: record.calculation,
      ...(record.documentHash ? { documentHash: record.documentHash } : {}),
      clauses: record.clauses.map((clause, index) => ({
        id: `${record.id}-clause-${index}`,
        ...clause,
      })),
      parties: record.parties.map((party, index) => ({
        id: `${record.id}-party-${index}`,
        ...party,
      })),
      paymentSchedule: record.paymentSchedule.map((item, index) => ({
        id: `${record.id}-pay-${index}`,
        ...item,
      })),
    };
    this.contractVersions.set(record.id, version);
    return version;
  }

  async getContractVersion(workspaceId: string, versionId: string) {
    const row = this.contractVersions.get(versionId);
    return row?.workspaceId === workspaceId ? row : undefined;
  }

  async listContractVersions(workspaceId: string, contractId: string) {
    return [...this.contractVersions.values()].filter(
      (row) => row.workspaceId === workspaceId && row.contractId === contractId,
    );
  }

  async updateContractVersionStatus(
    workspaceId: string,
    versionId: string,
    status: ContractVersionStatus,
    patch?: ContractStatusPatch,
  ): Promise<ContractVersionRecord> {
    const current = await this.getContractVersion(workspaceId, versionId);
    if (!current) throw new Error("Contract version not found.");
    if (current.status === "executed") {
      throw new Error("executed contract versions are immutable");
    }
    const next: ContractVersionRecord = {
      ...current,
      status,
      ...(patch?.documentHash ? { documentHash: patch.documentHash } : {}),
      ...(patch?.calculation ? { calculation: patch.calculation } : {}),
      ...(patch?.executedAt ? { executedAt: patch.executedAt } : {}),
    };
    this.contractVersions.set(versionId, next);
    return next;
  }

  async recordContractAcceptance(input: ContractAcceptanceInput) {
    void input;
  }

  async hasExecutedContract(workspaceId: string, opportunityId: string) {
    const contract = await this.getContractByOpportunity(
      workspaceId,
      opportunityId,
    );
    if (!contract) return false;
    return [...this.contractVersions.values()].some(
      (row) =>
        row.contractId === contract.id &&
        row.workspaceId === workspaceId &&
        row.status === "executed",
    );
  }
}

export class PostgresProposalContractRepository
  implements ProposalContractRepository
{
  constructor(private readonly db: SqlExecutor) {}

  async createProposal(record: ProposalRecord) {
    await this.db.query(
      `insert into public.proposals
        (id, workspace_id, opportunity_id, brief_version_id, currency, revision)
       values ($1,$2,$3,$4,$5,$6)`,
      [
        record.id,
        record.workspaceId,
        record.opportunityId,
        record.briefVersionId,
        record.currency,
        record.revision,
      ],
    );
    return record;
  }

  async getProposalByOpportunity(workspaceId: string, opportunityId: string) {
    const result = await this.db.query<Record<string, unknown>>(
      `select * from public.proposals
        where workspace_id = $1 and opportunity_id = $2 limit 1`,
      [workspaceId, opportunityId],
    );
    const row = result.rows[0];
    return row ? mapProposal(row) : undefined;
  }

  async getProposal(workspaceId: string, proposalId: string) {
    const result = await this.db.query<Record<string, unknown>>(
      `select * from public.proposals where id = $1 and workspace_id = $2`,
      [proposalId, workspaceId],
    );
    const row = result.rows[0];
    return row ? mapProposal(row) : undefined;
  }

  async getContract(workspaceId: string, contractId: string) {
    const result = await this.db.query<Record<string, unknown>>(
      `select * from public.contracts where id = $1 and workspace_id = $2`,
      [contractId, workspaceId],
    );
    const row = result.rows[0];
    return row ? mapContract(row) : undefined;
  }

  async createProposalVersion(
    record: CreateProposalVersionInput,
  ): Promise<ProposalVersionRecord> {
    await this.db.query(
      `insert into public.proposal_versions
        (id, workspace_id, proposal_id, version_number, status, pricing_model, calculation, document_hash)
       values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8)`,
      [
        record.id,
        record.workspaceId,
        record.proposalId,
        record.versionNumber,
        record.status,
        record.pricingModel,
        JSON.stringify(record.calculation),
        record.documentHash ?? null,
      ],
    );
    for (const section of record.sections) {
      await this.db.query(
        `insert into public.proposal_sections
          (id, workspace_id, proposal_version_id, section_key, title, body, sort_order)
         values (gen_random_uuid(),$1,$2,$3,$4,$5,$6)`,
        [
          record.workspaceId,
          record.id,
          section.sectionKey,
          section.title,
          section.body,
          section.sortOrder,
        ],
      );
    }
    for (const pkg of record.packages) {
      const pkgResult = await this.db.query<{ id: string }>(
        `insert into public.proposal_pricing_packages
          (id, workspace_id, proposal_version_id, name, pricing_model,
           subtotal_minor, discount_bps, tax_bps, contingency_bps, total_minor, is_recommended)
         values (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         returning id::text as id`,
        [
          record.workspaceId,
          record.id,
          pkg.name,
          pkg.pricingModel,
          pkg.subtotalMinor,
          pkg.discountBps,
          pkg.taxBps,
          pkg.contingencyBps,
          pkg.totalMinor,
          pkg.isRecommended,
        ],
      );
      const packageId = pkgResult.rows[0]?.id;
      if (!packageId) throw new Error("Failed to create pricing package.");
      for (const line of pkg.lineItems) {
        await this.db.query(
          `insert into public.proposal_line_items
            (id, workspace_id, package_id, description, quantity, unit_price_minor, line_total_minor, sort_order)
           values (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7)`,
          [
            record.workspaceId,
            packageId,
            line.description,
            line.quantity,
            line.unitPriceMinor,
            line.lineTotalMinor,
            line.sortOrder,
          ],
        );
      }
    }
    return (await this.getProposalVersion(record.workspaceId, record.id))!;
  }

  async listProposalVersions(workspaceId: string, proposalId: string) {
    const result = await this.db.query<{ id: string }>(
      `select id::text as id from public.proposal_versions
        where workspace_id = $1 and proposal_id = $2
        order by version_number asc`,
      [workspaceId, proposalId],
    );
    const versions: ProposalVersionRecord[] = [];
    for (const row of result.rows) {
      const version = await this.getProposalVersion(workspaceId, row.id);
      if (version) versions.push(version);
    }
    return versions;
  }

  async getProposalVersion(workspaceId: string, versionId: string) {
    const versionResult = await this.db.query<Record<string, unknown>>(
      `select * from public.proposal_versions
        where id = $1 and workspace_id = $2`,
      [versionId, workspaceId],
    );
    const row = versionResult.rows[0];
    if (!row) return undefined;
    const sections = await this.db.query<Record<string, unknown>>(
      `select id::text as id, section_key, title, body, sort_order
         from public.proposal_sections
        where workspace_id = $1 and proposal_version_id = $2
        order by sort_order asc`,
      [workspaceId, versionId],
    );
    const packagesResult = await this.db.query<Record<string, unknown>>(
      `select * from public.proposal_pricing_packages
        where workspace_id = $1 and proposal_version_id = $2`,
      [workspaceId, versionId],
    );
    const packages: ProposalPackageRecord[] = [];
    for (const pkgRow of packagesResult.rows) {
      const lines = await this.db.query<Record<string, unknown>>(
        `select id::text as id, description, quantity, unit_price_minor, line_total_minor, sort_order
           from public.proposal_line_items
          where workspace_id = $1 and package_id = $2
          order by sort_order asc`,
        [workspaceId, pkgRow.id],
      );
      packages.push({
        id: String(pkgRow.id),
        name: String(pkgRow.name),
        pricingModel: String(pkgRow.pricing_model),
        subtotalMinor: String(pkgRow.subtotal_minor),
        discountBps: Number(pkgRow.discount_bps),
        taxBps: Number(pkgRow.tax_bps),
        contingencyBps: Number(pkgRow.contingency_bps),
        totalMinor: String(pkgRow.total_minor),
        isRecommended: Boolean(pkgRow.is_recommended),
        lineItems: lines.rows.map((line) => ({
          id: String(line.id),
          description: String(line.description),
          quantity: Number(line.quantity),
          unitPriceMinor: String(line.unit_price_minor),
          lineTotalMinor: String(line.line_total_minor),
          sortOrder: Number(line.sort_order),
        })),
      });
    }
    return {
      id: String(row.id),
      workspaceId,
      proposalId: String(row.proposal_id),
      versionNumber: Number(row.version_number),
      status: row.status as ProposalVersionStatus,
      pricingModel: String(row.pricing_model),
      calculation: (row.calculation as Record<string, unknown>) ?? {},
      ...(row.document_hash ? { documentHash: row.document_hash as string } : {}),
      ...(row.immutable_at
        ? {
            immutableAt: new Date(row.immutable_at as string | Date).toISOString(),
          }
        : {}),
      sections: sections.rows.map((section) => ({
        id: String(section.id),
        sectionKey: String(section.section_key),
        title: String(section.title),
        body: String(section.body),
        sortOrder: Number(section.sort_order),
      })),
      packages,
    };
  }

  async updateProposalVersionStatus(
    workspaceId: string,
    versionId: string,
    status: ProposalVersionStatus,
    patch?: ProposalStatusPatch,
  ): Promise<ProposalVersionRecord> {
    const current = await this.getProposalVersion(workspaceId, versionId);
    if (!current) throw new Error("Proposal version not found.");
    if (current.status === "accepted" || current.status === "declined") {
      throw new Error("final proposal versions cannot be updated");
    }
    await this.db.query(
      `update public.proposal_versions
          set status = $3,
              document_hash = coalesce($4, document_hash),
              calculation = coalesce($5::jsonb, calculation),
              immutable_at = coalesce($6, immutable_at),
              approved_at = case when $3 = 'approved' then now() else approved_at end
        where id = $1 and workspace_id = $2`,
      [
        versionId,
        workspaceId,
        status,
        patch?.documentHash ?? null,
        patch?.calculation ? JSON.stringify(patch.calculation) : null,
        patch?.immutableAt ?? null,
      ],
    );
    return (await this.getProposalVersion(workspaceId, versionId))!;
  }

  async createProposalShare(record: ProposalShareRecord) {
    await this.db.query(
      `insert into public.proposal_shares
        (id, workspace_id, proposal_version_id, token_hash, expires_at, created_by)
       values ($1,$2,$3,$4,$5,$6)`,
      [
        record.id,
        record.workspaceId,
        record.proposalVersionId,
        record.tokenHash,
        record.expiresAt,
        null,
      ],
    );
    return record;
  }

  async getProposalShareByTokenHash(tokenHash: string) {
    const result = await this.db.query<Record<string, unknown>>(
      `select * from public.proposal_shares
        where token_hash = $1 and revoked_at is null and expires_at > now()
        limit 1`,
      [tokenHash],
    );
    const row = result.rows[0];
    if (!row) return undefined;
    const proposalVersion = await this.getProposalVersion(
      String(row.workspace_id),
      String(row.proposal_version_id),
    );
    if (!proposalVersion) return undefined;
    return {
      id: String(row.id),
      workspaceId: String(row.workspace_id),
      proposalVersionId: String(row.proposal_version_id),
      tokenHash: String(row.token_hash),
      expiresAt: new Date(String(row.expires_at)).toISOString(),
      proposalVersion,
    };
  }

  async revokeProposalShare(workspaceId: string, shareId: string) {
    await this.db.query(
      `update public.proposal_shares set revoked_at = now()
        where id = $1 and workspace_id = $2`,
      [shareId, workspaceId],
    );
  }

  async recordProposalClientResponse(input: ProposalClientResponseInput) {
    await this.db.query(
      `insert into public.proposal_client_responses
        (id, workspace_id, proposal_version_id, response, message, consent_text, document_hash, actor_label)
       values ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        input.id,
        input.workspaceId,
        input.proposalVersionId,
        input.response,
        input.message ?? null,
        input.consentText,
        input.documentHash,
        input.actorLabel,
      ],
    );
  }

  async createContract(record: ContractRecord) {
    await this.db.query(
      `insert into public.contracts
        (id, workspace_id, opportunity_id, proposal_version_id, currency, revision)
       values ($1,$2,$3,$4,$5,$6)`,
      [
        record.id,
        record.workspaceId,
        record.opportunityId,
        record.proposalVersionId,
        record.currency,
        record.revision,
      ],
    );
    return record;
  }

  async getContractByOpportunity(workspaceId: string, opportunityId: string) {
    const result = await this.db.query<Record<string, unknown>>(
      `select * from public.contracts
        where workspace_id = $1 and opportunity_id = $2 limit 1`,
      [workspaceId, opportunityId],
    );
    const row = result.rows[0];
    return row ? mapContract(row) : undefined;
  }

  async createContractVersion(
    record: CreateContractVersionInput,
  ): Promise<ContractVersionRecord> {
    await this.db.query(
      `insert into public.contract_versions
        (id, workspace_id, contract_id, version_number, status, calculation, document_hash)
       values ($1,$2,$3,$4,$5,$6::jsonb,$7)`,
      [
        record.id,
        record.workspaceId,
        record.contractId,
        record.versionNumber,
        record.status,
        JSON.stringify(record.calculation),
        record.documentHash ?? null,
      ],
    );
    for (const clause of record.clauses) {
      await this.db.query(
        `insert into public.contract_clauses
          (id, workspace_id, contract_version_id, clause_key, title, body, sort_order)
         values (gen_random_uuid(),$1,$2,$3,$4,$5,$6)`,
        [
          record.workspaceId,
          record.id,
          clause.clauseKey,
          clause.title,
          clause.body,
          clause.sortOrder,
        ],
      );
    }
    for (const party of record.parties) {
      await this.db.query(
        `insert into public.contract_parties
          (id, workspace_id, contract_version_id, party_role, legal_name, email, sort_order)
         values (gen_random_uuid(),$1,$2,$3,$4,$5,$6)`,
        [
          record.workspaceId,
          record.id,
          party.partyRole,
          party.legalName,
          party.email ?? null,
          0,
        ],
      );
    }
    for (const item of record.paymentSchedule) {
      await this.db.query(
        `insert into public.contract_payment_schedule_items
          (id, workspace_id, contract_version_id, label, due_description, amount_minor, sort_order)
         values (gen_random_uuid(),$1,$2,$3,$4,$5,$6)`,
        [
          record.workspaceId,
          record.id,
          item.label,
          item.dueDescription,
          item.amountMinor,
          item.sortOrder,
        ],
      );
    }
    return (await this.getContractVersion(record.workspaceId, record.id))!;
  }

  async getContractVersion(workspaceId: string, versionId: string) {
    const result = await this.db.query<Record<string, unknown>>(
      `select * from public.contract_versions where id = $1 and workspace_id = $2`,
      [versionId, workspaceId],
    );
    const row = result.rows[0];
    if (!row) return undefined;
    return this.mapContractVersionRow(workspaceId, versionId, row);
  }

  async listContractVersions(workspaceId: string, contractId: string) {
    const result = await this.db.query<{ id: string }>(
      `select id::text as id from public.contract_versions
        where workspace_id = $1 and contract_id = $2
        order by version_number asc`,
      [workspaceId, contractId],
    );
    const versions: ContractVersionRecord[] = [];
    for (const row of result.rows) {
      const version = await this.getContractVersion(workspaceId, row.id);
      if (version) versions.push(version);
    }
    return versions;
  }

  private async mapContractVersionRow(
    workspaceId: string,
    versionId: string,
    row: Record<string, unknown>,
  ): Promise<ContractVersionRecord> {
    const clauses = await this.db.query<Record<string, unknown>>(
      `select id::text as id, clause_key, title, body, sort_order
         from public.contract_clauses
        where workspace_id = $1 and contract_version_id = $2`,
      [workspaceId, versionId],
    );
    const parties = await this.db.query<Record<string, unknown>>(
      `select id::text as id, party_role, legal_name, email
         from public.contract_parties
        where workspace_id = $1 and contract_version_id = $2`,
      [workspaceId, versionId],
    );
    const payments = await this.db.query<Record<string, unknown>>(
      `select id::text as id, label, due_description, amount_minor, sort_order
         from public.contract_payment_schedule_items
        where workspace_id = $1 and contract_version_id = $2
        order by sort_order asc`,
      [workspaceId, versionId],
    );
    return {
      id: String(row.id),
      workspaceId,
      contractId: String(row.contract_id),
      versionNumber: Number(row.version_number),
      status: row.status as ContractVersionStatus,
      calculation: (row.calculation as Record<string, unknown>) ?? {},
      ...(row.document_hash ? { documentHash: row.document_hash as string } : {}),
      ...(row.executed_at
        ? { executedAt: new Date(row.executed_at as string | Date).toISOString() }
        : {}),
      clauses: clauses.rows.map((clause) => ({
        id: String(clause.id),
        clauseKey: String(clause.clause_key),
        title: String(clause.title),
        body: String(clause.body),
        sortOrder: Number(clause.sort_order),
      })),
      parties: parties.rows.map((party) => ({
        id: String(party.id),
        partyRole: String(party.party_role),
        legalName: String(party.legal_name),
        ...(party.email ? { email: party.email as string } : {}),
      })),
      paymentSchedule: payments.rows.map((item) => ({
        id: String(item.id),
        label: String(item.label),
        dueDescription: String(item.due_description),
        amountMinor: String(item.amount_minor),
        sortOrder: Number(item.sort_order),
      })),
    };
  }

  async updateContractVersionStatus(
    workspaceId: string,
    versionId: string,
    status: ContractVersionStatus,
    patch?: ContractStatusPatch,
  ): Promise<ContractVersionRecord> {
    const current = await this.getContractVersion(workspaceId, versionId);
    if (!current) throw new Error("Contract version not found.");
    if (current.status === "executed") {
      throw new Error("executed contract versions are immutable");
    }
    await this.db.query(
      `update public.contract_versions
          set status = $3,
              document_hash = coalesce($4, document_hash),
              calculation = coalesce($5::jsonb, calculation),
              executed_at = coalesce($6, executed_at)
        where id = $1 and workspace_id = $2`,
      [
        versionId,
        workspaceId,
        status,
        patch?.documentHash ?? null,
        patch?.calculation ? JSON.stringify(patch.calculation) : null,
        patch?.executedAt ?? null,
      ],
    );
    return (await this.getContractVersion(workspaceId, versionId))!;
  }

  async recordContractAcceptance(input: ContractAcceptanceInput) {
    await this.db.query(
      `insert into public.contract_acceptances
        (id, workspace_id, contract_version_id, consent_text, document_hash, actor_label)
       values ($1,$2,$3,$4,$5,$6)`,
      [
        input.id,
        input.workspaceId,
        input.contractVersionId,
        input.consentText,
        input.documentHash,
        input.actorLabel,
      ],
    );
  }

  async hasExecutedContract(workspaceId: string, opportunityId: string) {
    const result = await this.db.query<{ exists: boolean }>(
      `select exists(
         select 1 from public.contract_versions cv
         join public.contracts c on c.id = cv.contract_id and c.workspace_id = cv.workspace_id
        where c.workspace_id = $1 and c.opportunity_id = $2 and cv.status = 'executed'
       ) as exists`,
      [workspaceId, opportunityId],
    );
    return Boolean(result.rows[0]?.exists);
  }
}

function mapProposal(row: Record<string, unknown>): ProposalRecord {
  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id),
    opportunityId: String(row.opportunity_id),
    briefVersionId: String(row.brief_version_id),
    currency: String(row.currency),
    revision: Number(row.revision),
  };
}

function mapContract(row: Record<string, unknown>): ContractRecord {
  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id),
    opportunityId: String(row.opportunity_id),
    proposalVersionId: String(row.proposal_version_id),
    currency: String(row.currency),
    revision: Number(row.revision),
  };
}
