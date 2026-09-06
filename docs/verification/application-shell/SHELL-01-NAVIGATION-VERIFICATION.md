# SHELL-01 — Global top navigation

Desktop light/dark only. No mobile navigation. No Ask Flow visual redesign beyond coexistence.

## How to see it

```
/northstar-creative/admin
/northstar-creative/admin/clients
/northstar-creative/admin/opportunities
/northstar-creative/admin/lifecycle/projects
/northstar-creative/admin/team
```

One header from `FounderShell`. Individual pages do not render their own navigation.

## Verdicts

| Category | Verdict | Evidence |
|----|----|----|
| Functionality | PASS | Playwright `e2e/shell-navigation.spec.ts`: 1/1. One header instance. Active `aria-current` on Mission Control, Clients, Pipeline, Delivery, Team. Workspace name visible. Search Escape returns focus. Quick Create lists Client…Task. Theme toggle persists via `flow-theme-v1`. Ask Flow conversation survives Delivery navigation |
| Visual design | PARTIAL | Independent critic **8.0/10**, every primary screen ≥8, no critical defects. Product-owner approval pending. Same critic report as AF-01: `docs/quality/critic-reports/ui-critic-2026-09-03-af-01-shell-01.md` |
| Accessibility | PASS | axe on `[data-testid=workspace-header]`: no serious or critical violations after the active-pill contrast fix. Icon-only controls have labels, tooltips, 40×40 targets, and visible focus |
| Security | PASS | No new libraries. No Ask Flow header button. Notifications badge only when unread seed notes exist |
| Data integrity | N/A | No business-data change |
| Browser verification | PASS | 1440×900 light and dark. Centre nav measured within 8px of the header midpoint. No horizontal overflow. Header sticky, dock fixed |
| Performance | N/A | No new navigation library |

**Overall: PARTIAL.** Desktop navigation and coexistence are verified. Visual score bar is met; product-owner approval is not recorded. Mobile navigation is not started.

## Structure (verified)

- `grid-template-columns: 1fr auto 1fr`
- Left: accent tile (`--color-brand`), Flow wordmark, Northstar Creative
- Centre: Mission Control, Clients, Pipeline, Delivery, Team. Icon only on the active pill
- Right: Search, Quick Create, Approvals, Notifications, Theme, avatar — five utilities + avatar
- Search expands as a dropdown; utilities stay visible; Escape closes
- Quick Create links existing routes only; no create workflows

## Coexistence

- Header does not open Ask Flow
- Dock remains the AI entry point
- Page main reserves bottom space for the dock
- Navigating does not reset the conversation (`AskFlowProvider` is above the shell)

## Screenshots

`docs/verification/application-shell/screenshots/shell-01/`

| File | What it shows |
|----|----|
| `01-light-header.png` | Light header + dock on Mission Control |
| `02-dark-header.png` | Dark geometry, light active pill |
| `03-active-team.png` | Team pill active |
| `04-search-expanded.png` | Search dropdown, utilities intact |
| `05-quick-create.png` | Create menu |
| `06-header-with-dock.png` | Header + answered dock after navigation |

## Commands

```
npx pnpm --filter @flow/web test:e2e e2e/shell-navigation.spec.ts
```

## Stopped

- No mobile navigation
- No BLM
- Mission Control chart/data were not modified for this job
- No closure request
