# AF-01R — Global Ask Flow dock visual refinement

Chrome and geometry only. Answer logic, suggestions rules, Mission Control calculations, and locked desktop MC captures were not changed.

## AI Elements

Inspected before any dependency change:

| Check | Result |
|----|----|
| `apps/web/package.json` | Next 16, React 19, lucide. No `@ai-sdk/*`, no AI Elements, no shadcn |
| `components.json` | Absent |
| Flow UI matrix | Full shadcn / Tailwind stack already rejected |

AI Elements were **not** installed. The outer dock remains custom Flow CSS. Internal conversation / message / suggestion chrome stays the existing Flow panel.

## Geometry (measured)

Desktop 1440×900:

| Spec | Measured |
|----|----|
| Width | 820px (`min(820px, calc(100vw - 32px))`) |
| Height | 72px |
| Horizontal centre | dock centre = viewport centre (±2px) |
| Input centre | equals dock centre (±2px) — equal 112px side zones, no absolute prompt offsets |
| Bottom | ≥16px |
| Outer padding | 6px |
| Grid | `112px minmax(0, 1fr) 112px` |
| Tile | 56×56, workspace accent, black spark |
| Controls | 44×44, 8px gap |

375×812:

| Spec | Measured |
|----|----|
| Width | 359px (`calc(100vw - 16px)`) |
| Height | 64px |
| Input centre | equals dock centre |
| Bottom | ≥8px |
| Tile / controls | 48×48 / 40×40 |
| Overflow X | none |
| Submit | existing `.flow-ask-global--full` sheet |

Light and dark use the same width, height, and grid. Housing colour is quieter charcoal (`#2f2f2d` light, `#2a2a28` dark). Shadow is `0 6px 16px`, not a fog.

`--ask-dock-reserve` stays 140px so shell content is not trapped under the dock.

## Behaviour preserved

- Empty / focused-empty: no suggestions, no empty panel
- Typing ≥2 characters: contextual suggestions above the dock, 12px gap, centred, no viewport overflow
- Selected chip only gets a trailing submit arrow
- Clear: suggestions hide
- Enter submits; Shift+Enter newlines only while the conversation is open
- Escape on empty returns to rest (blur + minimise)
- Conversation expands upward, same width as the dock; the dock stays the composer
- Route change keeps the thread (Team navigation in Playwright)
- Mobile submit still uses the full-screen sheet

## Verdicts

| Category | Verdict | Evidence |
|----|----|----|
| Functionality | PASS | Playwright `e2e/ask-flow-dock-refine.spec.ts` 2/2. AF-01 + AF-02 regression 2/2. Suggestion, submit, persistence, keyboard order, tooltips |
| Visual design | PARTIAL | 10 captures. Independent critic primary 1440 resting **8/10**, overall **7.8/10** (`docs/quality/critic-reports/ui-critic-2026-09-03-af-01r-dock.md`). Product-owner approval not recorded. 375 dark frame was recaptured after the critic to drop the Next.js badge |
| Accessibility | PASS | axe on the dock: no serious or critical. Focus order tile → composer → voice → actions. Tooltips + aria-labels |
| Security | N/A | No API, auth, or tool change |
| Data integrity | N/A | No calculation or assistant-logic change |
| Browser verification | PASS | 1440 and 375, light and dark. No horizontal overflow |
| Performance | N/A | No new dependencies |

**Overall: PARTIAL.** Geometry and interaction contract hold. Visual PASS is blocked by missing product-owner approval.

## Screenshots

`docs/verification/ask-flow/screenshots/af-01r/`

| File | State |
|----|----|
| `01-1440-light-resting.png` | Resting, no chips |
| `02-1440-light-focused.png` | Composer focused |
| `03-1440-light-typing.png` | Three suggestions above the dock |
| `04-1440-light-submitted.png` | Conversation aligned to the dock |
| `05-1440-dark-resting.png` | Dark resting |
| `06-1440-dark-submitted.png` | Dark submitted |
| `07-375-light-resting.png` | 64px mobile dock |
| `08-375-light-typing.png` | Mobile suggestions |
| `09-375-light-submitted.png` | Mobile full-screen sheet |
| `10-375-dark-resting.png` | Mobile dark resting |

Locked Mission Control captures were not recaptured.

## Commands

```
npx tsc -p apps/web/tsconfig.json --noEmit
npx pnpm --filter @flow/web test:e2e e2e/ask-flow-dock-refine.spec.ts
npx pnpm --filter @flow/web test:e2e e2e/ask-flow-global.spec.ts e2e/ask-flow-assistant.spec.ts
node .cursor/hooks/secret-scan.mjs
```

2026-09-03: tsc 0, AF-01R 2 passed, AF-01+AF-02 2 passed.

## Stopped

No new business-assistant functionality. No write tools. No paid model. No Mission Control geometry edits.
