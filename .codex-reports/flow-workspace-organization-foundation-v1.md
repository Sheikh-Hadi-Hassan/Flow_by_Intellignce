# Flow Workspace And Organization Foundation v1

## Schema Created

- `organizations`
- `organization_units`
- `organization_locations`
- `organization_unit_memberships`
- workspace primary organization fields
- lightweight organization context fields on workspace membership

Migration:

- `20260810000300_workspace_organization_foundation.sql`

## Domain Models

The database package now models organizations, organization units, locations,
organization unit memberships, organization statuses, classification source,
and workspace-level primary organization selection. The contracts package adds
provider-neutral `OrganizationContext` and the minimal
`organization.update_profile` tool.

## Hierarchy Model

Organizational units use adjacency through `parentUnitId`. Tests cover
same-organization hierarchy, cross-organization parent rejection,
cross-workspace parent rejection, and cycle rejection.

## Workspace / Organization Separation

Workspace remains the tenant/security boundary. Organization represents the
business entity inside the workspace. Every organization-owned record carries
workspace identity.

## Permissions

Added minimal organization permissions:

- `organization.read`
- `organization.create`
- `organization.update_profile`
- `organization.archive`
- `organization_unit.read`
- `organization_unit.create`
- `organization_unit.update`
- `organization_unit.archive`
- `location.read`
- `location.manage`

No wildcard permission was added.

## RLS

The migration enables RLS on organization tables and uses active membership or
specific workspace permissions for access. Live Supabase execution remains
pending because Supabase CLI is unavailable in this environment.

## Action Wall Integration

Organization mutation authorization uses the existing Action Wall permissions.
Tests cover suspended membership denial, missing permission denial, allowed
role grant, and AI source parity.

## Tool Registry Integration

`organization.update_profile` is a Tool Registry tool with input validation,
low risk, no evidence requirement, no v1 approval requirement, and audit
through the Universal Execution Spine.

## Audit Behavior

The execution-spine test proves `organization.update_profile` emits an audit
event containing action, resource type, resource id, result status, actor,
workspace, and correlation context.

## Tests

Automated tests cover primary organization, cross-tenant organization access,
cross-tenant mutation denial, hierarchy integrity, cycle rejection, suspended
membership, missing permission, authorized update, audit emission, AI no
privilege gain, client workspace boundary, RLS migration guardrails, archive
semantics, and membership/employment separation.

## Known Limitations

Supabase CLI is not installed, so local live migration/RLS validation is still
pending. No organization-management UI or business modules were built.

## Open Questions

- Which local Supabase setup should be used for live RLS execution?
- Which organization profile fields should become user-visible first?

## Verification Results

- `pnpm format:check`: PASS
- `pnpm typecheck`: PASS
- `pnpm lint`: PASS
- `pnpm test`: PASS
- `pnpm build`: PASS
