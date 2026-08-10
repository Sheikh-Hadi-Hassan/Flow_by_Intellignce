export type EvidenceKind =
  | "document"
  | "user-input"
  | "system-record"
  | "external-record"
  | "calculation";

export type ClaimClassification =
  "FACT" | "INFERENCE" | "RECOMMENDATION" | "ASSUMPTION";

export interface EvidenceReference {
  readonly id: string;
  readonly kind: EvidenceKind;
  readonly source: string;
  readonly uri?: string;
  readonly excerpt?: string;
  readonly claimClassification: ClaimClassification;
  readonly trustLevel: "low" | "medium" | "high";
}

export type EvidencePolicy = "NONE" | "OPTIONAL" | "REQUIRED";

export interface EvidenceValidationResult {
  readonly valid: boolean;
  readonly reason: string;
}

export interface EvidenceValidator {
  validate(
    policy: EvidencePolicy,
    evidence: readonly EvidenceReference[],
  ): EvidenceValidationResult;
}

export class DefaultEvidenceValidator implements EvidenceValidator {
  validate(
    policy: EvidencePolicy,
    evidence: readonly EvidenceReference[],
  ): EvidenceValidationResult {
    if (policy === "REQUIRED" && evidence.length === 0) {
      return {
        valid: false,
        reason: "Evidence is required for this action but none was supplied.",
      };
    }

    return {
      valid: true,
      reason: "Evidence policy satisfied.",
    };
  }
}
