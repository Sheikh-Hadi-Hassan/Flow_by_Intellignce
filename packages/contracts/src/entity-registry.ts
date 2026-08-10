export type EntityDefinitionKind = "SYSTEM" | "CUSTOM";
export type EntityDefinitionStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
export type EntityOwnershipScope = "WORKSPACE" | "ORGANIZATION" | "USER";
export type FieldDefinitionSource = "SYSTEM" | "CUSTOM";
export type FieldDefinitionType =
  | "STRING"
  | "TEXT"
  | "BOOLEAN"
  | "INTEGER"
  | "DECIMAL"
  | "DATE"
  | "DATETIME"
  | "ENUM"
  | "REFERENCE"
  | "JSON";
export type RelationshipCardinality =
  "ONE_TO_ONE" | "ONE_TO_MANY" | "MANY_TO_MANY";
export type DefinitionOwner = "PLATFORM" | "WORKSPACE";

export interface FieldDefinition {
  readonly key: string;
  readonly label: string;
  readonly type: FieldDefinitionType;
  readonly required?: boolean;
  readonly immutable?: boolean;
  readonly source: FieldDefinitionSource;
  readonly version: string;
  readonly enumValues?: readonly string[];
  readonly referenceTargetEntityKey?: string;
}

export interface EntityActionDefinition {
  readonly action: string;
  readonly permission: string;
}

export interface EntityTypeDefinition {
  readonly id: string;
  readonly key: string;
  readonly moduleKey: string;
  readonly workspaceId?: string;
  readonly name: string;
  readonly pluralName?: string;
  readonly description?: string;
  readonly kind: EntityDefinitionKind;
  readonly status: EntityDefinitionStatus;
  readonly version: string;
  readonly ownershipScope: EntityOwnershipScope;
  readonly fields: readonly FieldDefinition[];
  readonly actions: readonly EntityActionDefinition[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface EntityRelationshipDefinition {
  readonly id: string;
  readonly key: string;
  readonly owner: DefinitionOwner;
  readonly workspaceId?: string;
  readonly sourceEntityKey: string;
  readonly targetEntityKey: string;
  readonly cardinality: RelationshipCardinality;
  readonly status: EntityDefinitionStatus;
  readonly version: string;
}

export const coreOrganizationEntityDefinition: EntityTypeDefinition = {
  id: "entity-core-organization-organization",
  key: "core.organization.organization",
  moduleKey: "core.organization",
  name: "Organization",
  pluralName: "Organizations",
  description:
    "Registry metadata for the typed organization domain table and service.",
  kind: "SYSTEM",
  status: "ACTIVE",
  version: "1.0.0",
  ownershipScope: "WORKSPACE",
  fields: [
    {
      key: "name",
      label: "Name",
      type: "STRING",
      required: true,
      immutable: false,
      source: "SYSTEM",
      version: "1.0.0",
    },
    {
      key: "status",
      label: "Status",
      type: "ENUM",
      required: true,
      source: "SYSTEM",
      version: "1.0.0",
      enumValues: ["ACTIVE", "INACTIVE", "ARCHIVED"],
    },
  ],
  actions: [
    {
      action: "organization.read",
      permission: "organization.read",
    },
    {
      action: "organization.update_profile",
      permission: "organization.update_profile",
    },
  ],
  createdAt: "2026-08-10T00:00:00.000Z",
  updatedAt: "2026-08-10T00:00:00.000Z",
};

export function validateFieldDefinition(
  field: FieldDefinition,
  knownEntityKeys: ReadonlySet<string>,
): void {
  if (
    field.type === "ENUM" &&
    (!field.enumValues || field.enumValues.length === 0)
  ) {
    throw new Error(`Enum field ${field.key} requires allowed values.`);
  }
  if (
    field.type === "REFERENCE" &&
    (!field.referenceTargetEntityKey ||
      !knownEntityKeys.has(field.referenceTargetEntityKey))
  ) {
    throw new Error(`Reference field ${field.key} has invalid target.`);
  }
}

export class EntityRegistry {
  private readonly entities = new Map<string, EntityTypeDefinition>();
  private readonly relationships = new Map<
    string,
    EntityRelationshipDefinition
  >();

  constructor(definitions: readonly EntityTypeDefinition[] = []) {
    for (const definition of definitions) {
      this.registerEntityType(definition);
    }
  }

  registerEntityType(definition: EntityTypeDefinition): void {
    if (this.entities.has(this.scopedEntityKey(definition))) {
      throw new Error(`Entity already registered: ${definition.key}`);
    }
    this.validateEntityDefinition(definition);
    this.entities.set(this.scopedEntityKey(definition), definition);
  }

  listEntityTypes(
    input: {
      readonly workspaceId?: string;
      readonly enabledModuleKeys?: readonly string[];
    } = {},
  ): readonly EntityTypeDefinition[] {
    const enabled = input.enabledModuleKeys
      ? new Set(input.enabledModuleKeys)
      : undefined;
    return [...this.entities.values()].filter((definition) => {
      if (enabled && !enabled.has(definition.moduleKey)) return false;
      if (definition.kind === "SYSTEM") return true;
      return definition.workspaceId === input.workspaceId;
    });
  }

  getEntityType(input: {
    readonly key: string;
    readonly workspaceId?: string;
  }): EntityTypeDefinition | undefined {
    return (
      this.entities.get(`WORKSPACE:${input.workspaceId ?? ""}:${input.key}`) ??
      this.entities.get(`SYSTEM::${input.key}`)
    );
  }

  archiveEntityType(input: {
    readonly key: string;
    readonly workspaceId: string;
  }): EntityTypeDefinition {
    const key = `WORKSPACE:${input.workspaceId}:${input.key}`;
    const definition = this.entities.get(key);
    if (!definition) {
      throw new Error("Workspace entity definition not found.");
    }
    const archived = {
      ...definition,
      status: "ARCHIVED" as const,
      updatedAt: new Date(0).toISOString(),
    };
    this.entities.set(key, archived);
    return archived;
  }

  updateFieldDefinition(input: {
    readonly entityKey: string;
    readonly workspaceId: string;
    readonly field: FieldDefinition;
  }): EntityTypeDefinition {
    const definition = this.getEntityType({
      key: input.entityKey,
      workspaceId: input.workspaceId,
    });
    if (!definition) throw new Error("Entity definition not found.");
    if (definition.kind === "SYSTEM") {
      throw new Error("Workspace cannot modify platform system fields.");
    }
    if (definition.workspaceId !== input.workspaceId) {
      throw new Error("Workspace cannot modify another workspace definition.");
    }
    const existing = definition.fields.find(
      (field) => field.key === input.field.key,
    );
    if (existing?.source === "SYSTEM") {
      throw new Error("Workspace cannot modify platform system fields.");
    }
    this.validateEntityDefinition({
      ...definition,
      fields: [
        ...definition.fields.filter((field) => field.key !== input.field.key),
        input.field,
      ],
    });
    const updated = {
      ...definition,
      fields: [
        ...definition.fields.filter((field) => field.key !== input.field.key),
        input.field,
      ],
      updatedAt: new Date(0).toISOString(),
    };
    this.entities.set(this.scopedEntityKey(updated), updated);
    return updated;
  }

  registerRelationship(definition: EntityRelationshipDefinition): void {
    if (this.relationships.has(this.scopedRelationshipKey(definition))) {
      throw new Error(`Relationship already registered: ${definition.key}`);
    }
    const source = this.getEntityType({
      key: definition.sourceEntityKey,
      ...(definition.workspaceId
        ? { workspaceId: definition.workspaceId }
        : {}),
    });
    const target = this.getEntityType({
      key: definition.targetEntityKey,
      ...(definition.workspaceId
        ? { workspaceId: definition.workspaceId }
        : {}),
    });
    if (!source || !target) {
      throw new Error("Relationship entities must exist.");
    }
    if (
      definition.owner === "WORKSPACE" &&
      (!definition.workspaceId ||
        (source.kind === "CUSTOM" &&
          source.workspaceId !== definition.workspaceId) ||
        (target.kind === "CUSTOM" &&
          target.workspaceId !== definition.workspaceId))
    ) {
      throw new Error("Workspace relationship cannot cross tenant boundaries.");
    }
    this.relationships.set(this.scopedRelationshipKey(definition), definition);
  }

  listRelationships(
    input: {
      readonly workspaceId?: string;
    } = {},
  ): readonly EntityRelationshipDefinition[] {
    return [...this.relationships.values()].filter((definition) => {
      if (definition.owner === "PLATFORM") return true;
      return definition.workspaceId === input.workspaceId;
    });
  }

  validateFieldValue(field: FieldDefinition, value: unknown): void {
    if (field.required && value === undefined) {
      throw new Error(`Field ${field.key} is required.`);
    }
    if (value === undefined) return;
    if (
      (field.type === "STRING" || field.type === "TEXT") &&
      typeof value !== "string"
    ) {
      throw new Error(`Field ${field.key} must be a string.`);
    }
    if (field.type === "BOOLEAN" && typeof value !== "boolean") {
      throw new Error(`Field ${field.key} must be a boolean.`);
    }
    if (
      field.type === "INTEGER" &&
      (!Number.isInteger(value) || typeof value !== "number")
    ) {
      throw new Error(`Field ${field.key} must be an integer.`);
    }
    if (
      field.type === "ENUM" &&
      (typeof value !== "string" || !field.enumValues?.includes(value))
    ) {
      throw new Error(`Field ${field.key} is outside allowed values.`);
    }
    if (field.type === "REFERENCE" && typeof value !== "string") {
      throw new Error(`Field ${field.key} must reference a record id.`);
    }
  }

  private validateEntityDefinition(definition: EntityTypeDefinition): void {
    if (definition.kind === "CUSTOM" && !definition.workspaceId) {
      throw new Error("Custom entity definitions must be workspace-scoped.");
    }
    if (definition.kind === "SYSTEM" && definition.workspaceId) {
      throw new Error("System entity definitions cannot be workspace-scoped.");
    }
    const keys = new Set<string>();
    const knownEntityKeys = new Set([
      ...[...this.entities.values()].map((entity) => entity.key),
      definition.key,
    ]);
    for (const field of definition.fields) {
      if (keys.has(field.key)) {
        throw new Error(`Duplicate field key: ${field.key}`);
      }
      keys.add(field.key);
      validateFieldDefinition(field, knownEntityKeys);
    }
  }

  private scopedEntityKey(definition: EntityTypeDefinition): string {
    if (definition.kind === "SYSTEM") return `SYSTEM::${definition.key}`;
    return `WORKSPACE:${definition.workspaceId ?? ""}:${definition.key}`;
  }

  private scopedRelationshipKey(
    definition: EntityRelationshipDefinition,
  ): string {
    return `${definition.owner}:${definition.workspaceId ?? ""}:${definition.key}`;
  }
}
