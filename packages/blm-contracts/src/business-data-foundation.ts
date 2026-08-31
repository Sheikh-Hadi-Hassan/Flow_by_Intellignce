import { toSemanticId, type SemanticId } from "./business-semantic-model.js";

export type BusinessHierarchyLevel =
  | "UNIVERSAL_BUSINESS"
  | "INDUSTRY"
  | "COUNTRY_JURISDICTION"
  | "BUSINESS_TYPE"
  | "COMPANY"
  | "DEPARTMENT"
  | "PROCESS"
  | "ENTITY"
  | "TRANSACTION";

export type CorpusClassification =
  "SYNTHETIC_CORPUS" | "PUBLIC_REAL_CORPUS" | "WORKSPACE_PRIVATE_CORPUS";

export type SourceFieldProvenanceKind =
  "REAL_SOURCE" | "SYNTHETIC_DERIVED" | "SYNTHETIC_CREATED";

export type TrainingUseStatus =
  | "TRAINING_ALLOWED"
  | "TRAINING_REQUIRES_REVIEW"
  | "TRAINING_PROHIBITED"
  | "UNKNOWN";

export type LocalDataUseClassification =
  | "WORKSPACE_ONLY"
  | "EVALUATION_ALLOWED"
  | "ANONYMIZED_LEARNING_ALLOWED"
  | "TRAINING_ALLOWED"
  | "TRAINING_PROHIBITED";

export interface SourceGovernanceManifest {
  readonly sourceId: string;
  readonly sourceName: string;
  readonly publisher: string;
  readonly sourceUrl: string;
  readonly retrievedAt: string;
  readonly license: string;
  readonly licenseUrl: string;
  readonly attributionRequirement: string;
  readonly commercialUseAllowed: boolean;
  readonly derivativeUseAllowed: boolean;
  readonly trainingUseStatus: TrainingUseStatus;
  readonly evaluationUseStatus: "ALLOWED" | "REQUIRES_REVIEW" | "PROHIBITED";
  readonly contextUseStatus: "ALLOWED" | "REQUIRES_REVIEW" | "PROHIBITED";
  readonly redistributionStatus: "ALLOWED" | "REQUIRES_REVIEW" | "PROHIBITED";
  readonly privacyRisk: "LOW" | "MEDIUM" | "HIGH";
  readonly PIIRisk: "LOW" | "MEDIUM" | "HIGH";
  readonly sourceTrustLevel: "LOW" | "MEDIUM" | "HIGH";
  readonly snapshotFingerprint: string;
}

export interface TrainingEligibilityReport {
  readonly allowedForContext: boolean;
  readonly allowedForEvaluation: boolean;
  readonly allowedForTraining: boolean;
  readonly allowedForCommercialTraining: boolean;
  readonly requiresAttribution: boolean;
  readonly requiresConsent: boolean;
  readonly requiresAnonymization: boolean;
}

export interface PrivacyConfidentialityProfile {
  readonly containsPII: boolean;
  readonly containsFinancialData: boolean;
  readonly containsEmployeeData: boolean;
  readonly containsCustomerData: boolean;
  readonly containsConfidentialBusinessData: boolean;
  readonly redactionRequired: boolean;
  readonly anonymizationRequired: boolean;
  readonly trainingConsentRequired: boolean;
}

export interface DataQualityScore {
  readonly completeness: number;
  readonly consistency: number;
  readonly referentialIntegrity: number;
  readonly temporalConsistency: number;
  readonly semanticMappingConfidence: number;
  readonly sourceTrust: number;
  readonly licenseConfidence: number;
}

export interface CanonicalBusinessRecord {
  readonly recordId: string;
  readonly workspaceId: string;
  readonly semanticId: SemanticId;
  readonly entityType: string;
  readonly fields: Readonly<Record<string, string | number | boolean>>;
  readonly sourceRecordId: string;
  readonly corpusClassification: CorpusClassification;
  readonly dataUseClassification: LocalDataUseClassification;
  readonly fieldProvenance: Readonly<Record<string, SourceFieldProvenanceKind>>;
  readonly sourceGovernanceId: string;
}

export interface SyntheticBusinessWorkspace {
  readonly businessId: string;
  readonly workspaceId: string;
  readonly businessType: string;
  readonly industry: string;
  readonly country: string;
  readonly currency: string;
  readonly modules: readonly string[];
  readonly records: readonly CanonicalBusinessRecord[];
  readonly qualityScore: DataQualityScore;
  readonly requiredLogicIds: readonly SemanticId[];
}

export interface HybridSyntheticBusinessWorkspace extends SyntheticBusinessWorkspace {
  readonly hybridSources: readonly {
    readonly sourceId: string;
    readonly sourceKind: SourceFieldProvenanceKind;
    readonly description: string;
  }[];
}

export interface PublicSourceSnapshot {
  readonly source: SourceGovernanceManifest;
  readonly rawRows: readonly Readonly<
    Record<string, string | number | boolean>
  >[];
}

export interface PublicDataAdapter {
  readonly adapterId: string;
  readonly sourceFamily:
    "RETAIL_TRANSACTION" | "MARKETING_CRM" | "CORPORATE_FINANCIAL_XBRL";
  normalize(snapshot: PublicSourceSnapshot): readonly CanonicalBusinessRecord[];
}

export interface LocalSMBOnboardingManifest {
  readonly businessId: string;
  readonly workspaceId: string;
  readonly businessType: string;
  readonly industry: string;
  readonly country: string;
  readonly currency: string;
  readonly locations: readonly string[];
  readonly sourceSystems: readonly LocalSMBSourceType[];
  readonly availableModules: readonly string[];
  readonly importMappings: readonly ExplicitImportMapping[];
  readonly dataQualityScore: DataQualityScore;
  readonly missingDomains: readonly string[];
  readonly consentProfile: PrivacyConfidentialityProfile;
  readonly trainingEligibility: TrainingEligibilityReport;
}

export type LocalSMBSourceType =
  | "CSV"
  | "EXCEL"
  | "POS_EXPORT"
  | "ACCOUNTING_EXPORT"
  | "CRM_EXPORT"
  | "BANK_STATEMENT_IMPORT_BOUNDARY"
  | "INVENTORY_EXPORT"
  | "ERP_EXPORT"
  | "REST_API_CONNECTOR"
  | "DATABASE_CONNECTOR"
  | "MANUAL_STRUCTURED_IMPORT";

export interface ExplicitImportMapping {
  readonly sourceField: string;
  readonly canonicalField: string;
  readonly semanticId: SemanticId;
  readonly required: boolean;
}

export interface WorkspaceImportSession {
  readonly importSessionId: string;
  readonly workspaceId: string;
  readonly sourceType: LocalSMBSourceType;
  readonly dataUseClassification: LocalDataUseClassification;
  readonly privacyProfile: PrivacyConfidentialityProfile;
  readonly mappings: readonly ExplicitImportMapping[];
}

export interface ExternalERPAdapter {
  readonly adapterId: string;
  readonly vendorFamily:
    | "SAP_LIKE"
    | "ORACLE_LIKE"
    | "DYNAMICS_LIKE"
    | "ODOO_LIKE"
    | "ERPNEXT_LIKE"
    | "CUSTOM_ERP";
  readonly boundary: "INTERFACE_ONLY";
}

export interface ERPRecordMapping {
  readonly externalEntityName: string;
  readonly canonicalSemanticId: SemanticId;
  readonly mappingRequired: true;
}

export interface ERPBusinessLogicCapability {
  readonly capabilityId: SemanticId;
  readonly supportedLogicIds: readonly SemanticId[];
  readonly executionLocation: "ERP_LOCAL" | "FLOW_CLOUD";
}

export interface LocalBusinessLogicRuntimeCapability {
  readonly runtimeId: string;
  readonly supportedLogicPackIds: readonly SemanticId[];
  readonly signedReleaseRequired: true;
}

export const businessDataHierarchyV1 = {
  root: "Universal Business Core",
  industries: [
    {
      name: "Retail",
      children: ["Grocery", "General Retail", "E-commerce"],
    },
    {
      name: "Services",
      children: ["Marketing Agency", "Consulting", "Field Service"],
    },
    { name: "Recurring Revenue", children: ["SaaS"] },
    { name: "Asset Businesses", children: ["Rental"] },
    { name: "Supply Chain", children: ["Distribution", "Manufacturing"] },
    { name: "Food", children: ["Restaurant"] },
  ],
} as const;

export function publicTrainingEligibility(
  source: SourceGovernanceManifest,
): TrainingEligibilityReport {
  const allowedForTraining =
    source.trainingUseStatus === "TRAINING_ALLOWED" &&
    source.commercialUseAllowed &&
    source.derivativeUseAllowed &&
    source.privacyRisk === "LOW" &&
    source.PIIRisk === "LOW";
  return {
    allowedForContext: source.contextUseStatus === "ALLOWED",
    allowedForEvaluation: source.evaluationUseStatus === "ALLOWED",
    allowedForTraining,
    allowedForCommercialTraining: allowedForTraining,
    requiresAttribution: source.attributionRequirement.trim().length > 0,
    requiresConsent: false,
    requiresAnonymization:
      source.privacyRisk !== "LOW" || source.PIIRisk !== "LOW",
  };
}

export function workspacePrivateEligibility(): TrainingEligibilityReport {
  return {
    allowedForContext: true,
    allowedForEvaluation: false,
    allowedForTraining: false,
    allowedForCommercialTraining: false,
    requiresAttribution: false,
    requiresConsent: true,
    requiresAnonymization: true,
  };
}

export function smbSemanticId(domain: string, name: string): SemanticId {
  return toSemanticId(`flow.concept.${domain}.${name}`);
}
