export type SemanticId = string & { readonly __brand: "SemanticId" };

export type SemanticDefinitionScope = "GLOBAL" | "WORKSPACE";

export type SemanticLifecycleStatus = "DRAFT" | "ACTIVE" | "DEPRECATED";

export type BusinessSemanticModelConcept =
  | "Organization"
  | "Workspace"
  | "BusinessProfile"
  | "BusinessCapability"
  | "Module"
  | "Component"
  | "Entity"
  | "Record"
  | "Role"
  | "Actor"
  | "Process"
  | "Workflow"
  | "Action"
  | "Decision"
  | "Policy"
  | "Event"
  | "Screen"
  | "Widget"
  | "Integration"
  | "DataContract"
  | "AIContract"
  | "Dependency"
  | "Constraint";

export type BusinessSemanticRelationshipType =
  | "HAS"
  | "REQUIRES"
  | "SATISFIED_BY"
  | "CONTAINS"
  | "PROVIDES"
  | "DEPENDS_ON"
  | "CONFLICTS_WITH"
  | "USES"
  | "PRODUCES"
  | "CONSUMES"
  | "EXPOSES"
  | "GOVERNED_BY"
  | "RENDERS"
  | "INTEGRATES_WITH"
  | "CAN_PERFORM"
  | "GOVERNS"
  | "EXECUTES"
  | "CONTROLS";

export type BusinessCapabilityType =
  "DOMAIN" | "OPERATIONAL" | "SUPPORTING" | "CONTROL";

export interface SemanticDefinitionBase {
  readonly semanticId: SemanticId;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly scope: SemanticDefinitionScope;
  readonly workspaceId?: string;
  readonly status: SemanticLifecycleStatus;
}

export interface BusinessCapabilityDefinition extends SemanticDefinitionBase {
  readonly concept: "BusinessCapability";
  readonly capabilityType: BusinessCapabilityType;
  readonly parentCapabilityId?: SemanticId;
}

export interface DataContractReference {
  readonly semanticId: SemanticId;
  readonly version: string;
  readonly entitySemanticId?: SemanticId;
  readonly entityTypeKey?: string;
}

export interface AIContractReference {
  readonly semanticId: SemanticId;
  readonly version: string;
  readonly toolId?: string;
  readonly requiredCapabilityIds?: readonly SemanticId[];
}

export interface ComponentConstraintReference {
  readonly semanticId: SemanticId;
  readonly description: string;
}

export interface BusinessComponentDefinition extends SemanticDefinitionBase {
  readonly concept: "Component";
  readonly moduleKey?: string;
  readonly providesCapabilityIds: readonly SemanticId[];
  readonly requiresCapabilityIds: readonly SemanticId[];
  readonly dependsOnComponentIds: readonly SemanticId[];
  readonly conflictsWithComponentIds: readonly SemanticId[];
  readonly usesEntityIds: readonly SemanticId[];
  readonly producesEventIds: readonly SemanticId[];
  readonly consumesEventIds: readonly SemanticId[];
  readonly exposesActionIds: readonly SemanticId[];
  readonly usesWorkflowIds: readonly SemanticId[];
  readonly usesDecisionIds: readonly SemanticId[];
  readonly governedByPolicyIds: readonly SemanticId[];
  readonly rendersScreenIds: readonly SemanticId[];
  readonly integratesWithIds: readonly SemanticId[];
  readonly dataContracts: readonly DataContractReference[];
  readonly aiContracts: readonly AIContractReference[];
  readonly constraints: readonly ComponentConstraintReference[];
}

export interface BusinessProfile {
  readonly profileId: string;
  readonly workspaceId: string;
  readonly organizationId?: string;
  readonly version: string;
  readonly businessType: string;
  readonly businessModel?: string;
  readonly productsAndServices: readonly string[];
  readonly customerTypes: readonly string[];
  readonly departments: readonly string[];
  readonly teamStructure: readonly string[];
  readonly locations: readonly string[];
  readonly requiredCapabilityIds: readonly SemanticId[];
  readonly salesModel?: string;
  readonly billingModel?: string;
  readonly approvalRequirements: readonly string[];
  readonly importantProcesses: readonly string[];
  readonly complianceRequirements: readonly string[];
  readonly integrations: readonly string[];
  readonly businessScale?: string;
}

export interface WorkspaceSemanticConfiguration {
  readonly workspaceId: string;
  readonly businessProfile: BusinessProfile;
  readonly enabledComponentIds: readonly SemanticId[];
  readonly componentConfiguration: Readonly<Record<string, unknown>>;
}

export interface BusinessSemanticRelationship {
  readonly semanticId: SemanticId;
  readonly relationship: BusinessSemanticRelationshipType;
  readonly sourceSemanticId: SemanticId;
  readonly targetSemanticId: SemanticId;
  readonly scope: SemanticDefinitionScope;
  readonly workspaceId?: string;
  readonly description?: string;
}

export interface BusinessSemanticModelSnapshot {
  readonly capabilities: readonly BusinessCapabilityDefinition[];
  readonly components: readonly BusinessComponentDefinition[];
  readonly relationships: readonly BusinessSemanticRelationship[];
}

export const businessSemanticModelConceptsV01 = [
  "Organization",
  "Workspace",
  "BusinessProfile",
  "BusinessCapability",
  "Module",
  "Component",
  "Entity",
  "Record",
  "Role",
  "Actor",
  "Process",
  "Workflow",
  "Action",
  "Decision",
  "Policy",
  "Event",
  "Screen",
  "Widget",
  "Integration",
  "DataContract",
  "AIContract",
  "Dependency",
  "Constraint",
] as const satisfies readonly BusinessSemanticModelConcept[];

export const businessSemanticRelationshipsV01 = [
  "HAS",
  "REQUIRES",
  "SATISFIED_BY",
  "CONTAINS",
  "PROVIDES",
  "DEPENDS_ON",
  "CONFLICTS_WITH",
  "USES",
  "PRODUCES",
  "CONSUMES",
  "EXPOSES",
  "GOVERNED_BY",
  "RENDERS",
  "INTEGRATES_WITH",
  "CAN_PERFORM",
  "GOVERNS",
  "EXECUTES",
  "CONTROLS",
] as const satisfies readonly BusinessSemanticRelationshipType[];

export const semanticIdPattern =
  /^flow\.(concept|capability|component|module|entity|record|role|actor|process|workflow|action|decision|policy|event|screen|widget|integration|contract|dependency|constraint|profile)(\.[a-z][a-z0-9-]*){1,}(@[0-9]+\.[0-9]+\.[0-9]+)?$/;

export function toSemanticId(value: string): SemanticId {
  validateSemanticId(value);
  return value as SemanticId;
}

export function validateSemanticId(value: string): void {
  if (!semanticIdPattern.test(value)) {
    throw new Error(
      `Invalid semantic id: ${value}. Expected flow.<kind>.<domain>.<name> with optional @major.minor.patch.`,
    );
  }
}

export function validateSemanticScope(input: {
  readonly scope: SemanticDefinitionScope;
  readonly workspaceId?: string;
  readonly label: string;
}): void {
  if (input.scope === "GLOBAL" && input.workspaceId) {
    throw new Error(
      `${input.label} global definitions cannot be workspace-owned.`,
    );
  }
  if (input.scope === "WORKSPACE" && !input.workspaceId) {
    throw new Error(
      `${input.label} workspace definitions require workspaceId.`,
    );
  }
}

export function validateBusinessCapabilityDefinition(
  capability: BusinessCapabilityDefinition,
): void {
  validateSemanticId(capability.semanticId);
  validateSemanticScope({
    scope: capability.scope,
    label: "BusinessCapability",
    ...(capability.workspaceId ? { workspaceId: capability.workspaceId } : {}),
  });
  if (!capability.name.trim()) {
    throw new Error("BusinessCapability requires a name.");
  }
  if (capability.parentCapabilityId === capability.semanticId) {
    throw new Error("BusinessCapability cannot be its own parent.");
  }
}

export function validateBusinessComponentDefinition(
  component: BusinessComponentDefinition,
  knownCapabilityIds: ReadonlySet<SemanticId>,
): void {
  validateSemanticId(component.semanticId);
  validateSemanticScope({
    scope: component.scope,
    label: "Component",
    ...(component.workspaceId ? { workspaceId: component.workspaceId } : {}),
  });
  assertUnique(component.providesCapabilityIds, "provided capabilities");
  assertUnique(component.requiresCapabilityIds, "required capabilities");
  assertUnique(component.dependsOnComponentIds, "component dependencies");
  assertUnique(component.conflictsWithComponentIds, "component conflicts");
  if (component.dependsOnComponentIds.includes(component.semanticId)) {
    throw new Error("Component cannot depend on itself.");
  }
  if (component.conflictsWithComponentIds.includes(component.semanticId)) {
    throw new Error("Component cannot conflict with itself.");
  }
  for (const capabilityId of [
    ...component.providesCapabilityIds,
    ...component.requiresCapabilityIds,
  ]) {
    if (!knownCapabilityIds.has(capabilityId)) {
      throw new Error(
        `Component references unknown capability: ${capabilityId}`,
      );
    }
  }
}

export function validateBusinessProfile(
  profile: BusinessProfile,
  knownCapabilityIds: ReadonlySet<SemanticId>,
): void {
  if (!profile.workspaceId) {
    throw new Error("BusinessProfile requires workspaceId.");
  }
  if (!profile.businessType.trim()) {
    throw new Error("BusinessProfile requires businessType.");
  }
  assertUnique(profile.requiredCapabilityIds, "BusinessProfile capabilities");
  for (const capabilityId of profile.requiredCapabilityIds) {
    if (!knownCapabilityIds.has(capabilityId)) {
      throw new Error(
        `BusinessProfile references unknown capability: ${capabilityId}`,
      );
    }
  }
}

export class BusinessSemanticModelRegistry {
  private readonly capabilities = new Map<
    SemanticId,
    BusinessCapabilityDefinition
  >();

  private readonly components = new Map<
    SemanticId,
    BusinessComponentDefinition
  >();

  private readonly workspaceConfigurations = new Map<
    string,
    WorkspaceSemanticConfiguration
  >();

  registerCapability(capability: BusinessCapabilityDefinition): void {
    validateBusinessCapabilityDefinition(capability);
    if (this.capabilities.has(capability.semanticId)) {
      throw new Error(
        `BusinessCapability already exists: ${capability.semanticId}`,
      );
    }
    if (
      capability.parentCapabilityId &&
      !this.capabilities.has(capability.parentCapabilityId)
    ) {
      throw new Error(
        `Parent capability does not exist: ${capability.parentCapabilityId}`,
      );
    }
    this.capabilities.set(capability.semanticId, capability);
    this.assertNoCapabilityCycles();
  }

  registerComponent(component: BusinessComponentDefinition): void {
    validateBusinessComponentDefinition(
      component,
      new Set(this.capabilities.keys()),
    );
    if (this.components.has(component.semanticId)) {
      throw new Error(`Component already exists: ${component.semanticId}`);
    }
    this.components.set(component.semanticId, component);
    this.assertNoComponentDependencyCycles();
  }

  setWorkspaceConfiguration(
    configuration: WorkspaceSemanticConfiguration,
  ): void {
    if (
      configuration.workspaceId !== configuration.businessProfile.workspaceId
    ) {
      throw new Error(
        "WorkspaceSemanticConfiguration and BusinessProfile workspaceId must match.",
      );
    }
    validateBusinessProfile(
      configuration.businessProfile,
      new Set(this.capabilities.keys()),
    );
    for (const componentId of configuration.enabledComponentIds) {
      if (!this.components.has(componentId)) {
        throw new Error(
          `Workspace configuration references unknown component: ${componentId}`,
        );
      }
    }
    this.workspaceConfigurations.set(configuration.workspaceId, configuration);
  }

  getCapability(id: SemanticId): BusinessCapabilityDefinition | undefined {
    return this.capabilities.get(id);
  }

  getComponent(id: SemanticId): BusinessComponentDefinition | undefined {
    return this.components.get(id);
  }

  getWorkspaceConfiguration(
    workspaceId: string,
  ): WorkspaceSemanticConfiguration | undefined {
    return this.workspaceConfigurations.get(workspaceId);
  }

  listCapabilities(): readonly BusinessCapabilityDefinition[] {
    return [...this.capabilities.values()];
  }

  listComponents(): readonly BusinessComponentDefinition[] {
    return [...this.components.values()];
  }

  listCapabilityChildren(
    parentCapabilityId: SemanticId,
  ): readonly BusinessCapabilityDefinition[] {
    return [...this.capabilities.values()].filter(
      (capability) => capability.parentCapabilityId === parentCapabilityId,
    );
  }

  listComponentsProvidingCapability(
    capabilityId: SemanticId,
  ): readonly BusinessComponentDefinition[] {
    return [...this.components.values()].filter((component) =>
      component.providesCapabilityIds.includes(capabilityId),
    );
  }

  listUnsatisfiedProfileCapabilities(
    workspaceId: string,
  ): readonly SemanticId[] {
    const configuration = this.workspaceConfigurations.get(workspaceId);
    if (!configuration) {
      throw new Error("Workspace semantic configuration not found.");
    }
    const provided = new Set<SemanticId>();
    for (const componentId of configuration.enabledComponentIds) {
      const component = this.components.get(componentId);
      for (const capabilityId of component?.providesCapabilityIds ?? []) {
        provided.add(capabilityId);
      }
    }
    return configuration.businessProfile.requiredCapabilityIds.filter(
      (capabilityId) => !provided.has(capabilityId),
    );
  }

  buildRelationshipSnapshot(): BusinessSemanticModelSnapshot {
    const relationships: BusinessSemanticRelationship[] = [];
    for (const capability of this.capabilities.values()) {
      if (capability.parentCapabilityId) {
        relationships.push({
          semanticId: toSemanticId(
            `${baseSemanticId(capability.semanticId)}.relationship.requires-parent`,
          ),
          relationship: "REQUIRES",
          sourceSemanticId: capability.semanticId,
          targetSemanticId: capability.parentCapabilityId,
          scope: "GLOBAL",
        });
      }
    }
    for (const component of this.components.values()) {
      for (const capabilityId of component.providesCapabilityIds) {
        relationships.push({
          semanticId: toSemanticId(
            `${baseSemanticId(component.semanticId)}.relationship.provides.${lastSegment(capabilityId)}`,
          ),
          relationship: "PROVIDES",
          sourceSemanticId: component.semanticId,
          targetSemanticId: capabilityId,
          scope: "GLOBAL",
        });
      }
      for (const capabilityId of component.requiresCapabilityIds) {
        relationships.push({
          semanticId: toSemanticId(
            `${baseSemanticId(component.semanticId)}.relationship.requires.${lastSegment(capabilityId)}`,
          ),
          relationship: "REQUIRES",
          sourceSemanticId: component.semanticId,
          targetSemanticId: capabilityId,
          scope: "GLOBAL",
        });
      }
      for (const dependencyId of component.dependsOnComponentIds) {
        relationships.push({
          semanticId: toSemanticId(
            `${baseSemanticId(component.semanticId)}.relationship.depends-on.${lastSegment(dependencyId)}`,
          ),
          relationship: "DEPENDS_ON",
          sourceSemanticId: component.semanticId,
          targetSemanticId: dependencyId,
          scope: "GLOBAL",
        });
      }
      for (const conflictId of component.conflictsWithComponentIds) {
        relationships.push({
          semanticId: toSemanticId(
            `${baseSemanticId(component.semanticId)}.relationship.conflicts-with.${lastSegment(conflictId)}`,
          ),
          relationship: "CONFLICTS_WITH",
          sourceSemanticId: component.semanticId,
          targetSemanticId: conflictId,
          scope: "GLOBAL",
        });
      }
    }
    return {
      capabilities: this.listCapabilities(),
      components: this.listComponents(),
      relationships,
    };
  }

  private assertNoCapabilityCycles(): void {
    const visiting = new Set<SemanticId>();
    const visited = new Set<SemanticId>();
    const visit = (id: SemanticId): void => {
      if (visited.has(id)) return;
      if (visiting.has(id)) {
        throw new Error("BusinessCapability hierarchy cycle rejected.");
      }
      visiting.add(id);
      const parentId = this.capabilities.get(id)?.parentCapabilityId;
      if (parentId) visit(parentId);
      visiting.delete(id);
      visited.add(id);
    };
    for (const id of this.capabilities.keys()) {
      visit(id);
    }
  }

  private assertNoComponentDependencyCycles(): void {
    const visiting = new Set<SemanticId>();
    const visited = new Set<SemanticId>();
    const visit = (id: SemanticId): void => {
      if (visited.has(id)) return;
      if (visiting.has(id)) {
        throw new Error("Component dependency cycle rejected.");
      }
      visiting.add(id);
      for (const dependencyId of this.components.get(id)
        ?.dependsOnComponentIds ?? []) {
        if (this.components.has(dependencyId)) {
          visit(dependencyId);
        }
      }
      visiting.delete(id);
      visited.add(id);
    };
    for (const id of this.components.keys()) {
      visit(id);
    }
  }
}

function assertUnique<T>(values: readonly T[], label: string): void {
  if (new Set(values).size !== values.length) {
    throw new Error(`${label} must be unique.`);
  }
}

function lastSegment(value: string): string {
  return baseSemanticId(value).split(".").at(-1) ?? "item";
}

function baseSemanticId(value: string): string {
  return value.replace(/@[0-9]+\.[0-9]+\.[0-9]+$/, "");
}
