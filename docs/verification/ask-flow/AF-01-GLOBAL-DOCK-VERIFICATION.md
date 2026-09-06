# AF-01 — Global Ask Flow dock

Desktop frontend interaction only. No Business Language Model. Mobile paused.

## How to see it

Sign into the Northstar demo, then any authenticated workspace route:

```
/northstar-creative/admin
/northstar-creative/admin/clients/ns-client-acme
/northstar-creative/admin/opportunities/ns-opp-acme-brand
/northstar-creative/admin/lifecycle/projects
/northstar-creative/admin/team
```

The dock is rendered once from `FounderShell`. It is not present on `/sign-in`.

## AI / component inspection

Before this job:

| Check | Result |
|----|----|
| `components.json` / shadcn | Absent |
| AI SDK / `@ai-sdk/*` / AI Elements | Absent |
| `apps/web/package.json` | Next 16, React 19, lucide, `@flow/commercial` |

No AI Elements or shadcn suite was installed. The approved Flow dock visual is custom CSS. Answers come from `src/lib/ask-flow/resolve.ts` over seeded Northstar records.

## Verdicts

| Category | Verdict | Evidence |
|----|----|----|
| Functionality | PASS | `vitest` `src/lib/ask-flow`: 6/6. Playwright `e2e/ask-flow-global.spec.ts`: 1/1. Resting has no options; `invoice` yields the three specified suggestions; submit shows Answered from; edit adds Version 1/2; counter-question offers deadline/margin; conversation and route context survive Team navigation; fullscreen uses the same thread; dock count is 0 on `/sign-in` |
| Visual design | PARTIAL | Independent critic **8.0/10**, every primary screen ≥8, no critical defects. Product-owner approval pending. Report: `docs/quality/critic-reports/ui-critic-2026-09-03-af-01-shell-01.md` |
| Accessibility | PASS | axe on the dock + header: no serious or critical violations. Composer is a combobox with a suggestions listbox. Escape dismisses suggestions then minimises. Focus trap only while fullscreen |
| Security | PASS | No model, no secrets, no private record payloads in client state. Context contract is identifiers + role/permissions. Dock is not mounted on public/auth shells |
| Data integrity | PASS | Deterministic suggestion and answer resolvers; catalog answers reuse `missionAskFlow` evidence; clarification appends a version instead of overwriting |
| Browser verification | PASS | 1440×900 light and dark. One dock instance on Mission Control, client detail, opportunity detail, delivery, and team |
| Performance | N/A | No new dependencies. No production build measured |

**Overall: PARTIAL.** Functionality and accessibility meet the frontend contract. Visual score bar is met; product-owner approval is not recorded. Mobile and BLM are out of scope.

## Interaction contract (verified)

- One dock from the authenticated shell; conversation state lives in `AskFlowProvider` at the app root
- Resting: accent tile, “Ask anything or search”, microphone, action palette. No suggestion chips
- Suggestions after `trim().length >= 2` and ~250ms debounce; hidden when the input is cleared
- Submit expands the conversation upward; composer stays attached; sourced answer + Answered from + related records + follow-ups
- Follow-up, edit/resubmit with versions, regenerate, copy, helpful/not helpful, minimise, fullscreen
- Counter-question is a workflow state (`asking_clarification`), not an error
- Explicit phases: idle, focused, typing, suggesting, submitted, streaming, answered, asking_clarification, plus reserved action/error/offline values

## Screenshots

`docs/verification/ask-flow/screenshots/af-01/`

| File | What it shows |
|----|----|
| `01-resting-dock.png` | Empty dock, no chips |
| `02-typing-suggestions.png` | Three centred invoice suggestions |
| `03-streaming.png` | Streaming answer |
| `04-answered-evidence.png` | Answered from + related invoices |
| `05-counter-question.png` | Deadline vs margin |
| `06-edited-versions.png` | Version 1 / Version 2 |
| `07-after-navigation.png` | Same thread on Team |
| `08-fullscreen.png` | Viewport-filling Ask Flow, same messages |
| `09-dark-resting.png` | Dark resting dock |

## Commands

```
npx pnpm --filter @flow/web exec vitest run src/lib/ask-flow
npx pnpm --filter @flow/web exec tsc -p tsconfig.json --noEmit
npx pnpm --filter @flow/web test:e2e e2e/ask-flow-global.spec.ts
```

## Stopped

- No BLM / live model
- No mobile Ask Flow
- MC-02R-03 remains paused
- No closure request
