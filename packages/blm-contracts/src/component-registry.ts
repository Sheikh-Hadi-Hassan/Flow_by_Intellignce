import {
  toSemanticId,
  validateSemanticId,
  validateSemanticScope,
  type SemanticId,
} from "./business-semantic-model.js";

export type ComponentLifecycleStatus =
  "EXPERIMENTAL" | "ACTIVE" | "DEPRECATED" | "RETIRED";

export type ComponentAvailability = "EXECUTABLE" | "SEMANTIC_ONLY";

export type ComponentConfigurationFieldType =
  "STRING" | "BOOLEAN" | "INTEGER" | "DECIMAL" | "ENUM";

export type ComponentRegistryValidationCode =
  | "UNKNOWN_COMPONENT"
  | "DUPLICATE_COMPONENT"
  | "INVALID_SEMANTIC_ID"
  | "INVALID_SCOPE"
  | "INVALID_LIFECYCLE"
  | "UNKNOWN_CAPABILITY"
  | "DUPLICATE_REFERENCE"
  | "MISSING_IMPLEMENTATION_BINDING"
  | "UNKNOWN_MODULE_BINDING"
  | "INVALID_MODULE_VERSION"
  | "INVALID_CONFIGURATION_CONTRACT"
  | "UNKNOWN_DEPENDENCY"
  | "DIRECT_CONFLICT"
  | "DEPENDENCY_CYCLE"
  | "TENANT_BOUNDARY_VIOLATION";

export interface ComponentRegistryValidationError {
  readonly code: ComponentRegistryValidationCode;
  readonly message: string;
  readonly componentSemanticId?: SemanticId;
  readonly targetSemanticId?: SemanticId;
  readonly moduleKey?: string;
  readonly field?: string;
}

export interface ComponentRegistryValidationResult {
  readonly valid: boolean;
  readonly errors: readonly ComponentRegistryValidationError[];
}

export interface TrustedModuleDefinition {
  readonly key: string;
  readonly version: string;
  readonly status: "ACTIVE" | "DEPRECATED" | "DISABLED";
  readonly capabilities: readonly string[];
  readonly dependencies: readonly string[];
  readonly entityTypes: readonly string[];
  readonly actions: readonly string[];
}

export interface ComponentConfigurationFieldDefinition {
  readonly key: string;
  readonly type: ComponentConfigurationFieldType;
  readonly required?: boolean;
  readonly enumValues?: readonly string[];
  readonly defaultValue?: string | number | boolean;
}

export interface ComponentConfigurationContract {
  readonly version: number;
  readonly fields: readonly ComponentConfigurationFieldDefinition[];
}

export interface ComponentImplementationBinding {
  readonly availability: ComponentAvailability;
  readonly moduleBindings: readonly ComponentModuleBinding[];
  readonly deferredReason?: string;
}

export interface ComponentModuleBinding {
  readonly moduleKey: string;
  readonly moduleVersion: string;
  readonly required: boolean;
  readonly purpose?: string;
}

export interface ComponentRegistration {
  readonly semanticId: SemanticId;
  readonly version: string;
  readonly displayName: string;
  readonly description: string;
  readonly lifecycleStatus: ComponentLifecycleStatus;
  readonly replacementComponentId?: SemanticId;
  readonly providesCapabilityIds: readonly SemanticId[];
  readonly requiresCapabilityIds: readonly SemanticId[];
  readonly dependsOnComponentIds: readonly SemanticId[];
  readonly optionalDependencyIds: readonly SemanticId[];
  readonly conflictsWithComponentIds: readonly SemanticId[];
  readonly implementation: ComponentImplementationBinding;
  readonly configurationContract?: ComponentConfigurationContract;
  readonly usesEntityTypeKeys: readonly string[];
  readonly exposesActions: readonly string[];
  readonly producesEvents: readonly SemanticId[];
  readonly consumesEvents: readonly SemanticId[];
  readonly semanticMetadata?: Readonly<
    Record<string, string | number | boolean>
  >;
  readonly scope: "GLOBAL";
  readonly workspaceId?: never;
}

export interface WorkspaceComponentConfiguration {
  readonly workspaceId: string;
  readonly componentSemanticId: SemanticId;
  readonly componentVersion: string;
  readonly configuration: Readonly<Record<string, unknown>>;
}

export interface ComponentAvailabilityReport {
  readonly semanticId: SemanticId;
  readonly registered: boolean;
  readonly availability: ComponentAvailability | "UNKNOWN";
  readonly executable: boolean;
  readonly reason: string;
  readonly moduleBindings: readonly ComponentModuleBinding[];
}

export class ComponentRegistry {
  private readonly components = new Map<SemanticId, ComponentRegistration>();
  private readonly trustedModules = new Map<string, TrustedModuleDefinition>();
  private readonly workspaceConfigurations = new Map<
    string,
    WorkspaceComponentConfiguration
  >();

  constructor(input: {
    readonly trustedModules: readonly TrustedModuleDefinition[];
    readonly components?: readonly ComponentRegistration[];
    readonly knownCapabilityIds: readonly SemanticId[];
  }) {
    this.knownCapabilityIds = new Set(input.knownCapabilityIds);
    for (const moduleDefinition of input.trustedModules) {
      this.trustedModules.set(moduleDefinition.key, moduleDefinition);
    }
    for (const component of input.components ?? []) {
      this.register(component);
    }
  }

  private readonly knownCapabilityIds: ReadonlySet<SemanticId>;

  register(
    component: ComponentRegistration,
  ): ComponentRegistryValidationResult {
    const errors = this.validateRegistration(component);
    if (this.components.has(component.semanticId)) {
      errors.push({
        code: "DUPLICATE_COMPONENT",
        message: `Component already registered: ${component.semanticId}`,
        componentSemanticId: component.semanticId,
      });
    }
    if (errors.length === 0) {
      this.components.set(component.semanticId, component);
      errors.push(...this.validateDependencyGraph());
      if (errors.length > 0) {
        this.components.delete(component.semanticId);
      }
    }
    return { valid: errors.length === 0, errors };
  }

  getComponent(semanticId: SemanticId): ComponentRegistration | undefined {
    return this.components.get(semanticId);
  }

  requireComponent(semanticId: SemanticId): ComponentRegistration {
    const component = this.components.get(semanticId);
    if (!component) {
      throw new ComponentRegistryError({
        code: "UNKNOWN_COMPONENT",
        message: `Unknown component: ${semanticId}`,
        componentSemanticId: semanticId,
      });
    }
    return component;
  }

  isTrustedComponent(semanticId: SemanticId): boolean {
    return this.components.has(semanticId);
  }

  listComponents(): readonly ComponentRegistration[] {
    return [...this.components.values()];
  }

  findComponentsProvidingCapability(
    capabilityId: SemanticId,
  ): readonly ComponentRegistration[] {
    return [...this.components.values()].filter((component) =>
      component.providesCapabilityIds.includes(capabilityId),
    );
  }

  getCapabilitiesProvidedByComponent(
    semanticId: SemanticId,
  ): readonly SemanticId[] {
    return this.requireComponent(semanticId).providesCapabilityIds;
  }

  getCapabilitiesRequiredByComponent(
    semanticId: SemanticId,
  ): readonly SemanticId[] {
    return this.requireComponent(semanticId).requiresCapabilityIds;
  }

  getComponentDependencies(semanticId: SemanticId): readonly SemanticId[] {
    return this.requireComponent(semanticId).dependsOnComponentIds;
  }

  getComponentConflicts(semanticId: SemanticId): readonly SemanticId[] {
    return this.requireComponent(semanticId).conflictsWithComponentIds;
  }

  getImplementationBinding(
    semanticId: SemanticId,
  ): ComponentImplementationBinding {
    return this.requireComponent(semanticId).implementation;
  }

  getAvailabilityReport(semanticId: SemanticId): ComponentAvailabilityReport {
    const component = this.components.get(semanticId);
    if (!component) {
      return {
        semanticId,
        registered: false,
        availability: "UNKNOWN",
        executable: false,
        reason: "Component is not registered in the trusted registry.",
        moduleBindings: [],
      };
    }
    if (component.implementation.availability === "SEMANTIC_ONLY") {
      return {
        semanticId,
        registered: true,
        availability: "SEMANTIC_ONLY",
        executable: false,
        reason:
          component.implementation.deferredReason ??
          "Component is semantically known but has no executable binding.",
        moduleBindings: [],
      };
    }
    const missingBinding = component.implementation.moduleBindings.find(
      (binding) => !this.trustedModules.has(binding.moduleKey),
    );
    if (missingBinding) {
      return {
        semanticId,
        registered: true,
        availability: "EXECUTABLE",
        executable: false,
        reason: `Implementation module is not trusted: ${missingBinding.moduleKey}`,
        moduleBindings: component.implementation.moduleBindings,
      };
    }
    return {
      semanticId,
      registered: true,
      availability: "EXECUTABLE",
      executable: component.lifecycleStatus === "ACTIVE",
      reason:
        component.lifecycleStatus === "ACTIVE"
          ? "Component has trusted executable bindings."
          : `Component lifecycle is ${component.lifecycleStatus}.`,
      moduleBindings: component.implementation.moduleBindings,
    };
  }

  setWorkspaceComponentConfiguration(
    configuration: WorkspaceComponentConfiguration,
  ): ComponentRegistryValidationResult {
    const component = this.components.get(configuration.componentSemanticId);
    const errors: ComponentRegistryValidationError[] = [];
    if (!configuration.workspaceId) {
      errors.push({
        code: "TENANT_BOUNDARY_VIOLATION",
        message: "Workspace component configuration requires workspaceId.",
        componentSemanticId: configuration.componentSemanticId,
      });
    }
    if (!component) {
      errors.push({
        code: "UNKNOWN_COMPONENT",
        message: `Unknown component: ${configuration.componentSemanticId}`,
        componentSemanticId: configuration.componentSemanticId,
      });
    } else {
      if (component.version !== configuration.componentVersion) {
        errors.push({
          code: "INVALID_MODULE_VERSION",
          message:
            "Workspace component configuration version does not match registration.",
          componentSemanticId: configuration.componentSemanticId,
        });
      }
      errors.push(
        ...validateComponentConfiguration(
          component.configurationContract,
          configuration.configuration,
          component.semanticId,
        ),
      );
    }
    if (errors.length === 0) {
      this.workspaceConfigurations.set(
        workspaceConfigurationKey(
          configuration.workspaceId,
          configuration.componentSemanticId,
        ),
        configuration,
      );
    }
    return { valid: errors.length === 0, errors };
  }

  getWorkspaceComponentConfiguration(input: {
    readonly workspaceId: string;
    readonly componentSemanticId: SemanticId;
  }): WorkspaceComponentConfiguration | undefined {
    return this.workspaceConfigurations.get(
      workspaceConfigurationKey(input.workspaceId, input.componentSemanticId),
    );
  }

  validateRegistrations(): ComponentRegistryValidationResult {
    const errors = [...this.components.values()].flatMap((component) =>
      this.validateRegistration(component),
    );
    errors.push(...this.validateDependencyGraph());
    return { valid: errors.length === 0, errors };
  }

  validateComponentSet(
    componentSemanticIds: readonly SemanticId[],
  ): ComponentRegistryValidationResult {
    const selected = new Set(componentSemanticIds);
    const errors: ComponentRegistryValidationError[] = [];
    for (const componentSemanticId of componentSemanticIds) {
      const component = this.components.get(componentSemanticId);
      if (!component) {
        errors.push({
          code: "UNKNOWN_COMPONENT",
          message: `Unknown component: ${componentSemanticId}`,
          componentSemanticId,
        });
        continue;
      }
      for (const dependencyId of component.dependsOnComponentIds) {
        if (!selected.has(dependencyId)) {
          errors.push({
            code: "UNKNOWN_DEPENDENCY",
            message: `Selected component set is missing required dependency: ${dependencyId}`,
            componentSemanticId,
            targetSemanticId: dependencyId,
          });
        }
      }
      for (const conflictId of component.conflictsWithComponentIds) {
        if (selected.has(conflictId)) {
          errors.push({
            code: "DIRECT_CONFLICT",
            message: `Selected component set contains direct conflict: ${conflictId}`,
            componentSemanticId,
            targetSemanticId: conflictId,
          });
        }
      }
    }
    return { valid: errors.length === 0, errors };
  }

  private validateRegistration(
    component: ComponentRegistration,
  ): ComponentRegistryValidationError[] {
    const errors: ComponentRegistryValidationError[] = [];
    try {
      validateSemanticId(component.semanticId);
    } catch (error) {
      errors.push({
        code: "INVALID_SEMANTIC_ID",
        message:
          error instanceof Error ? error.message : "Invalid semantic id.",
        componentSemanticId: component.semanticId,
      });
    }
    try {
      validateSemanticScope({
        scope: component.scope,
        label: "ComponentRegistration",
        ...((component as { readonly workspaceId?: string }).workspaceId
          ? {
              workspaceId: (component as { readonly workspaceId?: string })
                .workspaceId,
            }
          : {}),
      });
    } catch (error) {
      errors.push({
        code: "INVALID_SCOPE",
        message:
          error instanceof Error ? error.message : "Invalid component scope.",
        componentSemanticId: component.semanticId,
      });
    }
    if (
      !["EXPERIMENTAL", "ACTIVE", "DEPRECATED", "RETIRED"].includes(
        component.lifecycleStatus,
      )
    ) {
      errors.push({
        code: "INVALID_LIFECYCLE",
        message: `Invalid lifecycle status: ${component.lifecycleStatus}`,
        componentSemanticId: component.semanticId,
      });
    }
    for (const [label, values] of [
      ["provided capabilities", component.providesCapabilityIds],
      ["required capabilities", component.requiresCapabilityIds],
      ["component dependencies", component.dependsOnComponentIds],
      ["optional component dependencies", component.optionalDependencyIds],
      ["component conflicts", component.conflictsWithComponentIds],
    ] as const) {
      if (new Set(values).size !== values.length) {
        errors.push({
          code: "DUPLICATE_REFERENCE",
          message: `${label} must be unique.`,
          componentSemanticId: component.semanticId,
        });
      }
    }
    for (const capabilityId of [
      ...component.providesCapabilityIds,
      ...component.requiresCapabilityIds,
    ]) {
      if (!this.knownCapabilityIds.has(capabilityId)) {
        errors.push({
          code: "UNKNOWN_CAPABILITY",
          message: `Component references unknown capability: ${capabilityId}`,
          componentSemanticId: component.semanticId,
          targetSemanticId: capabilityId,
        });
      }
    }
    if (
      component.dependsOnComponentIds.includes(component.semanticId) ||
      component.optionalDependencyIds.includes(component.semanticId)
    ) {
      errors.push({
        code: "UNKNOWN_DEPENDENCY",
        message: "Component cannot depend on itself.",
        componentSemanticId: component.semanticId,
      });
    }
    if (component.conflictsWithComponentIds.includes(component.semanticId)) {
      errors.push({
        code: "DIRECT_CONFLICT",
        message: "Component cannot conflict with itself.",
        componentSemanticId: component.semanticId,
        targetSemanticId: component.semanticId,
      });
    }
    for (const dependencyId of component.dependsOnComponentIds) {
      if (!this.components.has(dependencyId)) {
        errors.push({
          code: "UNKNOWN_DEPENDENCY",
          message: `Component dependency is not registered: ${dependencyId}`,
          componentSemanticId: component.semanticId,
          targetSemanticId: dependencyId,
        });
      }
    }
    for (const conflictId of component.conflictsWithComponentIds) {
      if (this.components.has(conflictId)) {
        const other = this.components.get(conflictId);
        if (other?.dependsOnComponentIds.includes(component.semanticId)) {
          errors.push({
            code: "DIRECT_CONFLICT",
            message: "Component conflicts with a component that depends on it.",
            componentSemanticId: component.semanticId,
            targetSemanticId: conflictId,
          });
        }
      }
    }
    errors.push(...this.validateImplementationBinding(component));
    errors.push(
      ...validateConfigurationContract(
        component.configurationContract,
        component.semanticId,
      ),
    );
    return errors;
  }

  private validateImplementationBinding(
    component: ComponentRegistration,
  ): readonly ComponentRegistryValidationError[] {
    const errors: ComponentRegistryValidationError[] = [];
    const binding = component.implementation;
    if (
      binding.availability === "EXECUTABLE" &&
      binding.moduleBindings.length === 0
    ) {
      errors.push({
        code: "MISSING_IMPLEMENTATION_BINDING",
        message: "Executable component requires at least one module binding.",
        componentSemanticId: component.semanticId,
      });
    }
    if (
      binding.availability === "SEMANTIC_ONLY" &&
      binding.moduleBindings.length > 0
    ) {
      errors.push({
        code: "MISSING_IMPLEMENTATION_BINDING",
        message: "Semantic-only component cannot claim module bindings.",
        componentSemanticId: component.semanticId,
      });
    }
    for (const moduleBinding of binding.moduleBindings) {
      const moduleDefinition = this.trustedModules.get(moduleBinding.moduleKey);
      if (!moduleDefinition) {
        errors.push({
          code: "UNKNOWN_MODULE_BINDING",
          message: `Unknown trusted ModuleDefinition binding: ${moduleBinding.moduleKey}`,
          componentSemanticId: component.semanticId,
          moduleKey: moduleBinding.moduleKey,
        });
        continue;
      }
      if (moduleDefinition.version !== moduleBinding.moduleVersion) {
        errors.push({
          code: "INVALID_MODULE_VERSION",
          message: `Module binding version ${moduleBinding.moduleVersion} does not match trusted module ${moduleDefinition.version}.`,
          componentSemanticId: component.semanticId,
          moduleKey: moduleBinding.moduleKey,
        });
      }
      if (moduleDefinition.status === "DISABLED") {
        errors.push({
          code: "UNKNOWN_MODULE_BINDING",
          message: `Module binding is disabled: ${moduleBinding.moduleKey}`,
          componentSemanticId: component.semanticId,
          moduleKey: moduleBinding.moduleKey,
        });
      }
    }
    return errors;
  }

  private validateDependencyGraph(): readonly ComponentRegistryValidationError[] {
    const errors: ComponentRegistryValidationError[] = [];
    const visiting = new Set<SemanticId>();
    const visited = new Set<SemanticId>();
    const visit = (id: SemanticId): void => {
      if (visited.has(id)) return;
      if (visiting.has(id)) {
        errors.push({
          code: "DEPENDENCY_CYCLE",
          message: "Component dependency cycle rejected.",
          componentSemanticId: id,
        });
        return;
      }
      visiting.add(id);
      for (const dependencyId of this.components.get(id)
        ?.dependsOnComponentIds ?? []) {
        if (this.components.has(dependencyId)) visit(dependencyId);
      }
      visiting.delete(id);
      visited.add(id);
    };
    for (const id of this.components.keys()) {
      visit(id);
    }
    return errors;
  }
}

export class ComponentRegistryError extends Error {
  readonly validationError: ComponentRegistryValidationError;

  constructor(validationError: ComponentRegistryValidationError) {
    super(validationError.message);
    this.name = "ComponentRegistryError";
    this.validationError = validationError;
  }
}

export function validateConfigurationContract(
  contract: ComponentConfigurationContract | undefined,
  componentSemanticId: SemanticId,
): readonly ComponentRegistryValidationError[] {
  if (!contract) return [];
  const errors: ComponentRegistryValidationError[] = [];
  const keys = new Set<string>();
  for (const field of contract.fields) {
    if (!/^[a-z][a-zA-Z0-9]*$/.test(field.key)) {
      errors.push({
        code: "INVALID_CONFIGURATION_CONTRACT",
        message: `Invalid configuration key: ${field.key}`,
        componentSemanticId,
        field: field.key,
      });
    }
    if (keys.has(field.key)) {
      errors.push({
        code: "INVALID_CONFIGURATION_CONTRACT",
        message: `Duplicate configuration key: ${field.key}`,
        componentSemanticId,
        field: field.key,
      });
    }
    keys.add(field.key);
    if (
      field.type === "ENUM" &&
      (!field.enumValues || field.enumValues.length === 0)
    ) {
      errors.push({
        code: "INVALID_CONFIGURATION_CONTRACT",
        message: `ENUM configuration field ${field.key} requires options.`,
        componentSemanticId,
        field: field.key,
      });
    }
  }
  return errors;
}

export function validateComponentConfiguration(
  contract: ComponentConfigurationContract | undefined,
  configuration: Readonly<Record<string, unknown>>,
  componentSemanticId: SemanticId,
): readonly ComponentRegistryValidationError[] {
  const errors = [
    ...validateConfigurationContract(contract, componentSemanticId),
  ];
  if (!contract) {
    if (Object.keys(configuration).length > 0) {
      errors.push({
        code: "INVALID_CONFIGURATION_CONTRACT",
        message: "Component does not accept workspace configuration.",
        componentSemanticId,
      });
    }
    return errors;
  }
  for (const field of contract.fields) {
    const value = configuration[field.key];
    if (field.required && value === undefined) {
      errors.push({
        code: "INVALID_CONFIGURATION_CONTRACT",
        message: `Missing required component configuration: ${field.key}`,
        componentSemanticId,
        field: field.key,
      });
      continue;
    }
    if (value === undefined) continue;
    if (field.type === "STRING" && typeof value !== "string") {
      errors.push(typeError(componentSemanticId, field.key, "string"));
    }
    if (field.type === "BOOLEAN" && typeof value !== "boolean") {
      errors.push(typeError(componentSemanticId, field.key, "boolean"));
    }
    if (
      field.type === "INTEGER" &&
      (typeof value !== "number" || !Number.isInteger(value))
    ) {
      errors.push(typeError(componentSemanticId, field.key, "integer"));
    }
    if (field.type === "DECIMAL" && typeof value !== "number") {
      errors.push(typeError(componentSemanticId, field.key, "decimal"));
    }
    if (
      field.type === "ENUM" &&
      (typeof value !== "string" || !field.enumValues?.includes(value))
    ) {
      errors.push({
        code: "INVALID_CONFIGURATION_CONTRACT",
        message: `Component configuration ${field.key} is outside allowed options.`,
        componentSemanticId,
        field: field.key,
      });
    }
  }
  return errors;
}

export const customerManagementComponentId = toSemanticId(
  "flow.component.crm.customer-management",
);
export const leadManagementComponentId = toSemanticId(
  "flow.component.crm.lead-management",
);
export const quotationManagementComponentId = toSemanticId(
  "flow.component.sales.quotation-management",
);
export const quotationApprovalComponentId = toSemanticId(
  "flow.component.sales.quotation-approval",
);
export const projectManagementComponentId = toSemanticId(
  "flow.component.projects.project-management",
);
export const invoiceManagementComponentId = toSemanticId(
  "flow.component.finance.invoice-management",
);
export const taskManagementComponentId = toSemanticId(
  "flow.component.work.task-management",
);

function typeError(
  componentSemanticId: SemanticId,
  field: string,
  expected: string,
): ComponentRegistryValidationError {
  return {
    code: "INVALID_CONFIGURATION_CONTRACT",
    message: `Component configuration ${field} must be a ${expected}.`,
    componentSemanticId,
    field,
  };
}

function workspaceConfigurationKey(
  workspaceId: string,
  componentSemanticId: SemanticId,
): string {
  return `${workspaceId}:${componentSemanticId}`;
}
