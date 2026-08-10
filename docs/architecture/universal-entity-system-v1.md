# Universal Entity System v1

## Hybrid Entity Architecture

Flow does not use a giant generic EAV model for authoritative business data.
Important first-party entities use typed domain models and proper tables.
The Entity Registry is metadata/control-plane infrastructure describing
entity types, fields, relationships, actions, and module ownership.

## EntityTypeDefinition

Entity definitions use stable keys such as:

- `core.organization.organization`
- `crm.client`
- `projects.project`
- `custom.vendor_assessment`

System definitions are platform-owned. Custom definitions are workspace-owned
and lifecycle-aware with `DRAFT`, `ACTIVE`, and `ARCHIVED` states.

## FieldDefinition

Field definitions are deterministic metadata. Supported v1 field types are:

- `STRING`
- `TEXT`
- `BOOLEAN`
- `INTEGER`
- `DECIMAL`
- `DATE`
- `DATETIME`
- `ENUM`
- `REFERENCE`
- `JSON`

Validation rejects duplicate field keys, enum fields without options, invalid
reference targets, and values that do not match field type.

## System Vs Custom Fields

System fields are defined by platform/module code. Workspace custom fields can
extend supported entities but cannot delete, redefine, or change type for
critical system fields.

## Custom Field Value Storage

Custom value persistence is deferred until the first real business module.
Because no business records exist yet, v1 implements definitions and validators
without creating a generic `entity_records` or `entity_field_values` store.

When record storage exists, use a controlled hybrid strategy such as typed
domain tables plus validated extension containers on supported records.

## RelationshipDefinition

Relationship definitions support:

- `ONE_TO_ONE`
- `ONE_TO_MANY`
- `MANY_TO_MANY`

Definitions are owned by platform/module or workspace customization.
Workspace-owned relationships are workspace-scoped and cannot create
cross-tenant metadata leakage.

## Entity Actions

Entity metadata can declare discoverable actions and required permission keys.
Metadata does not grant permission by itself. Authorization remains Action Wall
plus persisted permission state.

## Registry Lookup

The Entity Registry answers which entity types, fields, relationships, and
actions are available for a workspace. Operational capability lookup must
respect module activation state.

## Future AI Schema Drafting

AI-generated future entity or field changes must enter draft state first, pass
deterministic validation, and require user approval before activation. AI must
not silently publish schema changes.
