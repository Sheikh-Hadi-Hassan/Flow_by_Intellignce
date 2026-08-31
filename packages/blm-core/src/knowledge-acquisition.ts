import { createHash } from "node:crypto";

import {
  BusinessExpertiseRegistry,
  blmBusinessBrainProofPacksV1,
  blmDomainPackIdsV1,
  blmSourceManifestV1,
  crmSalesPackV1,
  financeAccountingPackV1,
  inventoryProcurementPackV1,
  universalCorePackV1,
  type BusinessConceptDefinition,
  type BusinessDomainPackBundle,
  type BusinessKnowledgeProvenance,
  type BusinessKnowledgeSource,
  type ExternalStandardMapping,
} from "@flow/blm-contracts";
import {
  toSemanticId,
  validateSemanticId,
  validateSemanticScope,
  type SemanticId,
} from "@flow/blm-contracts";

export type SourceTrustState =
  "APPROVED" | "EVALUATE" | "REFERENCE_ONLY" | "REVIEW_REQUIRED" | "REJECTED";

export type KnowledgePublicationStage =
  | "DISCOVERED"
  | "NORMALIZED"
  | "MAPPED"
  | "VALIDATED"
  | "REVIEW_REQUIRED"
  | "APPROVED"
  | "PUBLISHED"
  | "REJECTED";

export type KnowledgeMappingRelationship =
  "EXACT" | "CLOSE" | "BROADER" | "NARROWER" | "RELATED";

export type KnowledgeReviewStatus = "APPROVED" | "REVIEW_REQUIRED" | "REJECTED";

export type KnowledgeIssueCode =
  | "UNKNOWN_SOURCE"
  | "SOURCE_NOT_APPROVED"
  | "SOURCE_REJECTED"
  | "SOURCE_REFERENCE_ONLY"
  | "LICENSE_BLOCK"
  | "UNKNOWN_ADAPTER"
  | "UNKNOWN_MAPPING"
  | "AMBIGUOUS_MAPPING"
  | "DUPLICATE_MAPPING"
  | "INCOMPATIBLE_EXACT_MAPPING"
  | "SEMANTIC_CONFLICT"
  | "TENANT_BOUNDARY_VIOLATION"
  | "INVALID_SEMANTIC_ID";

export interface KnowledgeAcquisitionIssue {
  readonly code: KnowledgeIssueCode;
  readonly message: string;
  readonly sourceId?: string;
  readonly sourceConceptId?: string;
  readonly canonicalSemanticId?: SemanticId;
  readonly severity: "INFO" | "WARNING" | "ERROR";
}

export interface SourceSnapshot {
  readonly sourceId: string;
  readonly sourceVersion: string;
  readonly tag?: string;
  readonly commitSha?: string;
  readonly retrievedAt: string;
  readonly contentFingerprint: string;
  readonly licenseReference: string;
  readonly ingestionPolicy: SourceTrustState;
  readonly sourceLocation: string;
}

export interface SourceNativeKnowledgeItem {
  readonly sourceId: string;
  readonly sourceConceptId: string;
  readonly nativeKind: "ENTITY" | "CLASS" | "DOCUMENT";
  readonly name: string;
  readonly description: string;
  readonly aliases: readonly string[];
  readonly sourcePath?: string;
  readonly sourceLine?: number;
  readonly nativeRelationships: readonly {
    readonly type: string;
    readonly targetSourceConceptId: string;
  }[];
}

export interface SourceAdapterExtraction {
  readonly snapshot: SourceSnapshot;
  readonly nativeItems: readonly SourceNativeKnowledgeItem[];
}

export interface BusinessKnowledgeSourceAdapter {
  readonly sourceId: string;
  extract(snapshot: SourceSnapshot): SourceAdapterExtraction;
}

export interface ExternalSemanticMapping {
  readonly mappingId: string;
  readonly sourceId: string;
  readonly externalConceptId: string;
  readonly canonicalSemanticId: SemanticId;
  readonly domainPackId: SemanticId;
  readonly relationship: KnowledgeMappingRelationship;
  readonly sourceVersion: string;
  readonly mappingVersion: string;
  readonly aliases: readonly string[];
  readonly provenance: BusinessKnowledgeProvenance;
  readonly reviewStatus: KnowledgeReviewStatus;
}

export interface NormalizedBusinessConcept {
  readonly canonicalCandidateId?: SemanticId;
  readonly sourceReferences: readonly SourceSnapshot[];
  readonly sourceConceptIds: readonly string[];
  readonly name: string;
  readonly description: string;
  readonly aliases: readonly string[];
  readonly conceptType:
    "PARTY" | "COMMERCIAL" | "FINANCE" | "INVENTORY" | "UPPER" | "DOCUMENT";
  readonly domainPackId?: SemanticId;
  readonly relationships: readonly {
    readonly type: string;
    readonly target: string;
  }[];
  readonly capabilities: readonly SemanticId[];
  readonly externalMappings: readonly ExternalSemanticMapping[];
  readonly provenance: BusinessKnowledgeProvenance;
  readonly confidence: number;
  readonly reviewStatus: KnowledgeReviewStatus;
  readonly publicationStage: KnowledgePublicationStage;
  readonly fingerprint: string;
  readonly scope: "GLOBAL";
  readonly workspaceId?: never;
}

export interface PublishedKnowledgeItem {
  readonly canonicalSemanticId: SemanticId;
  readonly domainPackId: SemanticId;
  readonly name: string;
  readonly aliases: readonly string[];
  readonly externalMappings: readonly ExternalSemanticMapping[];
  readonly provenance: BusinessKnowledgeProvenance;
  readonly publicationStage: "PUBLISHED";
  readonly fingerprint: string;
}

export interface KnowledgeConflict {
  readonly conflictId: string;
  readonly category:
    | "DUPLICATE_EXTERNAL_MAPPING"
    | "INCOMPATIBLE_EXACT_MAPPING"
    | "INCOMPATIBLE_DEFINITION"
    | "AMBIGUOUS_ALIAS";
  readonly affectedFlowSemanticId?: SemanticId;
  readonly sourceAClaim: string;
  readonly sourceBClaim: string;
  readonly resolutionStatus:
    | "UNRESOLVED"
    | "FLOW_CANONICAL_OVERRIDES"
    | "SOURCE_A_PREFERRED"
    | "SOURCE_B_PREFERRED"
    | "CONTEXT_DEPENDENT";
}

export interface KnowledgeAcquisitionReport {
  readonly sourceIds: readonly string[];
  readonly snapshotFingerprints: readonly string[];
  readonly itemsDiscovered: number;
  readonly itemsNormalized: number;
  readonly itemsMapped: number;
  readonly itemsApproved: number;
  readonly itemsRejected: number;
  readonly itemsNeedingReview: number;
  readonly conflicts: readonly KnowledgeConflict[];
  readonly licenseBlocks: readonly KnowledgeAcquisitionIssue[];
  readonly publishedItems: number;
  readonly issues: readonly KnowledgeAcquisitionIssue[];
}

export interface BLMKnowledgeRelease {
  readonly releaseId: string;
  readonly version: string;
  readonly createdAt: string;
  readonly sourceSnapshots: readonly SourceSnapshot[];
  readonly mappingVersion: string;
  readonly publishedItems: readonly PublishedKnowledgeItem[];
  readonly enrichedDomainPackIds: readonly SemanticId[];
  readonly fingerprint: string;
}

export interface KnowledgeReleaseDiff {
  readonly fromReleaseId: string;
  readonly toReleaseId: string;
  readonly changes: readonly {
    readonly type: "ADDED" | "REMOVED" | "CHANGED" | "MAPPING_CHANGED";
    readonly canonicalSemanticId: SemanticId;
    readonly detail: string;
  }[];
}

export interface KnowledgeAcquisitionRunResult {
  readonly snapshots: readonly SourceSnapshot[];
  readonly nativeItems: readonly SourceNativeKnowledgeItem[];
  readonly normalizedItems: readonly NormalizedBusinessConcept[];
  readonly publishedItems: readonly PublishedKnowledgeItem[];
  readonly conflicts: readonly KnowledgeConflict[];
  readonly report: KnowledgeAcquisitionReport;
  readonly release: BLMKnowledgeRelease;
  readonly enrichedDomainPacks: readonly BusinessDomainPackBundle[];
  readonly registry: BusinessExpertiseRegistry;
}

export function stableFingerprint(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function deriveSourceTrustState(
  source: BusinessKnowledgeSource,
): SourceTrustState {
  if (source.licenseStatus === "RESTRICTED") {
    return source.decision === "REJECT" ? "REJECTED" : "REFERENCE_ONLY";
  }
  if (source.licenseStatus === "REVIEW_REQUIRED") {
    return "REVIEW_REQUIRED";
  }
  if (source.decision === "ADOPT" || source.decision === "ADAPT") {
    return source.importPolicy === "REFERENCE_ONLY"
      ? "REFERENCE_ONLY"
      : "APPROVED";
  }
  if (source.decision === "DEFER") {
    return "REVIEW_REQUIRED";
  }
  if (source.decision === "REFERENCE_ONLY") {
    return "REFERENCE_ONLY";
  }
  return "REJECTED";
}

export function createSourceSnapshot(
  source: BusinessKnowledgeSource,
): SourceSnapshot {
  const ingestionPolicy = deriveSourceTrustState(source);
  const fingerprintInput = {
    sourceId: source.id,
    version: source.version,
    commitSha: source.commitSha,
    license: source.license,
    policy: ingestionPolicy,
    location: source.canonicalLocation,
  };
  return {
    sourceId: source.id,
    sourceVersion: source.version,
    ...(source.version.includes("v2.2.0") ? { tag: "v2.2.0" } : {}),
    ...(source.commitSha ? { commitSha: source.commitSha } : {}),
    retrievedAt: source.retrievedAt ?? "2026-08-11",
    contentFingerprint: stableFingerprint(fingerprintInput),
    licenseReference: source.license,
    ingestionPolicy,
    sourceLocation: source.canonicalLocation,
  };
}

export class MantleProofSourceAdapter implements BusinessKnowledgeSourceAdapter {
  readonly sourceId = "moqui.mantle-udm";

  extract(snapshot: SourceSnapshot): SourceAdapterExtraction {
    return {
      snapshot,
      nativeItems: [
        mantleEntity("Party", "mantle.party.Party", "PartyEntities.xml", 30),
        mantleEntity("Person", "mantle.party.Person", "PartyEntities.xml", 168),
        mantleEntity(
          "Organization",
          "mantle.party.Organization",
          "PartyEntities.xml",
          157,
        ),
        mantleEntity(
          "Product",
          "mantle.product.Product",
          "ProductDefinitionEntities.xml",
          30,
        ),
        mantleEntity(
          "Facility",
          "mantle.facility.Facility",
          "FacilityEntities.xml",
          22,
        ),
        mantleEntity(
          "Asset",
          "mantle.product.asset.Asset",
          "ProductAssetEntities.xml",
          28,
        ),
        mantleEntity(
          "WorkEffort",
          "mantle.work.effort.WorkEffort",
          "WorkEffortEntities.xml",
          37,
        ),
        mantleEntity(
          "OrderHeader",
          "mantle.order.OrderHeader",
          "OrderEntities.xml",
          67,
          ["Order"],
        ),
        mantleEntity(
          "Invoice",
          "mantle.account.invoice.Invoice",
          "AccountingAccountEntities.xml",
          328,
        ),
        mantleEntity(
          "Payment",
          "mantle.account.payment.Payment",
          "AccountingAccountEntities.xml",
          1377,
        ),
      ],
    };
  }
}

export class GistProofSourceAdapter implements BusinessKnowledgeSourceAdapter {
  readonly sourceId = "semanticarts.gist";

  extract(snapshot: SourceSnapshot): SourceAdapterExtraction {
    return {
      snapshot,
      nativeItems: [
        gistClass("gist:Organization", "Organization", 1392),
        gistClass("gist:Person", "Person", 1427),
        gistClass("gist:Agreement", "Agreement", 151),
        gistClass("gist:Event", "Event", 675),
        gistClass("gist:Magnitude", "Magnitude", 1085),
        gistClass("gist:UnitOfMeasure", "UnitOfMeasure", 1968, ["Unit"]),
        gistClass("gist:Category", "Category", 277),
        gistClass("gist:Address", "Address", 134),
      ],
    };
  }
}

export class UblProofSourceAdapter implements BusinessKnowledgeSourceAdapter {
  readonly sourceId = "oasis.ubl-2.4";

  extract(snapshot: SourceSnapshot): SourceAdapterExtraction {
    return {
      snapshot,
      nativeItems: [
        {
          sourceId: this.sourceId,
          sourceConceptId: "UBL-2.4:Invoice",
          nativeKind: "DOCUMENT",
          name: "Invoice",
          description: "UBL Invoice document type.",
          aliases: ["UBL Invoice"],
          nativeRelationships: [],
          sourcePath: "UBL-2.4.html",
        },
        {
          sourceId: this.sourceId,
          sourceConceptId: "UBL-2.4:Order",
          nativeKind: "DOCUMENT",
          name: "Order",
          description: "UBL Order document type.",
          aliases: ["UBL Order"],
          nativeRelationships: [],
          sourcePath: "UBL-2.4.html",
        },
        {
          sourceId: this.sourceId,
          sourceConceptId: "UBL-2.4:Quotation",
          nativeKind: "DOCUMENT",
          name: "Quotation",
          description: "UBL Quotation document type.",
          aliases: ["UBL Quotation"],
          nativeRelationships: [],
          sourcePath: "UBL-2.4.html",
        },
      ],
    };
  }
}

function mantleEntity(
  name: string,
  sourceConceptId: string,
  sourcePath: string,
  sourceLine: number,
  aliases: readonly string[] = [],
): SourceNativeKnowledgeItem {
  return {
    sourceId: "moqui.mantle-udm",
    sourceConceptId,
    nativeKind: "ENTITY",
    name,
    description: `Mantle UDM ${name} entity.`,
    aliases,
    nativeRelationships: [],
    sourcePath: `entity/${sourcePath}`,
    sourceLine,
  };
}

function gistClass(
  sourceConceptId: string,
  name: string,
  sourceLine: number,
  aliases: readonly string[] = [],
): SourceNativeKnowledgeItem {
  return {
    sourceId: "semanticarts.gist",
    sourceConceptId,
    nativeKind: "CLASS",
    name,
    description: `gist ${name} class.`,
    aliases,
    nativeRelationships: [],
    sourcePath: "ontologies/gistCore.ttl",
    sourceLine,
  };
}

export const blmKnowledgeAcquisitionMappingsV1: readonly ExternalSemanticMapping[] =
  [
    mapping(
      "moqui.mantle-udm",
      "mantle.party.Party",
      "flow.concept.universal.party",
      blmDomainPackIdsV1.universalCore,
      "EXACT",
      ["Party"],
    ),
    mapping(
      "moqui.mantle-udm",
      "mantle.party.Person",
      "flow.concept.universal.person",
      blmDomainPackIdsV1.universalCore,
      "EXACT",
      ["Person"],
    ),
    mapping(
      "moqui.mantle-udm",
      "mantle.party.Organization",
      "flow.concept.universal.organization",
      blmDomainPackIdsV1.universalCore,
      "EXACT",
      ["Organization"],
    ),
    mapping(
      "moqui.mantle-udm",
      "mantle.product.Product",
      "flow.concept.universal.product",
      blmDomainPackIdsV1.universalCore,
      "EXACT",
      ["Product"],
    ),
    mapping(
      "moqui.mantle-udm",
      "mantle.facility.Facility",
      "flow.concept.inventory.warehouse",
      blmDomainPackIdsV1.inventoryProcurement,
      "CLOSE",
      ["Facility", "Warehouse"],
    ),
    mapping(
      "moqui.mantle-udm",
      "mantle.product.asset.Asset",
      "flow.concept.finance.asset",
      blmDomainPackIdsV1.financeAccounting,
      "RELATED",
      ["Asset"],
    ),
    mapping(
      "moqui.mantle-udm",
      "mantle.work.effort.WorkEffort",
      "flow.concept.universal.event",
      blmDomainPackIdsV1.universalCore,
      "RELATED",
      ["WorkEffort"],
    ),
    mapping(
      "moqui.mantle-udm",
      "mantle.order.OrderHeader",
      "flow.concept.sales.sales-order",
      blmDomainPackIdsV1.crmSales,
      "CLOSE",
      ["Order", "SalesOrder"],
    ),
    mapping(
      "moqui.mantle-udm",
      "mantle.account.invoice.Invoice",
      "flow.concept.finance.invoice",
      blmDomainPackIdsV1.financeAccounting,
      "EXACT",
      ["Invoice"],
    ),
    mapping(
      "moqui.mantle-udm",
      "mantle.account.payment.Payment",
      "flow.concept.finance.payment",
      blmDomainPackIdsV1.financeAccounting,
      "EXACT",
      ["Payment"],
    ),
    mapping(
      "semanticarts.gist",
      "gist:Organization",
      "flow.concept.universal.organization",
      blmDomainPackIdsV1.universalCore,
      "RELATED",
      ["Organization"],
    ),
    mapping(
      "semanticarts.gist",
      "gist:Person",
      "flow.concept.universal.person",
      blmDomainPackIdsV1.universalCore,
      "RELATED",
      ["Person"],
    ),
    mapping(
      "semanticarts.gist",
      "gist:Agreement",
      "flow.concept.universal.agreement",
      blmDomainPackIdsV1.universalCore,
      "RELATED",
      ["Agreement"],
    ),
    mapping(
      "semanticarts.gist",
      "gist:Event",
      "flow.concept.universal.event",
      blmDomainPackIdsV1.universalCore,
      "RELATED",
      ["Event"],
    ),
    mapping(
      "semanticarts.gist",
      "gist:Magnitude",
      "flow.concept.universal.quantity",
      blmDomainPackIdsV1.universalCore,
      "RELATED",
      ["Magnitude", "Quantity"],
    ),
    mapping(
      "semanticarts.gist",
      "gist:UnitOfMeasure",
      "flow.concept.universal.unit",
      blmDomainPackIdsV1.universalCore,
      "RELATED",
      ["UnitOfMeasure", "Unit"],
    ),
    mapping(
      "semanticarts.gist",
      "gist:Category",
      "flow.concept.universal.classification",
      blmDomainPackIdsV1.universalCore,
      "RELATED",
      ["Category", "Classification"],
    ),
    mapping(
      "semanticarts.gist",
      "gist:Address",
      "flow.concept.universal.address",
      blmDomainPackIdsV1.universalCore,
      "RELATED",
      ["Address"],
    ),
    mapping(
      "oasis.ubl-2.4",
      "UBL-2.4:Invoice",
      "flow.concept.finance.invoice",
      blmDomainPackIdsV1.financeAccounting,
      "RELATED",
      ["Invoice", "UBL Invoice"],
    ),
    mapping(
      "oasis.ubl-2.4",
      "UBL-2.4:Order",
      "flow.concept.sales.sales-order",
      blmDomainPackIdsV1.crmSales,
      "RELATED",
      ["Order", "UBL Order"],
    ),
    mapping(
      "oasis.ubl-2.4",
      "UBL-2.4:Quotation",
      "flow.concept.sales.quote",
      blmDomainPackIdsV1.crmSales,
      "RELATED",
      ["Quotation", "Quote", "UBL Quotation"],
    ),
  ];

function mapping(
  sourceId: string,
  externalConceptId: string,
  canonicalId: string,
  domainPackId: SemanticId,
  relationship: KnowledgeMappingRelationship,
  aliases: readonly string[],
): ExternalSemanticMapping {
  return {
    mappingId: `${sourceId}:${externalConceptId}->${canonicalId}:v1`,
    sourceId,
    externalConceptId,
    canonicalSemanticId: toSemanticId(canonicalId),
    domainPackId,
    relationship,
    sourceVersion:
      blmSourceManifestV1.find((source) => source.id === sourceId)?.version ??
      "unknown",
    mappingVersion: "blm-knowledge-acquisition-v1",
    aliases,
    provenance: {
      sourceIds: [sourceId],
      use: "MAPPED_TO",
      notes: "Explicit curated external-to-Flow mapping.",
    },
    reviewStatus: "APPROVED",
  };
}

export class KnowledgeAcquisitionPipeline {
  private readonly sourceById: ReadonlyMap<string, BusinessKnowledgeSource>;
  private readonly adapterBySourceId: ReadonlyMap<
    string,
    BusinessKnowledgeSourceAdapter
  >;
  private readonly mappings: readonly ExternalSemanticMapping[];

  constructor(input: {
    readonly sources: readonly BusinessKnowledgeSource[];
    readonly adapters: readonly BusinessKnowledgeSourceAdapter[];
    readonly mappings: readonly ExternalSemanticMapping[];
  }) {
    this.sourceById = new Map(
      input.sources.map((source) => [source.id, source]),
    );
    this.adapterBySourceId = new Map(
      input.adapters.map((adapter) => [adapter.sourceId, adapter]),
    );
    this.mappings = input.mappings;
  }

  run(input: {
    readonly sourceIds: readonly string[];
    readonly mappingVersion: string;
    readonly releaseId: string;
    readonly releaseVersion: string;
    readonly createdAt: string;
  }): KnowledgeAcquisitionRunResult {
    const issues: KnowledgeAcquisitionIssue[] = [];
    const snapshots: SourceSnapshot[] = [];
    const nativeItems: SourceNativeKnowledgeItem[] = [];

    for (const sourceId of input.sourceIds) {
      const source = this.sourceById.get(sourceId);
      if (!source) {
        issues.push({
          code: "UNKNOWN_SOURCE",
          message: `Unknown source: ${sourceId}`,
          sourceId,
          severity: "ERROR",
        });
        continue;
      }
      const trust = deriveSourceTrustState(source);
      if (trust === "REJECTED") {
        issues.push({
          code: "SOURCE_REJECTED",
          message: `Source rejected: ${sourceId}`,
          sourceId,
          severity: "ERROR",
        });
        continue;
      }
      if (trust === "REFERENCE_ONLY") {
        issues.push({
          code: "SOURCE_REFERENCE_ONLY",
          message: `Reference-only source cannot enter acquisition: ${sourceId}`,
          sourceId,
          severity: "ERROR",
        });
        continue;
      }
      if (trust === "REVIEW_REQUIRED") {
        issues.push({
          code: "LICENSE_BLOCK",
          message: `Source requires license review before publication: ${sourceId}`,
          sourceId,
          severity: "ERROR",
        });
        continue;
      }
      const adapter = this.adapterBySourceId.get(sourceId);
      if (!adapter) {
        issues.push({
          code: "UNKNOWN_ADAPTER",
          message: `No source adapter registered for ${sourceId}`,
          sourceId,
          severity: "ERROR",
        });
        continue;
      }
      const snapshot = createSourceSnapshot(source);
      const extraction = adapter.extract(snapshot);
      snapshots.push(extraction.snapshot);
      nativeItems.push(...extraction.nativeItems);
    }

    const normalizedItems = this.normalize(nativeItems, snapshots, issues);
    const conflicts = detectKnowledgeConflicts(normalizedItems, this.mappings);
    const publishedItems =
      issues.some((issue) => issue.severity === "ERROR") || conflicts.length > 0
        ? []
        : publishKnowledge(normalizedItems);
    const enrichedDomainPacks = enrichDomainPacksWithPublishedKnowledge(
      blmBusinessBrainProofPacksV1,
      publishedItems,
    );
    const release = createKnowledgeRelease({
      releaseId: input.releaseId,
      version: input.releaseVersion,
      createdAt: input.createdAt,
      sourceSnapshots: snapshots,
      mappingVersion: input.mappingVersion,
      publishedItems,
      enrichedDomainPackIds: enrichedDomainPacks.map(
        (bundle) => bundle.domainPack.semanticId,
      ),
    });
    const report = createKnowledgeAcquisitionReport({
      sourceIds: input.sourceIds,
      snapshots,
      nativeItems,
      normalizedItems,
      publishedItems,
      conflicts,
      issues,
    });
    const registry = new BusinessExpertiseRegistry({
      sources: blmSourceManifestV1,
      domainPacks: enrichedDomainPacks,
    });

    return {
      snapshots,
      nativeItems,
      normalizedItems,
      publishedItems,
      conflicts,
      report,
      release,
      enrichedDomainPacks,
      registry,
    };
  }

  private normalize(
    nativeItems: readonly SourceNativeKnowledgeItem[],
    snapshots: readonly SourceSnapshot[],
    issues: KnowledgeAcquisitionIssue[],
  ): readonly NormalizedBusinessConcept[] {
    return nativeItems.map((item) => {
      const mappings = this.mappings.filter(
        (mapping) =>
          mapping.sourceId === item.sourceId &&
          mapping.externalConceptId === item.sourceConceptId,
      );
      const approvedMappings = mappings.filter(
        (mappingItem) => mappingItem.reviewStatus === "APPROVED",
      );
      const snapshot = snapshots.find(
        (candidate) => candidate.sourceId === item.sourceId,
      );
      if (!snapshot) {
        issues.push({
          code: "UNKNOWN_SOURCE",
          message: `Missing snapshot for ${item.sourceId}`,
          sourceId: item.sourceId,
          sourceConceptId: item.sourceConceptId,
          severity: "ERROR",
        });
      }
      if (approvedMappings.length === 0) {
        issues.push({
          code: "UNKNOWN_MAPPING",
          message: `No approved explicit mapping for ${item.sourceConceptId}`,
          sourceId: item.sourceId,
          sourceConceptId: item.sourceConceptId,
          severity: "WARNING",
        });
      }
      if (approvedMappings.length > 1) {
        issues.push({
          code: "AMBIGUOUS_MAPPING",
          message: `Multiple approved mappings for ${item.sourceConceptId}`,
          sourceId: item.sourceId,
          sourceConceptId: item.sourceConceptId,
          severity: "ERROR",
        });
      }
      const selectedMapping = approvedMappings[0];
      const provenance: BusinessKnowledgeProvenance = selectedMapping
        ? {
            sourceIds: [item.sourceId],
            use: "MAPPED_TO",
            notes: `Mapped through ${selectedMapping.mappingId} from snapshot ${snapshot?.contentFingerprint ?? "unknown"}.`,
          }
        : {
            sourceIds: [item.sourceId],
            use: "FLOW_NATIVE",
            notes: "Discovered but not mapped into Flow canonical knowledge.",
          };
      const normalized = {
        ...(selectedMapping
          ? {
              canonicalCandidateId: selectedMapping.canonicalSemanticId,
              domainPackId: selectedMapping.domainPackId,
            }
          : {}),
        sourceReferences: snapshot ? [snapshot] : [],
        sourceConceptIds: [item.sourceConceptId],
        name: item.name,
        description: item.description,
        aliases: uniqueStrings([
          ...item.aliases,
          ...(selectedMapping?.aliases ?? []),
        ]),
        conceptType: inferConceptType(item, selectedMapping),
        relationships: item.nativeRelationships.map((relationship) => ({
          type: relationship.type,
          target: relationship.targetSourceConceptId,
        })),
        capabilities: [],
        externalMappings: approvedMappings,
        provenance,
        confidence: selectedMapping ? 1 : 0,
        reviewStatus: selectedMapping
          ? selectedMapping.reviewStatus
          : "REVIEW_REQUIRED",
        publicationStage: selectedMapping ? "MAPPED" : "REVIEW_REQUIRED",
        scope: "GLOBAL",
      } satisfies Omit<NormalizedBusinessConcept, "fingerprint">;
      validateNormalizedBoundary(normalized);
      return {
        ...normalized,
        fingerprint: stableFingerprint(normalized),
      };
    });
  }
}

function inferConceptType(
  item: SourceNativeKnowledgeItem,
  mappingItem: ExternalSemanticMapping | undefined,
): NormalizedBusinessConcept["conceptType"] {
  if (item.nativeKind === "DOCUMENT") {
    return "DOCUMENT";
  }
  const candidate = mappingItem?.canonicalSemanticId ?? item.sourceConceptId;
  if (candidate.includes(".finance.")) {
    return "FINANCE";
  }
  if (
    candidate.includes(".inventory.") ||
    candidate.includes(".procurement.")
  ) {
    return "INVENTORY";
  }
  if (candidate.includes(".sales.") || candidate.includes(".crm.")) {
    return "COMMERCIAL";
  }
  if (item.sourceId === "semanticarts.gist") {
    return "UPPER";
  }
  return "PARTY";
}

function validateNormalizedBoundary(
  item: Omit<NormalizedBusinessConcept, "fingerprint">,
): void {
  if (item.canonicalCandidateId) {
    validateSemanticId(item.canonicalCandidateId);
  }
  validateSemanticScope({
    scope: "GLOBAL",
    label: item.name,
  });
}

function publishKnowledge(
  normalizedItems: readonly NormalizedBusinessConcept[],
): readonly PublishedKnowledgeItem[] {
  return normalizedItems
    .filter(
      (item) =>
        item.reviewStatus === "APPROVED" &&
        item.canonicalCandidateId &&
        item.domainPackId,
    )
    .map((item) => ({
      canonicalSemanticId: item.canonicalCandidateId!,
      domainPackId: item.domainPackId!,
      name: item.name,
      aliases: item.aliases,
      externalMappings: item.externalMappings,
      provenance: item.provenance,
      publicationStage: "PUBLISHED",
      fingerprint: stableFingerprint({
        canonicalSemanticId: item.canonicalCandidateId,
        aliases: item.aliases,
        mappings: item.externalMappings.map((mappingItem) => ({
          sourceId: mappingItem.sourceId,
          externalConceptId: mappingItem.externalConceptId,
          relationship: mappingItem.relationship,
          mappingVersion: mappingItem.mappingVersion,
        })),
      }),
    }));
}

export function detectKnowledgeConflicts(
  normalizedItems: readonly NormalizedBusinessConcept[],
  mappings: readonly ExternalSemanticMapping[],
): readonly KnowledgeConflict[] {
  const conflicts: KnowledgeConflict[] = [];
  const externalToFlow = new Map<string, ExternalSemanticMapping>();
  for (const mappingItem of mappings) {
    const key = `${mappingItem.sourceId}:${mappingItem.externalConceptId}`;
    const existing = externalToFlow.get(key);
    if (existing) {
      conflicts.push({
        conflictId: stableFingerprint({ key, existing, mappingItem }),
        category:
          existing.canonicalSemanticId === mappingItem.canonicalSemanticId
            ? "DUPLICATE_EXTERNAL_MAPPING"
            : "INCOMPATIBLE_EXACT_MAPPING",
        affectedFlowSemanticId: mappingItem.canonicalSemanticId,
        sourceAClaim: existing.mappingId,
        sourceBClaim: mappingItem.mappingId,
        resolutionStatus: "UNRESOLVED",
      });
    }
    externalToFlow.set(key, mappingItem);
  }

  const byCanonical = new Map<SemanticId, NormalizedBusinessConcept[]>();
  for (const item of normalizedItems) {
    if (!item.canonicalCandidateId) {
      continue;
    }
    const existing = byCanonical.get(item.canonicalCandidateId) ?? [];
    existing.push(item);
    byCanonical.set(item.canonicalCandidateId, existing);
  }
  for (const [canonicalId, items] of byCanonical.entries()) {
    const exactMappings = items.flatMap((item) =>
      item.externalMappings.filter(
        (mappingItem) => mappingItem.relationship === "EXACT",
      ),
    );
    const names = new Set(items.map((item) => item.name));
    if (exactMappings.length > 1 && names.size > 1) {
      conflicts.push({
        conflictId: stableFingerprint({ canonicalId, names: [...names] }),
        category: "INCOMPATIBLE_DEFINITION",
        affectedFlowSemanticId: canonicalId,
        sourceAClaim: items[0]?.name ?? "unknown",
        sourceBClaim: items[1]?.name ?? "unknown",
        resolutionStatus: "UNRESOLVED",
      });
    }
  }
  return conflicts;
}

export function createKnowledgeRelease(input: {
  readonly releaseId: string;
  readonly version: string;
  readonly createdAt: string;
  readonly sourceSnapshots: readonly SourceSnapshot[];
  readonly mappingVersion: string;
  readonly publishedItems: readonly PublishedKnowledgeItem[];
  readonly enrichedDomainPackIds: readonly SemanticId[];
}): BLMKnowledgeRelease {
  const releaseWithoutFingerprint = {
    releaseId: input.releaseId,
    version: input.version,
    createdAt: input.createdAt,
    sourceSnapshots: input.sourceSnapshots,
    mappingVersion: input.mappingVersion,
    publishedItems: input.publishedItems,
    enrichedDomainPackIds: input.enrichedDomainPackIds,
  };
  return {
    ...releaseWithoutFingerprint,
    fingerprint: stableFingerprint(releaseWithoutFingerprint),
  };
}

export function diffKnowledgeReleases(
  fromRelease: BLMKnowledgeRelease,
  toRelease: BLMKnowledgeRelease,
): KnowledgeReleaseDiff {
  const fromItems = new Map(
    fromRelease.publishedItems.map((item) => [item.canonicalSemanticId, item]),
  );
  const toItems = new Map(
    toRelease.publishedItems.map((item) => [item.canonicalSemanticId, item]),
  );
  const changes: {
    readonly type: "ADDED" | "REMOVED" | "CHANGED" | "MAPPING_CHANGED";
    readonly canonicalSemanticId: SemanticId;
    readonly detail: string;
  }[] = [];
  for (const [semanticId, item] of toItems.entries()) {
    const previous = fromItems.get(semanticId);
    if (!previous) {
      changes.push({
        type: "ADDED",
        canonicalSemanticId: semanticId,
        detail: "Published item added.",
      });
      continue;
    }
    if (previous.fingerprint !== item.fingerprint) {
      const previousMappings = stableFingerprint(previous.externalMappings);
      const nextMappings = stableFingerprint(item.externalMappings);
      changes.push({
        type: previousMappings !== nextMappings ? "MAPPING_CHANGED" : "CHANGED",
        canonicalSemanticId: semanticId,
        detail: "Published item fingerprint changed.",
      });
    }
  }
  for (const semanticId of fromItems.keys()) {
    if (!toItems.has(semanticId)) {
      changes.push({
        type: "REMOVED",
        canonicalSemanticId: semanticId,
        detail: "Published item removed.",
      });
    }
  }
  return {
    fromReleaseId: fromRelease.releaseId,
    toReleaseId: toRelease.releaseId,
    changes,
  };
}

export function enrichDomainPacksWithPublishedKnowledge(
  packs: readonly BusinessDomainPackBundle[],
  publishedItems: readonly PublishedKnowledgeItem[],
): readonly BusinessDomainPackBundle[] {
  return packs.map((pack) => {
    const itemsForPack = publishedItems.filter(
      (item) => item.domainPackId === pack.domainPack.semanticId,
    );
    if (itemsForPack.length === 0) {
      return pack;
    }
    return {
      ...pack,
      concepts: pack.concepts.map((concept) =>
        enrichConcept(concept, itemsForPack),
      ),
    };
  });
}

function enrichConcept(
  concept: BusinessConceptDefinition,
  publishedItems: readonly PublishedKnowledgeItem[],
): BusinessConceptDefinition {
  const matchingItems = publishedItems.filter(
    (item) => item.canonicalSemanticId === concept.semanticId,
  );
  if (matchingItems.length === 0) {
    return concept;
  }
  const externalMappings: ExternalStandardMapping[] = matchingItems.flatMap(
    (item) =>
      item.externalMappings.map((mappingItem) => ({
        sourceId: mappingItem.sourceId,
        externalId: mappingItem.externalConceptId,
        externalLabel: mappingItem.externalConceptId,
        version: mappingItem.sourceVersion,
        relationship:
          mappingItem.relationship === "EXACT"
            ? "EQUIVALENT_TO"
            : mappingItem.relationship === "BROADER"
              ? "BROADER_THAN"
              : mappingItem.relationship === "NARROWER"
                ? "NARROWER_THAN"
                : "RELATED_TO",
        provenance: mappingItem.provenance,
      })),
  );
  return {
    ...concept,
    aliases: uniqueStrings([
      ...concept.aliases,
      ...matchingItems.flatMap((item) => item.aliases),
    ]),
    externalMappings: [...concept.externalMappings, ...externalMappings],
    provenance: {
      sourceIds: uniqueStrings([
        ...concept.provenance.sourceIds,
        ...matchingItems.flatMap((item) => item.provenance.sourceIds),
      ]),
      use:
        concept.provenance.use === "FLOW_NATIVE"
          ? "ADAPTED_FROM"
          : concept.provenance.use,
      notes: `${concept.provenance.notes} Enriched by BLM Knowledge Acquisition Pipeline v1.`,
    },
  };
}

function createKnowledgeAcquisitionReport(input: {
  readonly sourceIds: readonly string[];
  readonly snapshots: readonly SourceSnapshot[];
  readonly nativeItems: readonly SourceNativeKnowledgeItem[];
  readonly normalizedItems: readonly NormalizedBusinessConcept[];
  readonly publishedItems: readonly PublishedKnowledgeItem[];
  readonly conflicts: readonly KnowledgeConflict[];
  readonly issues: readonly KnowledgeAcquisitionIssue[];
}): KnowledgeAcquisitionReport {
  return {
    sourceIds: input.sourceIds,
    snapshotFingerprints: input.snapshots.map(
      (snapshot) => snapshot.contentFingerprint,
    ),
    itemsDiscovered: input.nativeItems.length,
    itemsNormalized: input.normalizedItems.length,
    itemsMapped: input.normalizedItems.filter(
      (item) => item.publicationStage === "MAPPED",
    ).length,
    itemsApproved: input.normalizedItems.filter(
      (item) => item.reviewStatus === "APPROVED",
    ).length,
    itemsRejected: input.normalizedItems.filter(
      (item) => item.reviewStatus === "REJECTED",
    ).length,
    itemsNeedingReview: input.normalizedItems.filter(
      (item) => item.reviewStatus === "REVIEW_REQUIRED",
    ).length,
    conflicts: input.conflicts,
    licenseBlocks: input.issues.filter(
      (issue) => issue.code === "LICENSE_BLOCK",
    ),
    publishedItems: input.publishedItems.length,
    issues: input.issues,
  };
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort();
}

export function createBlmKnowledgeAcquisitionPipelineV1(): KnowledgeAcquisitionPipeline {
  return new KnowledgeAcquisitionPipeline({
    sources: blmSourceManifestV1,
    adapters: [
      new MantleProofSourceAdapter(),
      new GistProofSourceAdapter(),
      new UblProofSourceAdapter(),
    ],
    mappings: blmKnowledgeAcquisitionMappingsV1,
  });
}

export function runBlmKnowledgeAcquisitionProofV1(): KnowledgeAcquisitionRunResult {
  return createBlmKnowledgeAcquisitionPipelineV1().run({
    sourceIds: ["moqui.mantle-udm", "semanticarts.gist", "oasis.ubl-2.4"],
    mappingVersion: "blm-knowledge-acquisition-v1",
    releaseId: "flow.blm.knowledge-release.1",
    releaseVersion: "1.0.0",
    createdAt: "2026-08-11",
  });
}

export const blmKnowledgeAcquisitionProofReleaseV1 =
  runBlmKnowledgeAcquisitionProofV1().release;

export const blmKnowledgeAcquisitionEnrichedProofPacksV1 =
  runBlmKnowledgeAcquisitionProofV1().enrichedDomainPacks;

export const blmKnowledgeAcquisitionProofRegistryV1 =
  runBlmKnowledgeAcquisitionProofV1().registry;

export function getSourcesForConcept(
  registry: BusinessExpertiseRegistry,
  semanticId: SemanticId,
): readonly string[] {
  return registry
    .getExternalMappingsForConcept(semanticId)
    .map((mappingItem) => mappingItem.sourceId);
}

export function getDomainPackForConcept(
  semanticId: SemanticId,
): SemanticId | undefined {
  for (const pack of [
    universalCorePackV1,
    crmSalesPackV1,
    financeAccountingPackV1,
    inventoryProcurementPackV1,
  ]) {
    if (pack.domainPack.conceptIds.includes(semanticId)) {
      return pack.domainPack.semanticId;
    }
  }
  return undefined;
}
