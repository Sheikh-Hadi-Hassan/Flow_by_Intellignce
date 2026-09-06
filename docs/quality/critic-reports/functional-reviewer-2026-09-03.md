# Functional Review

Independent review of **AF-02 — Real read-only Business Assistant**.
Date: 2026-09-03. Reviewer did not author the implementation.

The local adapter (`flow-local-blm` / `deterministic-engine`) is a keyword/alias/Levenshtein planner plus read-only tools. It is **not** a neural Business Language Model. That gap is disclosed and does **not** by itself fail AF-02, but it blocks any overall product PASS for “real BLM.”

## Verdict: PARTIAL

| Category | Verdict | Why |
|----|----|----|
| Functionality | **PASS** | Required questions answer through `/api/ask` without the generic fallback. Independently re-ran 74 unit tests (74/74). Playwright specs cover the dock journeys plus API deny/unavailable. |
| Data integrity | **PASS** | Exposure `$356,000` / 3 decisions and Vantage `$18,500` / 34 days / Kestrel `$9,250` / 12 days come from `snapshotForState` / `missionViewForState` / seed minor units. Compose interpolates tool values. |
| Isolation | **PARTIAL** | Cross-workspace deny works at API and tool. Evidence and related hrefs stay on `northstar-creative`. Role deny works when the client sends a restricted context. `/api/ask` still trusts client-supplied role and permissions; there is no session/RLS on this path. |
| Persistence | **PARTIAL** | History is sent on each `/api/ask` request. Conversation is React state only — not persisted across refresh. Seed is not written. |
| Overall (AF-02) | **PARTIAL** | Read-only answering works. Neural BLM missing (disclosed). Auth is a prototype. Screenshot `10-turns-separate.png` is a byte-identical copy of `09-retry-unavailable.png`. |

## Journeys tested

| Journey | Result | Evidence |
|----|----|----|
| `hi` | PASS | Unit `assistant.test.ts` → `get_workspace_summary`, Hello + 3 decisions + `$356,000`. Playwright `ask-flow-assistant.spec.ts`. Screenshot `01-greeting-hi.png`. |
| Payment behaviour | PASS | Unit + Playwright: Vantage `$18,500` / 34 days, Kestrel `$9,250` / 12 days, last 30 days. Tool `analyze_client_payment_behavior`. Screenshot `02-payment-behaviour.png`. Seed invoices `inv-2041` / `inv-2038` in `seed.ts`. |
| `list today sales update` | PASS | Unit + Playwright: sales update + Pipeline. Tool `get_today_sales_update`. Screenshot `03-today-sales.png`. |
| `lis all project` | PASS | Alias `lis` → `list`. Tool `list_projects`. Screenshot `04-lis-all-project.png`. |
| `What needs my approval?` | PASS | Tool `list_pending_approvals`, Meridian in answer. Screenshot `05-approvals.png`. |
| `Why is $356K exposed?` | PASS | Tool `explain_open_exposure`. Answer holds `$356,000` and `3 open`. Matches Mission Control hero. Screenshot `06-exposure.png`. |
| Follow-up `Which one is most urgent?` | PASS | Planner uses last assistant tool from history → `get_project_health`. Playwright asserts `history.length > 0` on the POST body. Screenshot `07-follow-up-urgent.png` (“Most urgent first”, Wayfinding / Meridian). |
| `list projects` clarification | PASS | Counter-question + Active / At-risk / Every. Screenshot `08-clarification.png`. |
| Cross-workspace deny | PASS | API `route.ts` rejects `workspaceId !== northstar-creative` before the adapter. Tools also deny. Playwright `postAsk(..., { workspaceId: "acme-other" })` → `cross_workspace`. No related records. |
| Copywriter + finance | PASS | Unit + Playwright `postAsk` with `role: "Copywriter"` / `opportunity.read` only → `permission_denied`. |
| Model unavailable | PASS | Adapter `unavailable` + client abort. Playwright aborts `/api/ask`, shows Retry, composer keeps `hi again`. Screenshot `09-retry-unavailable.png`. |
| Tool unavailable | PASS (unit only) | `failTool: "list_projects"` in `assistant.test.ts`. Not exercised in Playwright. |
| Generic fallback | PASS | New path never emits `I do not have a sourced match for that exact question yet`. Mark lives only on `legacyResolveAskAnswer` / `GENERIC_FALLBACK_MARK` (`resolve.ts`, `planner.ts`). |
| Dock chrome / no write | PASS | `GlobalAskFlowDock.tsx` still copy / regenerate / feedback / edit / evidence / related links. Actions are hrefs or inert spans. AF-01 `ask-flow-global.spec.ts` still the regression. No AI Elements install. |

Independent unit re-run (this review):

```
npx vitest run src/lib/ask-flow src/lib/mission-control/ask-snapshot.test.ts src/lib/mission-control/seed.test.ts
```

Result: **74 passed / 0 failed / 0 skipped** (`apps/web`, 2026-09-03).

Playwright files reviewed, not re-executed in this review: `apps/web/e2e/ask-flow-assistant.spec.ts`, `apps/web/e2e/ask-flow-global.spec.ts`. Builder recorded 2/2 passed. Specs contain the required assertions; this review did not re-run the browser suite.

## Persistence checks

- **In-request history:** `AskFlowProvider.historyOf` flattens prior turns (question + answer + tool) and `streamAskAssistant` POSTs them as `history` (`AskFlowProvider.tsx`, `client.ts`). Playwright asserts the follow-up body has `history.length > 0`, `workspaceId: northstar-creative`, and a Northstar route.
- **Across refresh:** Conversation is `useState` only. Not written to `sessionStorage` / `localStorage` / a server session. Disclosed in AF-02 verification. **Not a PASS for durable persistence.**
- **Within session / navigation:** AF-01 e2e still checks the dock keeps versions after Team navigation. That is in-memory provider state, not durable storage.
- **Seed:** `runAskTool` only reads `snapshotForState` / `missionViewForState`. No insert/update/delete. The unit “does not mutate” case is weak (two identical reads) but inspection of `tools.ts` shows no writers.

## Role restriction checks

- Tools require scopes in `ASK_TOOL_DEFINITIONS` (`tools.ts`). Finance tools need `finance.read`. Approvals need `opportunity.manage` or `proposal.approve`.
- Copywriter + payment question is denied in unit and Playwright API capture.
- The live dock always sends `missionViewer` (Founder, full Northstar permissions) from `AskFlowProvider.tsx`. There is no employee session in the UI. Role deny is only proven when the client forges a restricted context.
- `/api/ask` does not authenticate the caller. It trusts `body.context.role` and `permissions`.

## Northstar isolation

- `apps/web/src/app/api/ask/route.ts` returns `cross_workspace` if `workspaceId !== NORTHSTAR_SLUG` before any adapter/tool run.
- `runAskTool` repeats the same deny and returns empty `related` / `recordIds`.
- Seed hrefs use `/${NORTHSTAR_SLUG}/admin` (`seed.ts`). Tool-built hrefs use the already-gated `workspaceId`.
- Screenshots show Northstar Creative chrome and Northstar record labels (Vantage, Kestrel, Meridian, Wayfinding).
- Ask Flow is not mounted on `/sign-in` (AF-01 e2e). No live DB write path in these tools.

## Data integrity (totals)

| Figure | Source | Not from |
|----|----|----|
| `$356,000` / 3 open | `snapshot.exposure` + `snapshot.decisionCount` via `snapshotForState("populated")` ← `decisionHeadline` BigInt sum in `seed.ts` | Planner / compose maths |
| `$18,500` / 34 days | `inv-2041` `usd("1850000")`, `ageDays: 34` | Model |
| `$9,250` / 12 days | `inv-2038` `usd("925000")`, `ageDays: 12` | Model |
| Pipeline / overdue totals | `formatMoney` + `BigInt` on view/snapshot minor units | Neural arithmetic |

`composeFromTool` (`compose.ts`) prints `values.*` already formatted by tools.

Residual (out of AF-02 required questions): `get_team_capacity` deadline/margin copy still hardcodes “38%” and “four days”. That path is leftover AF-01 narrative, not a snapshot field. Unused live helper `resolveClarificationAnswer` still mentions “Review draft reassignment” — the dock does not call it (`answerClarification` goes through `runAssistant`).

## Isolation / mutations / dock

- Twelve tools, all read. Stream type `proposed_action` exists on the type union and is never yielded by `LocalBusinessLanguageModelAdapter`.
- Dock follow-ups are `Open pipeline` / `Open projects` / `Open team` links, or an inert “Open decisions” span. No Approve / Save / Create.
- Planner is `ALIASES` + token score + follow-up `lastTool` (`planner.ts`). Adapter id `flow-local-blm`, runtime `deterministic-engine`. NDJSON streams composed words, not model tokens.

## Blockers

None that fail AF-02 read-only answering.

Do **not** close as overall product PASS while these remain:

1. No callable neural / conversational BLM — local deterministic adapter only.
2. `/api/ask` trusts client role and permissions (no session RLS).
3. Conversation history is in-request only.
4. `docs/verification/ask-flow/screenshots/af-02/10-turns-separate.png` is identical to `09-retry-unavailable.png` (same SHA). Retry + recover is asserted in Playwright; the “turns after retry” screenshot is not distinct evidence.

## Files cited

- `apps/web/src/app/api/ask/route.ts`
- `apps/web/src/lib/ask-flow/assistant/{local-adapter,planner,tools,compose,client,types}.ts`
- `apps/web/src/lib/ask-flow/assistant/assistant.test.ts`
- `apps/web/src/lib/ask-flow/resolve.ts` (legacy fallback only)
- `apps/web/src/components/ask/{AskFlowProvider,GlobalAskFlowDock}.tsx`
- `apps/web/src/lib/mission-control/{ask-snapshot,seed}.ts`
- `apps/web/e2e/ask-flow-assistant.spec.ts`
- `apps/web/e2e/ask-flow-global.spec.ts`
- `docs/verification/ask-flow/AF-02-REAL-ASSISTANT-VERIFICATION.md`
