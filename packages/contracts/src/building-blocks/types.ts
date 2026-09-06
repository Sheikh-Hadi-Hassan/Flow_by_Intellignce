export const BUILDING_BLOCK_LIFECYCLE = [
  "available",
  "recommended",
  "configuring",
  "awaiting_approval",
  "active",
  "suspended",
  "deprecated",
] as const;

export type BuildingBlockLifecycle = (typeof BUILDING_BLOCK_LIFECYCLE)[number];

export const BUILDING_BLOCK_UI_STATES = [
  "empty",
  "loading",
  "populated",
  "partial",
  "error",
  "restricted",
  "dense",
] as const;

export type BuildingBlockUiState = (typeof BUILDING_BLOCK_UI_STATES)[number];

export interface BuildingBlockRoute {
  readonly path: string;
  readonly title: string;
  readonly permission: string;
}

export interface BuildingBlockNavContribution {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  readonly appearsWhen: "active";
}

export interface BuildingBlockCommand {
  readonly id: string;
  readonly permission: string;
  readonly sideEffect: "none" | "write" | "protected-write";
}

export interface BuildingBlockQuery {
  readonly id: string;
  readonly permission: string;
}

export interface BuildingBlockAiTool {
  readonly name: string;
  readonly permission: string;
  readonly sideEffect: "read" | "propose";
}

export interface BuildingBlockEventType {
  readonly name: string;
  readonly direction: "emitted" | "consumed";
}

export interface BuildingBlockManifest {
  readonly id: string;
  readonly version: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly lifecycleStatus: "available" | "deprecated";
  readonly supportedBusinessModels: readonly string[];
  readonly businessProblemsSolved: readonly string[];
  readonly recommendationTriggers: readonly string[];
  readonly dependencies: readonly string[];
  readonly incompatibleBlocks: readonly string[];
  readonly routes: readonly BuildingBlockRoute[];
  readonly navigation: readonly BuildingBlockNavContribution[];
  readonly uiEntryPoints: readonly string[];
  readonly configurationSchemaVersion: number;
  readonly ownedEntities: readonly string[];
  readonly referencedSharedEntities: readonly string[];
  readonly commands: readonly BuildingBlockCommand[];
  readonly queries: readonly BuildingBlockQuery[];
  readonly deterministicRules: readonly string[];
  readonly kpis: readonly string[];
  readonly permissions: readonly string[];
  readonly aiTools: readonly BuildingBlockAiTool[];
  readonly events: readonly BuildingBlockEventType[];
  readonly integrationPoints: readonly string[];
  readonly seedDataProfile: string;
  readonly supportedUiStates: readonly BuildingBlockUiState[];
  readonly migrationVersion: string;
  readonly testRequirements: readonly string[];
}

export interface WorkspaceBuildingBlockInstallation {
  readonly workspaceId: string;
  readonly blockId: string;
  readonly blockVersion: string;
  readonly status: BuildingBlockLifecycle;
  readonly configuration: Readonly<Record<string, unknown>>;
  readonly proposedBy?: string;
  readonly approvedBy?: string;
  readonly proposedAt?: string;
  readonly approvedAt?: string;
  readonly activatedAt?: string;
  readonly suspendedAt?: string;
}

export interface BuildingBlockRecommendation {
  readonly blockId: string;
  readonly reason: string;
  readonly requirementEvidence: readonly string[];
  readonly recommendedConfiguration: Readonly<Record<string, unknown>>;
  readonly dependencies: readonly string[];
  readonly confidence: "low" | "medium" | "high";
  readonly risks: readonly string[];
  readonly alternatives: readonly string[];
  readonly requiresHumanApproval: true;
}

export interface BusinessComposerProfile {
  readonly workspaceId: string;
  readonly industry: string;
  readonly businessModel: string;
  readonly companySize: string;
  readonly roles: readonly string[];
  readonly existingSystems: readonly string[];
  readonly salesProcess: string;
  readonly deliveryProcess: string;
  readonly financialProcess: string;
  readonly problems: readonly string[];
  readonly goals: readonly string[];
  readonly compliance: readonly string[];
  readonly questionnaireAnswers: Readonly<Record<string, string>>;
  readonly verifiedFacts: readonly string[];
}

export interface BuildingBlockAuditEvent {
  readonly id: string;
  readonly workspaceId: string;
  readonly blockId: string;
  readonly action: string;
  readonly actorId: string;
  readonly previousStatus?: BuildingBlockLifecycle;
  readonly resultingStatus: BuildingBlockLifecycle;
  readonly reason: string;
  readonly occurredAt: string;
}

export interface DomainEvent<TPayload = unknown> {
  readonly name: string;
  readonly workspaceId: string;
  readonly recordId: string;
  readonly occurredAt: string;
  readonly payload: TPayload;
}
