import {
  BusinessExpertiseRegistry,
  blmSourceManifestV1,
  type BusinessDomainPackBundle,
  type BusinessKnowledgeProvenance,
} from "@flow/blm-contracts";
import {
  toSemanticId,
  validateSemanticId,
  type SemanticId,
} from "@flow/blm-contracts";
import type { AuditEvent } from "@flow/contracts";

import {
  createKnowledgeRelease,
  diffKnowledgeReleases,
  stableFingerprint,
  type BLMKnowledgeRelease,
  type ExternalSemanticMapping,
  type KnowledgeAcquisitionIssue,
  type KnowledgeAcquisitionRunResult,
  type KnowledgeConflict,
  type KnowledgeReleaseDiff,
  type PublishedKnowledgeItem,
  type SourceSnapshot,
} from "./knowledge-acquisition.js";

export type KnowledgeReviewReason =
  | "AMBIGUOUS_MAPPING"
  | "CONFLICTING_DEFINITION"
  | "DUPLICATE_CONCEPT"
  | "LICENSE_REVIEW_REQUIRED"
  | "SOURCE_VERSION_CHANGED"
  | "MAPPING_CHANGED"
  | "CANONICALIZATION_REQUIRED"
  | "PROVENANCE_INCOMPLETE"
  | "DOMAIN_ASSIGNMENT_REQUIRED"
  | "SEMANTIC_SCOPE_CONFLICT"
  | "DEPRECATION_REVIEW"
  | "EXTERNAL_STANDARD_CHANGE";

export type KnowledgeReviewItemStatus =
  | "OPEN"
  | "IN_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "REMAP_REQUIRED"
  | "DEFERRED"
  | "SUPERSEDED";

export type KnowledgeReviewDecisionType =
  | "APPROVE_MAPPING"
  | "REJECT_MAPPING"
  | "CHANGE_MAPPING"
  | "APPROVE_FLOW_CANONICAL_OVERRIDE"
  | "PREFER_SOURCE_A"
  | "PREFER_SOURCE_B"
  | "MARK_CONTEXT_DEPENDENT"
  | "REJECT_SOURCE_KNOWLEDGE"
  | "APPROVE_PUBLICATION"
  | "DEFER_DECISION";

export type KnowledgeReviewScopeType =
  "GLOBAL_BLM_REVIEW" | "WORKSPACE_KNOWLEDGE_REVIEW";

export type KnowledgeReviewRisk = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export const blmKnowledgeReviewPermissions = {
  review: "blm.knowledge.review",
  approve: "blm.knowledge.approve",
  reject: "blm.knowledge.reject",
  publish: "blm.knowledge.publish",
} as const;

export interface KnowledgeReviewerContext {
  readonly reviewerId: string;
  readonly reviewerRole: string;
  readonly authority: "HUMAN" | "AI_AGENT" | "SYSTEM";
  readonly permissionIds: readonly string[];
  readonly reviewedAt: string;
}

export interface KnowledgeReviewItem {
  readonly reviewId: string;
  readonly scopeType: KnowledgeReviewScopeType;
  readonly workspaceId?: string;
  readonly knowledgeItemFingerprint?: string;
  readonly mapping?: ExternalSemanticMapping;
  readonly conflict?: KnowledgeConflict;
  readonly reviewReason: KnowledgeReviewReason;
  readonly sourceReferences: readonly SourceSnapshot[];
  readonly affectedSemanticIds: readonly SemanticId[];
  readonly domainPackId?: SemanticId;
  readonly status: KnowledgeReviewItemStatus;
  readonly proposedDecision?: KnowledgeReviewDecisionType;
  readonly createdAt: string;
  readonly decidedAt?: string;
  readonly reviewerId?: string;
  readonly reviewerRole?: string;
  readonly reviewerAuthority?: KnowledgeReviewerContext["authority"];
  readonly explanation?: string;
  readonly evidenceFingerprint: string;
  readonly resultingKnowledgeAction?: KnowledgeReviewDecisionType;
  readonly priority: KnowledgeReviewRisk;
  readonly requiredDomainExpertise: readonly string[];
  readonly provenance: BusinessKnowledgeProvenance;
}

export interface ReviewEvidenceBundle {
  readonly reviewItem: KnowledgeReviewItem;
  readonly flowCanonicalConcept?: SemanticId;
  readonly externalSourceConcept?: string;
  readonly sourceDescription?: string;
  readonly sourceVersion?: string;
  readonly sourceCommitSha?: string;
  readonly mappingType?: ExternalSemanticMapping["relationship"];
  readonly aliases: readonly string[];
  readonly relationships: readonly string[];
  readonly domainPackId?: SemanticId;
  readonly license: string;
  readonly licenseStatus: string;
  readonly provenance: BusinessKnowledgeProvenance;
  readonly conflicts: readonly KnowledgeConflict[];
  readonly previousMapping?: ExternalSemanticMapping;
  readonly proposedMapping?: ExternalSemanticMapping;
  readonly affectedKnowledgeReleaseIds: readonly string[];
}

export interface KnowledgeDecisionRecord {
  readonly decisionId: string;
  readonly reviewId: string;
  readonly decisionType: KnowledgeReviewDecisionType;
  readonly reviewerId: string;
  readonly reviewerRole: string;
  readonly reviewerAuthority: KnowledgeReviewerContext["authority"];
  readonly decidedAt: string;
  readonly reason: string;
  readonly previousStatus: KnowledgeReviewItemStatus;
  readonly newStatus: KnowledgeReviewItemStatus;
  readonly affectedMapping?: ExternalSemanticMapping;
  readonly revisedMapping?: ExternalSemanticMapping;
  readonly affectedKnowledgeReleaseId?: string;
  readonly evidenceFingerprint: string;
  readonly auditEventId: string;
}

export interface MappingRevisionRecord {
  readonly revisionId: string;
  readonly reviewId: string;
  readonly previousMapping: ExternalSemanticMapping;
  readonly revisedMapping: ExternalSemanticMapping;
  readonly decisionId: string;
  readonly revisedAt: string;
}

export interface PublicationEligibilityDecision {
  readonly canPublish: boolean;
  readonly blockedReasons: readonly string[];
  readonly gates: {
    readonly sourceApproved: boolean;
    readonly licenseApproved: boolean;
    readonly mappingApproved: boolean;
    readonly conflictsResolved: boolean;
    readonly provenanceComplete: boolean;
    readonly validationPassed: boolean;
    readonly reviewCompleted: boolean;
    readonly canonicalIdValid: boolean;
  };
}

export interface KnowledgeReleaseCandidate {
  readonly candidateId: string;
  readonly createdAt: string;
  readonly eligibleItemFingerprints: readonly string[];
  readonly excludedReviewIds: readonly string[];
  readonly readiness: "READY" | "BLOCKED";
  readonly blockedReasons: readonly string[];
  readonly release?: BLMKnowledgeRelease;
}

export interface KnowledgeImpactReport {
  readonly affectedSemanticId: SemanticId;
  readonly domainPackIds: readonly SemanticId[];
  readonly skillIds: readonly SemanticId[];
  readonly documentIds: readonly SemanticId[];
  readonly metricIds: readonly SemanticId[];
  readonly ruleIds: readonly SemanticId[];
  readonly processPatternIds: readonly SemanticId[];
  readonly evaluationCaseIds: readonly SemanticId[];
}

export interface ReviewQueueFilter {
  readonly status?: KnowledgeReviewItemStatus;
  readonly reason?: KnowledgeReviewReason;
  readonly sourceId?: string;
  readonly domainPackId?: SemanticId;
  readonly semanticId?: SemanticId;
  readonly priority?: KnowledgeReviewRisk;
}

export class KnowledgeReviewError extends Error {}

export class InMemoryKnowledgeReviewRepository {
  private readonly items = new Map<string, KnowledgeReviewItem>();
  private readonly decisions: KnowledgeDecisionRecord[] = [];
  private readonly revisions: MappingRevisionRecord[] = [];
  private readonly auditEvents: AuditEvent[] = [];

  upsertItem(item: KnowledgeReviewItem): void {
    this.items.set(item.reviewId, item);
  }

  getItem(reviewId: string): KnowledgeReviewItem | undefined {
    return this.items.get(reviewId);
  }

  listItems(filter: ReviewQueueFilter = {}): readonly KnowledgeReviewItem[] {
    return [...this.items.values()].filter((item) => {
      if (filter.status && item.status !== filter.status) return false;
      if (filter.reason && item.reviewReason !== filter.reason) return false;
      if (
        filter.sourceId &&
        !item.sourceReferences.some(
          (source) => source.sourceId === filter.sourceId,
        )
      )
        return false;
      if (filter.domainPackId && item.domainPackId !== filter.domainPackId)
        return false;
      if (
        filter.semanticId &&
        !item.affectedSemanticIds.includes(filter.semanticId)
      )
        return false;
      if (filter.priority && item.priority !== filter.priority) return false;
      return true;
    });
  }

  addDecision(record: KnowledgeDecisionRecord): void {
    this.decisions.push(record);
  }

  listDecisions(reviewId?: string): readonly KnowledgeDecisionRecord[] {
    return this.decisions.filter(
      (decision) => !reviewId || decision.reviewId === reviewId,
    );
  }

  addRevision(record: MappingRevisionRecord): void {
    this.revisions.push(record);
  }

  listRevisions(reviewId?: string): readonly MappingRevisionRecord[] {
    return this.revisions.filter(
      (revision) => !reviewId || revision.reviewId === reviewId,
    );
  }

  addAuditEvent(event: AuditEvent): void {
    this.auditEvents.push(event);
  }

  listAuditEvents(): readonly AuditEvent[] {
    return [...this.auditEvents];
  }
}

export class KnowledgeReviewService {
  constructor(private readonly repository: InMemoryKnowledgeReviewRepository) {}

  createReviewItem(
    input: Omit<KnowledgeReviewItem, "evidenceFingerprint">,
  ): KnowledgeReviewItem {
    validateReviewScope(input);
    const item = {
      ...input,
      evidenceFingerprint: stableFingerprint({
        reviewId: input.reviewId,
        mapping: input.mapping,
        conflict: input.conflict,
        sourceReferences: input.sourceReferences,
        affectedSemanticIds: input.affectedSemanticIds,
      }),
    };
    this.repository.upsertItem(item);
    return item;
  }

  listOpenReviewItems(
    filter: Omit<ReviewQueueFilter, "status"> = {},
  ): readonly KnowledgeReviewItem[] {
    return this.repository.listItems({ ...filter, status: "OPEN" });
  }

  getReviewItem(reviewId: string): KnowledgeReviewItem {
    const item = this.repository.getItem(reviewId);
    if (!item) {
      throw new KnowledgeReviewError(`Unknown review item: ${reviewId}`);
    }
    return item;
  }

  getEvidenceBundle(input: {
    readonly reviewId: string;
    readonly previousMapping?: ExternalSemanticMapping;
    readonly proposedMapping?: ExternalSemanticMapping;
    readonly conflicts?: readonly KnowledgeConflict[];
    readonly affectedKnowledgeReleaseIds?: readonly string[];
  }): ReviewEvidenceBundle {
    const item = this.getReviewItem(input.reviewId);
    const source = item.sourceReferences[0];
    const sourceManifestEntry = source
      ? blmSourceManifestV1.find((entry) => entry.id === source.sourceId)
      : undefined;
    return {
      reviewItem: item,
      ...(item.mapping?.canonicalSemanticId
        ? { flowCanonicalConcept: item.mapping.canonicalSemanticId }
        : {}),
      ...(item.mapping?.externalConceptId
        ? { externalSourceConcept: item.mapping.externalConceptId }
        : {}),
      ...(item.mapping?.sourceVersion
        ? { sourceVersion: item.mapping.sourceVersion }
        : {}),
      ...(source?.commitSha ? { sourceCommitSha: source.commitSha } : {}),
      ...(item.mapping?.relationship
        ? { mappingType: item.mapping.relationship }
        : {}),
      aliases: item.mapping?.aliases ?? [],
      relationships: item.conflict
        ? [item.conflict.sourceAClaim, item.conflict.sourceBClaim]
        : [],
      ...(item.domainPackId ? { domainPackId: item.domainPackId } : {}),
      license:
        sourceManifestEntry?.license ?? source?.licenseReference ?? "UNKNOWN",
      licenseStatus: sourceManifestEntry?.licenseStatus ?? "UNKNOWN",
      provenance: item.provenance,
      conflicts: input.conflicts ?? (item.conflict ? [item.conflict] : []),
      ...(input.previousMapping
        ? { previousMapping: input.previousMapping }
        : {}),
      ...(input.proposedMapping
        ? { proposedMapping: input.proposedMapping }
        : {}),
      affectedKnowledgeReleaseIds: input.affectedKnowledgeReleaseIds ?? [],
    };
  }

  applyDecision(input: {
    readonly reviewId: string;
    readonly decisionType: KnowledgeReviewDecisionType;
    readonly reviewer: KnowledgeReviewerContext;
    readonly reason: string;
    readonly revisedMapping?: ExternalSemanticMapping;
    readonly affectedKnowledgeReleaseId?: string;
  }): KnowledgeDecisionRecord {
    const before = this.getReviewItem(input.reviewId);
    authorizeReviewDecision(input.decisionType, input.reviewer);
    const newStatus = nextReviewStatus(before.status, input.decisionType);
    const after = {
      ...before,
      status: newStatus,
      decidedAt: input.reviewer.reviewedAt,
      reviewerId: input.reviewer.reviewerId,
      reviewerRole: input.reviewer.reviewerRole,
      reviewerAuthority: input.reviewer.authority,
      explanation: input.reason,
      resultingKnowledgeAction: input.decisionType,
    } satisfies KnowledgeReviewItem;
    const decision: KnowledgeDecisionRecord = {
      decisionId: stableFingerprint({
        reviewId: input.reviewId,
        type: input.decisionType,
        reviewer: input.reviewer.reviewerId,
        at: input.reviewer.reviewedAt,
      }),
      reviewId: input.reviewId,
      decisionType: input.decisionType,
      reviewerId: input.reviewer.reviewerId,
      reviewerRole: input.reviewer.reviewerRole,
      reviewerAuthority: input.reviewer.authority,
      decidedAt: input.reviewer.reviewedAt,
      reason: input.reason,
      previousStatus: before.status,
      newStatus,
      ...(before.mapping ? { affectedMapping: before.mapping } : {}),
      ...(input.revisedMapping ? { revisedMapping: input.revisedMapping } : {}),
      ...(input.affectedKnowledgeReleaseId
        ? { affectedKnowledgeReleaseId: input.affectedKnowledgeReleaseId }
        : {}),
      evidenceFingerprint: before.evidenceFingerprint,
      auditEventId: `audit:${input.reviewId}:${input.reviewer.reviewedAt}`,
    };
    if (input.revisedMapping && before.mapping) {
      this.repository.addRevision({
        revisionId: stableFingerprint({
          reviewId: input.reviewId,
          previous: before.mapping,
          revised: input.revisedMapping,
        }),
        reviewId: input.reviewId,
        previousMapping: before.mapping,
        revisedMapping: input.revisedMapping,
        decisionId: decision.decisionId,
        revisedAt: input.reviewer.reviewedAt,
      });
    }
    this.repository.upsertItem(after);
    this.repository.addDecision(decision);
    this.repository.addAuditEvent(
      createKnowledgeReviewAuditEvent(before, after, decision),
    );
    return decision;
  }

  listDecisionHistory(reviewId?: string): readonly KnowledgeDecisionRecord[] {
    return this.repository.listDecisions(reviewId);
  }

  listMappingRevisions(reviewId?: string): readonly MappingRevisionRecord[] {
    return this.repository.listRevisions(reviewId);
  }

  listAuditEvents(): readonly AuditEvent[] {
    return this.repository.listAuditEvents();
  }
}

export function generateReviewItemsFromAcquisition(input: {
  readonly result: KnowledgeAcquisitionRunResult;
  readonly createdAt: string;
}): readonly KnowledgeReviewItem[] {
  const items: KnowledgeReviewItem[] = [];
  for (const issue of input.result.report.issues) {
    const reason = reviewReasonForIssue(issue);
    if (!reason) continue;
    items.push(
      makeReviewItem({
        reason,
        createdAt: input.createdAt,
        sourceReferences: input.result.snapshots.filter(
          (snapshot) => !issue.sourceId || snapshot.sourceId === issue.sourceId,
        ),
        affectedSemanticIds: issue.canonicalSemanticId
          ? [issue.canonicalSemanticId]
          : [],
        priority:
          reason === "LICENSE_REVIEW_REQUIRED"
            ? "HIGH"
            : reason === "CANONICALIZATION_REQUIRED"
              ? "MEDIUM"
              : "LOW",
        provenanceNotes: issue.message,
      }),
    );
  }
  for (const conflict of input.result.conflicts) {
    items.push(
      makeReviewItem({
        reason: "CONFLICTING_DEFINITION",
        createdAt: input.createdAt,
        sourceReferences: input.result.snapshots,
        affectedSemanticIds: conflict.affectedFlowSemanticId
          ? [conflict.affectedFlowSemanticId]
          : [],
        conflict,
        priority: "HIGH",
        provenanceNotes: `Conflict ${conflict.conflictId} requires human review.`,
      }),
    );
  }
  return items;
}

export function createReviewItemForMapping(input: {
  readonly mapping: ExternalSemanticMapping;
  readonly sourceReferences: readonly SourceSnapshot[];
  readonly reason: KnowledgeReviewReason;
  readonly createdAt: string;
  readonly priority?: KnowledgeReviewRisk;
}): KnowledgeReviewItem {
  return makeReviewItem({
    reason: input.reason,
    createdAt: input.createdAt,
    sourceReferences: input.sourceReferences,
    affectedSemanticIds: [input.mapping.canonicalSemanticId],
    mapping: input.mapping,
    domainPackId: input.mapping.domainPackId,
    priority: input.priority ?? "MEDIUM",
    provenanceNotes: `Review required for mapping ${input.mapping.mappingId}.`,
  });
}

export function canPublishKnowledge(input: {
  readonly reviewItem: KnowledgeReviewItem;
  readonly decisionHistory: readonly KnowledgeDecisionRecord[];
  readonly validationPassed: boolean;
}): PublicationEligibilityDecision {
  const sourceManifestEntry = input.reviewItem.sourceReferences
    .map((snapshot) =>
      blmSourceManifestV1.find((source) => source.id === snapshot.sourceId),
    )
    .find((source) => source !== undefined);
  const sourceApproved =
    !sourceManifestEntry ||
    (sourceManifestEntry.licenseStatus === "VERIFIED" &&
      (sourceManifestEntry.decision === "ADOPT" ||
        sourceManifestEntry.decision === "ADAPT"));
  const licenseApproved =
    !sourceManifestEntry || sourceManifestEntry.licenseStatus === "VERIFIED";
  const mappingApproved =
    input.reviewItem.mapping?.reviewStatus === "APPROVED" ||
    input.decisionHistory.some((decision) =>
      ["APPROVE_MAPPING", "CHANGE_MAPPING", "APPROVE_PUBLICATION"].includes(
        decision.decisionType,
      ),
    );
  const conflictsResolved =
    !input.reviewItem.conflict ||
    input.decisionHistory.some((decision) =>
      [
        "APPROVE_FLOW_CANONICAL_OVERRIDE",
        "PREFER_SOURCE_A",
        "PREFER_SOURCE_B",
        "MARK_CONTEXT_DEPENDENT",
      ].includes(decision.decisionType),
    );
  const provenanceComplete =
    input.reviewItem.provenance.notes.length > 0 &&
    input.reviewItem.sourceReferences.length > 0;
  const reviewCompleted = input.reviewItem.status === "APPROVED";
  const canonicalIdValid =
    input.reviewItem.affectedSemanticIds.length > 0 &&
    input.reviewItem.affectedSemanticIds.every((semanticId) => {
      try {
        validateSemanticId(semanticId);
        return true;
      } catch {
        return false;
      }
    });
  const gates = {
    sourceApproved,
    licenseApproved,
    mappingApproved,
    conflictsResolved,
    provenanceComplete,
    validationPassed: input.validationPassed,
    reviewCompleted,
    canonicalIdValid,
  };
  const blockedReasons = Object.entries(gates)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  return {
    canPublish: blockedReasons.length === 0,
    blockedReasons,
    gates,
  };
}

export function createKnowledgeReleaseCandidate(input: {
  readonly candidateId: string;
  readonly createdAt: string;
  readonly baseRelease: BLMKnowledgeRelease;
  readonly reviewItems: readonly KnowledgeReviewItem[];
  readonly decisionHistory: readonly KnowledgeDecisionRecord[];
  readonly publishedItems: readonly PublishedKnowledgeItem[];
}): KnowledgeReleaseCandidate {
  const eligibility = input.reviewItems.map((item) => ({
    item,
    decision: canPublishKnowledge({
      reviewItem: item,
      decisionHistory: input.decisionHistory.filter(
        (decision) => decision.reviewId === item.reviewId,
      ),
      validationPassed: true,
    }),
  }));
  const blocked = eligibility.filter((entry) => !entry.decision.canPublish);
  const eligibleSemanticIds = new Set(
    eligibility
      .filter((entry) => entry.decision.canPublish)
      .flatMap((entry) => entry.item.affectedSemanticIds),
  );
  const eligibleItems = input.publishedItems.filter((item) =>
    eligibleSemanticIds.has(item.canonicalSemanticId),
  );
  const release =
    blocked.length === 0
      ? createKnowledgeRelease({
          ...input.baseRelease,
          releaseId: `${input.baseRelease.releaseId}.candidate`,
          createdAt: input.createdAt,
          publishedItems: eligibleItems,
        })
      : undefined;
  return {
    candidateId: input.candidateId,
    createdAt: input.createdAt,
    eligibleItemFingerprints: eligibleItems.map((item) => item.fingerprint),
    excludedReviewIds: blocked.map((entry) => entry.item.reviewId),
    readiness: blocked.length === 0 ? "READY" : "BLOCKED",
    blockedReasons: [
      ...new Set(blocked.flatMap((entry) => entry.decision.blockedReasons)),
    ].sort(),
    ...(release ? { release } : {}),
  };
}

export function generateReviewItemsForReleaseDiff(input: {
  readonly diff: KnowledgeReleaseDiff;
  readonly sourceReferences: readonly SourceSnapshot[];
  readonly createdAt: string;
}): readonly KnowledgeReviewItem[] {
  return input.diff.changes
    .filter((change) => change.type === "MAPPING_CHANGED")
    .map((change) =>
      makeReviewItem({
        reason: "MAPPING_CHANGED",
        createdAt: input.createdAt,
        sourceReferences: input.sourceReferences,
        affectedSemanticIds: [change.canonicalSemanticId],
        priority: "HIGH",
        provenanceNotes: change.detail,
      }),
    );
}

export function generateReviewItemsForSourceUpdate(input: {
  readonly previous: SourceSnapshot;
  readonly next: SourceSnapshot;
  readonly affectedSemanticIds: readonly SemanticId[];
  readonly createdAt: string;
}): readonly KnowledgeReviewItem[] {
  if (input.previous.contentFingerprint === input.next.contentFingerprint) {
    return [];
  }
  return [
    makeReviewItem({
      reason: "SOURCE_VERSION_CHANGED",
      createdAt: input.createdAt,
      sourceReferences: [input.previous, input.next],
      affectedSemanticIds: input.affectedSemanticIds,
      priority: "HIGH",
      provenanceNotes: "Approved source snapshot changed; review required.",
    }),
  ];
}

export function analyzeKnowledgeImpact(
  semanticId: SemanticId,
  packs: readonly BusinessDomainPackBundle[],
): KnowledgeImpactReport {
  const domainPackIds: SemanticId[] = [];
  const skillIds: SemanticId[] = [];
  const documentIds: SemanticId[] = [];
  const metricIds: SemanticId[] = [];
  const ruleIds: SemanticId[] = [];
  const processPatternIds: SemanticId[] = [];
  const evaluationCaseIds: SemanticId[] = [];
  for (const pack of packs) {
    if (pack.domainPack.conceptIds.includes(semanticId)) {
      domainPackIds.push(pack.domainPack.semanticId);
    }
    skillIds.push(
      ...pack.skills
        .filter((skill) => skill.conceptIds.includes(semanticId))
        .map((skill) => skill.semanticId),
    );
    documentIds.push(
      ...pack.documents
        .filter(
          (document) =>
            document.participantConceptIds.includes(semanticId) ||
            document.lineItemConceptId === semanticId ||
            semanticTail(document.semanticId) === semanticTail(semanticId),
        )
        .map((document) => document.semanticId),
    );
    metricIds.push(
      ...pack.metrics
        .filter((metric) => metric.requiredInputIds.includes(semanticId))
        .map((metric) => metric.semanticId),
    );
    ruleIds.push(
      ...pack.rules
        .filter((rule) => rule.appliesToConceptIds.includes(semanticId))
        .map((rule) => rule.semanticId),
    );
    processPatternIds.push(
      ...pack.processPatterns
        .filter(
          (pattern) =>
            pattern.relatedSkillIds.some((skillId) =>
              skillIds.includes(skillId),
            ) ||
            pattern.relatedDocumentIds.some((documentId) =>
              documentIds.includes(documentId),
            ),
        )
        .map((pattern) => pattern.semanticId),
    );
    evaluationCaseIds.push(
      ...pack.evaluationCases
        .filter(
          (evaluationCase) =>
            evaluationCase.domainPackId === pack.domainPack.semanticId,
        )
        .map((evaluationCase) => evaluationCase.semanticId),
    );
  }
  return {
    affectedSemanticId: semanticId,
    domainPackIds: uniqueSemanticIds(domainPackIds),
    skillIds: uniqueSemanticIds(skillIds),
    documentIds: uniqueSemanticIds(documentIds),
    metricIds: uniqueSemanticIds(metricIds),
    ruleIds: uniqueSemanticIds(ruleIds),
    processPatternIds: uniqueSemanticIds(processPatternIds),
    evaluationCaseIds: uniqueSemanticIds(evaluationCaseIds),
  };
}

export function createReviewedBusinessExpertiseRegistry(input: {
  readonly reviewItems: readonly KnowledgeReviewItem[];
  readonly decisionHistory: readonly KnowledgeDecisionRecord[];
  readonly domainPacks: readonly BusinessDomainPackBundle[];
}): BusinessExpertiseRegistry {
  const unresolved = input.reviewItems.filter(
    (item) => item.status !== "APPROVED",
  );
  if (unresolved.length > 0) {
    throw new KnowledgeReviewError(
      "Cannot create reviewed registry with unresolved review items.",
    );
  }
  if (
    input.reviewItems.some(
      (item) =>
        !canPublishKnowledge({
          reviewItem: item,
          decisionHistory: input.decisionHistory.filter(
            (decision) => decision.reviewId === item.reviewId,
          ),
          validationPassed: true,
        }).canPublish,
    )
  ) {
    throw new KnowledgeReviewError(
      "Cannot create registry from unpublishable reviewed knowledge.",
    );
  }
  return new BusinessExpertiseRegistry({
    sources: blmSourceManifestV1,
    domainPacks: input.domainPacks,
  });
}

function makeReviewItem(input: {
  readonly reason: KnowledgeReviewReason;
  readonly createdAt: string;
  readonly sourceReferences: readonly SourceSnapshot[];
  readonly affectedSemanticIds: readonly SemanticId[];
  readonly priority: KnowledgeReviewRisk;
  readonly provenanceNotes: string;
  readonly mapping?: ExternalSemanticMapping;
  readonly conflict?: KnowledgeConflict;
  readonly domainPackId?: SemanticId;
}): KnowledgeReviewItem {
  const reviewSeed = {
    reason: input.reason,
    sourceReferences: input.sourceReferences.map((source) => ({
      sourceId: source.sourceId,
      fingerprint: source.contentFingerprint,
    })),
    affectedSemanticIds: input.affectedSemanticIds,
    mappingId: input.mapping?.mappingId,
    conflictId: input.conflict?.conflictId,
  };
  return {
    reviewId: `review:${stableFingerprint(reviewSeed)}`,
    scopeType: "GLOBAL_BLM_REVIEW",
    ...(input.mapping ? { mapping: input.mapping } : {}),
    ...(input.conflict ? { conflict: input.conflict } : {}),
    reviewReason: input.reason,
    sourceReferences: input.sourceReferences,
    affectedSemanticIds: input.affectedSemanticIds,
    ...(input.domainPackId ? { domainPackId: input.domainPackId } : {}),
    status: "OPEN",
    ...(input.mapping ? { proposedDecision: "APPROVE_MAPPING" as const } : {}),
    createdAt: input.createdAt,
    priority: input.priority,
    requiredDomainExpertise: domainExpertiseFor(
      input.domainPackId,
      input.reason,
    ),
    provenance: {
      sourceIds: input.sourceReferences.map((source) => source.sourceId),
      use: "FLOW_NATIVE",
      notes: input.provenanceNotes,
    },
    evidenceFingerprint: stableFingerprint(reviewSeed),
  };
}

function reviewReasonForIssue(
  issue: KnowledgeAcquisitionIssue,
): KnowledgeReviewReason | undefined {
  switch (issue.code) {
    case "UNKNOWN_MAPPING":
      return "CANONICALIZATION_REQUIRED";
    case "AMBIGUOUS_MAPPING":
      return "AMBIGUOUS_MAPPING";
    case "LICENSE_BLOCK":
      return "LICENSE_REVIEW_REQUIRED";
    case "INCOMPATIBLE_EXACT_MAPPING":
    case "SEMANTIC_CONFLICT":
    case "DUPLICATE_MAPPING":
      return "CONFLICTING_DEFINITION";
    default:
      return undefined;
  }
}

function validateReviewScope(item: {
  readonly scopeType: KnowledgeReviewScopeType;
  readonly workspaceId?: string;
}): void {
  if (item.scopeType === "GLOBAL_BLM_REVIEW" && item.workspaceId) {
    throw new KnowledgeReviewError(
      "Global BLM review items cannot be workspace-owned.",
    );
  }
  if (item.scopeType === "WORKSPACE_KNOWLEDGE_REVIEW" && !item.workspaceId) {
    throw new KnowledgeReviewError(
      "Workspace knowledge review items require workspaceId.",
    );
  }
}

function authorizeReviewDecision(
  decisionType: KnowledgeReviewDecisionType,
  reviewer: KnowledgeReviewerContext,
): void {
  if (reviewer.authority !== "HUMAN") {
    throw new KnowledgeReviewError(
      "Only human reviewers can make authoritative BLM knowledge decisions.",
    );
  }
  const requiredPermission =
    decisionType === "APPROVE_PUBLICATION"
      ? blmKnowledgeReviewPermissions.publish
      : decisionType.startsWith("REJECT")
        ? blmKnowledgeReviewPermissions.reject
        : blmKnowledgeReviewPermissions.approve;
  if (!reviewer.permissionIds.includes(requiredPermission)) {
    throw new KnowledgeReviewError(
      `Reviewer lacks permission: ${requiredPermission}`,
    );
  }
}

function nextReviewStatus(
  current: KnowledgeReviewItemStatus,
  decisionType: KnowledgeReviewDecisionType,
): KnowledgeReviewItemStatus {
  if (["APPROVED", "REJECTED", "SUPERSEDED"].includes(current)) {
    throw new KnowledgeReviewError(
      `Invalid review transition from terminal state ${current}.`,
    );
  }
  switch (decisionType) {
    case "APPROVE_MAPPING":
    case "APPROVE_PUBLICATION":
    case "APPROVE_FLOW_CANONICAL_OVERRIDE":
    case "PREFER_SOURCE_A":
    case "PREFER_SOURCE_B":
    case "MARK_CONTEXT_DEPENDENT":
      return "APPROVED";
    case "REJECT_MAPPING":
    case "REJECT_SOURCE_KNOWLEDGE":
      return "REJECTED";
    case "CHANGE_MAPPING":
      return "APPROVED";
    case "DEFER_DECISION":
      return "DEFERRED";
  }
}

function createKnowledgeReviewAuditEvent(
  before: KnowledgeReviewItem,
  after: KnowledgeReviewItem,
  decision: KnowledgeDecisionRecord,
): AuditEvent<KnowledgeReviewItem, KnowledgeReviewItem> {
  return {
    id: decision.auditEventId,
    occurredAt: decision.decidedAt,
    actorId: decision.reviewerId,
    workspaceId: after.workspaceId ?? "GLOBAL_PLATFORM",
    resourceType: "blm.knowledge.review",
    resourceId: before.reviewId,
    action: decision.decisionType,
    decision: {
      outcome: "ALLOW",
      reason: "Authorized human BLM knowledge review decision.",
      requiredPermission:
        decision.decisionType === "APPROVE_PUBLICATION"
          ? blmKnowledgeReviewPermissions.publish
          : blmKnowledgeReviewPermissions.approve,
    },
    resultStatus: "EXECUTED",
    reason: decision.reason,
    evidence: [
      {
        id: decision.evidenceFingerprint,
        kind: "system-record",
        source: "BLM Knowledge Review",
        claimClassification: "FACT",
        trustLevel: "high",
      },
    ],
    before,
    after,
    correlationId: `blm-review:${before.reviewId}` as never,
  };
}

function domainExpertiseFor(
  domainPackId: SemanticId | undefined,
  reason: KnowledgeReviewReason,
): readonly string[] {
  if (
    domainPackId === toSemanticId("flow.concept.blm.domain.finance-accounting")
  ) {
    return ["financial semantic reviewer"];
  }
  if (
    domainPackId ===
    toSemanticId("flow.concept.blm.domain.inventory-procurement")
  ) {
    return ["operations reviewer"];
  }
  if (reason === "LICENSE_REVIEW_REQUIRED") {
    return ["license reviewer"];
  }
  return ["platform semantic reviewer"];
}

function uniqueSemanticIds(
  values: readonly SemanticId[],
): readonly SemanticId[] {
  return [...new Set(values)].sort();
}

function semanticTail(semanticId: SemanticId): string {
  return semanticId.split(".").at(-1) ?? semanticId;
}

export function createProofReviewService(): KnowledgeReviewService {
  return new KnowledgeReviewService(new InMemoryKnowledgeReviewRepository());
}

export function createMappingChangedReviewFromReleases(input: {
  readonly previousRelease: BLMKnowledgeRelease;
  readonly nextRelease: BLMKnowledgeRelease;
  readonly sourceReferences: readonly SourceSnapshot[];
  readonly createdAt: string;
}): readonly KnowledgeReviewItem[] {
  return generateReviewItemsForReleaseDiff({
    diff: diffKnowledgeReleases(input.previousRelease, input.nextRelease),
    sourceReferences: input.sourceReferences,
    createdAt: input.createdAt,
  });
}
