# 17 — Phase 4 Implementation Contract

## Phase name

**Phase 4: Project Engine**

## User outcome

A founder with an **executed immutable contract** can complete:

Executed contract → Create project (deterministic plan) → Review plan → Approve → Publish → Manual assignment → Verify timeline, progress, and audit trail.

Northstar Creative demo ships **pre-seeded** with executed contract so the journey starts at project creation without re-running Phases 2–3 in the browser.

## Authority

- Authenticated mutations go through NestJS `ProjectEngineService` (repository pattern).
- RLS + permission keys enforce tenant isolation (ADR-041).
- Project lifecycle defined in XState; Postgres stores canonical status (ADR-043).
- Deterministic plan generation in `@flow/commercial`; **no LLM for structure, transitions, or calculations**.
- Published project plans are **immutable** at repository and DB trigger level for structural entities.
- Assignments are **manual only**; recommendation drafts are visible but never auto-applied.
- Audit via `flow_internal.business_audit_events` and `commercial_guard_decisions`; idempotency via `flow_internal.request_idempotency_records`.
- Northstar demo uses `sessionStorage` only — never writes to authenticated workspaces.

## In scope

### Backend

| Area | Deliverable |
| ---- | ----------- |
| Migration | Additive tables: `projects`, `project_phases`, `project_milestones`, `project_deliverables`, `project_tasks`, `project_task_dependencies`, `project_role_requirements`, `project_assignments`, `project_recommendation_drafts` |
| Permissions | `project.manage`, `project.approve`, `project.publish`, `project.assign`, `commercial.audit.read` (reuse) |
| Domain | `@flow/commercial`: project lifecycle machine, deterministic `generateProjectPlan` from executed contract scope |
| API | Extend `/api/v1/workspaces/:id/commercial/*` with project routes |
| Guards | Server-side transition validation; source link `contract_version_id` → `project` |
| Recommendations | Draft-only records; assignment endpoint requires explicit actor + role |

### Frontend

| Route | Purpose |
| ----- | ------- |
| `/:workspace/admin/opportunities/:id/project` | Plan review, lifecycle actions, timeline, assignments, audit |
| `/:workspace/admin/opportunities/:id/project/timeline` | Phase/milestone progress view |

Status badges: **Draft**, **In review**, **Changes requested**, **Approved**, **Published**, **Active**, **On hold**, **Completed**.

### Northstar seed

Pre-seeded `DemoState` includes:

- Approved brief, accepted proposal, executed contract (immutable)
- Opportunity `journey_status: contract_executed`
- Empty project slot — user creates project in journey
- Plan generation produces phases, milestones, deliverables, tasks, dependencies, role requirements, recommendation drafts
- All persistence in `sessionStorage` under `flow-northstar-commercial-v1`

## Out of scope

Invoicing/payments, full client portal, voice, agents, LangGraph/MCP, auto-assignment, Phase 5+.

---

## State machines

### Project (`projects.status`)

```text
draft → in_review → changes_requested | approved
approved → published → active
active → on_hold | completed
completed → archived
```

| Event | From | To | Guard |
| ----- | ---- | -- | ----- |
| SUBMIT_FOR_REVIEW | draft, changes_requested | in_review | Plan complete (phases, milestones, tasks) |
| REQUEST_CHANGES | in_review | changes_requested | Actor has `project.approve` |
| APPROVE | in_review | approved | Actor has `project.approve`; plan valid |
| PUBLISH | approved | published | Actor has `project.publish`; idempotent |
| ACTIVATE | published | active | Actor has `project.publish`; assignments optional |
| HOLD | active | on_hold | Actor has `project.manage` |
| RESUME | on_hold | active | Actor has `project.manage` |
| COMPLETE | active | completed | All milestones met or founder override |
| ARCHIVE | completed | archived | Actor has `project.manage` |

Published+ structural plan (phases, milestones, deliverables, tasks) is immutable.

### Opportunity journey extension

After contract executed:

```text
contract_executed → project_in_progress → project_published → project_active
```

Stored on `crm_opportunities.journey_status` (constraint extended additively).

### Task (`project_tasks.status`)

```text
todo → in_progress → in_review → done | cancelled
```

Task transitions are manual post-publish; blocked when upstream dependency incomplete.

### Assignment

```text
(none) → assigned (manual only)
```

Recommendation drafts: `draft` status only; converting to assignment requires `project.assign` and explicit POST.

---

## Data model

All tables: `uuid` PK, `workspace_id` FK, composite `(id, workspace_id)` for tenant-safe joins.

### projects

- `id`, `workspace_id`, `opportunity_id`, `contract_version_id`, `name`, `status`, `revision`, `currency`, `plan_hash`, `approved_at`, `approved_by`, `published_at`, `activated_at`, timestamps

### project_phases

- `id`, `workspace_id`, `project_id`, `phase_key`, `name`, `sort_order`, `status` (`planned` | `active` | `complete`)

### project_milestones

- `id`, `workspace_id`, `project_id`, `phase_id`, `milestone_key`, `name`, `due_offset_days`, `sort_order`, `status` (`pending` | `met` | `missed`)

### project_deliverables

- `id`, `workspace_id`, `project_id`, `phase_id`, `name`, `description`, `sort_order`

### project_tasks

- `id`, `workspace_id`, `project_id`, `deliverable_id`, `task_key`, `name`, `status`, `estimated_minutes`, `sort_order`

### project_task_dependencies

- `id`, `workspace_id`, `project_id`, `task_id`, `depends_on_task_id`

### project_role_requirements

- `id`, `workspace_id`, `project_id`, `task_id`, `role_key`, `estimated_minutes`, `required_count`

### project_assignments

- `id`, `workspace_id`, `project_id`, `task_id`, `role_key`, `assignee_label`, `assigned_by`, `assigned_at`

### project_recommendation_drafts

- `id`, `workspace_id`, `project_id`, `task_id`, `role_key`, `suggested_assignee_label`, `confidence_bps`, `rationale`, `status` (`draft` only in Phase 4)

---

## Permissions

| Permission | Roles (Phase 4) | Use |
| ---------- | --------------- | --- |
| project.manage | FOUNDER, OWNER | Create project, edit draft plan metadata |
| project.approve | FOUNDER, OWNER | Review and approve plan |
| project.publish | FOUNDER, OWNER | Publish approved plan |
| project.assign | FOUNDER, OWNER | Manual task assignment |
| commercial.audit.read | FOUNDER, OWNER | View guard/audit history |

---

## API routes

### Authenticated (`/api/v1/workspaces/:workspaceId/commercial`)

| Method | Path | Action |
| ------ | ---- | ------ |
| POST | `opportunities/:id/projects` | Generate project from executed contract |
| GET | `opportunities/:id/projects` | List project versions |
| GET | `projects/:projectId` | Full plan detail (phases, tasks, assignments) |
| POST | `projects/:projectId/submit` | Submit for review |
| POST | `projects/:projectId/changes` | Request changes |
| POST | `projects/:projectId/approve` | Approve plan (idempotent) |
| POST | `projects/:projectId/publish` | Publish plan (idempotent) |
| POST | `projects/:projectId/activate` | Mark active after publish |
| POST | `projects/:projectId/assignments` | Manual assignment |
| GET | `projects/:projectId/timeline` | Timeline/progress summary |
| GET | `projects/:projectId/audit` | Guard decisions + audit events |

---

## Business rules

1. Project creation requires `contract_versions.status = executed` for the opportunity.
2. One active project per opportunity (Guard denies duplicate).
3. Plan generation derives structure from contract clauses + opportunity deliverables + payment milestones — deterministic, documented in `generateProjectPlan`.
4. Recommendation drafts created at plan generation; never promoted without explicit assignment action.
5. Idempotency-Key honored on approve, publish, activate, assign.
6. Cross-tenant access returns 403 without leaked content.
7. Northstar demo never calls authenticated API for commercial mutations.

---

## Acceptance criteria

1. Northstar Playwright journey: executed contract (pre-seeded) → create project → review → approve → publish → assign → timeline + audit verified.
2. Published project structural plan cannot be mutated (API 409 + DB trigger).
3. Recommendation drafts visible; no auto-assignment.
4. Cross-tenant GET/POST returns 403.
5. Deterministic plan generation unit tests with documented examples.
6. Phase 2 golden path and Phase 3 proposal-contract regression pass with `--workers=1`.
7. Northstar isolation tests pass (demo never writes to API workspaces).
8. All package typecheck/test/build gates pass.
9. Migration applied only to `zuvtnmmnwohrapaecsuj` after dry-run.

---

## Definition of done

- This contract document committed.
- Implementation with verification report (`18-phase-4-verification-report.md`).
- Verdict **PASS** requires Northstar Playwright journey, RLS evidence, immutability, deterministic plan generation, and all quality gates.
- Commit and push only on PASS.
