# AF-02 — Real read-only Business Assistant

Stop after read-only answering. No write actions. Approved dock chrome unchanged.

## How to see it

Sign into the Northstar demo, then any authenticated workspace route:

```
/northstar-creative/admin
```

Ask from the global dock. Answers now go:

```
composer submit
→ AskFlowProvider.runAssistant
→ POST /api/ask (NDJSON)
→ LocalBusinessLanguageModelAdapter (id: flow-local-blm, runtime: deterministic-engine)
→ planAskIntent (alias / typo / paraphrase planner — not exact-string primary)
→ runAskTool (permission-aware, read-only)
→ composeFromTool (explains tool values only)
→ streamed text + evidence + related records
→ GlobalAskFlowDock turn
```

## Step 1 — Previous response path (the defect)

Before AF-02 the path was client-only:

```
Ask Flow input
→ AskFlowProvider.submit
→ resolveAskAnswer → legacy keyword router
→ catalog exact match / regex intents / fallback()
→ GlobalAskFlowDock
```

| Check | Finding |
|----|----|
| Hard-coded fallback | `I can answer from Northstar records on this route (${context.route}), but I do not have a sourced match for that exact question yet.` Kept as `legacyResolveAskAnswer` / `GENERIC_FALLBACK_MARK` |
| Old intents | Exact catalog prompts; move/reassign regex; exposure; `/approv\|what needs my/`; invoice/overdue; capacity. `hi`, `list today sales update`, `lis all project`, and payment-behaviour paraphrases all hit the same fallback |
| API request | None |
| BLM call | None |
| Conversation history sent | No |
| Route / workspace sent | `AskApplicationContext` on the client only |

Regression: `apps/web/src/lib/ask-flow/resolve.test.ts` — `legacyResolveAskAnswer` still returns `ver-fallback` for those four questions.

## Step 2 — Business Language Model audit

**No callable conversational Business Language Model is wired to Ask Flow.** This job did not pretend the old keyword resolver was the BLM, and it did not add a paid model provider.

| Capability | Verdict | Evidence |
|----|----|----|
| Conversational inference | **missing** | Ask Flow uses `LocalBusinessLanguageModelAdapter`. No token model is called |
| Neural streaming | **missing** | NDJSON streams composed words. Not model tokens. No random production timers |
| Structured output | **partial** | Discovery extraction JSON in `@flow/commercial` (`packages/commercial/src/discovery/openai-provider.ts`). Default `BLM_PROVIDER=fixture`. Not a chat assistant |
| Tool calling | **partial** | Missing in leftover BLM packages. Implemented locally in AF-02 (`runAskTool`) |
| Conversation history | **partial** | Prior turns are sent on each `/api/ask` request. Not persisted |
| Retrieval / embeddings | **missing** | No embedding index or retrieval path for Ask Flow |
| Business vocabulary | **partial** | Local alias / typo planner. Leftover `FounderSpeakInterpreter` exists only as untracked compiled types under `packages/blm-core` |
| Multilingual | **missing** | English aliases only |
| Deployment / runtime | **working (local)** | Next.js `POST /api/ask`, `runtime = "nodejs"`. Adapter id `flow-local-blm`, runtime `deterministic-engine` |
| Licence | **unverified** for leftover BLM packages; N/A for the local engine | `git ls-files packages/blm*` is empty. Directories are leftover compiled `.d.ts` |
| Operating cost | **free / local** | No paid provider added. Discovery BLM remains fixture unless someone sets `BLM_API_KEY` (out of scope) |

Leftover on disk, not used by Ask Flow:

- `packages/blm-core`, `blm-contracts`, `blm-provider-openai`, `blm-provider-groq`, `blm-evaluation` — compiled types / WIP. Removed from Phase 5 runtime (`docs/product-design/20-phase-5-resource-capacity-verification-report.md`). Root `package.json` still has `blm:*` scripts that target those filters.
- `@flow/commercial` discovery provider — working for **note extraction only**. Paid if a live key is configured. Not connected to Ask Flow.

AF-02 therefore ships a Flow-owned **deterministic adapter** behind `BusinessLanguageModelAdapter`. That is not a neural BLM.

## What remains mocked / not real

- Neural inference, embeddings, retrieval
- Paid OpenAI / Groq chat
- Conversation persistence
- Server-side session identity (the demo client still sends role and permissions; tools enforce them; `/api/ask` rejects a non-Northstar `workspaceId`)
- Write / proposed-action execution (read-only stop)

## Provider boundary

`apps/web/src/lib/ask-flow/assistant/types.ts` — `BusinessLanguageModelAdapter`

Accepts authenticated-looking context (user, workspace, role, permissions), conversation history, current route / selected IDs (via `AskApplicationContext`), user message, and tool definitions.

Yields typed parts: `status`, `text`, `clarification`, `evidence`, `sources`, `actions`, `tool_status`, `proposed_action`, `error`, `done`.

Implementation: `LocalBusinessLanguageModelAdapter` in `local-adapter.ts`.

## Read-only tools (12/12)

All run through `runAskTool` against `snapshotForState` / `missionViewForState`. Totals use `formatMoney` / `BigInt` on seed minor units. Each result includes workspace id, source record ids, as-of (`Today, 08:12`), calculated values, and user-safe evidence labels.

| Tool | Permission |
|----|----|
| `get_workspace_summary` | `opportunity.read` |
| `get_today_sales_update` | `opportunity.read` |
| `list_projects` | `project.manage` or `opportunity.read` |
| `get_project_health` | `project.manage` or `opportunity.read` |
| `analyze_client_payment_behavior` | `finance.read` |
| `list_overdue_invoices` | `finance.read` |
| `get_pipeline_summary` | `opportunity.read` |
| `list_pending_approvals` | `opportunity.manage` or `proposal.approve` |
| `get_team_capacity` | `project.manage` |
| `explain_open_exposure` | `opportunity.read` or `finance.read` |
| `search_clients` | `opportunity.read` |
| `search_business_records` | `opportunity.read` |

Cross-workspace: `workspaceId !== northstar-creative` is denied before data is read. No tool writes.

## Conversational behaviour (verified)

| Input | Result | Tool |
|----|----|----|
| `hi` | Natural greeting plus workspace status (`3 decisions`, `$356,000`) | `get_workspace_summary` |
| `Show clients with worsening payment behaviour` | Vantage $18,500 / 34 days; Kestrel $9,250 / 12 days; last 30 days vs on-time baseline | `analyze_client_payment_behavior` |
| `list today sales update` | CRM events, pipeline total, follow-ups | `get_today_sales_update` |
| `lis all project` | Full project list (typo → list all) | `list_projects` |
| `list projects` | Clarification: active / at-risk / every | none (counter-question) |
| `What needs my approval?` | Meridian and the founder queue | `list_pending_approvals` |
| `Why is $356K exposed?` | `$356,000` / `3 open` | `explain_open_exposure` |
| `Which one is most urgent?` after the project list | `Most urgent first` + Wayfinding / risks | `get_project_health` |
| Other workspace | Denied; no related records | — |
| Copywriter + finance question | Permission denied | — |
| Model unavailable | Specific unavailable copy + input kept + Retry | — |
| Failed tool | Specific retrieve-failed copy | — |

None of these return the generic fallback mark.

## Rendering and streaming

- Each exchange is a separate `ask-turn`. The panel scrolls to the latest turn.
- Copy / regenerate / feedback / evidence / related links stay on the existing Flow dock.
- AI Elements / shadcn were **not** installed.
- Phases: `submitted` → `retrieving` → `generating` → `streaming` → `answered`, plus `asking_clarification`, `tool_failure`, `model_unavailable`, `permission_denied`.
- Production streaming is NDJSON from `/api/ask`, not a random timer.

## Verdicts

| Category | Verdict | Evidence |
|----|----|----|
| Functionality | PASS | Vitest `src/lib/ask-flow` + `ask-snapshot` + `seed`: **74/74**. Playwright `e2e/ask-flow-assistant.spec.ts`: **1/1**. AF-01 dock regression `e2e/ask-flow-global.spec.ts`: **1/1**. `tsc --noEmit` exit 0 |
| Visual design | PARTIAL | Screenshots captured. Dock chrome was not redesigned. No new independent critic. Product-owner approval not recorded |
| Accessibility | PASS | axe on `[data-testid=global-ask-flow]`: no serious or critical violations |
| Security | PARTIAL | Cross-workspace denial verified (API + tools). Tools are read-only. Demo `/api/ask` still trusts client-supplied role/permissions; there is no RLS session on this prototype path |
| Data integrity | PASS | Exposure `$356,000` / 3 decisions and overdue `$18,500` / `$27,750` match `snapshotForState("populated")` / Mission Control seed. Compose does not recalculate totals |
| Browser verification | PASS | Playwright 1440×900 journey through greeting, payment, sales, typo list, follow-up, approvals, exposure, clarification, API abort + Retry. Input preserved as `hi again` |
| Performance | N/A | No new dependencies. No production build measured |

Independent reviews (builder is not the only evaluator):

- Functionality: [functional review](../../quality/critic-reports/functional-reviewer-2026-09-03.md) — Functionality PASS, data integrity PASS, isolation PARTIAL
- Security: [security review](../../quality/critic-reports/security-reviewer-2026-09-03.md) — PARTIAL (`/api/ask` is unauthenticated and trusts client role/permissions after the Northstar slug gate)

**Overall: PARTIAL.** Read-only answering works on the local deterministic adapter. A neural BLM is still missing. Visual approval and real session auth are not claimed.

## Screenshots

`docs/verification/ask-flow/screenshots/af-02/`

| File | What it shows |
|----|----|
| `01-greeting-hi.png` | `hi` → Hello + 3 decisions + $356,000 |
| `02-payment-behaviour.png` | Worsening payment clients from the receivables ledger |
| `03-today-sales.png` | Today sales update |
| `04-lis-all-project.png` | Typo `lis all project` → five projects + risks |
| `05-approvals.png` | Pending approvals |
| `06-exposure.png` | Why $356K is exposed |
| `07-follow-up-urgent.png` | `Which one is most urgent?` → most urgent first |
| `08-clarification.png` | `list projects` → three view choices |
| `09-retry-unavailable.png` | API abort, Retry, composer still holds `hi again` |
| `10-turns-separate.png` | Error turn for `hi again`, then a recovered Hello on its own turn (recaptured after Retry; no longer a copy of 09) |

Locked Mission Control captures (`mc-02r-reset-01`, `mc-02r-02`, `mc-02r-03`) were not recaptured.

## Commands

```
npx vitest run src/lib/ask-flow src/lib/mission-control/ask-snapshot.test.ts src/lib/mission-control/seed.test.ts
npx tsc -p tsconfig.json --noEmit
npx pnpm --filter @flow/web test:e2e e2e/ask-flow-assistant.spec.ts e2e/ask-flow-global.spec.ts
node .cursor/hooks/secret-scan.mjs
```

Results recorded 2026-09-03: 74 unit passed, 2 Playwright passed, tsc 0, secret scan PASS.

## Stopped

- No write tools
- No paid model provider
- No dock redesign
- No Mission Control calculation changes
- No claim that leftover `packages/blm-*` is the live assistant
