# Identity And Authorization Model v1

## Authentication Model

Flow initially uses Supabase Auth to authenticate human identities.
Supabase-specific verification stays behind an authentication adapter that
returns a provider-neutral `AuthenticatedIdentity`:

- `subjectId`
- `provider`
- `email`
- `claims`

Application code must not treat raw JWT claims as the complete business
authorization model. User-editable metadata is not used for authorization.

## Flow User Identity

Flow owns a stable internal `users` record. The user record maps the
Supabase subject identifier to Flow's application user identifier. Email is
optional metadata and is not a permanent primary key.

## Workspace Identity

Workspace is the tenant boundary. Protected actions require an explicit
workspace context. A user may belong to multiple workspaces, so workspace
selection is never inferred solely from identity.

## Membership

`workspace_memberships` connects a Flow user to a workspace. Membership has
at least `ACTIVE` and `SUSPENDED` states. Suspended membership does not
authorize normal workspace actions.

## Roles And Permissions

Roles are workspace-scoped and support future custom roles. Permissions are
explicit action identifiers such as:

- `workspace.read`
- `workspace.manage`
- `member.read`
- `member.invite`
- `member.update`
- `system.echo`

There is no wildcard permission and no invisible owner bypass. Broad roles are
represented by deterministic role-permission rows.

## Action Wall

The public Action Wall contract remains provider-neutral. The provider-backed
Action Wall checks:

- actor workspace equals request workspace
- resource workspace equals request workspace
- active membership exists
- persisted permission exists for the requested action
- approval still applies for high-risk actions

`requestSource` never grants authority. `AI`, `VOICE`, `WORKFLOW`, `API`, and
`UI` requests are evaluated against the same authenticated actor and workspace
authorization state.

## Authorization Provider Boundary

Flow depends on an `AuthorizationProvider` contract, not on a specific
authorization vendor. The initial implementation resolves PostgreSQL-backed
workspace membership, roles, and permissions. OpenFGA, SpiceDB, Cerbos, or a
similar engine can later implement the same boundary when resource
relationships justify it.

## RLS

PostgreSQL Row Level Security is enabled on foundational identity and
authorization tables. RLS is a second tenant-isolation boundary and does not
replace backend Action Wall checks.

Policies use private helper functions that derive the Flow user from
`auth.uid()` and check active workspace membership and permissions. The helper
functions are `SECURITY DEFINER` because self-referential membership policies
otherwise become recursive; they are isolated in `flow_private`, revoke public
execution, and include explicit `auth.uid()`-based checks.

## Approval Separation

Authorization means an actor may initiate an action. It does not always mean
the action may execute immediately. High-risk actions still require approval
through the Universal Execution Spine.

## Service Role Handling

Supabase service-role credentials bypass normal RLS. `SUPABASE_SERVICE_ROLE_KEY`
is server-only and must never be exposed to frontend code, model context, tools
available to AI, or normal request authentication. Privileged server use must
be narrow, audited, and separated from user authorization.

## Multi-Workspace Behavior

Selecting Workspace A authorizes only Workspace A data and actions. Membership
or role state from Workspace B is not inherited into Workspace A. Role changes
must affect subsequent authorization decisions from persisted state.

## Future Fine-Grained Authorization Engine

OpenFGA is deferred, not rejected. Reconsider a fine-grained authorization
engine when Flow needs relationship-aware permissions across nested resources,
shared objects, delegated access, or cross-workspace collaboration semantics
that cannot be cleanly represented by workspace roles and action permissions.
