import {
  businessSkillReleasesV1,
  isAuthoritativeSkillRelease,
  type ERPCapabilityId,
  type ExternalERPAdapterCapability,
  type ProposedBusinessSkillDraft,
  type SkillAmendmentDraft,
  type SkillCompatibilityResult,
  type SkillDependency,
  type SkillEvaluationCase,
  type SkillRelease,
  type WorkspaceSkillInstallation,
  type WorkspaceSkillInstallationContext,
} from "@flow/blm-contracts";
import { toSemanticId, type SemanticId } from "@flow/blm-contracts";

import { stableFingerprint } from "./knowledge-acquisition.js";

export interface BusinessSkillResolutionContext {
  readonly workspaceId: string;
  readonly industry: string;
  readonly businessType: string;
  readonly asOf: string;
  readonly installedSkills: readonly WorkspaceSkillInstallation[];
  readonly availableLogicIds: readonly SemanticId[];
  readonly availableERPCapabilities: readonly ERPCapabilityId[];
  readonly actorPermissionIds: readonly string[];
}

export interface BusinessSkillResolutionResult {
  readonly status: "FOUND" | "MISSING" | "NOT_AUTHORIZED";
  readonly skill?: SkillRelease;
  readonly compatibility?: SkillCompatibilityResult;
}

export interface SkillDependencyValidationResult {
  readonly status:
    | "VALID"
    | "MISSING_DEPENDENCY"
    | "WRONG_VERSION"
    | "DEPENDENCY_CYCLE"
    | "INCOMPATIBLE_SCOPE"
    | "MISSING_ERP_CAPABILITY";
  readonly issues: readonly string[];
  readonly order: readonly SemanticId[];
}

export class BusinessSkillRegistry {
  private readonly releases = new Map<string, SkillRelease>();

  constructor(releases: readonly SkillRelease[] = businessSkillReleasesV1) {
    for (const release of releases) {
      this.releases.set(key(release.skillId, release.version), release);
    }
  }

  listAuthoritative(): readonly SkillRelease[] {
    return [...this.releases.values()].filter(isAuthoritativeSkillRelease);
  }

  get(skillId: SemanticId, version: string): SkillRelease | undefined {
    return this.releases.get(key(skillId, version));
  }

  resolve(input: {
    readonly skillId: SemanticId;
    readonly context: BusinessSkillResolutionContext;
  }): BusinessSkillResolutionResult {
    const installation = input.context.installedSkills.find(
      (item) =>
        item.skillId === input.skillId &&
        item.status === "INSTALLED" &&
        item.effectiveFrom <= input.context.asOf &&
        (!item.effectiveTo || item.effectiveTo >= input.context.asOf),
    );
    if (!installation) return { status: "MISSING" };
    const release = this.get(input.skillId, installation.skillVersion);
    if (!release || !isAuthoritativeSkillRelease(release)) {
      return { status: "MISSING" };
    }
    const compatibility = this.compatibility(release, input.context);
    if (compatibility.status === "NOT_AUTHORIZED") {
      return { status: "NOT_AUTHORIZED", skill: release, compatibility };
    }
    return { status: "FOUND", skill: release, compatibility };
  }

  resolveInstalled(
    context: BusinessSkillResolutionContext,
  ): readonly SkillRelease[] {
    return context.installedSkills
      .flatMap((installation) => {
        const result = this.resolve({ skillId: installation.skillId, context });
        return result.status === "FOUND" &&
          result.compatibility?.status !== "INCOMPATIBLE"
          ? [result.skill]
          : [];
      })
      .filter((skill): skill is SkillRelease => Boolean(skill));
  }

  compatibility(
    release: SkillRelease,
    context: Pick<
      WorkspaceSkillInstallationContext,
      | "availableLogicIds"
      | "availableERPCapabilities"
      | "actorPermissionIds"
      | "businessType"
      | "industry"
    >,
  ): SkillCompatibilityResult {
    const missingLogicIds = release.requiredLogicIds.filter(
      (logicId) => !context.availableLogicIds.includes(logicId),
    );
    const missingCapabilityIds = release.requiredERPCapabilities
      .filter(
        (requirement) =>
          !context.availableERPCapabilities.includes(requirement.capabilityId),
      )
      .map((requirement) => requirement.capabilityId);
    const requiredMissingCapabilities = release.requiredERPCapabilities
      .filter((requirement) => requirement.required)
      .filter(
        (requirement) =>
          !context.availableERPCapabilities.includes(requirement.capabilityId),
      );
    const missingPolicyIds = release.requiredPolicyIds.filter(
      (policyId) => !context.actorPermissionIds.includes(policyId),
    );
    const incompatibleScope =
      release.businessTypeScopes.length > 0 &&
      !release.businessTypeScopes.includes(context.businessType);
    const dependencyIssues = incompatibleScope
      ? [`Skill not scoped to business type ${context.businessType}.`]
      : [];
    const status = compatibilityStatus({
      missingLogicIds,
      missingCapabilityIds,
      requiredMissingCapabilities: requiredMissingCapabilities.map(
        (item) => item.capabilityId,
      ),
      missingPolicyIds,
      dependencyIssues,
    });
    return {
      skillId: release.skillId,
      version: release.version,
      status,
      missingLogicIds,
      missingCapabilityIds,
      missingPolicyIds,
      missingDataFields: [],
      dependencyIssues,
      warnings:
        missingCapabilityIds.length > requiredMissingCapabilities.length
          ? ["Optional ERP capability missing; skill is degraded."]
          : [],
    };
  }

  dependencyGraph(input: {
    readonly rootSkillIds: readonly SemanticId[];
    readonly availableERPCapabilities: readonly ERPCapabilityId[];
    readonly maxNodes: number;
  }): SkillDependencyValidationResult {
    const authoritative = this.listAuthoritative();
    const byId = new Map(
      authoritative.map((release) => [release.skillId, release]),
    );
    const visiting = new Set<SemanticId>();
    const visited = new Set<SemanticId>();
    const order: SemanticId[] = [];
    const issues: string[] = [];

    const visit = (skillId: SemanticId): boolean => {
      if (visited.has(skillId)) return true;
      if (visiting.has(skillId)) {
        issues.push(`Cycle at ${skillId}.`);
        return false;
      }
      if (visited.size + visiting.size + 1 > input.maxNodes) {
        issues.push("Dependency graph exceeds max nodes.");
        return false;
      }
      const release = byId.get(skillId);
      if (!release) {
        issues.push(`Missing dependency ${skillId}.`);
        return false;
      }
      const missingRequiredCapability = release.requiredERPCapabilities.find(
        (requirement) =>
          requirement.required &&
          !input.availableERPCapabilities.includes(requirement.capabilityId),
      );
      if (missingRequiredCapability) {
        issues.push(
          `Missing ERP capability ${missingRequiredCapability.capabilityId}.`,
        );
        return false;
      }
      visiting.add(skillId);
      for (const dependency of release.dependencies) {
        if (dependency.required && !visit(dependency.skillId)) return false;
      }
      visiting.delete(skillId);
      visited.add(skillId);
      order.push(skillId);
      return true;
    };

    for (const skillId of input.rootSkillIds) {
      if (!visit(skillId)) {
        return {
          status: issues.some((issue) => issue.includes("Cycle"))
            ? "DEPENDENCY_CYCLE"
            : issues.some((issue) => issue.includes("ERP capability"))
              ? "MISSING_ERP_CAPABILITY"
              : "MISSING_DEPENDENCY",
          issues,
          order: [],
        };
      }
    }
    return { status: "VALID", issues, order };
  }

  proposeDraft(input: {
    readonly name: string;
    readonly purpose: string;
    readonly industry: string;
    readonly businessType: string;
    readonly requiredInputs: readonly string[];
    readonly expectedOutputs: readonly string[];
    readonly requiredConcepts: readonly SemanticId[];
    readonly requiredLogic: readonly SemanticId[];
    readonly requiredPolicies: readonly string[];
    readonly requiredERPCapabilities: readonly ERPCapabilityId[];
    readonly evaluationCases: readonly SkillEvaluationCase[];
    readonly dependencies?: readonly SkillDependency[];
  }): ProposedBusinessSkillDraft {
    return {
      proposedSkillId: toSemanticId(
        `flow.capability.skill.proposed-${slug(input.name)}`,
      ),
      ...input,
      authority: "DRAFT_ONLY",
      risk: "MEDIUM",
      assumptions: [
        "Draft requires human review before approval or installation.",
      ],
      dependencies: input.dependencies ?? [],
    };
  }

  amendPublished(input: {
    readonly baseSkillId: SemanticId;
    readonly baseVersion: string;
    readonly changeReason: string;
    readonly changedDependencies: readonly SkillDependency[];
    readonly changedLogicReferences: readonly SemanticId[];
    readonly newEvaluationCases: readonly SkillEvaluationCase[];
  }): SkillAmendmentDraft {
    return {
      ...input,
      draftVersion: `${Number(input.baseVersion) + 1}`,
      status: "DRAFT",
      impactReport: [
        "Published release remains immutable.",
        "Draft amendment requires review, approval, and publication.",
      ],
    };
  }

  missingInformation(input: {
    readonly skill: SkillRelease;
    readonly fields: Readonly<Record<string, unknown>>;
  }): readonly string[] {
    return input.skill.inputSchema.filter(
      (field) => input.fields[field] === undefined,
    );
  }
}

export class FakeExternalERPAdapterCapabilityRegistry {
  constructor(private readonly adapter: ExternalERPAdapterCapability) {}

  has(capabilityId: ERPCapabilityId): boolean {
    return this.adapter.capabilityIds.includes(capabilityId);
  }

  list(): readonly ERPCapabilityId[] {
    return this.adapter.capabilityIds;
  }
}

export function workspaceSkillInstallation(input: {
  readonly workspaceId: string;
  readonly skillId: SemanticId;
  readonly skillVersion: string;
  readonly installedBy: string;
  readonly configuration?: Readonly<Record<string, string | number | boolean>>;
  readonly runtimeFingerprint?: string;
}): WorkspaceSkillInstallation {
  const configuration = input.configuration ?? {};
  return {
    workspaceId: input.workspaceId,
    skillId: input.skillId,
    skillVersion: input.skillVersion,
    status: "INSTALLED",
    installedAt: "2026-08-12T00:00:00.000Z",
    installedBy: input.installedBy,
    configuration,
    configurationFingerprint: stableFingerprint(configuration),
    ...(input.runtimeFingerprint
      ? { runtimeFingerprint: input.runtimeFingerprint }
      : {}),
    effectiveFrom: "2026-08-12",
  };
}

function compatibilityStatus(input: {
  readonly missingLogicIds: readonly SemanticId[];
  readonly missingCapabilityIds: readonly ERPCapabilityId[];
  readonly requiredMissingCapabilities: readonly ERPCapabilityId[];
  readonly missingPolicyIds: readonly string[];
  readonly dependencyIssues: readonly string[];
}): SkillCompatibilityResult["status"] {
  if (input.missingPolicyIds.length > 0) return "NOT_AUTHORIZED";
  if (input.missingLogicIds.length > 0) return "MISSING_LOGIC";
  if (input.requiredMissingCapabilities.length > 0) return "MISSING_CAPABILITY";
  if (input.dependencyIssues.length > 0) return "INCOMPATIBLE";
  if (input.missingCapabilityIds.length > 0) return "DEGRADED";
  return "COMPATIBLE";
}

function key(skillId: SemanticId, version: string): string {
  return `${skillId}:${version}`;
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
