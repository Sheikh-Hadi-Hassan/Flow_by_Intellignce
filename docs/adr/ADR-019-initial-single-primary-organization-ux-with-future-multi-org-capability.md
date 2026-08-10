# ADR-019: Initial Single Primary Organization UX With Future Multi-Org Capability

Status: Accepted

## Context

Most initial workspaces represent one business, but future customers may need
multiple legal entities, subsidiaries, or business groups inside one
workspace.

## Decision

Use an explicit `primary_organization_id` on workspace. Initial product flows
can present one primary organization without preventing multiple
organizations in the schema.

## Consequences

The UI can stay simple while the model avoids a hard one-workspace-one-org
ceiling. Future multi-organization UX must resolve organization context
explicitly instead of relying on creation order.
