# 19 — Phase 5 Implementation Contract

## Phase name

**Phase 5: Team, Resource Planning, Capacity and Governed Assignment**

## Product objective

Extend the verified commercial journey so an **activated project** can move through governed staffing:

```text
Activated project
→ Required roles and skills
→ Available employees/contractors
→ Capacity calculation
→ Assignment recommendations
→ Founder/PM review
→ Guard approval
→ Published executable workload
```

Founders and authorized project managers plan staffing with deterministic capacity math, human approval, and immutable published workload versions. Employees see only their own assigned work.

## Authority

- Authenticated mutations go through NestJS `ResourceCapacityService` (repository pattern).
- RLS + permission keys enforce tenant isolation (ADR-041).
- Resource-plan lifecycle defined in XState; Postgres stores canonical status (ADR-043).
- Capacity, utilization, recommendations, and cost forecasts are **deterministic** in `@flow/commercial`; no LLM.
- Recommendations are **draft-only**; never auto-assigned.
- Published resource plans are **immutable** at repository and DB trigger level.
- Project activation (Phase 4) and resource-plan publication (Phase 5) are **separate governed actions**.
- Audit via `flow_internal.business_audit_events` and `commercial_guard_decisions`.
- Northstar demo uses `sessionStorage` only — never writes to authenticated workspaces.

## In scope

| Area | Deliverable |
| ---- | ----------- |
| Migration | Additive tables: `resource_profiles`, `workspace_skill_definitions`, `resource_profile_skills`, `resource_working_schedules`, `resource_availability_exceptions`, `project_task_skill_requirements`, `project_resource_plans`, `resource_plan_recommendations`, `resource_plan_assignment_drafts`, `resource_plan_versions`, `resource_plan_guard_decisions` |
| Permissions | `resource.manage`, `resource.read`, `resource.plan.manage`, `resource.plan.approve`, `resource.plan.publish`, `resource.cost.read`, `resource.work.read` |
| Domain | `@flow/commercial`: resource-plan lifecycle, capacity engine, recommendation engine |
| API | `/api/v1/workspaces/:id/commercial/resources/*`, `.../projects/:projectId/resource-plan/*` |
| UI | Team list/profile, project resources/capacity, employee My Work |
| Northstar | Pre-seeded team, schedules, conflicts, published plan on active Acme project |

## Out of scope

Payroll, timesheets, invoicing, recruitment, performance scoring, calendar integrations, full employee/vendor portals, voice, BLM, autonomous agents, automatic assignment without approval, UI redesign, Phase 6.

## Phase 4 dependencies

- `projects` with `status = active` required before resource-plan work
- `project_role_requirements` for role coverage
- `project_tasks` for effort minutes
- `project_assignments` extended with optional `resource_profile_id` on publish
- `workspace_memberships` for optional employee linkage
- Existing permission and RLS helper patterns (`flow_private.has_active_membership`, `has_workspace_permission`)

## Domain entities

| Entity | Purpose |
| ------ | ------- |
| `resource_profiles` | Assignable employee, contractor, or future vendor worker |
| `workspace_skill_definitions` | Workspace skill catalog |
| `resource_profile_skills` | Proficiency per resource (basis points) |
| `resource_working_schedules` | Weekly working minutes by day-of-week |
| `resource_availability_exceptions` | Leave/unavailable intervals |
| `project_task_skill_requirements` | Minimum skill proficiency per task |
| `project_resource_plans` | Resource plan lifecycle per project |
| `resource_plan_recommendations` | Draft ranked suggestions with evidence JSON |
| `resource_plan_assignment_drafts` | Draft assignments pending approval |
| `resource_plan_versions` | Immutable published workload snapshots |
| `resource_plan_guard_decisions` | Guard outcomes for plan transitions |

Resource profiles may link optionally to `workspace_memberships` (authenticated employees). Contractors need no auth record.

## State machines

### Resource plan (`project_resource_plans.status`)

```text
draft → recommendations_ready → founder_review ⇄ changes_requested → approved → published
```

| Event | From | To | Guard |
| ----- | ---- | -- | ----- |
| GENERATE_RECOMMENDATIONS | draft, changes_requested | recommendations_ready | Project active; requirements exist |
| SUBMIT_FOR_REVIEW | recommendations_ready, changes_requested | founder_review | Draft assignments present |
| REQUEST_CHANGES | founder_review | changes_requested | Actor has `resource.plan.approve` |
| APPROVE | founder_review | approved | Role coverage complete; guard allows |
| PUBLISH | approved | published | Actor has `resource.plan.publish`; creates immutable version |
| REVISE | published | draft | New revision; prior version retained |

Published versions are immutable. Reassignment after publish starts a new plan revision.

### Recommendation / assignment drafts

Always `draft` until approved and published. Converting recommendation → assignment requires explicit actor action.

## Permissions

| Permission | Roles (default) | Capability |
| ---------- | --------------- | ---------- |
| `resource.read` | Founder, Ops, PM | List team profiles (no private rates unless authorized) |
| `resource.manage` | Founder, Ops | CRUD profiles, schedules, skills |
| `resource.plan.manage` | Founder, PM | Draft plans, assignments, generate recommendations |
| `resource.plan.approve` | Founder | Approve staffing plan |
| `resource.plan.publish` | Founder | Publish approved plan |
| `resource.cost.read` | Founder, Finance | Internal cost forecasts |
| `resource.work.read` | All members | Own workload only |

Private `internal_rate_minor` visible only with `resource.cost.read` or `resource.manage`.

## RLS model

- All new tables: RLS enabled on creation
- SELECT: `flow_private.has_active_membership(workspace_id)` baseline
- Own-work: `resource_profiles.workspace_membership_id` matches caller membership for `resource.work.read`
- Writes: `has_workspace_permission` with appropriate key
- Sensitive rates: separate policy requiring `resource.cost.read` or `resource.manage`
- Cross-tenant IDs return empty/403 without leakage

## Deterministic calculations

For each resource and date range:

```text
scheduled_working_minutes
− leave_unavailable_minutes
− committed_assignment_minutes
= available_capacity_minutes
```

Also compute: requested task minutes, remaining minutes, utilization (basis points), over-allocation minutes, role coverage, skill gaps, conflicts, labour-cost forecast.

**Rounding:** All division for utilization uses integer floor; basis points = `floor(committed * 10000 / capacity)` capped at 10000. Cost = `minutes * rate_minor / 60` using integer math.

## API routes

| Method | Path | Permission |
| ------ | ---- | ---------- |
| GET/POST | `/commercial/resources` | read / manage |
| GET/PATCH | `/commercial/resources/:id` | read / manage |
| POST | `/commercial/resources/:id/skills` | manage |
| POST | `/commercial/resources/:id/schedules` | manage |
| POST | `/commercial/resources/:id/exceptions` | manage |
| GET/POST | `/commercial/projects/:projectId/resource-plan` | plan.manage |
| POST | `/commercial/projects/:projectId/resource-plan/recommendations` | plan.manage |
| POST | `/commercial/projects/:projectId/resource-plan/assignments` | plan.manage |
| POST | `/commercial/projects/:projectId/resource-plan/submit` | plan.manage |
| POST | `/commercial/projects/:projectId/resource-plan/changes` | plan.approve |
| POST | `/commercial/projects/:projectId/resource-plan/approve` | plan.approve |
| POST | `/commercial/projects/:projectId/resource-plan/publish` | plan.publish |
| GET | `/commercial/projects/:projectId/resource-plan/capacity` | read |
| GET | `/commercial/projects/:projectId/resource-plan/cost` | cost.read |
| GET | `/commercial/my-work` | work.read |

## UI routes

| Route | Purpose |
| ----- | ------- |
| `/:workspace/admin/team` | Resource list |
| `/:workspace/admin/team/:resourceId` | Profile, skills, schedule |
| `/:workspace/admin/opportunities/:id/project/resources` | Project staffing requirements |
| `/:workspace/admin/opportunities/:id/project/capacity` | Capacity board, recommendations, guard |
| `/:workspace/work` | Employee My Work |

## Northstar demo behavior

Northstar Creative includes Maya (founder), ops/PM, strategist, designer, copywriter, paid media, developer, one contractor. Pre-seeded on active Acme project: skills, schedules, leave, allocations, one safe recommendation, one skill gap, one over-allocation, approved+published plan. All in `sessionStorage`.

## Authenticated production behavior

Full API → Postgres journey with RLS, audit, guard decisions, idempotent publish.

## Error and empty states

- No resources: prompt to add team
- No active project: block resource plan
- No recommendations: show constraints and gaps
- Guard block: show missing role/skill coverage
- Unauthorized: 403 without cross-tenant hints

## Security risks

| Risk | Mitigation |
| ---- | ---------- |
| Cross-tenant staffing data | workspace_id on all tables + RLS |
| Rate leakage | Column-level policy / API redaction |
| Auto-assignment | Recommendations draft-only; publish requires approval |
| Published plan tampering | Immutable trigger on versions |
| Contractor PII exposure | Limited own-work scope |

## Acceptance criteria

1. Migration applied to `zuvtnmmnwohrapaecsuj`; local/remote aligned
2. Capacity engine unit tests pass (schedules, leave, overlap, timezone, skills)
3. Resource-plan lifecycle enforced server-side
4. Recommendations explain inclusion/exclusion with evidence
5. Published plans immutable; reassignment creates new revision
6. Employee sees own work only; cannot see private rates
7. Northstar journey complete without Postgres writes
8. Authenticated E2E: role requirements → recommendations → publish → my work persists after refresh
9. Phase 2–4 regressions pass; Phase 5 E2E passes twice with 0 skipped
10. All lint, typecheck, test, build gates pass

## Definition of done

- Contract, migration, domain, persistence, API, UI, Northstar, tests, verification report complete
- Commit `feat(resources): add governed capacity and assignment planning` pushed to `feat/phase-5-resource-capacity`
- Not merged to `main`
