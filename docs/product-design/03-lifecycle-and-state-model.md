# 03 — Lifecycle and State Model

## Principles

1. **No silent promotion** — Records advance only through explicit Actions guarded by Guard.
2. **No duplicate truth** — Child records inherit scope and pricing from parents; conversion copies references, not orphaned clones.
3. **Draft-first** — Editable states precede committed states; committed states require Proof and often approval.
4. **Reversibility** — Archive and restore where safe; compensation where physical undo is impossible.
5. **Audit everywhere** — Every transition emits actor, timestamp, prior state, resulting state, correlation ID.

## Core record lifecycles

### Workspace and Business Twin

```text
CREATED → ONBOARDING_IN_PROGRESS → ONBOARDING_COMPLETE → TWIN_COMPILED → ACTIVE
                                      ↓
                              ONBOARDING_ABANDONED (resumable)
```

| State                    | Meaning                                 | Allowed actions                       |
| ------------------------ | --------------------------------------- | ------------------------------------- |
| `CREATED`                | Workspace exists; no onboarding answers | Start onboarding                      |
| `ONBOARDING_IN_PROGRESS` | Partial answers saved                   | Save section, resume                  |
| `ONBOARDING_COMPLETE`    | All required sections answered          | Compile Twin                          |
| `TWIN_COMPILED`          | Twin snapshot generated                 | View, edit sections, activate modules |
| `ACTIVE`                 | Normal operations                       | All module actions per role           |

Twin edits create a new **version**; Pulse may flag drift between Twin and live records.

### Service and questionnaire

```text
DRAFT → ACTIVE → ARCHIVED
```

| Transition        | Guard                                        |
| ----------------- | -------------------------------------------- |
| DRAFT → ACTIVE    | Founder or module owner; questionnaire valid |
| ACTIVE → ARCHIVED | No open opportunities referencing service    |

### Opportunity (pipeline)

```text
LEAD → QUALIFIED → DISCOVERY → BRIEF_READY → PROPOSAL_IN_PROGRESS → WON | LOST | ON_HOLD
```

| State                  | Entry criteria                             |
| ---------------------- | ------------------------------------------ |
| `LEAD`                 | Client or lead identified                  |
| `QUALIFIED`            | Budget, timeline, decision-maker confirmed |
| `DISCOVERY`            | Discovery interview or notes attached      |
| `BRIEF_READY`          | Brief approved internally                  |
| `PROPOSAL_IN_PROGRESS` | Linked proposal in draft or sent           |
| `WON`                  | Proposal approved / contract signed        |
| `LOST`                 | Explicit close with reason                 |
| `ON_HOLD`              | Paused; no automatic advance               |

### Creative brief

```text
DRAFT → IN_REVIEW → APPROVED → SUPERSEDED
```

- Linked to one opportunity (required)
- **Proof** required on goals, audience, deliverables, constraints
- Approval may be founder-only or account-manager + founder per workspace policy

### Proposal

```text
DRAFT → INTERNAL_REVIEW → SENT → CLIENT_REVIEW → APPROVED → SUPERSEDED | EXPIRED
```

| Transition               | Guard                                                      |
| ------------------------ | ---------------------------------------------------------- |
| DRAFT → INTERNAL_REVIEW  | Account manager submit                                     |
| INTERNAL_REVIEW → SENT   | Founder or delegated approver                              |
| SENT → CLIENT_REVIEW     | Client opens secure link                                   |
| CLIENT_REVIEW → APPROVED | Client approval Action                                     |
| APPROVED → Contract      | Automated conversion Action (Guard: no duplicate contract) |

Pricing lines reference **Logic** calculations; manual overrides require Proof note.

### Contract

```text
DRAFT → PENDING_SIGNATURE → ACTIVE → COMPLETED | TERMINATED
```

| Transition                 | Notes                                                      |
| -------------------------- | ---------------------------------------------------------- |
| From proposal              | Scope, pricing, timeline copied by reference               |
| PENDING_SIGNATURE → ACTIVE | Signature captured (e-sign or manual attestation for demo) |
| ACTIVE → Project           | Spawn project Action; single project per contract default  |

### Project

```text
PLANNING → ACTIVE → ON_HOLD → COMPLETED → ARCHIVED
```

| Sub-entities | Lifecycle                                         |
| ------------ | ------------------------------------------------- |
| Phase        | PLANNED → ACTIVE → COMPLETE                       |
| Milestone    | PENDING → MET → MISSED                            |
| Task         | TODO → IN_PROGRESS → IN_REVIEW → DONE → CANCELLED |
| Dependency   | Declared; blocks downstream task start            |

Plan generation from contract produces **PROPOSED_PLAN** requiring human approval before `ACTIVE`.

### Invoice

```text
DRAFT → SENT → PARTIALLY_PAID → PAID → VOID
```

Triggers: milestone met, retainer schedule, manual founder create. Amounts from Logic; taxes per jurisdiction config.

### Employee assignment

```text
PROPOSED → ASSIGNED → IN_PROGRESS → COMPLETE
```

Agent-proposed assignments start as `PROPOSED`; PM or founder confirms.

---

## Cross-lifecycle conversion graph

```text
Opportunity ──brief──▶ Brief ──generates──▶ Proposal
                                              │
                                    approved  ▼
                                         Contract
                                              │
                                    signed    ▼
                                         Project ──milestones──▶ Invoice
```

Each arrow is a named **Action** with:

- Input record IDs
- Guard check (role + state + approval policy)
- Proof bundle (source records, calculation IDs)
- Audit event

---

## Guard decision outcomes

Every Action request returns one of:

| Outcome             | UX                                          |
| ------------------- | ------------------------------------------- |
| `ALLOW`             | Execute; show success + audit ref           |
| `DENY`              | Explain missing permission or invalid state |
| `REQUIRES_APPROVAL` | Preview card; queue for approver            |

Preview card contents:

- Action summary in plain language
- Affected records (before / after)
- Proof attachments
- Reversibility note
- Approve / Reject / Edit

---

## Pulse signal model

Pulse aggregates **signals** derived from record states — not a separate datastore.

| Signal type        | Example trigger                           |
| ------------------ | ----------------------------------------- |
| `APPROVAL_BACKLOG` | Proposal awaiting founder > 48h           |
| `SCOPE_RISK`       | Task hours > brief estimate threshold     |
| `DELIVERY_RISK`    | Milestone date < 7 days, tasks incomplete |
| `CASH_RISK`        | Invoice overdue > 30 days                 |
| `UTILIZATION`      | Team member > 110% allocated              |
| `SETUP_INCOMPLETE` | Onboarding abandoned mid-flow             |

Signals link to the underlying record and recommended next Action.

---

## Proof claim types on lifecycle events

| Event                   | Typical claim types                                                 |
| ----------------------- | ------------------------------------------------------------------- |
| Brief section populated | FACT (from meeting note), INFERENCE (from BLM), ASSUMPTION (marked) |
| Margin on proposal      | FACT (Logic execution ID), RECOMMENDATION (pricing suggestion)      |
| Client approval         | FACT (approval timestamp, actor)                                    |
| Scope creep alert       | INFERENCE (utilization vs scope), FACT (logged hours)               |

---

## State storage alignment (planning note)

Lifecycle states map to:

- **Canonical business records** (`canonical_business_records` + `record_type` + `status`)
- **Workflow instances** (future durable workflow engine)
- **Audit events** (`business_audit_events`)

Phase 1 implements only workspace and Twin states; commercial lifecycles are documented here for IA and API contract continuity.
