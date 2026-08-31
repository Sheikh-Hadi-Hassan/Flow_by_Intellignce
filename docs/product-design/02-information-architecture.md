# 02 — Information Architecture

## Top-level structure

Flow OS is organized around **workspace context**, **portal**, **module**, and **record**. Every authenticated route lives under a workspace slug.

```text
/                           Public marketing / sign-in entry (pre-auth)
/welcome                    Post-auth workspace picker (multi-workspace future)
/:workspace                 Authenticated shell (portal-aware)
```

## Portal model

Four portal experiences share one workspace data model but differ in navigation, defaults, and visibility:

| Portal                  | Slug prefix          | Primary user                                  |
| ----------------------- | -------------------- | --------------------------------------------- |
| **Admin / Founder**     | `/:workspace/admin`  | Founder, ops lead, finance admin              |
| **Employee**            | `/:workspace/work`   | Account managers, PMs, designers, strategists |
| **Client**              | `/:workspace/client` | Client stakeholders                           |
| **Vendor / Contractor** | `/:workspace/vendor` | Freelancers, subcontractors, suppliers        |

Portal selection is determined by membership role. Users with multiple roles see a **portal switcher** in the shell header. Portal choice never changes underlying permissions — it only changes navigation emphasis.

## Interaction mode affordances

Available in every portal shell:

| Affordance   | Location                           | Behavior                                          |
| ------------ | ---------------------------------- | ------------------------------------------------- |
| **Ask Flow** | Header command bar (Business Mode) | Contextual panel; scoped to current page and role |
| **Voice**    | Header mic button                  | Enters Voice Active Mode overlay                  |
| **Pulse**    | Header indicator + `/pulse`        | Alerts, risks, approvals backlog                  |
| **Proof**    | Inline on records + drawer         | Provenance for claims and calculations            |
| **Guard**    | Modal / side sheet                 | Action preview and approval                       |

Mode state is URL-independent (`?mode=voice` optional for deep link) but persists per session.

---

## Route map — public and auth

| Route              | Portal | Purpose                              | Phase |
| ------------------ | ------ | ------------------------------------ | ----- |
| `/`                | Public | Product entry; sign in / sign up CTA | 1     |
| `/sign-in`         | Public | Email + password / magic link        | 1     |
| `/sign-up`         | Public | Account creation                     | 1     |
| `/forgot-password` | Public | Password recovery                    | 1     |
| `/verify-email`    | Public | Email verification holding state     | 1     |

---

## Route map — onboarding (founder)

| Route                               | Purpose                                  | Phase |
| ----------------------------------- | ---------------------------------------- | ----- |
| `/:workspace/onboarding`            | Onboarding hub / resume                  | 1     |
| `/:workspace/onboarding/business`   | Business type, name, jurisdiction        | 1     |
| `/:workspace/onboarding/operations` | Team, locations, hours, tools            | 1     |
| `/:workspace/onboarding/services`   | Services sold (high level)               | 1–2   |
| `/:workspace/onboarding/policies`   | Approvals, communication, billing habits | 1     |
| `/:workspace/onboarding/review`     | Summary before Twin compile              | 1     |
| `/:workspace/onboarding/complete`   | Twin + setup plan reveal                 | 1     |

---

## Route map — Admin / Founder portal

### Home and intelligence

| Route                     | Purpose                                          | Phase |
| ------------------------- | ------------------------------------------------ | ----- |
| `/:workspace/admin`       | Founder home: Pulse, setup progress, key metrics | 1     |
| `/:workspace/admin/pulse` | Operational alerts and risk feed                 | 8     |
| `/:workspace/admin/ask`   | Full-page Ask Flow (optional; panel is default)  | 8     |
| `/:workspace/admin/twin`  | Business Twin viewer and edit                    | 1     |
| `/:workspace/admin/setup` | Setup plan and module recommendations            | 1     |

### CRM and revenue

| Route                                           | Purpose             | Phase |
| ----------------------------------------------- | ------------------- | ----- |
| `/:workspace/admin/clients`                     | Client list         | 3     |
| `/:workspace/admin/clients/:id`                 | Client detail       | 3     |
| `/:workspace/admin/opportunities`               | Pipeline            | 3     |
| `/:workspace/admin/opportunities/:id`           | Opportunity detail  | 3     |
| `/:workspace/admin/opportunities/:id/discovery` | Discovery interview | 3     |
| `/:workspace/admin/opportunities/:id/brief`     | Creative brief      | 3     |

### Commercial documents

| Route                                     | Purpose          | Phase |
| ----------------------------------------- | ---------------- | ----- |
| `/:workspace/admin/proposals`             | Proposal list    | 4     |
| `/:workspace/admin/proposals/:id`         | Proposal editor  | 4     |
| `/:workspace/admin/proposals/:id/preview` | Internal preview | 4     |
| `/:workspace/admin/contracts`             | Contract list    | 4     |
| `/:workspace/admin/contracts/:id`         | Contract detail  | 4     |

### Delivery

| Route                                      | Purpose                          | Phase |
| ------------------------------------------ | -------------------------------- | ----- |
| `/:workspace/admin/projects`               | Project list                     | 5     |
| `/:workspace/admin/projects/:id`           | Project overview                 | 5     |
| `/:workspace/admin/projects/:id/plan`      | Phases, milestones, dependencies | 5     |
| `/:workspace/admin/projects/:id/tasks`     | Task board / list                | 5     |
| `/:workspace/admin/projects/:id/resources` | Assignments and capacity         | 5     |

### Finance

| Route                              | Purpose                   | Phase |
| ---------------------------------- | ------------------------- | ----- |
| `/:workspace/admin/invoices`       | Invoice list              | 6     |
| `/:workspace/admin/invoices/:id`   | Invoice detail            | 6     |
| `/:workspace/admin/finance/aging`  | AR aging                  | 6     |
| `/:workspace/admin/finance/margin` | Project and client margin | 6     |

### People and configuration

| Route                                 | Purpose                        | Phase |
| ------------------------------------- | ------------------------------ | ----- |
| `/:workspace/admin/team`              | Employees and roles            | 5     |
| `/:workspace/admin/vendors`           | Contractor/vendor directory    | 6     |
| `/:workspace/admin/services`          | Service catalog                | 2     |
| `/:workspace/admin/services/:id`      | Service editor + questionnaire | 2     |
| `/:workspace/admin/settings`          | Workspace settings             | 1     |
| `/:workspace/admin/settings/branding` | Logo, accent, fonts            | 9     |
| `/:workspace/admin/settings/modules`  | Module activation              | 1     |
| `/:workspace/admin/reports`           | Report gallery                 | 9     |

---

## Route map — Employee portal

| Route                           | Purpose                                        | Phase |
| ------------------------------- | ---------------------------------------------- | ----- |
| `/:workspace/work`              | My work home: tasks, deadlines, Pulse (scoped) | 5     |
| `/:workspace/work/tasks`        | Assigned tasks                                 | 5     |
| `/:workspace/work/tasks/:id`    | Task detail                                    | 5     |
| `/:workspace/work/projects`     | Projects I contribute to                       | 5     |
| `/:workspace/work/projects/:id` | Project detail (scoped)                        | 5     |
| `/:workspace/work/clients`      | Clients I support (scoped)                     | 5     |
| `/:workspace/work/clients/:id`  | Client detail (scoped)                         | 5     |
| `/:workspace/work/documents`    | Shared documents                               | 5     |
| `/:workspace/work/time`         | Time entry (if enabled)                        | 6     |
| `/:workspace/work/performance`  | My performance evidence                        | 7     |

---

## Route map — Client portal

| Route                              | Purpose                                         | Phase |
| ---------------------------------- | ----------------------------------------------- | ----- |
| `/:workspace/client`               | Client home: active projects, pending approvals | 4     |
| `/:workspace/client/proposals/:id` | Proposal review and approval                    | 4     |
| `/:workspace/client/contracts/:id` | Contract view                                   | 4     |
| `/:workspace/client/projects`      | My projects                                     | 5     |
| `/:workspace/client/projects/:id`  | Deliverables and timeline                       | 5     |
| `/:workspace/client/approvals`     | Pending approvals queue                         | 4     |
| `/:workspace/client/invoices`      | My invoices                                     | 6     |
| `/:workspace/client/invoices/:id`  | Invoice detail and payment status               | 6     |
| `/:workspace/client/messages`      | Communication thread (future)                   | 7     |

---

## Route map — Vendor portal

| Route                                | Purpose                               | Phase |
| ------------------------------------ | ------------------------------------- | ----- |
| `/:workspace/vendor`                 | Vendor home: assigned work, deadlines | 6     |
| `/:workspace/vendor/assignments`     | Active assignments                    | 6     |
| `/:workspace/vendor/assignments/:id` | Brief, deliverables, due dates        | 6     |
| `/:workspace/vendor/documents`       | Shared briefs and assets              | 6     |
| `/:workspace/vendor/payments`        | Payment status                        | 6     |

---

## Navigation proposal

### Admin shell (desktop)

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ [Logo] Northstar Creative ▾   [Portal ▾]   [Ask Flow…]  [🎤] [Pulse•2]  │
├────────────┬─────────────────────────────────────────────────────────────┤
│ Home       │                                                             │
│ Twin       │                    Main content                             │
│ Pulse      │                                                             │
│ ─────────  │                                                             │
│ Clients    │                                                             │
│ Pipeline   │                                                             │
│ Proposals  │                                                             │
│ Projects   │                                                             │
│ Invoices   │                                                             │
│ ─────────  │                                                             │
│ Services   │                                                             │
│ Team       │                                                             │
│ Reports    │                                                             │
│ Settings   │                                                             │
└────────────┴─────────────────────────────────────────────────────────────┘
```

### Admin shell (mobile)

- Bottom tab bar: **Home**, **Pipeline**, **Projects**, **More**
- **More** drawer: Twin, Services, Team, Invoices, Settings
- Ask Flow and Voice in top bar; Pulse as badge on Home

### Employee shell

- Simplified nav: **My Work**, **Projects**, **Clients**, **Documents**
- No finance, margin, or workspace settings

### Client shell

- Minimal nav: **Home**, **Approvals**, **Projects**, **Invoices**
- No internal team, margin, or unrelated clients

### Vendor shell

- **Assignments**, **Documents**, **Payments**

---

## URL and routing conventions

- Workspace slug: lowercase, hyphenated (`northstar-creative`)
- Record IDs: opaque UUID in URL; human title in page header
- Draft records: visible badge; shareable preview links use signed tokens (`/preview/...`)
- Breadcrumbs: `Portal → Module → Record → Sub-view`
- Deep links preserve portal context; unauthorized access → Guard denial page, not 404

---

## Module-to-navigation mapping

| Module (platform)     | Admin nav label      | Employee | Client               | Vendor      |
| --------------------- | -------------------- | -------- | -------------------- | ----------- |
| Organization          | Settings / Twin      | —        | —                    | —           |
| Customer & Revenue    | Clients, Pipeline    | Clients  | —                    | —           |
| Proposals & Contracts | Proposals, Contracts | —        | Proposals, Contracts | —           |
| Project Delivery      | Projects             | Projects | Projects             | Assignments |
| Finance               | Invoices, Finance    | —        | Invoices             | Payments    |
| Services              | Services             | —        | —                    | —           |
| People                | Team                 | —        | —                    | —           |

---

## Phase 1 route subset (implementation contract)

Only these routes are in scope for Phase 1 — see [09-phase-1-implementation-contract.md](./09-phase-1-implementation-contract.md):

```text
/
/sign-in
/sign-up
/verify-email
/:workspace/onboarding/*
/:workspace/admin
/:workspace/admin/twin
/:workspace/admin/setup
/:workspace/admin/settings
/:workspace/admin/settings/modules
```

All other routes are **planned** and documented here for IA continuity; they must not be stubbed in Phase 1.
