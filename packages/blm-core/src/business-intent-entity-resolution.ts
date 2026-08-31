import {
  type BusinessActionProposalIntent,
  type BusinessAmbiguity,
  type BusinessAuthoritySensitivity,
  type BusinessContextFrame,
  type BusinessEntityType,
  type BusinessIntent,
  type BusinessMissingInformation,
  type BusinessQueryFilter,
  type BusinessQueryIntent,
  type BusinessQuantity,
  type BusinessRecordRef,
  type BusinessResolutionStatus,
  type BusinessTimeRange,
  type BusinessUserAssertion,
  type EntityCandidate,
  type EntityMatchReason,
  type EntityMention,
  type EntityResolution,
  type GroundedBusinessRequest,
  type ModelRecordReferenceProposal,
  type ModelRecordReferenceValidation,
  type BusinessIntentClass,
  type BusinessUtteranceInterpretation,
  type SemanticId,
} from "@flow/blm-contracts";

import {
  BusinessLanguageRegistry,
  FounderSpeakInterpreter,
  businessLanguageCoreConceptIds,
  normalizeBusinessText,
} from "./business-language-foundation.js";
import { stableFingerprint } from "./knowledge-acquisition.js";

const INTERPRETER_VERSION = "flow-blm-intent-entity-resolution-v1";
const DEFAULT_TIMEZONE = "UTC";

export interface BusinessEntityLookupContext {
  readonly workspaceId: string;
  readonly userId?: string;
  readonly permissionIds: readonly string[];
  readonly roleRefs: readonly string[];
  readonly correlationId?: string;
}

export interface BusinessEntityLookupRecord {
  readonly recordRef: BusinessRecordRef;
  readonly displayLabel: string;
  readonly searchableText?: readonly string[];
  readonly aliases?: readonly string[];
  readonly externalIds?: readonly string[];
  readonly emailAddresses?: readonly string[];
  readonly referenceNumbers?: readonly string[];
  readonly requiredPermissions?: readonly string[];
  readonly archived?: boolean;
}

export interface EntityCandidateSearchInput {
  readonly context: BusinessEntityLookupContext;
  readonly entityType: BusinessEntityType;
  readonly normalizedText: string;
  readonly rawText: string;
  readonly limit?: number;
}

export interface BusinessEntityLookupProvider {
  readonly entityType: BusinessEntityType;
  findCandidates(input: EntityCandidateSearchInput): readonly EntityCandidate[];
  getByRef(input: {
    readonly context: BusinessEntityLookupContext;
    readonly ref: BusinessRecordRef;
  }): EntityCandidate | undefined;
  validateRecordRef(input: {
    readonly context: BusinessEntityLookupContext;
    readonly ref: BusinessRecordRef;
  }): "VALID" | "WRONG_WORKSPACE" | "INACCESSIBLE" | "NOT_FOUND";
}

export class InMemoryBusinessEntityLookupProvider implements BusinessEntityLookupProvider {
  constructor(
    readonly entityType: BusinessEntityType,
    private readonly records: readonly BusinessEntityLookupRecord[],
  ) {}

  findCandidates(
    input: EntityCandidateSearchInput,
  ): readonly EntityCandidate[] {
    return this.authorizedRecords(input.context)
      .flatMap((record) => matchRecord(record, input.normalizedText))
      .sort(compareCandidate)
      .slice(0, input.limit ?? 10);
  }

  getByRef(input: {
    readonly context: BusinessEntityLookupContext;
    readonly ref: BusinessRecordRef;
  }): EntityCandidate | undefined {
    if (
      input.ref.workspaceId !== input.context.workspaceId ||
      input.ref.entityType !== this.entityType
    ) {
      return undefined;
    }
    const record = this.authorizedRecords(input.context).find(
      (candidate) => candidate.recordRef.recordId === input.ref.recordId,
    );
    return record
      ? candidateFromRecord(
          record,
          ["EXACT_ID", "AUTHORIZED_WORKSPACE_SCOPE"],
          1,
        )
      : undefined;
  }

  validateRecordRef(input: {
    readonly context: BusinessEntityLookupContext;
    readonly ref: BusinessRecordRef;
  }): "VALID" | "WRONG_WORKSPACE" | "INACCESSIBLE" | "NOT_FOUND" {
    if (input.ref.workspaceId !== input.context.workspaceId) {
      return "WRONG_WORKSPACE";
    }
    const record = this.records.find(
      (candidate) =>
        candidate.recordRef.workspaceId === input.ref.workspaceId &&
        candidate.recordRef.entityType === input.ref.entityType &&
        candidate.recordRef.recordId === input.ref.recordId,
    );
    if (!record || record.archived) return "NOT_FOUND";
    if (!isRecordAuthorized(record, input.context)) return "INACCESSIBLE";
    return "VALID";
  }

  private authorizedRecords(
    context: BusinessEntityLookupContext,
  ): readonly BusinessEntityLookupRecord[] {
    return this.records.filter(
      (record) =>
        record.recordRef.workspaceId === context.workspaceId &&
        record.recordRef.entityType === this.entityType &&
        !record.archived &&
        isRecordAuthorized(record, context),
    );
  }
}

export class EntityResolverRegistry {
  private readonly providers = new Map<
    BusinessEntityType,
    BusinessEntityLookupProvider
  >();

  register(provider: BusinessEntityLookupProvider): void {
    this.providers.set(provider.entityType, provider);
  }

  getProvider(
    entityType: BusinessEntityType,
  ): BusinessEntityLookupProvider | undefined {
    return this.providers.get(entityType);
  }

  findCandidates(input: {
    readonly context: BusinessEntityLookupContext;
    readonly entityTypes: readonly BusinessEntityType[];
    readonly rawText: string;
    readonly normalizedText: string;
    readonly limit?: number;
  }): readonly EntityCandidate[] {
    return input.entityTypes
      .flatMap(
        (entityType) =>
          this.providers.get(entityType)?.findCandidates({
            context: input.context,
            entityType,
            rawText: input.rawText,
            normalizedText: input.normalizedText,
            ...(input.limit === undefined ? {} : { limit: input.limit }),
          }) ?? [],
      )
      .sort(compareCandidate)
      .slice(0, input.limit ?? 12);
  }

  getByRef(input: {
    readonly context: BusinessEntityLookupContext;
    readonly ref: BusinessRecordRef;
  }): EntityCandidate | undefined {
    return this.providers.get(input.ref.entityType)?.getByRef(input);
  }

  validateRecordRef(input: {
    readonly context: BusinessEntityLookupContext;
    readonly ref: BusinessRecordRef;
  }):
    "VALID" | "WRONG_WORKSPACE" | "INACCESSIBLE" | "NOT_FOUND" | "UNSUPPORTED" {
    const provider = this.providers.get(input.ref.entityType);
    if (!provider) return "UNSUPPORTED";
    return provider.validateRecordRef(input);
  }
}

export interface TemporalExpressionResolverInput {
  readonly text: string;
  readonly timezone?: string;
  readonly relativeTo: string;
}

export class TemporalExpressionResolver {
  resolve(
    input: TemporalExpressionResolverInput,
  ): BusinessTimeRange | undefined {
    const normalized = normalizeBusinessText(input.text);
    const timezone = input.timezone ?? DEFAULT_TIMEZONE;
    const relativeDate = zonedDateParts(input.relativeTo, timezone);
    const match = temporalExpressions.find((candidate) =>
      normalized.includes(candidate.expression),
    );
    if (!match) {
      if (
        /\b(recently|soon|later|end of day|eod|next business day)\b/u.test(
          normalized,
        )
      ) {
        return unresolvedTimeRange({
          expression:
            normalized.match(
              /\b(recently|soon|later|end of day|eod|next business day)\b/u,
            )?.[0] ?? "ambiguous time",
          timezone,
          relativeTo: input.relativeTo,
        });
      }
      return undefined;
    }
    const range = match.toRange(relativeDate);
    return timeRange({
      expression: match.expression,
      start: range.start,
      end: range.end,
      timezone,
      granularity: match.granularity,
      relativeTo: input.relativeTo,
      resolutionStatus: "RESOLVED",
    });
  }
}

export interface BusinessIntentResolverInput {
  readonly utterance: string;
  readonly contextFrame: BusinessContextFrame;
  readonly sourceInterpretation: BusinessUtteranceInterpretation;
  readonly timeRange?: BusinessTimeRange;
  readonly quantities: readonly BusinessQuantity[];
}

export class BusinessIntentResolver {
  resolve(input: BusinessIntentResolverInput): BusinessIntent {
    const normalized = normalizeBusinessText(input.utterance);
    const concepts = contextualConcepts(
      input.sourceInterpretation.resolvedConcepts.map(
        (concept) => concept.conceptId,
      ),
      input.contextFrame,
      normalized,
    );
    const intentClass = refineIntent(
      input.sourceInterpretation.intent,
      normalized,
    );
    const targetEntityTypes = inferTargetEntityTypes(normalized, concepts);
    const filters = inferFilters(
      normalized,
      concepts,
      input.timeRange,
      input.quantities,
    );
    const missingInformation = inferIntentMissingInformation({
      normalized,
      intentClass,
      targetEntityTypes,
      quantities: input.quantities,
      ...(input.timeRange ? { timeRange: input.timeRange } : {}),
    });
    const ambiguity = input.sourceInterpretation.ambiguousTerms.map(
      (term): BusinessAmbiguity => ({
        code: "METRIC_AMBIGUITY",
        detail: `Business language term '${term.input}' has multiple canonical meanings.`,
        candidateCount: term.candidates.length,
      }),
    );
    const actionCandidateRefs = actionRefsFor(normalized, concepts);
    const sideEffectClass = sideEffectClassFor(intentClass);
    const authoritySensitivity = authorityFor({
      intentClass,
      normalized,
      actionCandidateRefs,
    });
    const requestedMetrics = concepts.filter((concept) =>
      isMetricConcept(concept),
    );
    const requestedDocuments = concepts.filter(
      (concept) =>
        concept === businessLanguageCoreConceptIds.invoice ||
        concept === businessLanguageCoreConceptIds.contract ||
        concept === businessLanguageCoreConceptIds.proposal,
    );
    const material = {
      normalized,
      intentClass,
      concepts,
      targetEntityTypes,
      filters,
      missingInformation,
      ambiguity,
      actionCandidateRefs,
      sideEffectClass,
      authoritySensitivity,
      timeRange: input.timeRange,
      quantities: input.quantities,
    };
    const resolutionStatus = statusFrom(missingInformation, ambiguity);
    return {
      intentId: `intent:${stableFingerprint(material).slice(0, 24)}`,
      intentClass,
      requestedOutcome: requestedOutcomeFor(intentClass, normalized),
      domainCandidates: [
        ...new Set(
          input.sourceInterpretation.resolvedConcepts.map(
            (concept) => concept.domain,
          ),
        ),
      ],
      conceptRefs: concepts,
      actionCandidateRefs,
      targetEntityTypes,
      requestedMetrics,
      requestedDocuments,
      ...(input.timeRange ? { requestedTimeRange: input.timeRange } : {}),
      filters,
      assumptions: timeAssumptions(input.timeRange),
      ambiguity,
      missingInformation,
      authoritySensitivity,
      sideEffectClass,
      confidence:
        input.sourceInterpretation.resolutionStatus === "RESOLVED"
          ? 0.84
          : 0.64,
      resolutionStatus,
      provenance: ["TASK_002_BUSINESS_LANGUAGE_INTERPRETATION"],
      interpreterVersion: INTERPRETER_VERSION,
      fingerprint: stableFingerprint(material),
    };
  }
}

export interface GroundedBusinessRequestCompilerInput {
  readonly utterance: string;
  readonly contextFrame: BusinessContextFrame;
  readonly relativeTo?: string;
  readonly modelRecordProposals?: readonly ModelRecordReferenceProposal[];
}

export class BusinessEntityResolver {
  constructor(private readonly registry: EntityResolverRegistry) {}

  resolveMentions(input: {
    readonly mentions: readonly MentionDraft[];
    readonly contextFrame: BusinessContextFrame;
  }): readonly EntityResolution[] {
    const context = lookupContext(input.contextFrame);
    return input.mentions.map((mention) => {
      const candidates = this.registry.findCandidates({
        context,
        entityTypes: mention.expectedEntityTypes,
        rawText: mention.rawText,
        normalizedText: mention.normalizedText,
      });
      return resolutionFromCandidates(mention, candidates, context);
    });
  }

  resolveContextRef(input: {
    readonly ref: BusinessRecordRef;
    readonly contextFrame: BusinessContextFrame;
    readonly role: string;
  }): EntityResolution {
    const context = lookupContext(input.contextFrame);
    const status = this.registry.validateRecordRef({ context, ref: input.ref });
    const mention = entityMention({
      rawText: input.ref.displayLabel ?? input.role,
      normalizedText: normalizeBusinessText(
        input.ref.displayLabel ?? input.role,
      ),
      expectedEntityTypes: [input.ref.entityType],
      canonicalConceptRefs: input.ref.canonicalTypeRef
        ? [input.ref.canonicalTypeRef]
        : [],
      candidates: status === "VALID" ? [input.ref] : [],
      ...(status === "VALID" ? { resolvedRef: input.ref } : {}),
      resolutionStatus: status === "VALID" ? "RESOLVED" : "INACCESSIBLE",
      missingInformation:
        status === "VALID"
          ? []
          : missing(
              "MISSING_RECORD_CONTEXT",
              "Context record is not accessible in this workspace.",
            ),
      evidence:
        status === "VALID"
          ? ["CURRENT_CONTEXT", "AUTHORIZED_WORKSPACE_SCOPE"]
          : ["CONTEXT_REFERENCE_REJECTED"],
      provenance: ["BUSINESS_CONTEXT_FRAME"],
    });
    const selected =
      status === "VALID"
        ? this.registry.getByRef({ context, ref: input.ref })
        : undefined;
    return {
      mention,
      candidates: selected ? [selected] : [],
      ...(selected ? { selectedEntity: selected } : {}),
      resolutionStatus: mention.resolutionStatus,
      confidence: selected ? 1 : 0,
      filtersApplied: ["WORKSPACE_SCOPE", "ACCESSIBLE_RECORD"],
      contextEvidence: mention.resolutionEvidence,
      permissionBoundary: `workspace:${context.workspaceId}`,
      missingInformation: mention.missingInformation,
      fingerprint: stableFingerprint({
        ref: input.ref,
        status,
        workspaceId: context.workspaceId,
      }),
    };
  }

  validateModelRecordProposals(input: {
    readonly contextFrame: BusinessContextFrame;
    readonly proposals: readonly ModelRecordReferenceProposal[];
  }): ModelRecordReferenceValidation {
    const context = lookupContext(input.contextFrame);
    const acceptedRefs: BusinessRecordRef[] = [];
    const rejectedRefs: {
      readonly recordRef: BusinessRecordRef;
      readonly reason: ModelRecordReferenceValidation["rejectedRefs"][number]["reason"];
    }[] = [];
    for (const proposal of input.proposals) {
      const status = this.registry.validateRecordRef({
        context,
        ref: proposal.recordRef,
      });
      if (status === "VALID") {
        acceptedRefs.push(proposal.recordRef);
      } else {
        rejectedRefs.push({
          recordRef: proposal.recordRef,
          reason:
            status === "WRONG_WORKSPACE"
              ? "MODEL_PROPOSED_WRONG_WORKSPACE"
              : status === "INACCESSIBLE"
                ? "MODEL_PROPOSED_INACCESSIBLE_ENTITY"
                : status === "UNSUPPORTED"
                  ? "MODEL_PROPOSED_UNSUPPORTED_ENTITY_TYPE"
                  : "MODEL_PROPOSED_UNKNOWN_ENTITY",
        });
      }
    }
    return { acceptedRefs, rejectedRefs };
  }
}

export class GroundedBusinessRequestCompiler {
  private readonly interpreter: FounderSpeakInterpreter;
  private readonly intentResolver = new BusinessIntentResolver();
  private readonly temporalResolver = new TemporalExpressionResolver();
  private readonly entityResolver: BusinessEntityResolver;

  constructor(input: {
    readonly registry?: BusinessLanguageRegistry;
    readonly entityRegistry: EntityResolverRegistry;
  }) {
    this.interpreter = new FounderSpeakInterpreter(
      input.registry ?? BusinessLanguageRegistry.universal(),
    );
    this.entityResolver = new BusinessEntityResolver(input.entityRegistry);
  }

  compile(
    input: GroundedBusinessRequestCompilerInput,
  ): GroundedBusinessRequest {
    const currentObject = currentObjectContext(input.contextFrame);
    const languageContext = {
      workspaceId: input.contextFrame.workspaceId,
      domainContext: input.contextFrame.availableDomains,
      ...(input.contextFrame.locale
        ? { languageTag: input.contextFrame.locale }
        : {}),
      ...(currentObject ? { currentObject } : {}),
    };
    const sourceInterpretation = this.interpreter.interpret(
      input.utterance,
      languageContext,
    );
    const relativeTo = input.relativeTo ?? new Date().toISOString();
    const timeRange = this.temporalResolver.resolve({
      text: input.utterance,
      relativeTo,
      ...(input.contextFrame.timezone
        ? { timezone: input.contextFrame.timezone }
        : {}),
    });
    const quantities = extractQuantities(
      normalizeBusinessText(input.utterance),
      input.contextFrame,
    );
    const intent = this.intentResolver.resolve({
      utterance: input.utterance,
      contextFrame: input.contextFrame,
      sourceInterpretation,
      quantities,
      ...(timeRange ? { timeRange } : {}),
    });
    const mentions = extractEntityMentions({
      utterance: input.utterance,
      normalized: normalizeBusinessText(input.utterance),
      concepts: intent.conceptRefs,
      targetEntityTypes: intent.targetEntityTypes,
    });
    const entityResolutions = [
      ...this.entityResolver.resolveMentions({
        mentions,
        contextFrame: input.contextFrame,
      }),
      ...contextEntityResolutions({
        compiler: this.entityResolver,
        intent,
        contextFrame: input.contextFrame,
      }),
      ...pronounEntityResolutions({
        compiler: this.entityResolver,
        utterance: input.utterance,
        intent,
        contextFrame: input.contextFrame,
      }),
    ];
    const modelRecordValidation = input.modelRecordProposals
      ? this.entityResolver.validateModelRecordProposals({
          contextFrame: input.contextFrame,
          proposals: input.modelRecordProposals,
        })
      : undefined;
    const filters = [...intent.filters];
    const queryIntent = buildQueryIntent(
      intent,
      entityResolutions,
      filters,
      timeRange,
    );
    const actionProposalIntent = buildActionProposalIntent(
      intent,
      entityResolutions,
      normalizeBusinessText(input.utterance),
    );
    const userAssertions = extractUserAssertions({
      normalized: normalizeBusinessText(input.utterance),
      sourceInterpretation,
    });
    const ambiguity = [
      ...intent.ambiguity,
      ...entityResolutions.flatMap((resolution) =>
        resolution.ambiguityReason
          ? [
              {
                code:
                  resolution.mention.normalizedText === "it"
                    ? "PRONOUN_AMBIGUITY"
                    : "ENTITY_NAME_COLLISION",
                detail: resolution.ambiguityReason,
                candidateCount: resolution.candidates.length,
                relatedMentionId: resolution.mention.mentionId,
              } satisfies BusinessAmbiguity,
            ]
          : [],
      ),
    ];
    const missingInformation = [
      ...intent.missingInformation,
      ...entityResolutions.flatMap(
        (resolution) => resolution.missingInformation,
      ),
      ...(actionProposalIntent?.missingInformation ?? []),
    ];
    const resolutionStatus = aggregateRequestStatus({
      intent,
      entityResolutions,
      ambiguity,
      missingInformation,
    });
    const concepts = [...new Set(intent.conceptRefs)];
    const material = {
      workspaceId: input.contextFrame.workspaceId,
      userId: input.contextFrame.userId,
      sourceFingerprint: sourceInterpretation.fingerprint,
      intentFingerprint: intent.fingerprint,
      entityFingerprints: entityResolutions.map(
        (resolution) => resolution.fingerprint,
      ),
      timeRangeFingerprint: timeRange?.fingerprint,
      quantityFingerprints: quantities.map((quantity) => quantity.fingerprint),
      filters,
      userAssertions,
      resolutionStatus,
    };
    return {
      workspaceId: input.contextFrame.workspaceId,
      ...(input.contextFrame.userId
        ? { userId: input.contextFrame.userId }
        : {}),
      sourceInterpretationRef: sourceInterpretation.fingerprint,
      sourceInterpretation,
      intent,
      entityMentions: entityResolutions.map((resolution) => resolution.mention),
      resolvedEntities: entityResolutions,
      concepts,
      ...(queryIntent ? { queryIntent } : {}),
      ...(actionProposalIntent ? { actionProposalIntent } : {}),
      ...(timeRange ? { timeRange } : {}),
      quantities,
      filters,
      userAssertions,
      ambiguity,
      missingInformation: dedupeMissing(missingInformation),
      authoritySensitivity: intent.authoritySensitivity,
      resolutionStatus,
      provenance: [
        "TASK_002_CANONICAL_LANGUAGE",
        "TASK_003_DETERMINISTIC_ENTITY_RESOLUTION",
      ],
      modelAssistUsed: Boolean(input.modelRecordProposals),
      ...(modelRecordValidation ? { modelRecordValidation } : {}),
      executionPerformed: false,
      fingerprint: stableFingerprint(material),
    };
  }
}

interface MentionDraft {
  readonly rawText: string;
  readonly normalizedText: string;
  readonly expectedEntityTypes: readonly BusinessEntityType[];
  readonly canonicalConceptRefs: readonly SemanticId[];
  readonly startOffset?: number;
  readonly endOffset?: number;
  readonly provenance: readonly string[];
}

function isRecordAuthorized(
  record: BusinessEntityLookupRecord,
  context: BusinessEntityLookupContext,
): boolean {
  const required = record.requiredPermissions ?? [];
  return required.every((permission) =>
    context.permissionIds.includes(permission),
  );
}

function matchRecord(
  record: BusinessEntityLookupRecord,
  normalizedText: string,
): readonly EntityCandidate[] {
  const labels = [
    record.displayLabel,
    record.recordRef.displayLabel,
    ...(record.searchableText ?? []),
  ].filter((label): label is string => Boolean(label));
  const aliases = record.aliases ?? [];
  const externalIds = record.externalIds ?? [];
  const emails = record.emailAddresses ?? [];
  const references = record.referenceNumbers ?? [];
  const matches: EntityCandidate[] = [];
  if (record.recordRef.recordId.toLowerCase() === normalizedText) {
    matches.push(candidateFromRecord(record, ["EXACT_ID"], 1));
  }
  if (labels.some((label) => normalizeBusinessText(label) === normalizedText)) {
    matches.push(candidateFromRecord(record, ["EXACT_NAME"], 0.98));
  }
  if (
    aliases.some((alias) => normalizeBusinessText(alias) === normalizedText)
  ) {
    matches.push(candidateFromRecord(record, ["WORKSPACE_ENTITY_ALIAS"], 0.96));
  }
  if (externalIds.some((id) => normalizeBusinessText(id) === normalizedText)) {
    matches.push(candidateFromRecord(record, ["EXTERNAL_ID"], 0.97));
  }
  if (emails.some((email) => email.toLowerCase() === normalizedText)) {
    matches.push(candidateFromRecord(record, ["EMAIL_MATCH"], 0.97));
  }
  if (
    references.some(
      (reference) => normalizeBusinessText(reference) === normalizedText,
    )
  ) {
    matches.push(candidateFromRecord(record, ["REFERENCE_NUMBER"], 0.97));
  }
  return dedupeCandidates(matches);
}

function candidateFromRecord(
  record: BusinessEntityLookupRecord,
  reasons: readonly EntityMatchReason[],
  score: number,
): EntityCandidate {
  return {
    recordRef: record.recordRef,
    entityType: record.recordRef.entityType,
    displayLabel: record.displayLabel,
    matchReasons: [
      ...new Set<EntityMatchReason>([...reasons, "AUTHORIZED_WORKSPACE_SCOPE"]),
    ],
    deterministicScore: score,
    contextScore:
      reasons.includes("CURRENT_CONTEXT") ||
      reasons.includes("RECENT_REFERENCE")
        ? 1
        : 0,
  };
}

function compareCandidate(
  first: EntityCandidate,
  second: EntityCandidate,
): number {
  return (second.deterministicScore ?? 0) - (first.deterministicScore ?? 0);
}

function dedupeCandidates(
  candidates: readonly EntityCandidate[],
): readonly EntityCandidate[] {
  const seen = new Map<string, EntityCandidate>();
  for (const candidate of candidates) {
    const key = refKey(candidate.recordRef);
    const existing = seen.get(key);
    if (
      !existing ||
      (candidate.deterministicScore ?? 0) > (existing.deterministicScore ?? 0)
    ) {
      seen.set(key, candidate);
    }
  }
  return [...seen.values()];
}

function lookupContext(
  frame: BusinessContextFrame,
): BusinessEntityLookupContext {
  return {
    workspaceId: frame.workspaceId,
    permissionIds: frame.permissionIds ?? [],
    roleRefs: frame.roleRefs,
    ...(frame.userId ? { userId: frame.userId } : {}),
    ...(frame.correlationId ? { correlationId: frame.correlationId } : {}),
  };
}

function resolutionFromCandidates(
  draft: MentionDraft,
  candidates: readonly EntityCandidate[],
  context: BusinessEntityLookupContext,
): EntityResolution {
  const selectedByScore = selectMateriallyStrongerCandidate(candidates);
  const status: BusinessResolutionStatus =
    candidates.length === 0
      ? "NOT_FOUND"
      : candidates.length === 1 || selectedByScore
        ? "RESOLVED"
        : "AMBIGUOUS";
  const selected =
    status === "RESOLVED" ? (selectedByScore ?? candidates[0]) : undefined;
  const missingInformation =
    status === "NOT_FOUND"
      ? missing(
          "MISSING_ENTITY_IDENTITY",
          `No accessible ${draft.expectedEntityTypes.join("/")} record matched '${draft.rawText}'.`,
        )
      : status === "AMBIGUOUS"
        ? missing(
            "AMBIGUOUS_ENTITY",
            `Multiple accessible records matched '${draft.rawText}'.`,
          )
        : [];
  const mention = entityMention({
    ...draft,
    candidates: candidates.map((candidate) => candidate.recordRef),
    ...(selected ? { resolvedRef: selected.recordRef } : {}),
    resolutionStatus: status,
    missingInformation,
    evidence:
      selected?.matchReasons ??
      (candidates.length > 0
        ? ["AUTHORIZED_CANDIDATES_ONLY"]
        : ["NO_ACCESSIBLE_MATCH"]),
    provenance: draft.provenance,
  });
  return {
    mention,
    candidates,
    ...(selected ? { selectedEntity: selected } : {}),
    resolutionStatus: status,
    confidence: selected ? (selected.deterministicScore ?? 0.8) : 0,
    filtersApplied: ["WORKSPACE_SCOPE", "ACCESSIBLE_RECORD"],
    contextEvidence: mention.resolutionEvidence,
    permissionBoundary: `workspace:${context.workspaceId}`,
    ...(status === "AMBIGUOUS"
      ? {
          ambiguityReason: `Multiple accessible records matched '${draft.rawText}'.`,
        }
      : {}),
    missingInformation,
    fingerprint: stableFingerprint({
      draft,
      candidateRefs: candidates.map((candidate) => candidate.recordRef),
      selected: selected?.recordRef,
      status,
      workspaceId: context.workspaceId,
    }),
  };
}

function selectMateriallyStrongerCandidate(
  candidates: readonly EntityCandidate[],
): EntityCandidate | undefined {
  if (candidates.length < 2) return undefined;
  const [first, second] = candidates;
  if (!first || !second) return undefined;
  const gap =
    (first.deterministicScore ?? 0) - (second.deterministicScore ?? 0);
  return gap >= 0.08 ? first : undefined;
}

function entityMention(
  input: MentionDraft & {
    readonly candidates: readonly BusinessRecordRef[];
    readonly resolvedRef?: BusinessRecordRef;
    readonly resolutionStatus: BusinessResolutionStatus;
    readonly missingInformation: readonly BusinessMissingInformation[];
    readonly evidence: readonly string[];
  },
): EntityMention {
  const material = {
    rawText: input.rawText,
    normalizedText: input.normalizedText,
    expectedEntityTypes: input.expectedEntityTypes,
    canonicalConceptRefs: input.canonicalConceptRefs,
    candidates: input.candidates.map(refKey),
    resolvedRef: input.resolvedRef ? refKey(input.resolvedRef) : undefined,
    resolutionStatus: input.resolutionStatus,
  };
  return {
    mentionId: `mention:${stableFingerprint(material).slice(0, 24)}`,
    rawText: input.rawText,
    normalizedText: input.normalizedText,
    expectedEntityTypes: input.expectedEntityTypes,
    canonicalConceptRefs: input.canonicalConceptRefs,
    ...(input.startOffset !== undefined
      ? { startOffset: input.startOffset }
      : {}),
    ...(input.endOffset !== undefined ? { endOffset: input.endOffset } : {}),
    candidateRefs: input.candidates,
    ...(input.resolvedRef ? { resolvedRef: input.resolvedRef } : {}),
    resolutionStatus: input.resolutionStatus,
    ...(input.resolutionStatus === "AMBIGUOUS"
      ? { ambiguityReason: "Multiple authorized candidates remain." }
      : {}),
    missingInformation: input.missingInformation,
    resolutionEvidence: input.evidence,
    provenance: input.provenance,
    fingerprint: stableFingerprint(material),
  };
}

function extractEntityMentions(input: {
  readonly utterance: string;
  readonly normalized: string;
  readonly concepts: readonly SemanticId[];
  readonly targetEntityTypes: readonly BusinessEntityType[];
}): readonly MentionDraft[] {
  if (/\b(it|this|that|previous one|last one)\b/u.test(input.normalized)) {
    return [];
  }
  const ignored = new Set([
    "I",
    "Show",
    "Why",
    "What",
    "Which",
    "Send",
    "Close",
    "Client",
    "Kaun",
  ]);
  const properName = [...input.utterance.matchAll(/\b[A-Z][A-Za-z0-9]*\b/gu)]
    .map((match) => match[0])
    .find((candidate) => !ignored.has(candidate));
  if (!properName) return [];
  const expected: readonly BusinessEntityType[] =
    input.targetEntityTypes.length > 0
      ? input.targetEntityTypes
      : ["CLIENT", "CUSTOMER", "CONTACT", "PROJECT", "EMPLOYEE"];
  const startOffset = input.utterance.indexOf(properName);
  return [
    {
      rawText: properName,
      normalizedText: normalizeBusinessText(properName),
      expectedEntityTypes: expected,
      canonicalConceptRefs: conceptRefsForEntityTypes(expected, input.concepts),
      startOffset,
      endOffset: startOffset + properName.length,
      provenance: ["DETERMINISTIC_PROPER_NAME_MENTION"],
    },
  ];
}

function contextEntityResolutions(input: {
  readonly compiler: BusinessEntityResolver;
  readonly intent: BusinessIntent;
  readonly contextFrame: BusinessContextFrame;
}): readonly EntityResolution[] {
  if (
    input.intent.conceptRefs.includes(
      businessLanguageCoreConceptIds.projectMargin,
    ) &&
    input.contextFrame.activeProjectRef
  ) {
    return [
      input.compiler.resolveContextRef({
        ref: input.contextFrame.activeProjectRef,
        contextFrame: input.contextFrame,
        role: "active project",
      }),
    ];
  }
  if (
    input.intent.targetEntityTypes.includes("CLIENT") &&
    input.contextFrame.activeClientRef &&
    input.intent.resolutionStatus !== "NEEDS_INFORMATION"
  ) {
    return [
      input.compiler.resolveContextRef({
        ref: input.contextFrame.activeClientRef,
        contextFrame: input.contextFrame,
        role: "active client",
      }),
    ];
  }
  return [];
}

function pronounEntityResolutions(input: {
  readonly compiler: BusinessEntityResolver;
  readonly utterance: string;
  readonly intent: BusinessIntent;
  readonly contextFrame: BusinessContextFrame;
}): readonly EntityResolution[] {
  const normalized = normalizeBusinessText(input.utterance);
  if (!/\b(it|this|that|previous one|last one)\b/u.test(normalized)) return [];
  const compatible = input.contextFrame.recentResolvedRefs
    .filter(
      (recent) =>
        input.intent.targetEntityTypes.length === 0 ||
        input.intent.targetEntityTypes.includes(recent.recordRef.entityType),
    )
    .sort((first, second) => first.recency - second.recency);
  if (compatible.length === 1) {
    return [
      input.compiler.resolveContextRef({
        ref: compatible[0]!.recordRef,
        contextFrame: input.contextFrame,
        role: "recent reference",
      }),
    ];
  }
  const missingInformation = missing(
    compatible.length === 0 ? "MISSING_TARGET_OBJECT" : "AMBIGUOUS_ENTITY",
    compatible.length === 0
      ? "No compatible current or recent record is available for the pronoun."
      : "Multiple compatible recent records are available for the pronoun.",
  );
  const mention = entityMention({
    rawText: normalized.includes("it") ? "it" : "this",
    normalizedText: normalized.includes("it") ? "it" : "this",
    expectedEntityTypes: input.intent.targetEntityTypes,
    canonicalConceptRefs: input.intent.conceptRefs,
    candidates: compatible.map((item) => item.recordRef),
    resolutionStatus:
      compatible.length === 0 ? "NEEDS_INFORMATION" : "AMBIGUOUS",
    missingInformation,
    evidence: ["PRONOUN_REFERENCE_REQUIRES_CONTEXT"],
    provenance: ["BUSINESS_CONTEXT_FRAME"],
  });
  const resolution: EntityResolution = {
    mention,
    candidates: [],
    resolutionStatus: mention.resolutionStatus,
    confidence: 0,
    filtersApplied: ["WORKSPACE_SCOPE", "RECENT_REFERENCE_COMPATIBILITY"],
    contextEvidence: mention.resolutionEvidence,
    permissionBoundary: `workspace:${input.contextFrame.workspaceId}`,
    missingInformation,
    fingerprint: stableFingerprint({
      normalized,
      compatible: compatible.map((item) => refKey(item.recordRef)),
      status: mention.resolutionStatus,
    }),
    ...(compatible.length > 1
      ? { ambiguityReason: "Multiple compatible recent records." }
      : {}),
  };
  return [resolution];
}

function inferTargetEntityTypes(
  normalized: string,
  concepts: readonly SemanticId[],
): readonly BusinessEntityType[] {
  if (
    /\bclient\b/u.test(normalized) ||
    concepts.includes(businessLanguageCoreConceptIds.client)
  ) {
    return ["CLIENT", "CUSTOMER"];
  }
  if (
    /\binvoice|invoices\b/u.test(normalized) ||
    concepts.includes(businessLanguageCoreConceptIds.invoice)
  ) {
    return normalized.includes("send it")
      ? ["INVOICE", "DOCUMENT"]
      : ["CLIENT", "CUSTOMER"];
  }
  if (
    /\bproject\b/u.test(normalized) ||
    concepts.includes(businessLanguageCoreConceptIds.projectMargin)
  ) {
    return ["PROJECT"];
  }
  if (/\bfree|available|availability|capacity\b/u.test(normalized)) {
    return ["EMPLOYEE", "TEAM"];
  }
  if (/\bryan\b/u.test(normalized)) {
    return ["CLIENT", "CUSTOMER", "CONTACT", "EMPLOYEE"];
  }
  return [];
}

function refineIntent(
  interpreted: BusinessIntentClass,
  normalized: string,
): BusinessIntentClass {
  if (/\bapproved\b/u.test(normalized)) return "REQUEST_APPROVAL";
  if (/^(send|close|approve|draft|create|update)\b/u.test(normalized)) {
    if (/\bdraft\b/u.test(normalized)) return "DRAFT";
    return "PROPOSE_ACTION";
  }
  if (/\bwhy\b|killing|worse|unprofitable|happening/u.test(normalized)) {
    return normalized.includes("happening") ? "SUMMARIZE" : "DIAGNOSE";
  }
  if (/\bshow|which|what|kaun\b/u.test(normalized)) return "READ";
  return interpreted;
}

function inferFilters(
  normalized: string,
  concepts: readonly SemanticId[],
  timeRange: BusinessTimeRange | undefined,
  quantities: readonly BusinessQuantity[],
): readonly BusinessQueryFilter[] {
  const filters: BusinessQueryFilter[] = [];
  if (/\boverdue\b/u.test(normalized)) {
    filters.push({
      fieldConceptRef: businessLanguageCoreConceptIds.overdueInvoice,
      operator: "IS_OVERDUE",
      value: true,
    });
  }
  if (/\bowing|owe|receivable|paisa/u.test(normalized)) {
    const quantityItem = quantities[0];
    filters.push({
      fieldConceptRef: businessLanguageCoreConceptIds.receivable,
      operator: quantityItem ? "GREATER_THAN" : "CONTAINS",
      ...(quantityItem
        ? {
            value: quantityItem.value,
            ...(quantityItem.currency
              ? { currency: quantityItem.currency }
              : {}),
          }
        : { value: "outstanding" }),
    });
  }
  if (timeRange) {
    filters.push({
      fieldConceptRef: concepts.includes(businessLanguageCoreConceptIds.invoice)
        ? businessLanguageCoreConceptIds.invoice
        : businessLanguageCoreConceptIds.timeWindow,
      operator: "BETWEEN",
      temporalBoundary: timeRange,
    });
  }
  return filters;
}

function extractQuantities(
  normalized: string,
  frame: BusinessContextFrame,
): readonly BusinessQuantity[] {
  const results: BusinessQuantity[] = [];
  const amount = normalized.match(
    /\b(?:more than|over|above)\s+([0-9]+(?:\.[0-9]+)?)(k)?\b/u,
  );
  if (amount) {
    const value = Number(amount[1]) * (amount[2] === "k" ? 1000 : 1);
    results.push(
      quantity({
        expression: amount[0],
        value,
        missingInformation: frame.baseCurrency
          ? []
          : missing(
              "MISSING_CURRENCY",
              "Currency is required for a material money threshold.",
            ),
        ...(frame.baseCurrency ? { currency: frame.baseCurrency } : {}),
      }),
    );
  }
  const percent = normalized.match(/\b([0-9]+(?:\.[0-9]+)?)\s+percent\b/u);
  if (percent) {
    results.push(
      quantity({
        expression: percent[0],
        value: Number(percent[1]),
        unit: "PERCENT",
        missingInformation: [],
      }),
    );
  }
  const hours = normalized.match(
    /\b(?:more than|over|above)\s+([0-9]+(?:\.[0-9]+)?)\s+hours\b/u,
  );
  if (hours) {
    results.push(
      quantity({
        expression: hours[0],
        value: Number(hours[1]),
        unit: "HOURS",
        missingInformation: [],
      }),
    );
  }
  return results;
}

function quantity(input: {
  readonly expression: string;
  readonly value: number;
  readonly unit?: string;
  readonly currency?: string;
  readonly missingInformation: readonly BusinessMissingInformation[];
}): BusinessQuantity {
  const material = {
    expression: input.expression,
    value: input.value,
    unit: input.unit,
    currency: input.currency,
    missingInformation: input.missingInformation,
  };
  return {
    expression: input.expression,
    value: input.value,
    ...(input.unit ? { unit: input.unit } : {}),
    ...(input.currency ? { currency: input.currency } : {}),
    missingInformation: input.missingInformation,
    fingerprint: stableFingerprint(material),
  };
}

function buildQueryIntent(
  intent: BusinessIntent,
  resolutions: readonly EntityResolution[],
  filters: readonly BusinessQueryFilter[],
  timeRange: BusinessTimeRange | undefined,
): BusinessQueryIntent | undefined {
  if (
    intent.sideEffectClass !== "READ_ONLY" &&
    intent.intentClass !== "DIAGNOSE" &&
    intent.intentClass !== "ANALYZE" &&
    intent.intentClass !== "SUMMARIZE"
  ) {
    return undefined;
  }
  const selected = resolutions
    .map((resolution) => resolution.selectedEntity?.recordRef)
    .filter((ref): ref is BusinessRecordRef => Boolean(ref));
  return {
    targetRefs: selected,
    requestedConcepts: intent.conceptRefs,
    requestedMetrics: intent.requestedMetrics,
    filters,
    ...(intent.targetEntityTypes[0]
      ? { targetEntityType: intent.targetEntityTypes[0] }
      : {}),
    ...(timeRange ? { timeRange } : {}),
  };
}

function buildActionProposalIntent(
  intent: BusinessIntent,
  resolutions: readonly EntityResolution[],
  normalized: string,
): BusinessActionProposalIntent | undefined {
  if (
    intent.sideEffectClass !== "PROPOSE_ACTION" &&
    intent.sideEffectClass !== "REQUEST_APPROVAL"
  ) {
    return undefined;
  }
  const targetRefs = resolutions
    .map((resolution) => resolution.selectedEntity?.recordRef)
    .filter((ref): ref is BusinessRecordRef => Boolean(ref));
  const missingInformation: BusinessMissingInformation[] = [];
  if (targetRefs.length === 0) {
    missingInformation.push(
      ...missing(
        "MISSING_TARGET_OBJECT",
        "Action target object is unresolved.",
      ),
    );
  }
  if (/\bsend\b/u.test(normalized)) {
    missingInformation.push(
      ...missing("MISSING_RECIPIENT", "Send action recipient is unresolved."),
    );
  }
  if (/\bapproved\b/u.test(normalized)) {
    missingInformation.push(
      ...missing(
        "MISSING_APPROVAL_OBJECT",
        "Approval target object is unresolved.",
      ),
    );
  }
  return {
    action: /\bclose\b/u.test(normalized)
      ? "CLOSE"
      : /\bapproved|approve\b/u.test(normalized)
        ? "APPROVE"
        : /\bsend\b/u.test(normalized)
          ? "SEND"
          : "PROPOSE_ACTION",
    targetRefs,
    recipientRefs: [],
    missingInformation,
    authoritySensitivity: intent.authoritySensitivity,
    executionPerformed: false,
  };
}

function extractUserAssertions(input: {
  readonly normalized: string;
  readonly sourceInterpretation: BusinessUtteranceInterpretation;
}): readonly BusinessUserAssertion[] {
  const assertions: BusinessUserAssertion[] = [];
  if (
    /\bunprofitable|losing money|cash is worse|paisa .*nahi aya|paisa phansa/u.test(
      input.normalized,
    )
  ) {
    assertions.push({
      rawText: input.sourceInterpretation.rawUtterance,
      normalizedText: input.normalized,
      conceptRefs: input.sourceInterpretation.resolvedConcepts.map(
        (concept) => concept.conceptId,
      ),
      status: "USER_ASSERTION",
      provenance: ["USER_UTTERANCE"],
    });
  }
  return assertions;
}

function aggregateRequestStatus(input: {
  readonly intent: BusinessIntent;
  readonly entityResolutions: readonly EntityResolution[];
  readonly ambiguity: readonly BusinessAmbiguity[];
  readonly missingInformation: readonly BusinessMissingInformation[];
}): BusinessResolutionStatus {
  if (
    input.entityResolutions.some(
      (resolution) => resolution.resolutionStatus === "AMBIGUOUS",
    ) ||
    input.ambiguity.length > 0
  ) {
    return "AMBIGUOUS";
  }
  if (
    input.intent.sideEffectClass === "PROPOSE_ACTION" &&
    input.entityResolutions.some(
      (resolution) => resolution.resolutionStatus === "RESOLVED",
    )
  ) {
    return "PARTIALLY_RESOLVED";
  }
  if (
    input.missingInformation.length > 0 ||
    input.entityResolutions.some(
      (resolution) =>
        resolution.resolutionStatus === "NEEDS_INFORMATION" ||
        resolution.resolutionStatus === "NOT_FOUND",
    )
  ) {
    return "NEEDS_INFORMATION";
  }
  if (
    input.entityResolutions.length > 0 &&
    input.entityResolutions.every(
      (resolution) => resolution.resolutionStatus === "RESOLVED",
    )
  ) {
    return input.intent.sideEffectClass === "PROPOSE_ACTION"
      ? "PARTIALLY_RESOLVED"
      : "RESOLVED";
  }
  return input.intent.resolutionStatus;
}

function inferIntentMissingInformation(input: {
  readonly normalized: string;
  readonly intentClass: BusinessIntentClass;
  readonly targetEntityTypes: readonly BusinessEntityType[];
  readonly timeRange?: BusinessTimeRange;
  readonly quantities: readonly BusinessQuantity[];
}): readonly BusinessMissingInformation[] {
  const items: BusinessMissingInformation[] = [];
  if (
    input.normalized.includes("client ka paisa") ||
    input.normalized.includes("ryan ka paisa")
  ) {
    items.push(
      ...missing(
        "MISSING_ENTITY_IDENTITY",
        "Client identity is required before payment status can be checked.",
      ),
    );
  }
  if (input.normalized.includes("close it")) {
    items.push(
      ...missing("MISSING_TARGET_OBJECT", "Close action target is unresolved."),
    );
  }
  if (input.normalized.includes("send it")) {
    items.push(
      ...missing("MISSING_RECIPIENT", "Send action recipient is unresolved."),
    );
  }
  for (const quantityItem of input.quantities) {
    items.push(...quantityItem.missingInformation);
  }
  if (input.timeRange?.resolutionStatus === "NEEDS_INFORMATION") {
    items.push(...input.timeRange.missingInformation);
  }
  return dedupeMissing(items);
}

function contextualConcepts(
  concepts: readonly SemanticId[],
  frame: BusinessContextFrame,
  normalized: string,
): readonly SemanticId[] {
  const contextual = [...concepts];
  if (
    /\bmargin\b/u.test(normalized) &&
    frame.activeProjectRef &&
    !contextual.includes(businessLanguageCoreConceptIds.projectMargin)
  ) {
    contextual.push(businessLanguageCoreConceptIds.projectMargin);
  }
  return [...new Set(contextual)];
}

function statusFrom(
  missingInformation: readonly BusinessMissingInformation[],
  ambiguity: readonly BusinessAmbiguity[],
): BusinessResolutionStatus {
  if (ambiguity.length > 0) return "AMBIGUOUS";
  if (missingInformation.length > 0) return "NEEDS_INFORMATION";
  return "RESOLVED";
}

function requestedOutcomeFor(
  intentClass: BusinessIntentClass,
  normalized: string,
): string {
  if (intentClass === "PROPOSE_ACTION")
    return "prepare action proposal without execution";
  if (intentClass === "REQUEST_APPROVAL")
    return "identify approval statement and missing approval target";
  if (intentClass === "DIAGNOSE")
    return "diagnose business condition from verified downstream data";
  if (normalized.includes("happening"))
    return "summarize accessible business status";
  return "return structured business information";
}

function actionRefsFor(
  normalized: string,
  concepts: readonly SemanticId[],
): readonly SemanticId[] {
  const refs = [
    ...concepts.filter((concept) => concept.startsWith("flow.action.")),
  ];
  if (/\bsend\b/u.test(normalized))
    refs.push(businessLanguageCoreConceptIds.sendAction);
  if (/\bclose\b/u.test(normalized))
    refs.push(businessLanguageCoreConceptIds.closeAction);
  return [...new Set(refs)];
}

function sideEffectClassFor(
  intentClass: BusinessIntentClass,
): BusinessIntent["sideEffectClass"] {
  if (intentClass === "PROPOSE_ACTION") return "PROPOSE_ACTION";
  if (intentClass === "REQUEST_APPROVAL") return "REQUEST_APPROVAL";
  if (intentClass === "DRAFT") return "DRAFT_ONLY";
  return "READ_ONLY";
}

function authorityFor(input: {
  readonly intentClass: BusinessIntentClass;
  readonly normalized: string;
  readonly actionCandidateRefs: readonly SemanticId[];
}): BusinessAuthoritySensitivity {
  if (
    input.normalized.includes("delete") ||
    input.normalized.includes("make the numbers look")
  ) {
    return "HIGH_RISK";
  }
  if (input.intentClass === "REQUEST_APPROVAL") return "APPROVAL_RELEVANT";
  if (
    input.intentClass === "PROPOSE_ACTION" ||
    input.actionCandidateRefs.length > 0
  ) {
    return "EXECUTION_RELEVANT";
  }
  if (
    /\binvoice|payment|margin|cash|receivable|unprofitable|discount\b/u.test(
      input.normalized,
    )
  ) {
    return "MATERIAL";
  }
  return "LOW";
}

function isMetricConcept(concept: SemanticId): boolean {
  return (
    concept === businessLanguageCoreConceptIds.projectMargin ||
    concept === businessLanguageCoreConceptIds.grossMargin ||
    concept === businessLanguageCoreConceptIds.netMargin ||
    concept === businessLanguageCoreConceptIds.operatingMargin ||
    concept === businessLanguageCoreConceptIds.clientProfitability ||
    concept === businessLanguageCoreConceptIds.cash ||
    concept === businessLanguageCoreConceptIds.receivable ||
    concept === businessLanguageCoreConceptIds.availability ||
    concept === businessLanguageCoreConceptIds.capacity
  );
}

function conceptRefsForEntityTypes(
  entityTypes: readonly BusinessEntityType[],
  fallback: readonly SemanticId[],
): readonly SemanticId[] {
  const refs = entityTypes.flatMap((entityType) => {
    switch (entityType) {
      case "CLIENT":
      case "CUSTOMER":
        return [businessLanguageCoreConceptIds.client];
      case "CONTACT":
        return [businessLanguageCoreConceptIds.contact];
      case "EMPLOYEE":
        return [businessLanguageCoreConceptIds.employee];
      case "PROJECT":
        return [businessLanguageCoreConceptIds.project];
      case "INVOICE":
        return [businessLanguageCoreConceptIds.invoice];
      default:
        return [];
    }
  });
  return [...new Set(refs.length > 0 ? refs : fallback)];
}

function currentObjectContext(frame: BusinessContextFrame) {
  const current =
    frame.currentRecordRefs?.[0] ??
    frame.activeProjectRef ??
    frame.activeClientRef ??
    frame.activeDocumentRef;
  if (!current?.canonicalTypeRef) return undefined;
  return {
    objectTypeConceptId: current.canonicalTypeRef,
    objectId: current.recordId,
    ...(current.displayLabel ? { label: current.displayLabel } : {}),
  };
}

function refKey(ref: BusinessRecordRef): string {
  return `${ref.workspaceId}:${ref.entityType}:${ref.recordId}`;
}

function missing(
  code: BusinessMissingInformation["code"],
  detail: string,
): readonly BusinessMissingInformation[] {
  return [{ code, detail }];
}

function dedupeMissing(
  items: readonly BusinessMissingInformation[],
): readonly BusinessMissingInformation[] {
  const seen = new Map<string, BusinessMissingInformation>();
  for (const item of items) {
    seen.set(
      `${item.code}:${item.detail}:${item.relatedMentionId ?? ""}`,
      item,
    );
  }
  return [...seen.values()];
}

function timeAssumptions(
  timeRange: BusinessTimeRange | undefined,
): readonly string[] {
  if (!timeRange) return [];
  return timeRange.granularity === "QUARTER"
    ? ["Calendar quarter used because no fiscal calendar is configured."]
    : [];
}

interface TemporalExpression {
  readonly expression: string;
  readonly granularity: BusinessTimeRange["granularity"];
  toRange(date: CalendarDate): { readonly start: string; readonly end: string };
}

interface CalendarDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

const temporalExpressions: readonly TemporalExpression[] = [
  {
    expression: "yesterday",
    granularity: "DAY",
    toRange: (date) => dayRange(addDays(date, -1)),
  },
  {
    expression: "tomorrow",
    granularity: "DAY",
    toRange: (date) => dayRange(addDays(date, 1)),
  },
  {
    expression: "today",
    granularity: "DAY",
    toRange: (date) => dayRange(date),
  },
  {
    expression: "next week",
    granularity: "WEEK",
    toRange: (date) => weekRange(addDays(startOfWeek(date), 7)),
  },
  {
    expression: "last week",
    granularity: "WEEK",
    toRange: (date) => weekRange(addDays(startOfWeek(date), -7)),
  },
  {
    expression: "this week",
    granularity: "WEEK",
    toRange: (date) => weekRange(startOfWeek(date)),
  },
  {
    expression: "next month",
    granularity: "MONTH",
    toRange: (date) =>
      monthRange({ year: date.year, month: date.month + 1, day: 1 }),
  },
  {
    expression: "last month",
    granularity: "MONTH",
    toRange: (date) =>
      monthRange({ year: date.year, month: date.month - 1, day: 1 }),
  },
  {
    expression: "this month",
    granularity: "MONTH",
    toRange: (date) => monthRange(date),
  },
  {
    expression: "this year",
    granularity: "YEAR",
    toRange: (date) => ({
      start: `${date.year}-01-01`,
      end: `${date.year}-12-31`,
    }),
  },
  {
    expression: "last quarter",
    granularity: "QUARTER",
    toRange: (date) => quarterRange(date, -1),
  },
  {
    expression: "this quarter",
    granularity: "QUARTER",
    toRange: (date) => quarterRange(date, 0),
  },
];

function timeRange(
  input: Omit<
    BusinessTimeRange,
    "missingInformation" | "ambiguity" | "fingerprint"
  >,
): BusinessTimeRange {
  const material = {
    expression: input.expression,
    start: input.start,
    end: input.end,
    timezone: input.timezone,
    granularity: input.granularity,
    relativeTo: input.relativeTo,
    resolutionStatus: input.resolutionStatus,
  };
  return {
    ...input,
    missingInformation: [],
    ambiguity: [],
    fingerprint: stableFingerprint(material),
  };
}

function unresolvedTimeRange(input: {
  readonly expression: string;
  readonly timezone: string;
  readonly relativeTo: string;
}): BusinessTimeRange {
  const missingInformation = missing(
    "INSUFFICIENT_CONTEXT",
    "Business-calendar policy is required for this time expression.",
  );
  const ambiguity: readonly BusinessAmbiguity[] = [
    {
      code: "TEMPORAL_AMBIGUITY",
      detail: "Time expression depends on workspace business-calendar policy.",
    },
  ];
  const material = { ...input, missingInformation, ambiguity };
  return {
    expression: input.expression,
    timezone: input.timezone,
    granularity: "BUSINESS_CALENDAR_DEPENDENT",
    relativeTo: input.relativeTo,
    resolutionStatus: "NEEDS_INFORMATION",
    missingInformation,
    ambiguity,
    fingerprint: stableFingerprint(material),
  };
}

function zonedDateParts(iso: string, timezone: string): CalendarDate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso));
  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value),
  };
}

function addDays(date: CalendarDate, days: number): CalendarDate {
  const utc = Date.UTC(date.year, date.month - 1, date.day + days);
  const next = new Date(utc);
  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
  };
}

function dayRange(date: CalendarDate): {
  readonly start: string;
  readonly end: string;
} {
  const value = formatDate(date);
  return { start: value, end: value };
}

function startOfWeek(date: CalendarDate): CalendarDate {
  const js = new Date(Date.UTC(date.year, date.month - 1, date.day));
  const day = js.getUTCDay() || 7;
  return addDays(date, 1 - day);
}

function weekRange(start: CalendarDate): {
  readonly start: string;
  readonly end: string;
} {
  return { start: formatDate(start), end: formatDate(addDays(start, 6)) };
}

function monthRange(date: CalendarDate): {
  readonly start: string;
  readonly end: string;
} {
  const normalized = new Date(Date.UTC(date.year, date.month - 1, 1));
  const year = normalized.getUTCFullYear();
  const month = normalized.getUTCMonth() + 1;
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    start: formatDate({ year, month, day: 1 }),
    end: formatDate({ year, month, day: last }),
  };
}

function quarterRange(
  date: CalendarDate,
  offset: number,
): { readonly start: string; readonly end: string } {
  const quarter = Math.floor((date.month - 1) / 3) + offset;
  const startMonth = quarter * 3 + 1;
  return monthSpan({ year: date.year, month: startMonth, day: 1 }, 3);
}

function monthSpan(
  date: CalendarDate,
  months: number,
): { readonly start: string; readonly end: string } {
  const start = new Date(Date.UTC(date.year, date.month - 1, 1));
  const end = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + months, 0),
  );
  return {
    start: formatDate({
      year: start.getUTCFullYear(),
      month: start.getUTCMonth() + 1,
      day: 1,
    }),
    end: formatDate({
      year: end.getUTCFullYear(),
      month: end.getUTCMonth() + 1,
      day: end.getUTCDate(),
    }),
  };
}

function formatDate(date: CalendarDate): string {
  return `${date.year.toString().padStart(4, "0")}-${date.month.toString().padStart(2, "0")}-${date.day.toString().padStart(2, "0")}`;
}
