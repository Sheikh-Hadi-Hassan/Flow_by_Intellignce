import { describe, expect, it } from "vitest";
import {
  coreOrganizationEntityDefinition,
  EntityRegistry,
  type EntityRelationshipDefinition,
  type EntityTypeDefinition,
} from "./entity-registry.js";

function customEntity(
  workspaceId = "workspace-alpha",
  key = "custom.vendor_assessment",
): EntityTypeDefinition {
  return {
    id: `${workspaceId}:${key}`,
    key,
    moduleKey: "core.organization",
    workspaceId,
    name: "Vendor Assessment",
    pluralName: "Vendor Assessments",
    kind: "CUSTOM",
    status: "DRAFT",
    version: "1.0.0",
    ownershipScope: "WORKSPACE",
    fields: [
      {
        key: "risk",
        label: "Risk",
        type: "ENUM",
        enumValues: ["LOW", "MEDIUM", "HIGH"],
        source: "CUSTOM",
        version: "1.0.0",
      },
    ],
    actions: [
      {
        action: "custom.vendor_assessment.read",
        permission: "entity_definition.read",
      },
    ],
    createdAt: "2026-08-10T00:00:00.000Z",
    updatedAt: "2026-08-10T00:00:00.000Z",
  };
}

describe("EntityRegistry", () => {
  it("registers a system entity definition and associates it to its module", () => {
    const registry = new EntityRegistry([coreOrganizationEntityDefinition]);

    expect(
      registry.getEntityType({ key: "core.organization.organization" }),
    ).toMatchObject({
      key: "core.organization.organization",
      moduleKey: "core.organization",
      kind: "SYSTEM",
    });
  });

  it("validates entity key uniqueness in scope", () => {
    expect(
      () =>
        new EntityRegistry([
          coreOrganizationEntityDefinition,
          coreOrganizationEntityDefinition,
        ]),
    ).toThrow("already registered");
  });

  it("filters operational entity lookup by enabled modules", () => {
    const registry = new EntityRegistry([coreOrganizationEntityDefinition]);

    expect(
      registry.listEntityTypes({
        workspaceId: "workspace-alpha",
        enabledModuleKeys: [],
      }),
    ).toEqual([]);
    expect(
      registry.listEntityTypes({
        workspaceId: "workspace-alpha",
        enabledModuleKeys: ["core.organization"],
      }),
    ).toHaveLength(1);
  });

  it("rejects duplicate field keys", () => {
    expect(
      () =>
        new EntityRegistry([
          {
            ...customEntity(),
            fields: [
              ...customEntity().fields,
              {
                ...customEntity().fields[0]!,
              },
            ],
          },
        ]),
    ).toThrow("Duplicate field key");
  });

  it("rejects invalid enum and reference field definitions", () => {
    expect(
      () =>
        new EntityRegistry([
          {
            ...customEntity(),
            fields: [
              {
                key: "bad_enum",
                label: "Bad Enum",
                type: "ENUM",
                source: "CUSTOM",
                version: "1.0.0",
              },
            ],
          },
        ]),
    ).toThrow("requires allowed values");

    expect(
      () =>
        new EntityRegistry([
          {
            ...customEntity(),
            fields: [
              {
                key: "bad_ref",
                label: "Bad Ref",
                type: "REFERENCE",
                referenceTargetEntityKey: "missing.entity",
                source: "CUSTOM",
                version: "1.0.0",
              },
            ],
          },
        ]),
    ).toThrow("invalid target");
  });

  it("validates enum values deterministically", () => {
    const registry = new EntityRegistry([customEntity()]);
    const field = customEntity().fields[0]!;

    expect(() => registry.validateFieldValue(field, "LOW")).not.toThrow();
    expect(() => registry.validateFieldValue(field, "UNKNOWN")).toThrow(
      "outside allowed",
    );
  });

  it("isolates workspace custom definitions by tenant", () => {
    const registry = new EntityRegistry([
      customEntity("workspace-alpha"),
      customEntity("workspace-beta"),
    ]);

    expect(
      registry.listEntityTypes({ workspaceId: "workspace-alpha" }),
    ).toHaveLength(1);
    expect(
      registry.listEntityTypes({ workspaceId: "workspace-beta" }),
    ).toHaveLength(1);
  });

  it("prevents Workspace A from modifying Workspace B custom fields", () => {
    const registry = new EntityRegistry([customEntity("workspace-beta")]);

    expect(() =>
      registry.updateFieldDefinition({
        entityKey: "custom.vendor_assessment",
        workspaceId: "workspace-alpha",
        field: {
          key: "risk",
          label: "Risk",
          type: "STRING",
          source: "CUSTOM",
          version: "1.0.1",
        },
      }),
    ).toThrow("not found");
  });

  it("prevents workspace mutation of platform system fields", () => {
    const registry = new EntityRegistry([coreOrganizationEntityDefinition]);

    expect(() =>
      registry.updateFieldDefinition({
        entityKey: "core.organization.organization",
        workspaceId: "workspace-alpha",
        field: {
          key: "name",
          label: "Name",
          type: "TEXT",
          source: "CUSTOM",
          version: "1.0.1",
        },
      }),
    ).toThrow("system fields");
  });

  it("denies cross-workspace relationship definitions", () => {
    const registry = new EntityRegistry([
      customEntity("workspace-alpha", "custom.alpha"),
      customEntity("workspace-beta", "custom.beta"),
    ]);
    const relationship: EntityRelationshipDefinition = {
      id: "relationship-alpha-beta",
      key: "custom.alpha_to_beta",
      owner: "WORKSPACE",
      workspaceId: "workspace-alpha",
      sourceEntityKey: "custom.alpha",
      targetEntityKey: "custom.beta",
      cardinality: "ONE_TO_MANY",
      status: "DRAFT",
      version: "1.0.0",
    };

    expect(() => registry.registerRelationship(relationship)).toThrow(
      "must exist",
    );
  });

  it("supports archive lifecycle for workspace custom definitions", () => {
    const registry = new EntityRegistry([customEntity("workspace-alpha")]);

    expect(
      registry.archiveEntityType({
        key: "custom.vendor_assessment",
        workspaceId: "workspace-alpha",
      }),
    ).toMatchObject({ status: "ARCHIVED" });
  });

  it("entity metadata does not grant authorization by itself", () => {
    const entity = coreOrganizationEntityDefinition;

    expect(entity.actions[0]).toMatchObject({
      action: "organization.read",
      permission: "organization.read",
    });
    expect(entity).not.toHaveProperty("grantsPermission");
  });
});
