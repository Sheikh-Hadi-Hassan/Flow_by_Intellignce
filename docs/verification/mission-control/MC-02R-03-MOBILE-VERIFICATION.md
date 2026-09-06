# MC-02R-03A — 375px mobile approval closure

**Status: awaiting product-owner visual approval.**
**Overall: PARTIAL** — visual design is not closed (critic + PO). All other
mandatory categories that apply to this gate are PASS.

Do not start mobile dark mode, additional widths, backend integration, or
MC-03 from this gate. Locked 1440 light and dark geometry were not recomposed
and were not recaptured.

## How to see it

```
/northstar-creative/admin?variant=canvas-v2
```

375×812, light theme. `?state=` still selects a seeded demo state.
The visual demo-state switcher is QA-only: `?qa=1`.

## Verdicts

| Category | Verdict | Evidence |
|----|----|----|
| Functionality | PASS | 9/9 Playwright in `mission-control-canvas-mobile.spec.ts`. 79 unit tests including 19 snapshot tests across all six states. Hero exposure and decision count match Ask Flow. Dense answers `$360,200` / 4, not `$356K` / 3. Changing state invalidates stale suggestions. Resting and focused-empty show no suggestions; typing shows centred suggestions; submit opens full-screen; follow-up can suggest again. Switcher hidden unless `qa=1` |
| Visual design | PARTIAL | Independent critic **7/10** on the primary 375×812 first viewport (threshold is 8). Average **7.6/10**. Report: `docs/quality/critic-reports/ui-critic-2026-09-03-mc-02r-03a-mobile.md`. Named 03A contract is met in pixels. Header collision on every 375 frame and missing PO approval block visual PASS |
| Browser verification | PASS | PNGs **exactly 375×812**, `deviceScaleFactor: 1`, first viewport (not full-page). No horizontal overflow on all six states. No demo switcher on ordinary screens. Console clean aside from expected unauthenticated 401s. 1440 lock: plot **292px**, queue top ≥ 900 |
| Accessibility | PASS | axe on `.flow-canvas`, `[data-testid=global-ask-flow]`, and `[data-testid=workspace-header]` at 375 light: no serious or critical violations |
| Data integrity | PASS | Ask Flow exposure and decision counts are derived from `snapshotForState` / `missionViewForState`. Seed and history calculations were not changed. Chart annotation “3 decisions opened” remains history replay, not Ask Flow copy |
| Security | N/A | No backend, API, auth, or RLS change. Demo switcher is query-gated and never shown in ordinary product screens |
| Performance | N/A | Preview-gated prototype; no new dependencies |

## What this closure fixed

1. **Data mismatches.** Ask Flow no longer hard-codes `$356K` or `3 decisions`.
   Suggestions and answers read the active demo snapshot. Dense hero `$360,200`
   / 4 decisions matches the Ask Flow exposure prompt and answers.
2. **Suggestion behaviour.** Empty and focused-empty show no suggestions.
   Typing (`trim().length >= 2`) shows centred contextual suggestions.
   Clearing the input hides them. Submit on a narrow viewport opens the
   full-screen answer. Follow-up typing can suggest again.
3. **Demo switcher.** `?state=` still works. The visual “Demo states” control
   is shown only with `?qa=1`.

Approved 375 composition (hero, chart, dock placement) was not redesigned.
1440 light/dark geometry was not touched.

## Screenshots

`docs/verification/mission-control/screenshots/mc-02r-03/`

| File | Size | What it shows |
|----|----|----|
| `ask-flow-resting-375.png` | **375×812** | Empty resting dock, no suggestions, no switcher |
| `ask-flow-typing-375.png` | **375×812** | Centred `Why is $356,000 exposed?` while typing |
| `ask-flow-submitted-375.png` | **375×812** | Full-screen answer; 3 open decisions / `$356,000` |
| `ask-flow-counter-375.png` | **375×812** | Full-screen counter-question |
| `state-populated-375.png` | **375×812** | `$356,000` / 3 decisions |
| `state-dense-375.png` | **375×812** | `$360,200` / 4 decisions; Ask Flow at rest has no `$356K` |
| `light-375x812.png` | **375×812** | Same first viewport as resting populated |
| `state-empty-375.png` | 375×812 | Empty headline; no money figure |
| `state-loading-375.png` | 375×812 | Loading skeleton |
| `state-error-375.png` | 375×812 | Error |
| `state-restricted-375.png` | 375×812 | Restricted |

`ask-flow-expanded-375.png` is a leftover from MC-02R-03 and is not a 03A
evidence frame.

Locked 1440 files under `mc-02r-reset-01/` and `mc-02r-02/` were not
overwritten.

## Independent UI critic

Report: `docs/quality/critic-reports/ui-critic-2026-09-03-mc-02r-03a-mobile.md`

| Screen | Score |
|----|----|
| 375×812 first viewport | **7/10** |
| Ask Flow resting | 7/10 |
| Ask Flow typing | 8/10 |
| Ask Flow submitted | 8/10 |
| Ask Flow counter | 8/10 |
| Dense | 7/10 |
| Empty / loading / error / restricted | 8/10 |
| Average | 7.6/10 |

Named 03A contract **MET** in these pixels: no chips at rest, one centred
`Why is $356,000 exposed?` while typing, full-screen answer on submit, dense
hero `$360,200` / 4 with no leftover `$356K` dock chips, no Demo states
tray. Prior error/restricted flush headlines now start at x=18.

What blocks visual PASS:

1. **Header collision on every 375 frame** — overlapping utility disks and
   desktop wordmark type showing through the cluster. Critic: do not fix by
   touching hero, chart, or dock.
2. **Product-owner approval is not recorded.**

## Tests run

| Command | Result |
|----|----|
| `npx vitest run src/lib/mission-control/ask-snapshot.test.ts src/lib/ask-flow/resolve.test.ts src/lib/ask-flow/suggestions.test.ts src/lib/mission-control/seed.test.ts src/lib/mission-control/history.test.ts` | **79 passed** |
| `npx playwright test e2e/mission-control-canvas-mobile.spec.ts` | **9 passed** (includes axe) |
| `npx tsc -p tsconfig.json --noEmit` | exit 0 after test-type fix |
| `node .cursor/hooks/secret-scan.mjs` | PASS |

The locked light RESET-01 and dark MC-02R-02 Playwright specs were not re-run,
so those approved screenshots were not recaptured.

## Files

- `apps/web/src/lib/mission-control/ask-snapshot.ts` — per-state Ask Flow numbers
- `apps/web/src/lib/mission-control/ask-snapshot.test.ts` — six-state equality
- `apps/web/src/lib/ask-flow/suggestions.ts` / `resolve.ts` — snapshot-backed
- `apps/web/src/components/ask/AskFlowProvider.tsx` — follows `?state=` and the demo store; mobile submit opens fullscreen
- `apps/web/src/components/ask/GlobalAskFlowDock.tsx` — `data-ask-exposure` / `data-ask-decisions`; suggestions while typing, including follow-up
- `apps/web/src/components/mission/canvas/MissionControlCanvas.tsx` — switcher only with `?qa=1`
- `apps/web/src/components/mission/MissionControlScreen.tsx` — same
- `apps/web/e2e/mission-control-canvas-mobile.spec.ts` — 375 captures, axe, 1440 lock

## Stop

Named 03A work is done and evidenced. Visual design remains PARTIAL
(primary score 7, PO pending). The header collision is a SHELL chrome
defect, not a canvas redesign.
Do not start mobile dark mode, additional widths, backend integration, or
MC-03 from this gate.
