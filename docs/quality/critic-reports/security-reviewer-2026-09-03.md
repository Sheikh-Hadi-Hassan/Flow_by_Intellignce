# Security Review

**Scope:** AF-02 Ask Flow assistant  
**Date:** 2026-09-03  
**Reviewer:** independent `flow-security-reviewer` (not the builder)  
**Files:** `apps/web/src/app/api/ask/route.ts`, `apps/web/src/lib/ask-flow/assistant/tools.ts`, `apps/web/src/lib/ask-flow/assistant/local-adapter.ts`, `apps/web/src/components/ask/AskFlowProvider.tsx` (context → `/api/ask`)

## Verdict: PARTIAL

Read-only tools and Northstar slug isolation hold. Authorization does not. `/api/ask` has no JWT or session identity and **trusts client-supplied `role` / `permissions` after rejecting a non-`northstar-creative` `workspaceId`**. That prototype limitation is **confirmed**, not refuted.

This path reads seeded Northstar Mission Control snapshots. **No RLS evidence is claimed** — there is no database query on this route.

## Authorization

**Not production-grade. Session identity is not bound.**

`POST /api/ask` parses the body and requires only `context.workspaceId` plus a non-empty `message`. There is no `getUser()`, cookie/JWT check, or membership lookup:

```17:56:apps/web/src/app/api/ask/route.ts
export async function POST(request: Request) {
  let body: AskAssistantRequest;
  try {
    body = (await request.json()) as AskAssistantRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body?.context?.workspaceId || !body.message?.trim()) {
    return NextResponse.json({ error: "workspace and message required" }, { status: 400 });
  }

  if (body.context.workspaceId !== NORTHSTAR_SLUG) {
    // …cross_workspace stream…
  }

  const adapter = new LocalBusinessLanguageModelAdapter({
    unavailable: process.env.ASK_ASSISTANT_UNAVAILABLE === "1",
  });
  const payload: AskAssistantRequest = {
    ...body,
    tools: body.tools?.length ? body.tools : defaultAskTools(),
  };
```

Middleware does not close this gap. `requiresAuthenticatedWorkspaceAccess` only applies to `/{slug}/admin` and `/{slug}/onboarding` (`apps/web/src/lib/auth/route-policy.ts`, `apps/web/src/lib/auth/redirects.ts`). `/api/ask` is not workspace-scoped, so it is passed through without a Supabase user.

The browser client posts context with no `Authorization` header:

```9:13:apps/web/src/lib/ask-flow/assistant/client.ts
  const response = await fetch("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
```

`AskFlowProvider` builds that context on the client from the first path segment plus the hardcoded founder `missionViewer` seed — not from a server session:

```156:180:apps/web/src/components/ask/AskFlowProvider.tsx
  const context = useMemo<AskApplicationContext>(
    () => ({
      workspaceId: pathname.split("/").filter(Boolean)[0] ?? "",
      userId: missionViewer.person.id,
      role: missionViewer.person.role,
      permissions: missionViewer.permissions,
      route: pathname,
      // …
      conversationId: conversationIdRef.current,
      missionStateKind,
```

`missionViewer.permissions` is the founder set (`opportunity.read/manage`, `proposal.approve`, `contract.approve`, `project.manage`, `finance.read`) in `apps/web/src/lib/mission-control/seed.ts`. The restricted Mission Control viewer (Taylor Kim, `opportunity.read` only) is **not** wired into Ask context. The dock therefore always claims Founder even when `?state=restricted`.

### Known limitation — confirmed

After the slug gate, tools authorize from `context.permissions` and `context.role` on the request body:

```25:31:apps/web/src/lib/ask-flow/assistant/tools.ts
function allowed(
  permissions: readonly string[],
  needed: readonly string[],
): boolean {
  if (permissions.includes("workspace.mission_control")) return true;
  return needed.some((scope) => permissions.includes(scope));
}
```

```75:86:apps/web/src/lib/ask-flow/assistant/tools.ts
  const definition = ASK_TOOL_DEFINITIONS.find((row) => row.name === call.name);
  if (!definition) {
    return deny(call.name, context.workspaceId, "unavailable", "That tool is not registered.");
  }
  if (!allowed(context.permissions, definition.permissions)) {
    return deny(
      call.name,
      context.workspaceId,
      "permission_denied",
      `Your role (${context.role}) cannot read ${call.name.replaceAll("_", " ")}.`,
    );
  }
```

`LocalBusinessLanguageModelAdapter.stream` then calls `runAskTool(planned.call, request.context)` with that client context (`local-adapter.ts`).

Consequence: any caller who posts `workspaceId: "northstar-creative"` can attach `finance.read` (or `workspace.mission_control`, which bypasses every tool ACL) and receive finance/approval/capacity answers. The inverse is also client-driven: e2e and unit tests deny a Copywriter by **sending** `permissions: ["opportunity.read"]` (`assistant.test.ts`, `e2e/ask-flow-assistant.spec.ts`). Permission checks are real code paths, but they are not server-enforced identity.

`request.tools` is accepted on the payload and defaulted in the route; the local adapter **does not execute** client-supplied tool definitions. Planning uses the closed `ASK_TOOL_NAMES` union.

## RLS and cross-tenant

**No RLS to review on this path.** Tools import only seed helpers:

- `snapshotForState` / `missionViewForState` (`ask-snapshot.ts`, `states.ts`)
- `NORTHSTAR_SLUG`
- `formatMoney`

There is no Supabase client, no `workspace_id` query, and no tenant table access in `route.ts` or `tools.ts`. Do not treat slug denial as RLS.

**Cross-workspace string gate exists and is tested.** Non-`northstar-creative` `workspaceId` is rejected in the route before the adapter runs, and again in `runAskTool` before a snapshot is read:

```29:48:apps/web/src/app/api/ask/route.ts
  if (body.context.workspaceId !== NORTHSTAR_SLUG) {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder().encode(
            `${JSON.stringify({
              type: "error",
              code: "cross_workspace",
              message:
                "That workspace is not available to this session. Ask Flow only reads the workspace you are signed into.",
            })}\n`,
          ),
        );
```

```65:73:apps/web/src/lib/ask-flow/assistant/tools.ts
  const workspaceId = context.workspaceId || NORTHSTAR_SLUG;
  if (workspaceId !== NORTHSTAR_SLUG) {
    return deny(
      call.name,
      context.workspaceId,
      "cross_workspace",
      "That workspace is not available to this session. Ask Flow only reads the workspace you are signed into.",
    );
  }
```

The error copy says “the workspace you are signed into.” That is **not** true of the implementation: there is no signed-in workspace. The gate only compares the posted slug to `northstar-creative`. Anyone who knows that slug can read the Northstar **demo** snapshot. That is not a live-tenant leak; it is also not session isolation.

`missionStateKind` is client-supplied and only selects another **Northstar seed variant** (empty / dense / populated). `visibleRecordIds` and `exposureMinor` are sent by the provider but tools do not use them as a data source — they re-read the seed snapshot.

## Secrets scan

**PASS.** Independent `node .cursor/hooks/secret-scan.mjs` → `Secret scan: PASS`.

Reviewed Ask Flow sources contain no service-role keys, JWTs, provider API keys, or database URLs. The adapter is `flow-local-blm` / `deterministic-engine`. The only env flag is `ASK_ASSISTANT_UNAVAILABLE === "1"` (availability switch, not a secret). Context contract is identifiers + role/permissions; no private record payloads are posted (`AskApplicationContext` comment in `types.ts`).

## Immutable records

**PASS for this path.** No write tools exist.

The closed tool list is 12 read names only (`get_*`, `list_*`, `analyze_*`, `explain_*`, `search_*`) in `ASK_TOOL_DEFINITIONS` / `ASK_TOOL_NAMES`. Grep found no `create_` / `update_` / `delete_` / `write_` / `approve_` / `execute_` / `mutate_` tool names.

`runAskTool` returns in-memory `AskToolResult` objects. It does not call fetch, Supabase, `northstar-store`, `localStorage`, or any persist helper. `actions` are navigation hrefs (or a label-only “Open decisions”). `proposed_action` exists on the stream type union and is **never emitted**. Planner tokens `move` / `reassign` / `handoff` return a clarification, then `get_team_capacity` (read), not a mutation.

Money in answers is `formatMoney` / `BigInt` over seed minor units — not LLM-authored totals.

## Migration safety

**N/A.** AF-02 adds no migrations and does not touch project `zuvtnmmnwohrapaecsuj`.

## Blockers

These block a **security PASS** and any claim of server-side authorization. They are acceptable as a documented prototype limit for AF-02 overall **PARTIAL**, not as production auth.

1. **Confirmed:** `/api/ask` trusts client `role` / `permissions` (and `userId`) after the Northstar slug check. Bind identity on the server; ignore client ACLs.
2. **No JWT / session on `/api/ask`.** Middleware does not require a user for this route.
3. **`workspace.mission_control` in a posted permission array bypasses every tool ACL.** Must not be client-settable.
4. **Ask Flow identity is always founder `missionViewer`**, including restricted demo state.

Not blockers for the AF-02 read-only stop:

- Tools cannot mutate; no write/approve/execute tools.
- Non-Northstar `workspaceId` is denied before seed read.
- No secrets in this path.
- No RLS/migration work on this prototype route.
