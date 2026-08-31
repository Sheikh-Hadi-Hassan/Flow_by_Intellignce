import { toSemanticId, type SemanticId } from "./business-semantic-model.js";

export type BusinessLogicType =
  | "CALCULATION"
  | "VALIDATION_RULE"
  | "DECISION_TABLE"
  | "DIAGNOSTIC_RULE"
  | "POLICY_RULE"
  | "PROCESS_RULE";

export type BusinessLogicScopeLevel =
  "UNIVERSAL" | "INDUSTRY" | "JURISDICTION" | "BUSINESS_TYPE" | "WORKSPACE";

export type BusinessLogicStatus =
  | "DRAFT"
  | "IN_REVIEW"
  | "APPROVED"
  | "PUBLISHED"
  | "DEPRECATED"
  | "SUPERSEDED"
  | "REJECTED";

export type BusinessLogicApprovalStatus =
  | "DRAFT_ONLY"
  | "HUMAN_REVIEW_REQUIRED"
  | "APPROVED_BY_GOVERNANCE"
  | "REJECTED_BY_GOVERNANCE";

export type BusinessLogicImplementationType =
  | "CONTRACT_ONLY"
  | "DETERMINISTIC_FUNCTION"
  | "DECISION_TABLE"
  | "EXTERNAL_RUNTIME_CAPABILITY";

export interface BusinessLogicScope {
  readonly level: BusinessLogicScopeLevel;
  readonly industry?: string;
  readonly jurisdiction?: string;
  readonly businessType?: string;
  readonly workspaceId?: string;
}

export interface BusinessLogicSchemaField {
  readonly name: string;
  readonly valueType: "STRING" | "NUMBER" | "BOOLEAN" | "DATE" | "MONEY";
  readonly required: boolean;
  readonly semanticId?: SemanticId;
  readonly unit?: string;
}

export interface BusinessLogicSourceReference {
  readonly sourceId: string;
  readonly sourceName: string;
  readonly sourceUrl?: string;
  readonly license?: string;
  readonly trustLevel: "FLOW_CURATED" | "PUBLIC_GOVERNED" | "WORKSPACE_POLICY";
}

export interface BusinessLogicTestCase {
  readonly caseId: string;
  readonly description: string;
  readonly inputs: Readonly<Record<string, string | number | boolean>>;
  readonly expectedOutputShape: Readonly<Record<string, string>>;
  readonly deterministic: true;
}

export interface BusinessLogicDefinition {
  readonly logicId: SemanticId;
  readonly name: string;
  readonly description: string;
  readonly logicType: BusinessLogicType;
  readonly domainId: SemanticId;
  readonly conceptIds: readonly SemanticId[];
  readonly scope: BusinessLogicScope;
  readonly version: string;
  readonly effectiveFrom: string;
  readonly effectiveTo?: string;
  readonly status: BusinessLogicStatus;
  readonly inputSchema: readonly BusinessLogicSchemaField[];
  readonly outputSchema: readonly BusinessLogicSchemaField[];
  readonly implementationType: BusinessLogicImplementationType;
  readonly sourceReferences: readonly BusinessLogicSourceReference[];
  readonly provenance: {
    readonly source: "FLOW_CURATED" | "PUBLIC_SOURCE" | "WORKSPACE_POLICY";
    readonly notes: string;
  };
  readonly testCases: readonly BusinessLogicTestCase[];
  readonly edgeCases: readonly string[];
  readonly approvalStatus: BusinessLogicApprovalStatus;
  readonly supersedes?: SemanticId;
  readonly supersededBy?: SemanticId;
  readonly fingerprint: string;
}

export interface ProposedBusinessLogicDraft {
  readonly proposedLogicId: SemanticId;
  readonly name: string;
  readonly businessPurpose: string;
  readonly logicType: BusinessLogicType;
  readonly requiredInputs: readonly BusinessLogicSchemaField[];
  readonly expectedOutput: readonly BusinessLogicSchemaField[];
  readonly proposedFormulaOrRule: string;
  readonly assumptions: readonly string[];
  readonly edgeCases: readonly string[];
  readonly missingInformation: readonly string[];
  readonly sourceReferences: readonly BusinessLogicSourceReference[];
  readonly proposedTests: readonly BusinessLogicTestCase[];
  readonly scope: BusinessLogicScope;
  readonly authority: "DRAFT_ONLY";
}

export interface MissingBusinessLogic {
  readonly requestedLogicName: string;
  readonly logicType: BusinessLogicType;
  readonly conceptIds: readonly SemanticId[];
  readonly reason:
    "NO_APPROVED_LOGIC" | "NO_MATCHING_SCOPE" | "ONLY_DRAFT_FOUND";
}

export interface BusinessLogicResolutionContext {
  readonly workspaceId?: string;
  readonly industry?: string;
  readonly jurisdiction?: string;
  readonly businessType?: string;
  readonly conceptIds: readonly SemanticId[];
  readonly logicType?: BusinessLogicType;
  readonly asOf: string;
}

export interface BusinessLogicResolutionResult {
  readonly status: "FOUND" | "MISSING";
  readonly logic?: BusinessLogicDefinition;
  readonly missing?: MissingBusinessLogic;
  readonly consideredLogicIds: readonly SemanticId[];
}

export interface FlowLogicPackManifest {
  readonly packId: SemanticId;
  readonly version: string;
  readonly logicIds: readonly SemanticId[];
  readonly dependencies: readonly SemanticId[];
  readonly compatibility: readonly string[];
  readonly fingerprint: string;
  readonly effectiveFrom: string;
  readonly signedReleaseRequired: true;
}

export function logicId(
  domain: string,
  name: string,
  version: number,
): SemanticId {
  return toSemanticId(`flow.decision.logic.${domain}.${name}@${version}.0.0`);
}

export const businessLogicScopePrecedence: readonly BusinessLogicScopeLevel[] =
  ["WORKSPACE", "BUSINESS_TYPE", "JURISDICTION", "INDUSTRY", "UNIVERSAL"];

export const authoritativeBusinessLogicStatuses: readonly BusinessLogicStatus[] =
  ["APPROVED", "PUBLISHED"];
