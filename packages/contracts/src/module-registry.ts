export type ModuleStatus = "ACTIVE" | "DEPRECATED" | "DISABLED";
export type WorkspaceModuleActivationStatus = "ENABLED" | "DISABLED";
export type ModuleConfigurationFieldType =
  "STRING" | "BOOLEAN" | "INTEGER" | "ENUM";

export interface ModuleConfigurationFieldDefinition {
  readonly key: string;
  readonly type: ModuleConfigurationFieldType;
  readonly required?: boolean;
  readonly enumValues?: readonly string[];
}

export interface ModuleConfigurationSchema {
  readonly version: number;
  readonly fields: readonly ModuleConfigurationFieldDefinition[];
}

export interface ModuleDefinition {
  readonly key: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly category?: string;
  readonly status: ModuleStatus;
  readonly capabilities: readonly string[];
  readonly dependencies: readonly string[];
  readonly entityTypes: readonly string[];
  readonly actions: readonly string[];
  readonly configurationSchema?: ModuleConfigurationSchema;
}

export interface WorkspaceModuleActivation {
  readonly id: string;
  readonly workspaceId: string;
  readonly moduleKey: string;
  readonly version: string;
  readonly status: WorkspaceModuleActivationStatus;
  readonly configuration: Readonly<Record<string, unknown>>;
  readonly enabledAt: string;
  readonly enabledBy: string;
  readonly updatedAt: string;
}

export interface ModuleEnableInput {
  readonly workspaceId: string;
  readonly moduleKey: string;
  readonly version: string;
  readonly configuration?: Readonly<Record<string, unknown>>;
  readonly enabledBy: string;
}

export const coreOrganizationModule: ModuleDefinition = {
  key: "core.organization",
  name: "Organization",
  version: "1.0.0",
  description: "Core workspace organization metadata and hierarchy.",
  category: "core",
  status: "ACTIVE",
  capabilities: [
    "organization.profile",
    "organization.units",
    "organization.locations",
  ],
  dependencies: [],
  entityTypes: ["core.organization.organization"],
  actions: ["organization.read", "organization.update_profile"],
  configurationSchema: {
    version: 1,
    fields: [
      {
        key: "profileEditing",
        type: "BOOLEAN",
        required: true,
      },
    ],
  },
};

export const commercialCoreTestModule: ModuleDefinition = {
  key: "test.commercial_core",
  name: "Commercial Core Test Module",
  version: "1.0.0",
  description: "Foundation-only module used for dependency tests.",
  category: "test",
  status: "ACTIVE",
  capabilities: ["commercial.shared"],
  dependencies: [],
  entityTypes: [],
  actions: [],
};

export const proposalsTestModule: ModuleDefinition = {
  key: "test.proposals",
  name: "Proposal Test Module",
  version: "1.0.0",
  description: "Foundation-only dependent module used for dependency tests.",
  category: "test",
  status: "ACTIVE",
  capabilities: ["proposals.drafting"],
  dependencies: ["test.commercial_core"],
  entityTypes: [],
  actions: ["proposal.read"],
};

function assertSafeRegistryString(value: string, label: string): void {
  if (
    /javascript:|https?:\/\/|<script|\bselect\b|\binsert\b|\bdelete\b|\bdrop\b|\bshell\b/i.test(
      value,
    )
  ) {
    throw new Error(
      `${label} cannot contain executable code, SQL, or remote URLs.`,
    );
  }
}

export function validateModuleDefinition(definition: ModuleDefinition): void {
  assertSafeRegistryString(definition.key, "Module key");
  assertSafeRegistryString(definition.description, "Module description");
  if (definition.dependencies.includes(definition.key)) {
    throw new Error("Module cannot depend on itself.");
  }
  if (
    new Set(definition.capabilities).size !== definition.capabilities.length
  ) {
    throw new Error("Module capabilities must be unique.");
  }
  if (definition.configurationSchema) {
    validateConfigurationSchema(definition.configurationSchema);
  }
}

export function validateConfigurationSchema(
  schema: ModuleConfigurationSchema,
): void {
  const keys = new Set<string>();
  for (const field of schema.fields) {
    if (keys.has(field.key)) {
      throw new Error(`Duplicate configuration key: ${field.key}`);
    }
    keys.add(field.key);
    if (
      field.type === "ENUM" &&
      (!field.enumValues || field.enumValues.length === 0)
    ) {
      throw new Error(
        `ENUM configuration field ${field.key} requires options.`,
      );
    }
  }
}

export function validateConfiguration(
  schema: ModuleConfigurationSchema | undefined,
  configuration: Readonly<Record<string, unknown>>,
): void {
  if (!schema) {
    if (Object.keys(configuration).length > 0) {
      throw new Error("Module does not accept configuration.");
    }
    return;
  }

  for (const field of schema.fields) {
    const value = configuration[field.key];
    if (field.required && value === undefined) {
      throw new Error(`Missing required module configuration: ${field.key}`);
    }
    if (value === undefined) {
      continue;
    }
    if (field.type === "STRING" && typeof value !== "string") {
      throw new Error(`Module configuration ${field.key} must be a string.`);
    }
    if (field.type === "BOOLEAN" && typeof value !== "boolean") {
      throw new Error(`Module configuration ${field.key} must be a boolean.`);
    }
    if (
      field.type === "INTEGER" &&
      (!Number.isInteger(value) || typeof value !== "number")
    ) {
      throw new Error(`Module configuration ${field.key} must be an integer.`);
    }
    if (
      field.type === "ENUM" &&
      (typeof value !== "string" || !field.enumValues?.includes(value))
    ) {
      throw new Error(
        `Module configuration ${field.key} is outside allowed options.`,
      );
    }
  }
}

export class ModuleRegistry {
  private readonly modules = new Map<string, ModuleDefinition>();
  private readonly activations = new Map<string, WorkspaceModuleActivation>();

  constructor(definitions: readonly ModuleDefinition[] = []) {
    for (const definition of definitions) {
      this.register(definition);
    }
  }

  register(definition: ModuleDefinition): void {
    validateModuleDefinition(definition);
    if (this.modules.has(definition.key)) {
      throw new Error(`Module already registered: ${definition.key}`);
    }
    this.modules.set(definition.key, definition);
    this.assertNoDependencyCycles();
  }

  listAvailableModules(): readonly ModuleDefinition[] {
    return [...this.modules.values()];
  }

  getModule(key: string): ModuleDefinition | undefined {
    return this.modules.get(key);
  }

  listEnabledModules(
    workspaceId: string,
  ): readonly WorkspaceModuleActivation[] {
    return [...this.activations.values()].filter(
      (activation) =>
        activation.workspaceId === workspaceId &&
        activation.status === "ENABLED",
    );
  }

  getCapabilities(workspaceId: string): readonly string[] {
    const capabilities = new Set<string>();
    for (const activation of this.listEnabledModules(workspaceId)) {
      const definition = this.modules.get(activation.moduleKey);
      for (const capability of definition?.capabilities ?? []) {
        capabilities.add(capability);
      }
    }
    return [...capabilities].sort();
  }

  isModuleEnabled(workspaceId: string, moduleKey: string): boolean {
    return (
      this.activations.get(`${workspaceId}:${moduleKey}`)?.status === "ENABLED"
    );
  }

  enableModule(input: ModuleEnableInput): WorkspaceModuleActivation {
    const definition = this.modules.get(input.moduleKey);
    if (!definition || definition.status !== "ACTIVE") {
      throw new Error("Module is not available for activation.");
    }
    if (definition.version !== input.version) {
      throw new Error("Module activation version does not match definition.");
    }
    for (const dependency of definition.dependencies) {
      if (!this.isModuleEnabled(input.workspaceId, dependency)) {
        throw new Error(`Missing required module dependency: ${dependency}`);
      }
    }
    const configuration = input.configuration ?? {};
    validateConfiguration(definition.configurationSchema, configuration);

    const now = new Date(0).toISOString();
    const activation: WorkspaceModuleActivation = {
      id: `${input.workspaceId}:${input.moduleKey}`,
      workspaceId: input.workspaceId,
      moduleKey: input.moduleKey,
      version: input.version,
      status: "ENABLED",
      configuration,
      enabledAt: now,
      enabledBy: input.enabledBy,
      updatedAt: now,
    };
    this.activations.set(`${input.workspaceId}:${input.moduleKey}`, activation);
    return activation;
  }

  disableModule(input: {
    readonly workspaceId: string;
    readonly moduleKey: string;
  }): WorkspaceModuleActivation {
    const activation = this.activations.get(
      `${input.workspaceId}:${input.moduleKey}`,
    );
    if (!activation) {
      throw new Error("Module activation does not exist.");
    }
    const disabled = {
      ...activation,
      status: "DISABLED" as const,
      updatedAt: new Date(0).toISOString(),
    };
    this.activations.set(`${input.workspaceId}:${input.moduleKey}`, disabled);
    return disabled;
  }

  private assertNoDependencyCycles(): void {
    const visiting = new Set<string>();
    const visited = new Set<string>();
    const visit = (key: string): void => {
      if (visited.has(key)) return;
      if (visiting.has(key)) {
        throw new Error("Module dependency cycle rejected.");
      }
      visiting.add(key);
      for (const dependency of this.modules.get(key)?.dependencies ?? []) {
        if (this.modules.has(dependency)) {
          visit(dependency);
        }
      }
      visiting.delete(key);
      visited.add(key);
    };
    for (const key of this.modules.keys()) {
      visit(key);
    }
  }
}
