# Workspace Organization Foundation v1

## Workspace Vs Organization

Workspace is Flow's security, tenancy, account, and authorization boundary.
Workspace controls tenant isolation, memberships, roles, permissions, and
future subscription/configuration behavior.

Organization is the business entity represented inside a workspace. It may be
a company, agency, firm, legal entity, operating entity, or future subsidiary.
Every organization belongs to exactly one workspace and can never cross
workspace boundaries.

## Tenant Boundary

All organization-owned records include `workspace_id`. Application
authorization checks the selected workspace through the Action Wall, and
PostgreSQL RLS applies a second database-level tenant isolation boundary.

## Primary Organization

A workspace has an explicit `primary_organization_id`. Flow does not rely on
"first organization created" as permanent business logic. Initial UX can show
one primary organization while the schema remains compatible with future
multi-organization workspaces.

## Organization Profile

The core organization profile is intentionally small:

- name
- display name
- legal name
- slug
- status
- country
- default currency
- timezone
- website
- description
- minimal classification source

Tax registrations, bank accounts, licenses, payroll, and industry-specific
details are deferred to later modules.

## Organizational Units

`organization_units` represent generic divisions, departments, teams,
branches, and other business units. The hierarchy uses adjacency through
`parent_unit_id`. Database constraints prevent cross-workspace and
cross-organization parent relationships, and a trigger rejects hierarchy
cycles.

## Locations

`organization_locations` is a minimal universal location model for offices,
branches, warehouses, stores, and remote hubs. It avoids geographic
intelligence and maps.

## Membership Vs Employment

`workspace_memberships` means an authenticated user has access to a Flow
workspace. It does not mean the person is an employee. Organization unit
membership can attach lightweight business context such as a display title,
but salary, contracts, attendance, leave, performance, and HR position
management are deferred.

## Permissions

Organization actions use explicit permissions:

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

No wildcard permission or broad invisible admin bypass is introduced.

## RLS

RLS is enabled on organizations, organization units, organization locations,
and organization unit memberships. Policies require active workspace
membership for reads and specific permissions for mutations.

Live Supabase execution remains pending because Supabase CLI is not installed
in the current environment.

## Audit And Execution Spine

`organization.update_profile` is represented as a Tool Registry tool and runs
through the Universal Execution Spine:

Actor Context -> Action Request -> Action Wall -> Evidence -> Approval -> Tool
Registry -> Tool Execution -> Audit -> Structured Result.

Low-risk profile updates do not require v1 approval, but the approval boundary
remains available for future sensitive organization changes.

## Future Templates

Business templates may later propose departments, roles, and settings, but
templates must create configuration through controlled services and
authorization. Templates do not bypass Action Wall, RLS, audit, or tenant
isolation.

## Future AI Onboarding

Future conversational onboarding may suggest organization identity, industry,
business model, services, structure, and preferences. AI-suggested
classification is not authoritative until confirmed or assigned a clear source
status.
