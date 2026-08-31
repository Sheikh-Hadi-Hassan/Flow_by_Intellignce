# 04 — Portal Permission Matrix

## Rules

1. **Backend is authoritative** — UI hides disallowed actions; Guard enforces on every Action.
2. **Portal ≠ permission** — Portal shapes navigation; role and record scope determine access.
3. **AI_PERMISSION ≤ CURRENT_USER_PERMISSION** — Ask Flow and Voice never elevate authority.
4. **Client and vendor are external actors** — Separate membership types; no internal fields in their views.
5. **Proof visibility follows record access** — Cannot view Proof for records you cannot read.

## Role definitions (agency demo)

| Role ID           | Portal           | Description                              |
| ----------------- | ---------------- | ---------------------------------------- |
| `founder`         | Admin            | Full workspace authority                 |
| `operations_lead` | Admin            | Delivery and resourcing; limited finance |
| `account_manager` | Admin / Employee | CRM, proposals, client relationships     |
| `project_manager` | Employee         | Projects, tasks, assignments             |
| `creative_lead`   | Employee         | Tasks, documents, reviews                |
| `finance_admin`   | Admin            | Invoices, margin, AR                     |
| `employee`        | Employee         | Assigned work only                       |
| `client_contact`  | Client           | Own client's shared records              |
| `contractor`      | Vendor           | Assigned vendor work only                |

Users may hold multiple roles; effective permissions are unioned, then record scope applied.

---

## Matrix — Workspace and Twin

| Capability          | Founder | Ops Lead | Acct Mgr | PM  | Creative | Finance | Employee | Client | Contractor |
| ------------------- | ------- | -------- | -------- | --- | -------- | ------- | -------- | ------ | ---------- |
| View Twin           | ✓       | ✓        | ◐        | ○   | ○        | ◐       | ○        | ○      | ○          |
| Edit Twin           | ✓       | ◐        | ○        | ○   | ○        | ○       | ○        | ○      | ○          |
| Complete onboarding | ✓       | ◐        | ○        | ○   | ○        | ○       | ○        | ○      | ○          |
| Activate modules    | ✓       | ◐        | ○        | ○   | ○        | ○       | ○        | ○      | ○          |
| Workspace settings  | ✓       | ○        | ○        | ○   | ○        | ○       | ○        | ○      | ○          |
| Branding settings   | ✓       | ○        | ○        | ○   | ○        | ○       | ○        | ○      | ○          |

◐ = delegated subset · ○ = no access

---

## Matrix — CRM and discovery

| Capability             | Founder | Ops Lead | Acct Mgr | PM  | Creative | Finance | Employee | Client | Contractor |
| ---------------------- | ------- | -------- | -------- | --- | -------- | ------- | -------- | ------ | ---------- |
| List all clients       | ✓       | ✓        | ✓        | ◐   | ○        | ✓       | ◐        | ○      | ○          |
| View client detail     | ✓       | ✓        | ✓        | ◐   | ◐        | ✓       | ◐        | own    | ○          |
| Create client          | ✓       | ◐        | ✓        | ○   | ○        | ○       | ○        | ○      | ○          |
| Opportunities pipeline | ✓       | ✓        | ✓        | ◐   | ○        | ○       | ○        | ○      | ○          |
| Discovery / brief edit | ✓       | ◐        | ✓        | ◐   | ◐        | ○       | ○        | ○      | ○          |
| Approve brief          | ✓       | ◐        | ◐        | ○   | ○        | ○       | ○        | ○      | ○          |
| Meeting notes          | ✓       | ✓        | ✓        | ✓   | ✓        | ○       | ◐        | ○      | ○          |

◐ scoped = assigned clients/projects only

---

## Matrix — Proposals and contracts

| Capability                  | Founder | Ops Lead | Acct Mgr | PM  | Creative | Finance | Employee | Client | Contractor |
| --------------------------- | ------- | -------- | -------- | --- | -------- | ------- | -------- | ------ | ---------- |
| Create proposal             | ✓       | ○        | ✓        | ○   | ○        | ○       | ○        | ○      | ○          |
| Edit proposal               | ✓       | ○        | ✓        | ○   | ○        | ○       | ○        | ○      | ○          |
| View margin on proposal     | ✓       | ✓        | ◐        | ○   | ○        | ✓       | ○        | ○      | ○          |
| Send proposal               | ✓       | ○        | ✓        | ○   | ○        | ○       | ○        | ○      | ○          |
| Approve proposal (internal) | ✓       | ○        | ○        | ○   | ○        | ○       | ○        | ○      | ○          |
| View proposal (client)      | ○       | ○        | ○        | ○   | ○        | ○       | ○        | ✓      | ○          |
| Approve proposal (client)   | ○       | ○        | ○        | ○   | ○        | ○       | ○        | ✓      | ○          |
| View contract               | ✓       | ✓        | ✓        | ✓   | ○        | ✓       | ○        | ✓      | ○          |
| Sign contract               | ✓       | ○        | ◐        | ○   | ○        | ○       | ○        | ✓      | ○          |

---

## Matrix — Projects and tasks

| Capability                   | Founder | Ops Lead | Acct Mgr | PM  | Creative | Finance | Employee | Client | Contractor |
| ---------------------------- | ------- | -------- | -------- | --- | -------- | ------- | -------- | ------ | ---------- |
| View all projects            | ✓       | ✓        | ✓        | ✓   | ◐        | ◐       | ◐        | ◐      | ◐          |
| Create project from contract | ✓       | ✓        | ○        | ✓   | ○        | ○       | ○        | ○      | ○          |
| Approve project plan         | ✓       | ✓        | ○        | ◐   | ○        | ○       | ○        | ○      | ○          |
| Assign tasks                 | ✓       | ✓        | ◐        | ✓   | ○        | ○       | ○        | ○      | ○          |
| Update own task              | ✓       | ✓        | ✓        | ✓   | ✓        | ✓       | ✓        | ○      | ✓          |
| View internal hours / cost   | ✓       | ✓        | ◐        | ✓   | ○        | ✓       | ○        | ○      | ○          |
| View deliverables            | ✓       | ✓        | ✓        | ✓   | ✓        | ○       | ✓        | ✓      | ✓          |
| Approve deliverable (client) | ○       | ○        | ○        | ○   | ○        | ○       | ○        | ✓      | ○          |

---

## Matrix — Finance

| Capability               | Founder | Ops Lead | Acct Mgr | PM  | Creative | Finance | Employee | Client | Contractor |
| ------------------------ | ------- | -------- | -------- | --- | -------- | ------- | -------- | ------ | ---------- |
| View invoices (all)      | ✓       | ◐        | ◐        | ○   | ○        | ✓       | ○        | ○      | ○          |
| View own client invoices | ○       | ○        | ✓        | ○   | ○        | ✓       | ○        | ✓      | ○          |
| Create invoice           | ✓       | ○        | ◐        | ○   | ○        | ✓       | ○        | ○      | ○          |
| View AR aging            | ✓       | ◐        | ○        | ○   | ○        | ✓       | ○        | ○      | ○          |
| View project margin      | ✓       | ✓        | ◐        | ◐   | ○        | ✓       | ○        | ○      | ○          |
| View vendor payments     | ✓       | ✓        | ○        | ○   | ○        | ✓       | ○        | ○      | ✓          |

---

## Matrix — Intelligence surfaces

| Capability                | Founder | Ops Lead | Acct Mgr | PM  | Creative | Finance | Employee | Client | Contractor |
| ------------------------- | ------- | -------- | -------- | --- | -------- | ------- | -------- | ------ | ---------- |
| Ask Flow (workspace-wide) | ✓       | ✓        | ◐        | ◐   | ◐        | ◐       | ◐        | ○      | ○          |
| Ask Flow (scoped)         | ✓       | ✓        | ✓        | ✓   | ✓        | ✓       | ✓        | ✓      | ✓          |
| Voice Active Mode         | ✓       | ✓        | ✓        | ✓   | ✓        | ✓       | ✓        | ◐      | ◐          |
| Pulse (full)              | ✓       | ✓        | ◐        | ◐   | ○        | ✓       | ○        | ○      | ○          |
| Pulse (task-scoped)       | ✓       | ✓        | ✓        | ✓   | ✓        | ✓       | ✓        | ◐      | ◐          |
| View Proof                | ✓       | ✓        | ✓        | ✓   | ✓        | ✓       | ✓        | ◐      | ○          |
| Request Guarded Action    | ✓       | ✓        | ✓        | ✓   | ◐        | ✓       | ◐        | ◐      | ◐          |
| Approve Guarded Action    | ✓       | ◐        | ○        | ○   | ○        | ✓       | ○        | ✓      | ○          |

---

## Forbidden cross-portal exposures

Never visible outside Admin (founder/finance):

- Internal margin and cost rates
- Employee compensation and performance rankings
- Unrelated client names or pipeline
- Founder private memory and preferences
- Contractor rates on client-facing surfaces

Never visible to vendors:

- Client contract value (unless required for assignment)
- Other vendors' assignments
- Internal team conflict or utilization details

---

## Approval policy defaults (agency demo)

| Action                       | Default approver                      |
| ---------------------------- | ------------------------------------- |
| Send proposal to client      | Founder                               |
| Convert proposal to contract | Founder                               |
| Contract signature           | Client contact + founder attestation  |
| Spawn project from contract  | Ops lead or founder                   |
| Publish project plan         | PM + founder if over budget threshold |
| Issue invoice > $10,000      | Finance admin or founder              |
| Archive active client        | Founder                               |
| Edit Twin after ACTIVE       | Founder                               |

Workspace may relax or tighten in Settings → Policies (Phase 1: store preferences; enforce in later phases).

---

## Implementation mapping

| Product         | Backend                                                    |
| --------------- | ---------------------------------------------------------- |
| Guard           | Action Wall (`ALLOW` / `DENY` / `REQUIRES_APPROVAL`)       |
| Action          | Tool Registry + Execution Engine                           |
| Permission keys | `packages/contracts`, `packages/database` membership roles |
| Portal routing  | Frontend shell; server validates `ActorContext`            |

Phase 1 enforces: founder-only onboarding, Twin view, module recommendation display. Full matrix enforcement begins Phase 3+.
