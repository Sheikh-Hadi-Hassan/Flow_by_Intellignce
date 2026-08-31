import {
  applyRoleOverlays,
  createMultiRolePerspectives,
  resolveBusinessRoleAlias,
  universalBusinessRolesV1,
  type BusinessRolePacket,
  type MultiRolePerspective,
  type RoleAliasResolution,
  type RoleOverlay,
  type SemanticId,
} from "@flow/blm-contracts";

import type { BusinessContextRequest } from "./business-context-compiler.js";

export interface BusinessRoleContextRequest {
  readonly businessContextRequest: BusinessContextRequest;
  readonly roleTitles?: readonly string[];
  readonly roleIds?: readonly SemanticId[];
  readonly decisionContext?: readonly string[];
  readonly overlays?: readonly RoleOverlay[];
  readonly maxRoles?: number;
}

export interface CompiledRoleContext {
  readonly primaryRole?: BusinessRolePacket;
  readonly relevantPeerRoles: readonly BusinessRolePacket[];
  readonly decisionOwnerRoles: readonly BusinessRolePacket[];
  readonly approvalRoles: readonly BusinessRolePacket[];
  readonly keyVariables: readonly string[];
  readonly relevantMetricIds: readonly SemanticId[];
  readonly expectedEvidenceRequirementIds: readonly string[];
  readonly authorityBoundaries: readonly string[];
  readonly relevantLanguagePatterns: readonly string[];
  readonly topCrossFunctionalDependencies: readonly SemanticId[];
  readonly aliasResolutions: readonly RoleAliasResolution[];
  readonly multiRolePerspectives: readonly MultiRolePerspective[];
  readonly compilerExplanation: string;
}

export class BusinessRoleContextCompiler {
  compile(request: BusinessRoleContextRequest): CompiledRoleContext {
    const maxRoles = request.maxRoles ?? 4;
    const resolvedFromTitles = (request.roleTitles ?? []).map((title) =>
      resolveBusinessRoleAlias({
        title,
        businessContext: [
          request.businessContextRequest.task.requestedTask,
          ...(request.decisionContext ?? []),
        ],
        decisionMaterial: true,
      }),
    );
    const explicitRoles = (request.roleIds ?? [])
      .map((roleId) =>
        universalBusinessRolesV1.find((role) => role.role_id === roleId),
      )
      .filter((role): role is BusinessRolePacket => role !== undefined);
    const inferredRoles = inferRolesFromTask(
      request.businessContextRequest.task.requestedTask,
    );
    const resolvedRoles = resolvedFromTitles
      .flatMap((resolution) =>
        resolution.status === "RESOLVED" && resolution.selectedRole
          ? [resolution.selectedRole]
          : resolution.candidates.map((candidate) => candidate.role),
      )
      .filter((role) => role !== undefined);
    const selectedRoles = uniqueRoles([
      ...explicitRoles,
      ...resolvedRoles,
      ...inferredRoles,
    ])
      .slice(0, maxRoles)
      .map((role) =>
        applyRoleOverlays({ role, overlays: request.overlays ?? [] }),
      );
    const primaryRole = selectedRoles[0];
    const peerRoleIds = selectedRoles.flatMap((role) => role.peer_roles);
    const relevantPeerRoles = universalBusinessRolesV1
      .filter((role) => peerRoleIds.includes(role.role_id))
      .slice(0, maxRoles);
    const decisionOwnerRoles = selectedRoles.filter((role) =>
      role.recurring_decisions.some(
        (decision) =>
          decision.linkKind === "PRIMARY_OWNER" ||
          decision.linkKind === "CO_OWNER",
      ),
    );
    const approvalRoles = selectedRoles.filter((role) =>
      role.authority_scope.normative.includes("approve"),
    );
    return {
      ...(primaryRole ? { primaryRole } : {}),
      relevantPeerRoles,
      decisionOwnerRoles,
      approvalRoles,
      keyVariables: uniqueStrings(
        selectedRoles.flatMap((role) => role.core_variables),
      ).slice(0, 12),
      relevantMetricIds: uniqueSemanticIds(
        selectedRoles.flatMap((role) => role.metrics),
      ).slice(0, 12),
      expectedEvidenceRequirementIds: uniqueStrings(
        selectedRoles.flatMap((role) =>
          role.evidence_requirements.map((item) => item.evidenceId),
        ),
      ).slice(0, 12),
      authorityBoundaries: uniqueStrings(
        selectedRoles.map((role) => role.authority_scope.boundary),
      ),
      relevantLanguagePatterns: uniqueStrings(
        selectedRoles.flatMap((role) =>
          role.language_patterns.map((pattern) => pattern.phrase),
        ),
      ).slice(0, 12),
      topCrossFunctionalDependencies: uniqueSemanticIds(
        selectedRoles.flatMap((role) => role.cross_function_dependencies),
      ).slice(0, 8),
      aliasResolutions: resolvedFromTitles,
      multiRolePerspectives: createMultiRolePerspectives(selectedRoles),
      compilerExplanation:
        "Compiled only task-relevant role lenses; role knowledge is advisory and does not grant workspace authority.",
    };
  }
}

function inferRolesFromTask(task: string): readonly BusinessRolePacket[] {
  const text = task.toLowerCase();
  const roleKeys: string[] = [];
  if (
    text.includes("cash") ||
    text.includes("runway") ||
    text.includes("margin")
  ) {
    roleKeys.push("cfo");
  }
  if (
    text.includes("constraint") ||
    text.includes("capacity") ||
    text.includes("operations")
  ) {
    roleKeys.push("coo");
  }
  if (
    text.includes("pipeline") ||
    text.includes("revenue") ||
    text.includes("sales")
  ) {
    roleKeys.push("chief-revenue-officer");
  }
  if (
    text.includes("marketing") ||
    text.includes("cac") ||
    text.includes("channel")
  ) {
    roleKeys.push("cmo");
  }
  if (text.includes("security") || text.includes("control")) {
    roleKeys.push("ciso");
  }
  if (text.includes("board")) {
    roleKeys.push("board-director");
  }
  if (text.includes("ceo") || text.includes("enterprise")) {
    roleKeys.push("ceo");
  }
  return roleKeys
    .map((key) =>
      universalBusinessRolesV1.find((role) => role.role_id.endsWith(`.${key}`)),
    )
    .filter((role): role is BusinessRolePacket => role !== undefined);
}

function uniqueRoles(
  roles: readonly BusinessRolePacket[],
): readonly BusinessRolePacket[] {
  const seen = new Set<SemanticId>();
  const result: BusinessRolePacket[] = [];
  for (const role of roles) {
    if (seen.has(role.role_id)) continue;
    seen.add(role.role_id);
    result.push(role);
  }
  return result;
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

function uniqueSemanticIds(
  values: readonly SemanticId[],
): readonly SemanticId[] {
  return [...new Set(values)];
}
