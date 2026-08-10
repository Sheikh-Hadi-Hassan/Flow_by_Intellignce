# Flow Foundation Authorization And Identity v1

## Authentication Architecture

Supabase Auth is the initial authentication provider. `packages/auth` exposes
a provider-neutral `AuthenticatedIdentity` and an adapter interface. The
Supabase adapter validates bearer tokens by calling Supabase Auth's user
endpoint instead of decoding JWT payloads locally and trusting claims.

## Authorization Architecture

Flow authorization is owned by Flow contracts and persisted identity state.
`ProviderBackedActionWall` depends on an `AuthorizationProvider` interface and
does not know database implementation details.

## Schema And Migrations

- `20260810000100_foundation_identity_workspace.sql`
- `20260810000200_identity_authorization_rls.sql`

The second migration establishes Flow-owned users, memberships, roles,
permissions, role-permission links, membership-role links, RLS policies, and
deterministic seed permissions.

## RLS Policies

RLS is enabled on users, workspaces, workspace memberships, roles,
permissions, role permissions, and membership roles. Policies derive the
current Flow user from Supabase `auth.uid()` and enforce active membership or
specific permissions for reads and mutations.

## Action Wall Integration

The API proof now requires bearer authentication and an explicit
`x-flow-workspace-id`. Actor context is derived server-side. Client-supplied
actor, role, and permission headers are ignored.

## Tests

Automated tests cover:

- unauthenticated request denial
- invalid token denial
- valid identity with unknown Flow user
- no workspace membership
- suspended membership
- missing permission
- correct permission
- multi-workspace permission isolation
- AI source no additional permission
- client-supplied actor and role claims ignored
- role changes affecting subsequent decisions
- approval requirement preserved
- migration RLS policy guardrails

## Security Properties Proved

`AI_PERMISSION <= CURRENT_USER_PERMISSION` is preserved. Workspace selection is
explicit. Membership status and role-permission links are resolved from trusted
server-side state. RLS provides database defense in depth.

## Dependencies Added

None. Existing Vitest is now referenced by auth/database packages for local
test scripts, but no new external package was introduced.

## Known Limitations

Supabase CLI is not installed in this environment, so the migration was not
executed against a live local Supabase database here. Repository tests verify
migration policy structure and application authorization behavior.

## Future OpenFGA Trigger

Reconsider OpenFGA or another FGA engine when Flow requires nested object
relationships, delegated access, cross-workspace sharing, or relationship
queries beyond workspace RBAC.

## Open Questions

- Which production Supabase project and local Supabase config should be used
  for live migration testing?
- What exact platform-admin trust domain should exist later?

## Verification Results

- `pnpm format:check`: PASS
- `pnpm typecheck`: PASS
- `pnpm lint`: PASS
- `pnpm test`: PASS
- `pnpm build`: PASS
