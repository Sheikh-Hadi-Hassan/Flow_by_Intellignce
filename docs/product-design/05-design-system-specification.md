# 05 — Design System Specification

## Design intent

Flow's interface is **calm authority**: the product looks like serious business software that happens to be intelligent — not an AI demo wearing a dashboard costume.

Canonical tone inherited from the existing web shell:

- Light neutral canvas (`#f7f8fa`)
- Strong typographic hierarchy
- Left-accent editorial cues for narrative moments (onboarding, Twin reveal)
- Muted secondary labels
- Generous whitespace; content-first

This specification extends that foundation into a full token-driven system.

---

## Token architecture

All visual properties flow through CSS custom properties on `:root` and `[data-theme="dark"]`. Components never hardcode hex values.

### Color tokens

#### Neutral (light)

| Token                    | Value     | Use                    |
| ------------------------ | --------- | ---------------------- |
| `--color-bg-canvas`      | `#f7f8fa` | Page background        |
| `--color-bg-surface`     | `#ffffff` | Cards, panels          |
| `--color-bg-subtle`      | `#f0f2f5` | Secondary surfaces     |
| `--color-bg-inset`       | `#e8ebf0` | Inputs, wells          |
| `--color-border`         | `#d9dee7` | Borders, dividers      |
| `--color-border-strong`  | `#b8c0cc` | Focus rings, emphasis  |
| `--color-text-primary`   | `#171717` | Headings, body         |
| `--color-text-secondary` | `#5f6875` | Labels, metadata       |
| `--color-text-tertiary`  | `#8b939f` | Placeholders, disabled |

#### Neutral (dark)

| Token                    | Value     |
| ------------------------ | --------- |
| `--color-bg-canvas`      | `#0f1114` |
| `--color-bg-surface`     | `#1a1d23` |
| `--color-bg-subtle`      | `#242830` |
| `--color-bg-inset`       | `#2e333d` |
| `--color-border`         | `#3a4049` |
| `--color-border-strong`  | `#525a66` |
| `--color-text-primary`   | `#f2f4f7` |
| `--color-text-secondary` | `#a3aab4` |
| `--color-text-tertiary`  | `#6b7280` |

#### Brand (workspace-overridable)

| Token                         | Default   | Use                                |
| ----------------------------- | --------- | ---------------------------------- |
| `--color-brand`               | `#1a56db` | Primary actions, links, active nav |
| `--color-brand-hover`         | `#1446b8` | Hover                              |
| `--color-brand-subtle`        | `#e8effc` | Selected rows, badges (light)      |
| `--color-brand-subtle` (dark) | `#1e2a44` | Selected rows (dark)               |

Workspace branding overrides `--color-brand*` only; neutrals remain platform-controlled for accessibility.

#### Semantic

| Token                | Light     | Use                      |
| -------------------- | --------- | ------------------------ |
| `--color-success`    | `#0d7a4e` | Paid, complete, approved |
| `--color-success-bg` | `#e6f5ee` | Success banners          |
| `--color-warning`    | `#b45309` | At risk, pending         |
| `--color-warning-bg` | `#fef3e2` | Warning banners          |
| `--color-danger`     | `#c41e3a` | Overdue, denied, error   |
| `--color-danger-bg`  | `#fce8ec` | Error banners            |
| `--color-info`       | `#1a56db` | Informational            |
| `--color-info-bg`    | `#e8effc` | Info banners             |

#### Proof claim types

| Token                          | Color     | Badge label    |
| ------------------------------ | --------- | -------------- |
| `--color-proof-fact`           | `#0d7a4e` | Fact           |
| `--color-proof-inference`      | `#1a56db` | Inference      |
| `--color-proof-recommendation` | `#7c3aed` | Recommendation |
| `--color-proof-assumption`     | `#b45309` | Assumption     |

#### Guard states

| Token                   | Use                     |
| ----------------------- | ----------------------- |
| `--color-guard-allow`   | Approved action preview |
| `--color-guard-deny`    | Denied action           |
| `--color-guard-pending` | Awaiting approval       |

---

### Typography

#### Font stacks

| Token            | Stack                                                          |
| ---------------- | -------------------------------------------------------------- |
| `--font-sans`    | `"Inter", ui-sans-serif, system-ui, -apple-system, sans-serif` |
| `--font-display` | `"Inter", var(--font-sans)`                                    |
| `--font-mono`    | `"JetBrains Mono", ui-monospace, monospace`                    |

Workspace may override `--font-sans` and `--font-display` from an approved list (Inter, Source Sans 3, IBM Plex Sans).

#### Scale

| Token         | Size     | Line height | Weight | Use                         |
| ------------- | -------- | ----------- | ------ | --------------------------- |
| `--text-xs`   | 0.75rem  | 1.25        | 500    | Badges, metadata            |
| `--text-sm`   | 0.875rem | 1.4         | 400    | Secondary body, table cells |
| `--text-base` | 1rem     | 1.5         | 400    | Body                        |
| `--text-lg`   | 1.125rem | 1.5         | 500    | Lead paragraphs             |
| `--text-xl`   | 1.25rem  | 1.4         | 600    | Section headings            |
| `--text-2xl`  | 1.5rem   | 1.3         | 600    | Page titles                 |
| `--text-3xl`  | 2rem     | 1.2         | 700    | Hero, Twin reveal           |
| `--text-4xl`  | 2.5rem   | 1.15        | 700    | Marketing headline          |

#### Eyebrow (preserve existing pattern)

```css
.eyebrow {
  font-size: var(--text-sm);
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
}
```

---

### Spacing scale

4px base grid:

| Token        | Value |
| ------------ | ----- |
| `--space-1`  | 4px   |
| `--space-2`  | 8px   |
| `--space-3`  | 12px  |
| `--space-4`  | 16px  |
| `--space-5`  | 20px  |
| `--space-6`  | 24px  |
| `--space-8`  | 32px  |
| `--space-10` | 40px  |
| `--space-12` | 48px  |
| `--space-16` | 64px  |

Page padding: `--space-8` desktop, `--space-4` mobile.

---

### Radius

| Token           | Value  | Use                  |
| --------------- | ------ | -------------------- |
| `--radius-sm`   | 4px    | Badges, inputs       |
| `--radius-md`   | 8px    | Buttons, cards       |
| `--radius-lg`   | 12px   | Modals, large panels |
| `--radius-full` | 9999px | Avatars, pills       |

Avoid radius > 12px except pills. No fully rounded cards.

---

### Shadows

Restrained; prefer borders over elevation.

| Token         | Value                         |
| ------------- | ----------------------------- |
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)`  |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.08)` |
| `--shadow-lg` | `0 8px 24px rgba(0,0,0,0.12)` |

Use `--shadow-md` only for modals, Ask Flow panel, Voice overlay. Lists and tables are flat.

---

### Motion

| Token               | Value                          |
| ------------------- | ------------------------------ |
| `--duration-fast`   | 120ms                          |
| `--duration-normal` | 200ms                          |
| `--duration-slow`   | 320ms                          |
| `--ease-standard`   | `cubic-bezier(0.4, 0, 0.2, 1)` |

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

Voice listening pulse: single ring animation; disabled under `prefers-reduced-motion`.

---

## Component specifications

### Button

| Variant   | Background       | Text                     | Border           |
| --------- | ---------------- | ------------------------ | ---------------- |
| Primary   | `--color-brand`  | white                    | none             |
| Secondary | transparent      | `--color-text-primary`   | `--color-border` |
| Ghost     | transparent      | `--color-text-secondary` | none             |
| Danger    | `--color-danger` | white                    | none             |

Sizes: `sm` (32px), `md` (40px), `lg` (48px). Min touch target 44px on mobile.

### Input / Select / Textarea

- Background: `--color-bg-inset`
- Border: 1px `--color-border`; focus: 2px `--color-brand`
- Label above; helper text below in `--text-sm` secondary
- Error state: `--color-danger` border + message

### Card

- Not the default layout primitive — use sparingly
- Surface: `--color-bg-surface`; border: 1px `--color-border`; radius `--radius-md`
- No shadow unless elevated (modal context)
- Prefer flat sections with dividers for dense business data

### Table

- Sticky header on scroll
- Row height: 44px (touch-friendly)
- Zebra optional; default flat with row borders
- Sortable columns; inline actions on hover/focus
- Empty state row with action CTA

### Navigation

- **Sidebar** (desktop admin): 240px fixed; collapsible to 64px icons
- **Top bar**: 56px; workspace name, portal switcher, Ask Flow, Voice, Pulse
- Active item: `--color-brand-subtle` bg + `--color-brand` left border (3px — preserve shell accent pattern)

### Modal / Drawer

- Modal: centered, max-width 560px (forms), 720px (Guard preview)
- Drawer: right-side, 400px (Proof, Ask Flow context)
- Focus trap; Esc closes non-destructive dialogs
- Guard approval: modal only — never toast

### Toast / Alert

- Toast: bottom-right; auto-dismiss 5s for success; persistent for errors
- Inline alert: full-width banner for page-level state
- Never use toast for Guard outcomes

### Badge / Status pill

Lifecycle states map to semantic colors:

| State family        | Color    |
| ------------------- | -------- |
| Draft               | neutral  |
| In review / pending | warning  |
| Active / approved   | success  |
| At risk             | warning  |
| Denied / overdue    | danger   |
| Archived            | tertiary |

### Proof chip

Inline chip next to claims; click opens Proof drawer.

| Type           | Icon         | Color token                    |
| -------------- | ------------ | ------------------------------ |
| Fact           | check-circle | `--color-proof-fact`           |
| Inference      | sparkles     | `--color-proof-inference`      |
| Recommendation | lightbulb    | `--color-proof-recommendation` |
| Assumption     | alert-circle | `--color-proof-assumption`     |

### Guard preview card

- Title: action in plain language ("Send proposal to Acme Robotics")
- Before / after diff (field-level)
- Proof attachments list
- Approver identity
- Buttons: Approve (primary), Reject (danger), Edit (secondary)

### Ask Flow panel

- Right drawer, 400px desktop; full-screen sheet mobile
- Message thread + input
- Suggestions as tappable chips below input
- Proof inline on AI responses
- Does not block main content interaction

### Voice overlay

- Full-screen dimmed overlay
- Center: state indicator (Listen / Think / Respond / Guard)
- Waveform or pulse only while listening (reduced-motion: static icon)
- Tappable suggestion chips
- Keyboard fallback always visible
- Mic off by default; explicit tap to activate

### Empty / Loading / Error

| State             | Pattern                                                                 |
| ----------------- | ----------------------------------------------------------------------- |
| Loading           | Skeleton lines matching content shape; no spinners except button inline |
| Empty             | Illustration-free; heading + one sentence + primary CTA                 |
| Error             | Inline alert + retry action; correlation ID in footer for support       |
| Permission denied | Guard denial page; explain role needed; no 404                          |

---

## Accessibility

- WCAG 2.1 AA minimum contrast on all text and interactive elements
- Visible focus ring: 2px `--color-brand` offset 2px
- All interactive elements keyboard reachable; logical tab order
- `aria-live="polite"` on Voice state changes and toast region
- Form fields: `label` + `aria-describedby` for errors
- Tables: `scope` on headers; caption for data tables
- Skip link: "Skip to main content" first focusable element

---

## White-label readiness

Workspace branding config (stored, applied via CSS variables at runtime):

```json
{
  "logoUrl": "...",
  "workspaceDisplayName": "Northstar Creative",
  "brandColor": "#e85d04",
  "fontFamily": "Inter",
  "proposalHeaderHtml": "...",
  "clientPortalWelcome": "..."
}
```

Rules:

- Brand color applied only to `--color-brand*` tokens
- Logo in header and client/vendor portals
- Proposal and client portal may use extended brand header
- Dark mode recalculates brand subtle backgrounds algorithmically
- No per-component color overrides

---

## Iconography

- **Lucide** icon set (MIT); 20px default, 16px inline
- Stroke width 1.75; no filled decorative icons
- Status icons paired with text label — never color alone

---

## Document and proposal typography

Proposals and contracts use a **document theme** layered on base tokens:

| Element         | Spec                                |
| --------------- | ----------------------------------- |
| Document title  | `--text-3xl`, display font          |
| Section heading | `--text-xl`, semibold               |
| Body            | `--text-base`, 1.6 line-height      |
| Pricing card    | bordered surface, no shadow         |
| Timeline        | horizontal desktop, vertical mobile |

Agency demo: confident sans-serif; no script fonts.

---

## What not to build

- Gradient hero backgrounds
- Glowing AI orb mascots
- Floating widget dashboards on every page
- Chat bubbles as primary layout for Business Mode
- Neon dark mode
- More than one accent color per workspace
