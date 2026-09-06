# Security Review

**Scope:** BB-00 AI-composable building blocks + CRM Core  
**Date:** 2026-09-03  
**Reviewer:** independent `flow-security-reviewer` (not the builder)  
**Allowed Supabase project:** `zuvtnmmnwohrapaecsuj` (SQL review only; no live query in this job)

## Verdict: PARTIAL

API authorization and in-process cross-tenant denial hold. Workspace-scoped permission asserts are present on every building-block and CRM Core API method reviewed. Activation does not drop those asserts.

Live RLS is **not PASS**. This job ran no database query against `zuvtnmmnwohrapaecsuj`. The Nest persistence stack still constructs `InMemoryBuildingBlockStore` even when Postgres is configured, so the new SQL/RLS is unused on the runtime API path. Ask Flow CRM tools remain a Northstar prototype: `/api/ask` rejects a non-Northstar `workspaceId`, but still trusts client-supplied `permissions` and `activeBuildingBlocks`.

## Authorization

**API path: PASS for membership + permission gating. Ask Flow path: PARTIAL (prototype identity).**

Protected routes live on `/api/v1/workspaces/:workspaceId/building-blocks`. `BuildingBlocksController.withIdentity` resolves a bearer token through `FlowRequestIdentityResolver`, requires an active workspace membership, and rejects header/path workspace mismatch with `401 Workspace context mismatch`.

```207:220:apps/api/src/building-blocks/building-blocks.controller.ts
    const identity = await this.identityResolver.resolve({
      authorizationHeader: authorization,
      workspaceIdHeader: workspaceHeader ?? workspaceId,
    });
    if (identity.workspaceId !== workspaceId) {
      throw new UnauthorizedException("Workspace context mismatch.");
    }
    return fn(identity);
```

`FlowRequestIdentityResolver.resolve` authenticates the bearer, maps the subject to a Flow user, and loads membership. Non-members receive `403 Flow user is not a member of the requested workspace.` Production uses `SupabaseAuthAdapter` with the publishable key only; tests use static tokens.

Service-layer asserts (not prompt rules):

| Method | Permission |
|---|---|
| `overview`, `compose` | `building_block.read` |
| `configure`, `submit` | `building_block.configure` |
| `approve` | `building_block.approve` |
| `suspend` | `building_block.suspend` |
| `listClients`, `getClient` | `client.read` |
| `listDuplicates` | `crm.duplicate.propose` |
| `proposeWrite` (`propose_duplicate_merge`) | `crm.duplicate.propose` |
| `proposeWrite` (other tools) | `client.manage` |
| `approveWrite` | `crm.duplicate.merge` |

`compose` overwrites `workspaceId` from identity, so a client cannot retarget another tenant through the body.

**Evidence cited by the builder and consistent with the spec:** `apps/api/test/building-blocks.spec.ts` — anonymous GET returns `401`; Alice bearer + Maya `workspaceId` returns `403` and the body does not contain `Meridian`. This reviewer did not re-run that spec.

CRM Core UI on Northstar is gated by `WorkspaceGate` + `isMissionDemoWorkspace`. Authenticated commercial workspaces keep `CommercialRoute` + `client.read` on the existing commercial API. Demo `?state=restricted` is a fixture, not an authorization control.

**Activation does not weaken API access control.** `listClients` / `getClient` still require `client.read` after approve. Suspend hides the in-memory CRM list (`[]`) but does not grant extra permissions. Role keys (`building_block.*`, `crm.duplicate.*`) are assigned at provision / SQL role_permissions, not at activation.

**Ask Flow:** `POST /api/ask` still has no JWT or membership lookup. It rejects `workspaceId !== northstar-creative` before the adapter runs. Tool ACLs then run against **client-supplied** `context.permissions`. `AskFlowProvider` always sends founder `missionViewer.permissions`. A caller who posts `activeBuildingBlocks: ["crm.core"]` can obtain CRM seed answers without an approved installation. `workspace.mission_control` in `allowed()` still bypasses every tool ACL. This is the AF-02 limitation, now extended to CRM tools.

CRM write tools (`propose_client_update`, `propose_duplicate_merge`) return a proposal status and do not mutate seed records. They do not call the Nest write APIs. Action Wall on this path is propose-only.

Permission names on Ask tools are **weaker than the CRM Core manifest**:

- Manifest `find_duplicate_clients` → `crm.duplicate.propose`; Ask ACL → `client.read` **or** `opportunity.read`
- Manifest `propose_client_update` → `client.manage`; Ask ACL → `opportunity.manage`
- Manifest `propose_duplicate_merge` → `crm.duplicate.merge`; Ask ACL → `opportunity.manage`
- Manifest `list_client_contracts` → `contract.manage`; Ask ACL → `opportunity.read`

`runAskTool` checks `allowed()` before `runCrmAskTool`, so CRM tools do not skip the (client-supplied) ACL. They also do not bypass Nest permissions, because they never hit Nest.

## RLS and cross-tenant

**SQL review: PARTIAL. Live RLS: not verified. Runtime API does not query the new tables.**

Migration `supabase/migrations/20260906000100_building_blocks_crm_core.sql` is additive: new permissions, `crm.core` module row, extra columns on `crm_clients`, five new tables. It does not drop `crm_clients` / `crm_contacts`. `lifecycle_stage` check is dropped and re-added with a default of `'active'`, which matches existing rows.

RLS is enabled on:

- `workspace_building_block_installations`
- `building_block_recommendations`
- `crm_interactions`
- `crm_duplicate_candidates`
- `crm_write_proposals`

Policies are permission-aware and scoped by `workspace_id`. Existing `crm_clients` / `crm_contacts` keep prior membership SELECT + `client.manage` writes.

**Do not claim live RLS PASS.** This job executed no `select` / `set role` / cross-tenant query on `zuvtnmmnwohrapaecsuj`. The persistence unit test only `readFileSync`s the migration text.

**Runtime residual (confirmed in code):** `createPersistenceStack()` always injects `new InMemoryBuildingBlockStore(commercialRepository)`, including the Postgres branch:

```85:93:apps/api/src/database/persistence.providers.ts
  const commercialRepository = new PostgresCommercialRepository(sql);
  return {
    identityRepository: new PostgresFlowIdentityRepository(sql),
    // ...
    buildingBlockStore: new InMemoryBuildingBlockStore(commercialRepository),
```

There is no `PostgresBuildingBlockStore`. Installations, recommendations, duplicates, write proposals, and CRM seed live in process memory, keyed by `workspaceId`. API tenant isolation therefore depends on identity + in-memory maps, not on the new RLS policies. The Nest pool, when used for commercial seed, bypasses RLS as table owner (same as other commercial APIs).

**Policy coarseness (matters if PostgREST or a future SQL store is wired):**

- `workspace_building_block_installations` SELECT allows `building_block.read` **or** any active membership — weaker than the API.
- UPDATE on installations allows `configure` **or** `approve` **or** `suspend` with no status-transition check. A `configure`-only member could `UPDATE status = 'active'` via PostgREST.
- `crm_duplicate_candidates` UPDATE allows propose **or** merge; a proposer could set `status = 'merged'`.
- `crm_write_proposals` UPDATE allows `client.manage` **or** `crm.duplicate.merge`; the API requires merge to approve.
- No DELETE policies (fail-closed). No `FORCE ROW LEVEL SECURITY`.
- No explicit `GRANT` to `authenticated` (unlike `discovery_extraction_runs`). Fail-closed if default privileges are absent; RLS-bound if Supabase defaults apply.
- `crm_duplicate_candidates` has no composite FK to `crm_clients (id, workspace_id)`. `owner_user_id` on `crm_clients` has no FK to `users`.
- `crm_interactions.workspace_id` is not a direct FK to `workspaces`; isolation is via the client composite FK.

**Cross-tenant API:** Alice 403 is membership denial, not RLS. In-memory `listClients` / `getClient` / `approveWrite` all require `identity.workspaceId`. `approveWrite` rejects proposals whose `workspaceId` does not match. CRM GET after seed is not separately tested for Alice; membership 403 on the same `withIdentity` path is the expected control.

**Production seed hazard (integrity, not a read leak):** `seedIfActive` writes deterministic UUIDs (`00000000-0000-4000-a000-…`) through `commercial.createClient`. If Postgres commercial is attached, the first activating workspace occupies those primary keys globally. A second workspace would collide on `crm_clients.id`; `getClient` still filters `id + workspace_id`, so this is availability/integrity, not a documented cross-tenant read.

Web CRM screens do not call Supabase for the new tables. Northstar uses `sessionStorage` (`flow-building-blocks-v1`). No `supabase.from('workspace_building_block_installations')` (or sibling) usage was found.

## Secrets scan

**PASS for BB-00 files reviewed.**

No `sb_secret_`, service-role key, JWT, database URL, or private key in building-block / CRM Core / Ask CRM tool sources. API auth adapter uses the publishable key via `getSupabasePublishableKey()`. `/api/ask` client posts JSON with no `Authorization` header and no service-role material. This reviewer did not run `node .cursor/hooks/secret-scan.mjs` in this job.

## Immutable records

**PASS / N/A for money; PARTIAL for installation status at the SQL layer.**

No LLM-authored monetary fields in BB-00. CRM writes on Ask Flow are proposals only. Nest `proposeWrite` stores `{ status: "proposed" }`; `approveWrite` is a separate `crm.duplicate.merge` call. Duplicate merge in the in-memory store marks a candidate `merged` and does not delete clients (ADR-026: disable hides, does not delete).

SQL installation UPDATE is not transition-constrained, so PostgREST could flip `status` without the API state machine. Runtime API still goes through `BuildingBlockRegistry` transitions.

Issued invoices / executed contracts are out of scope; CRM Core does not mutate them.

## Migration safety

**PARTIAL — additive SQL, not applied or dry-run in this job.**

- Additive columns, tables, indexes, permissions, policies.
- `on conflict do nothing` for permissions and `module_definitions`.
- Role grants limited to `OWNER` and `FOUNDER` (matches commercial/project migrations). In-memory provision also adds the new keys to FOUNDER.
- No `drop table` of tenant CRM tables.
- Check-constraint replace on `lifecycle_stage` is compatible with the new default `'active'`.
- Linked project / `migration list` / `db push --dry-run` were **not** executed here. Do not claim the migration is applied to `zuvtnmmnwohrapaecsuj`.

## Blockers

None that demonstrate a live cross-tenant **read** of workspace B from workspace A on the Nest API. Alice 403 + workspace mismatch 401 are the intended controls.

**Residuals that keep overall security PARTIAL (not PASS):**

1. **In-memory API store.** SQL/RLS exists and is unused at runtime. Process restart, multi-instance drift, and PostgREST are outside the tested path.
2. **No live RLS evidence.** No authenticated / cross-tenant SQL was run against `zuvtnmmnwohrapaecsuj`.
3. **`/api/ask` still trusts client `permissions`, `role`, and `activeBuildingBlocks`.** Non-Northstar `workspaceId` is rejected; CRM seed is still reachable without JWT if the caller claims Northstar + `crm.core`.
4. **Ask tool ACLs are weaker than the CRM Core manifest** (`opportunity.read` / `opportunity.manage` vs `client.*` / `crm.duplicate.*`). `workspace.mission_control` remains a full bypass.
5. **RLS UPDATE policies do not encode approve vs configure vs merge.** Fine while only the API writes; unsafe if those tables are exposed via PostgREST.
6. **Deterministic seed UUIDs + `seedIfActive` → `PostgresCommercialRepository.createClient`** can collide across workspaces if production Postgres is attached.
7. **CRM GET after activation is not cross-tenant tested** (only overview GET for Alice). Inferred from shared `withIdentity`.
8. **Missing FKs** on duplicate candidate client ids and `owner_user_id`.
9. **No explicit GRANTs** on the new tables.

## Closure implication

Security for BB-00 is **PARTIAL**. Functionality tests that show anonymous 401 and Alice 403 are accepted as API evidence. They are not a substitute for live RLS. Overall phase PASS remains blocked until residuals 1–3 are closed or explicitly accepted by the product owner as Northstar-only prototype limits.
