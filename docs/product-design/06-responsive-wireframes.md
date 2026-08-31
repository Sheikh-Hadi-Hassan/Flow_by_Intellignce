# 06 — Responsive Wireframes

ASCII wireframes for Phase 1 screens and representative future screens. Breakpoints:

| Name    | Width  | Layout                                   |
| ------- | ------ | ---------------------------------------- |
| Mobile  | 390px  | Single column; bottom nav (later phases) |
| Tablet  | 768px  | Collapsible sidebar                      |
| Desktop | 1280px | Full sidebar + content                   |

---

## P0 — Public sign-in

### Desktop

```text
┌────────────────────────────────────────────────────────────────┐
│  [Flow logo]                                                   │
│                                                                │
│              ┌─────────────────────────────┐                   │
│              │  Sign in to Flow            │                   │
│              │                             │                   │
│              │  Email                      │                   │
│              │  [________________________] │                   │
│              │  Password                   │                   │
│              │  [________________________] │                   │
│              │                             │                   │
│              │  [      Sign in           ] │                   │
│              │                             │                   │
│              │  No account? Sign up        │                   │
│              └─────────────────────────────┘                   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Mobile

Same card; full-width with `--space-4` horizontal padding.

---

## P1 — Onboarding step (business profile)

### Desktop

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ [Flow]                                              Step 2 of 5  [Save] │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ARCHITECTURE FOUNDATION → ONBOARDING                                    │
│                                                                          │
│  Tell us about your agency                                               │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                          │
│  Business name                                                           │
│  [ Northstar Creative________________________________ ]                  │
│                                                                          │
│  Business type                                                           │
│  ( ) Creative / marketing agency  (*) Consulting  ( ) Other service     │
│                                                                          │
│  Team size              Primary location                                 │
│  [ 35___________ ]      [ Austin, TX, US___________ ]                   │
│                                                                          │
│  What tools do you use today? (select all)                               │
│  [x] QuickBooks  [x] ClickUp  [ ] HubSpot  [ ] Slack  [+ Other]         │
│                                                                          │
│  ┌─ Ask Flow ─────────────────────────────────────────────────────────┐ │
│  │ Not sure how to describe your model? Ask Flow can help.      [Ask] │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│                              [ Back ]  [ Continue → ]                    │
│                                                                          │
│  ● ○ ○ ○ ○   Business · Operations · Services · Policies · Review      │
└──────────────────────────────────────────────────────────────────────────┘
```

### Mobile

- Progress dots remain at bottom
- Form fields stack single column
- Ask Flow collapses to icon chip in header
- Sticky footer: `[ Back ]  [ Continue ]`

---

## P1 — Business Twin reveal

### Desktop

```text
┌────────────┬─────────────────────────────────────────────────────────────┐
│ Home       │  YOUR BUSINESS TWIN                                         │
│ Twin ●     │  ─────────────────────────────────────────────────────────  │
│ Setup      │                                                             │
│ Settings   │  Northstar Creative                                         │
│            │  35-person B2B creative & performance marketing agency      │
│            │  Austin, TX · USD · Agency expertise pack installed         │
│            │                                                             │
│            │  ┌─ Operating model ──────────────────────────────────────┐ │
│            │  │ Retainers + project campaigns · Blended internal/     │ │
│            │  │ contractor delivery · Account-led sales               │ │
│            │  └───────────────────────────────────────────────────────┘ │
│            │                                                             │
│            │  ┌─ Services (from onboarding) ───────────────────────────┐ │
│            │  │ Brand Strategy Retainer · Campaign Launch · Web Redesign│ │
│            │  └───────────────────────────────────────────────────────┘ │
│            │                                                             │
│            │  ┌─ Recommended modules ──────────────── Proof ⓘ ────────┐ │
│            │  │ ✓ Customer & Revenue        Install now    P1         │ │
│            │  │ ✓ Project Delivery            Install now    P1         │ │
│            │  │ ○ Finance & Invoicing         Phase 6        Deferred   │ │
│            │  └───────────────────────────────────────────────────────┘ │
│            │                                                             │
│            │  [ View setup plan ]              [ Go to workspace home → ] │
└────────────┴─────────────────────────────────────────────────────────────┘
```

---

## P1 — Founder home (post-onboarding)

### Desktop

```text
┌────────────┬─────────────────────────────────────────────────────────────┐
│ [nav]      │  Good evening, Maya                                         │
│            │                                                             │
│            │  ┌─ Setup progress ─────────────────────────────────────────┐│
│            │  │ ████████░░  80%   Next: Define service questionnaires  ││
│            │  └──────────────────────────────────────────────────────────┘│
│            │                                                             │
│            │  ┌─ Pulse ──────────────┐  ┌─ Twin snapshot ──────────────┐ │
│            │  │ No alerts yet        │  │ Agency · 35 people · 3 svcs  │ │
│            │  │ Complete setup →     │  │ [ View Twin ]                │ │
│            │  └──────────────────────┘  └──────────────────────────────┘ │
│            │                                                             │
│            │  Quick actions                                              │
│            │  [ Define services ]  [ Invite team ]  [ Ask Flow ]           │
└────────────┴─────────────────────────────────────────────────────────────┘
```

### Mobile

```text
┌─────────────────────────┐
│ ☰  Northstar    [Ask][🎤]│
├─────────────────────────┤
│ Good evening, Maya      │
│                         │
│ Setup ████████░░ 80%    │
│ Next: Service questions │
│                         │
│ ┌─ Pulse ─────────────┐ │
│ │ No alerts yet       │ │
│ └─────────────────────┘ │
│                         │
│ ┌─ Twin ──────────────┐ │
│ │ Agency · 35 people  │ │
│ │ [ View Twin ]       │ │
│ └─────────────────────┘ │
│                         │
│ [ Define services ]     │
│ [ Invite team ]         │
├─────────────────────────┤
│ Home  Twin  Setup  More │
└─────────────────────────┘
```

---

## P3 — Opportunity pipeline (future reference)

### Desktop

```text
┌────────────┬─────────────────────────────────────────────────────────────┐
│ Pipeline ● │  Opportunities                          [ + New ] [Filter]│
│            │  ┌────────┬──────────┬──────────┬──────────┬──────────┐   │
│            │  │ Lead   │Qualified │Discovery │ Brief    │ Proposal │   │
│            │  ├────────┼──────────┼──────────┼──────────┼──────────┤   │
│            │  │        │          │ Acme     │          │          │   │
│            │  │        │          │ Robotics │          │          │   │
│            │  │        │          │ $85k     │          │          │   │
│            │  └────────┴──────────┴──────────┴──────────┴──────────┘   │
└────────────┴─────────────────────────────────────────────────────────────┘
```

---

## P4 — Proposal editor (future reference)

### Desktop — split view

```text
┌────────────┬──────────────────────────────┬────────────────────────────┐
│ Proposals  │  Editor                      │  Preview (client view)     │
│            │  ─────────────────────────── │  ─────────────────────────  │
│            │  Acme Q4 Launch              │  [Northstar logo]          │
│            │                              │  Campaign Proposal         │
│            │  ## Executive summary        │  ─────────────────────     │
│            │  [ rich text area          ] │  Package: Growth  $52,000  │
│            │                              │  Optional: Influencer +$8k │
│            │  ## Packages                 │  Timeline: 12 weeks        │
│            │  [ Growth ] [ Scale ]        │                            │
│            │                              │  Margin: 38%  Proof ⓘ     │
│            │  [ Send for internal review] │  (hidden in client preview)│
└────────────┴──────────────────────────────┴────────────────────────────┘
```

---

## P8 — Voice Active Mode overlay

### Mobile (primary Voice surface)

```text
┌─────────────────────────┐
│                    [ ✕ ] │
│                         │
│                         │
│         ┌─────┐         │
│         │ 🎤  │         │
│         │Listening     │
│         └─────┘         │
│                         │
│  "What should I focus   │
│   on for Acme this      │
│   week?"                │
│                         │
│  ┌───────────────────┐  │
│  │ Scope review      │  │
│  │ Check utilization │  │
│  │ Draft check-in    │  │
│  └───────────────────┘  │
│                         │
│  [ Type instead...    ] │
│                         │
└─────────────────────────┘
```

### Thinking → Guard path

```text
┌─────────────────────────┐
│  Thinking...            │
│  ░░░░░░░░░░░░░░░░░░░░  │
│                         │
│  → Responding with Proof│
│                         │
│  ┌─ Guard preview ─────┐ │
│  │ Create task: Scope  │ │
│  │ review for Acme     │ │
│  │ [ Approve ] [ Edit ]│ │
│  └─────────────────────┘ │
└─────────────────────────┘
```

---

## P8 — Ask Flow panel (Business Mode)

### Desktop — drawer

```text
┌──────────────────────────────────────────────┬──────────────────────────┐
│  [ Main content — project detail ]           │ Ask Flow            [ ✕ ]│
│                                              │ ──────────────────────── │
│                                              │ You: Margin on Acme?     │
│                                              │                          │
│                                              │ Flow: Project margin is  │
│                                              │ 34.2% [Fact ⓘ]          │
│                                              │ Based on Logic calc #8821│
│                                              │                          │
│                                              │ [ Why is it down? ]      │
│                                              │ [ Show hours breakdown ] │
│                                              │                          │
│                                              │ [ Ask anything...     ]  │
└──────────────────────────────────────────────┴──────────────────────────┘
```

---

## Responsive rules summary

| Pattern       | Desktop            | Tablet                 | Mobile                   |
| ------------- | ------------------ | ---------------------- | ------------------------ |
| Navigation    | Fixed sidebar      | Collapsible sidebar    | Bottom tabs + drawer     |
| Data tables   | Full columns       | Hide low-priority cols | Card list transformation |
| Split editors | Side-by-side       | Stacked tabs           | Stacked tabs             |
| Ask Flow      | Right drawer       | Right drawer           | Full-screen sheet        |
| Voice         | Overlay            | Overlay                | Full-screen overlay      |
| Guard preview | Modal 720px        | Modal full-width       | Full-screen sheet        |
| Onboarding    | Centered max 720px | Same                   | Full width               |

---

## Wireframe → component mapping (implementation reference)

| Wireframe region | Component(s)                                                |
| ---------------- | ----------------------------------------------------------- |
| Sidebar          | `AppSidebar`, `NavItem`, `PortalSwitcher`                   |
| Top bar          | `AppHeader`, `AskFlowTrigger`, `VoiceTrigger`, `PulseBadge` |
| Onboarding form  | `OnboardingStep`, `FormField`, `ProgressStepper`            |
| Twin reveal      | `TwinSummary`, `ModuleRecommendationList`, `ProofPopover`   |
| Pipeline kanban  | `KanbanBoard`, `OpportunityCard`                            |
| Proposal split   | `DocumentEditor`, `ProposalPreview`, `PricingCard`          |
| Voice overlay    | `VoiceOverlay`, `VoiceStateIndicator`, `SuggestionChips`    |
| Guard            | `GuardPreviewModal`, `ActionDiff`                           |

Phase 1 implements only wireframes marked **P0** and **P1**.
