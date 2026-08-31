import {
  blmExpertisePacksV1,
  blmIndustryEdgesV1,
  blmIndustryFamilyMappingsV1,
  blmIndustryNodesV1,
  blmNicheDefinitionsV1,
  blmReferenceArchitectureEdgesV1,
  blmReferenceArchitectureNodesV1,
  blmTaxonomyProvenanceV1,
  blmUniversalCapabilitiesV1,
  type BLMExpertisePack,
  type BusinessClassificationCandidate,
  type BusinessClassificationEvidence,
  type BusinessClassificationResult,
  type BusinessTaxonomyContext,
  type BusinessTaxonomyDimension,
  type IndustryNode,
  type IndustryRelease,
  type ReferenceBusinessArchitectureGraph,
  type SourceCorpusReference,
  type UniversalCapabilityRegistry,
} from "@flow/blm-contracts";
import type { SemanticId } from "@flow/blm-contracts";
import { stableFingerprint } from "./knowledge-acquisition.js";

export interface BusinessClassificationInput {
  readonly businessDescription?: string;
  readonly authorizedDocuments?: readonly string[];
  readonly workspaceFacts?: readonly string[];
  readonly existingSystems?: readonly string[];
  readonly userAnswers?: readonly string[];
}

export interface BusinessTaxonomyContextBudget {
  readonly maxIndustries: number;
  readonly maxCapabilities: number;
  readonly maxExpertisePacks: number;
  readonly maxRoles: number;
}

const defaultBudget: BusinessTaxonomyContextBudget = {
  maxIndustries: 2,
  maxCapabilities: 6,
  maxExpertisePacks: 2,
  maxRoles: 4,
};

const sourceReferences: readonly SourceCorpusReference[] = [
  {
    sourceKey: "BLM-TAXONOMY-V1",
    repositoryPath:
      "knowledge/blm/sources/global-core/Flow_BLM_Global_Business_Taxonomy_Context_Architecture_v1.docx",
    version: "v1",
    knowledgeGroup: "GLOBAL_CORE",
  },
  {
    sourceKey: "BLM-CORE-ARCHITECTURE-V1",
    repositoryPath:
      "knowledge/blm/sources/global-core/Flow_BLM_Factual_Business_Architecture_Library_v1.docx",
    version: "v1",
    knowledgeGroup: "GLOBAL_CORE",
  },
  {
    sourceKey: "BLM-MODULE-ARCH-V1",
    repositoryPath:
      "knowledge/blm/sources/global-core/Flow_BLM_Business_Operating_System_Module_Building_Block_Architecture_v1.pdf",
    version: "v1",
    knowledgeGroup: "GLOBAL_CORE",
  },
  {
    sourceKey: "BLM-KG-REGISTRY-V2",
    repositoryPath:
      "knowledge/blm/sources/global-core/Flow_BLM_Business_Operating_System_Knowledge_Graph_Registry_v2.json",
    version: "v2",
    knowledgeGroup: "GLOBAL_CORE",
  },
  {
    sourceKey: "BLM-EXPERTISE-V5",
    repositoryPath:
      "knowledge/blm/sources/global-core/Flow_BLM_Industry_Niche_Expertise_Psychology_Strategy_Library_v5.docx",
    version: "v5",
    knowledgeGroup: "GLOBAL_CORE",
  },
];

export function createGlobalIndustryReleaseV1(): IndustryRelease {
  const withoutFingerprint = {
    releaseId: "blm-global-business-taxonomy-1.0.0",
    version: "1.0.0",
    status: "ACTIVE" as const,
    sourceCorpusRelease: "knowledge/blm/manifests/releases.manifest.json#1.0.0",
    sourceReferences,
    industryNodes: blmIndustryNodesV1,
    industryEdges: blmIndustryEdgesV1,
    familyMappings: blmIndustryFamilyMappingsV1,
    niches: blmNicheDefinitionsV1,
    provenance: blmTaxonomyProvenanceV1,
  };
  return {
    ...withoutFingerprint,
    fingerprint: stableFingerprint(withoutFingerprint),
  };
}

export function createReferenceBusinessArchitectureGraphV1(): ReferenceBusinessArchitectureGraph {
  const withoutFingerprint = {
    graphType: "REFERENCE_BUSINESS_ARCHITECTURE" as const,
    graphId: "blm-reference-business-architecture-1.0.0",
    version: "1.0.0",
    nodes: blmReferenceArchitectureNodesV1,
    edges: blmReferenceArchitectureEdgesV1,
    provenance: blmTaxonomyProvenanceV1,
  };
  return {
    ...withoutFingerprint,
    fingerprint: stableFingerprint(withoutFingerprint),
  };
}

export function createUniversalCapabilityRegistryV1(): UniversalCapabilityRegistry {
  const withoutFingerprint = {
    registryId: "blm-universal-capabilities-1.0.0",
    version: "1.0.0",
    capabilities: blmUniversalCapabilitiesV1,
    provenance: blmTaxonomyProvenanceV1,
  };
  return {
    ...withoutFingerprint,
    fingerprint: stableFingerprint(withoutFingerprint),
  };
}

export function createBLMExpertisePacksV1(): readonly BLMExpertisePack[] {
  return blmExpertisePacksV1.map((pack) => {
    const withoutFingerprint = { ...pack, fingerprint: "" };
    return {
      ...pack,
      fingerprint: stableFingerprint(withoutFingerprint),
    };
  });
}

export class BusinessClassificationEngine {
  constructor(
    private readonly taxonomy: IndustryRelease = createGlobalIndustryReleaseV1(),
    private readonly expertisePacks: readonly BLMExpertisePack[] = createBLMExpertisePacksV1(),
  ) {}

  classify(input: BusinessClassificationInput): BusinessClassificationResult {
    const evidence = collectEvidence(input);
    const scored = this.taxonomy.industryNodes
      .map((industry) => this.scoreIndustry(industry, evidence))
      .filter((candidate) => candidate.score > 0)
      .sort((a, b) => b.score - a.score);

    if (scored.length === 0) {
      return {
        status: "INSUFFICIENT_INFORMATION",
        candidates: [],
        evidence,
        missingInformation: ["industry", "customerModel", "revenueModel"],
        discoveryQuestions: [
          "What does the business sell, and to whom?",
          "How does the business earn revenue?",
        ],
        workspaceFactsAcceptedAsTruth: false,
        genericPriorAcceptedAsWorkspaceFact: false,
      };
    }

    const top = scored[0]!;
    const second = scored[1];
    const ambiguous = Boolean(second && top.score - second.score <= 1);
    const confidence = Math.min(0.95, 0.35 + top.score * 0.12);
    const candidate = this.toCandidate(top.industry, confidence, evidence);
    const candidates = ambiguous
      ? [
          candidate,
          this.toCandidate(
            second!.industry,
            Math.max(0.35, confidence - 0.12),
            evidence,
          ),
        ]
      : [candidate];

    const missingInformation = uniqueDimensions(
      candidates.flatMap((item) => item.missingInformation),
    );

    return {
      status:
        confidence < 0.5
          ? "INSUFFICIENT_INFORMATION"
          : ambiguous
            ? "AMBIGUOUS"
            : "CLASSIFIED",
      candidates,
      evidence,
      missingInformation,
      discoveryQuestions: discoveryQuestionsFor(missingInformation),
      workspaceFactsAcceptedAsTruth: false,
      genericPriorAcceptedAsWorkspaceFact: false,
    };
  }

  compileContext(input: {
    readonly classification: BusinessClassificationResult;
    readonly budget?: Partial<BusinessTaxonomyContextBudget>;
  }): BusinessTaxonomyContext {
    const budget = { ...defaultBudget, ...input.budget };
    const selectedCandidate =
      input.classification.status === "CLASSIFIED"
        ? input.classification.candidates[0]
        : undefined;
    const relevantIndustryIds = input.classification.candidates
      .flatMap((candidate) =>
        candidate.industryId ? [candidate.industryId] : [],
      )
      .slice(0, budget.maxIndustries);
    const relevantNicheIds = input.classification.candidates
      .flatMap((candidate) => (candidate.nicheId ? [candidate.nicheId] : []))
      .slice(0, budget.maxIndustries);
    const relevantCapabilityIds = uniqueSemanticIds(
      relevantIndustryIds.flatMap(
        (industryId) =>
          this.taxonomy.industryNodes.find(
            (node) => node.industryId === industryId,
          )?.typicalCapabilityIds ?? [],
      ),
    ).slice(0, budget.maxCapabilities);
    const relevantExpertisePackIds = this.expertisePacks
      .filter((pack) =>
        pack.industryScopes.some((industryId) =>
          relevantIndustryIds.includes(industryId),
        ),
      )
      .map((pack) => pack.packId)
      .slice(0, budget.maxExpertisePacks);
    const relevantRoleIds = uniqueSemanticIds(
      relevantIndustryIds.flatMap(
        (industryId) =>
          this.taxonomy.industryNodes.find(
            (node) => node.industryId === industryId,
          )?.typicalRoleIds ?? [],
      ),
    ).slice(0, budget.maxRoles);
    const withoutFingerprint = {
      contextId: "pending",
      source: "BUSINESS_TAXONOMY_CONTEXT_COMPILER" as const,
      classificationStatus: input.classification.status,
      ...(selectedCandidate ? { selectedCandidate } : {}),
      relevantIndustryIds,
      relevantNicheIds,
      relevantCapabilityIds,
      relevantExpertisePackIds,
      relevantRoleIds,
      evidence: input.classification.evidence,
      missingInformation: input.classification.missingInformation,
      contextLimit: budget,
      provenance: blmTaxonomyProvenanceV1,
    };
    const fingerprint = stableFingerprint(withoutFingerprint);
    return {
      ...withoutFingerprint,
      contextId: `business-taxonomy-context:${fingerprint.slice(0, 24)}`,
      fingerprint,
    };
  }

  private scoreIndustry(
    industry: IndustryNode,
    evidence: readonly BusinessClassificationEvidence[],
  ): { readonly industry: IndustryNode; readonly score: number } {
    const haystack = evidence.map((item) => item.text.toLowerCase()).join(" ");
    const aliasScore = industry.aliases.filter((alias) =>
      haystack.includes(alias.toLowerCase()),
    ).length;
    const maturityScore = industry.maturitySignals.filter((signal) =>
      haystack.includes(signal.toLowerCase()),
    ).length;
    const nicheScore = this.taxonomy.niches
      .filter((niche) => niche.industryId === industry.industryId)
      .flatMap((niche) => niche.signals)
      .filter((signal) => haystack.includes(signal.toLowerCase())).length;
    return {
      industry,
      score: aliasScore * 3 + maturityScore + nicheScore * 2,
    };
  }

  private toCandidate(
    industry: IndustryNode,
    confidence: number,
    evidence: readonly BusinessClassificationEvidence[],
  ): BusinessClassificationCandidate {
    const niche = this.taxonomy.niches.find(
      (item) => item.industryId === industry.industryId,
    );
    const missingInformation: BusinessTaxonomyDimension[] = [
      "customerModel",
      "revenueModel",
      "jurisdiction",
    ];
    const text = evidence.map((item) => item.text.toLowerCase()).join(" ");
    const scale = inferScale(text);
    if (!scale) missingInformation.push("scale");
    return {
      candidateId: `candidate:${industry.industryId}`,
      industryId: industry.industryId,
      ...(niche ? { nicheId: niche.nicheId } : {}),
      ...(scale ? { scale } : {}),
      dimensions: {
        industry: industry.name,
        ...(niche ? { niche: niche.name } : {}),
        ...(scale ? { scale } : {}),
      },
      confidence,
      evidenceIds: evidence.map((item) => item.evidenceId),
      missingInformation,
      assumptions: [
        "Industry classification is a candidate until confirmed with workspace evidence or user answer.",
      ],
    };
  }
}

function collectEvidence(
  input: BusinessClassificationInput,
): readonly BusinessClassificationEvidence[] {
  const rows: BusinessClassificationEvidence[] = [];
  addEvidence(rows, "BUSINESS_DESCRIPTION", input.businessDescription, false);
  for (const text of input.authorizedDocuments ?? []) {
    addEvidence(rows, "AUTHORIZED_DOCUMENT", text, true);
  }
  for (const text of input.workspaceFacts ?? []) {
    addEvidence(rows, "WORKSPACE_FACT", text, true);
  }
  for (const text of input.existingSystems ?? []) {
    addEvidence(rows, "EXISTING_SYSTEM", text, true);
  }
  for (const text of input.userAnswers ?? []) {
    addEvidence(rows, "USER_ANSWER", text, true);
  }
  return rows;
}

function addEvidence(
  rows: BusinessClassificationEvidence[],
  source: BusinessClassificationEvidence["source"],
  text: string | undefined,
  workspaceScoped: boolean,
): void {
  if (!text?.trim()) return;
  rows.push({
    evidenceId: `evidence:${stableFingerprint({ source, text }).slice(0, 24)}`,
    source,
    text: text.trim(),
    supports: supportedDimensions(text),
    confidence: source === "BUSINESS_DESCRIPTION" ? 0.55 : 0.75,
    workspaceScoped,
  });
}

function supportedDimensions(
  text: string,
): readonly BusinessTaxonomyDimension[] {
  const lower = text.toLowerCase();
  const dimensions: BusinessTaxonomyDimension[] = ["industry"];
  if (/\b(smb|small|mid-market|enterprise|employees|team)\b/u.test(lower)) {
    dimensions.push("scale");
  }
  if (
    /\b(subscription|retainer|project|transaction|invoice|mrr|arr)\b/u.test(
      lower,
    )
  ) {
    dimensions.push("revenueModel");
  }
  if (/\b(b2b|b2c|customer|client|consumer)\b/u.test(lower)) {
    dimensions.push("customerModel");
  }
  if (
    /\b(inventory|stock|warehouse|fulfillment|factory|field|site)\b/u.test(
      lower,
    )
  ) {
    dimensions.push("fulfilmentModel", "inventoryModel");
  }
  return uniqueDimensions(dimensions);
}

function inferScale(text: string): BusinessClassificationCandidate["scale"] {
  if (/\benterprise\b/u.test(text)) return "ENTERPRISE";
  if (/\bmid-market\b/u.test(text)) return "MID_MARKET";
  if (/\b(smb|small|small business)\b/u.test(text)) return "SMB";
  if (/\b(solo|freelancer)\b/u.test(text)) return "SOLO";
  return undefined;
}

function discoveryQuestionsFor(
  missingInformation: readonly BusinessTaxonomyDimension[],
): readonly string[] {
  return missingInformation.slice(0, 3).map((dimension) => {
    if (dimension === "customerModel") {
      return "Who are the primary customers: businesses, consumers, or both?";
    }
    if (dimension === "revenueModel") {
      return "How does the business primarily earn revenue?";
    }
    if (dimension === "scale") {
      return "What is the approximate team size or operating scale?";
    }
    if (dimension === "jurisdiction") {
      return "Which jurisdiction or operating region should be considered?";
    }
    return `What should Flow know about the business ${dimension}?`;
  });
}

function uniqueDimensions(
  dimensions: readonly BusinessTaxonomyDimension[],
): readonly BusinessTaxonomyDimension[] {
  return [...new Set(dimensions)];
}

function uniqueSemanticIds(ids: readonly SemanticId[]): readonly SemanticId[] {
  return [...new Set(ids)];
}
