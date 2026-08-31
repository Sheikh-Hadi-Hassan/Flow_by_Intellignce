# 09 — Phase 1 Implementation Contract

## Phase name

**Phase 1: Signup, Onboarding, and Business Twin Creation**

## User outcome

A founder at a creative agency can:

1. Create an account and workspace
2. Complete structured onboarding about their agency
3. See a compiled **Business Twin** summary
4. Review a **setup plan** with recommended modules
5. Land on a founder home with clear next steps

No CRM, proposals, projects, invoicing, client portal, or Voice mode in Phase 1.

---

## In scope

### Routes (see [02-information-architecture.md](./02-information-architecture.md))

```text
/
/sign-in
/sign-up
/verify-email
/forgot-password
/:workspace/onboarding
/:workspace/onboarding/business
/:workspace/onboarding/operations
/:workspace/onboarding/services
/:workspace/onboarding/policies
/:workspace/onboarding/review
/:workspace/onboarding/complete
/:workspace/admin
/:workspace/admin/twin
/:workspace/admin/setup
/:workspace/admin/settings
/:workspace/admin/settings/modules
```

### Features

| Feature                      | Description                                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------------------------- |
| **Authentication**           | Email/password sign-up and sign-in via Supabase Auth                                              |
| **Workspace creation**       | New workspace on first sign-up; slug from business name                                           |
| **Onboarding wizard**        | 5 steps with save/resume; agency type pre-recognized                                              |
| **Twin compilation**         | Server-side compile from onboarding answers + agency expertise pack metadata                      |
| **Setup plan**               | Display module recommendations (read-only; dry-run from BLM knowledge)                            |
| **Founder home**             | Setup progress, Twin snapshot card, Pulse placeholder (empty state)                               |
| **Settings shell**           | Workspace name, module list (recommended vs active)                                               |
| **Design system foundation** | Tokens, light/dark toggle, core UI primitives for Phase 1 screens                                 |
| **Responsive layouts**       | Mobile and desktop per wireframes in [06-responsive-wireframes.md](./06-responsive-wireframes.md) |

### Intelligence (bounded)

| Capability   | Phase 1 behavior                                                                    |
| ------------ | ----------------------------------------------------------------------------------- |
| **BLM**      | Classify business type; select digital agency expertise pack                        |
| **Twin**     | Deterministic template + onboarding field mapping; no live LLM required for compile |
| **Ask Flow** | **Not in Phase 1** — placeholder chip disabled with "Coming soon"                   |
| **Voice**    | **Not in Phase 1**                                                                  |
| **Pulse**    | Empty state with copy; no signals                                                   |
| **Proof**    | On module recommendations only (source: compiled knowledge manifest)                |
| **Guard**    | Not user-facing; no mutating Actions except workspace/onboarding save               |
| **Logic**    | Not used                                                                            |

---

## Out of scope

- Employee, client, vendor portals (routes must not be stubbed)
- Services editor and questionnaires (Phase 2) — onboarding captures high-level service names only
- CRM, opportunities, briefs, proposals, contracts, projects, tasks, invoices
- Team invite and membership management (show CTA; disabled or waitlist)
- External integrations (QuickBooks, ClickUp)
- Real-time collaboration
- Voice and Ask Flow functional UI
- White-label branding editor (show defaults only)
- Email transactional templates beyond verification
- Production deployment

---

## Existing assets to reuse

| Asset                                                                          | Use in Phase 1                            |
| ------------------------------------------------------------------------------ | ----------------------------------------- |
| `packages/auth` `SupabaseAuthAdapter`                                          | Server session verification               |
| `packages/database` identity types                                             | Workspace, membership models              |
| `packages/blm-core` `business-module-planning`                                 | Module recommendation dry-run             |
| `knowledge/blm/compiled/modules/digital-agency-module-recommendations-v1.json` | Recommendation labels                     |
| `knowledge/blm/compiled/expertise/blm-expertise-packs-v1.json`                 | Agency pack metadata                      |
| `apps/web/src/app/globals.css`                                                 | Tone reference; supersede with token file |
| Supabase migrations (identity, workspace)                                      | Persistence                               |

---

## New work required (implementation phase — not this task)

### UI components

- `AppShell` (admin layout, sidebar, header)
- `OnboardingStepper` + 5 step forms
- `TwinSummary`, `ModuleRecommendationCard`, `SetupPlanChecklist`
- `FounderHome`, `SetupProgressBar`
- UI primitives: `Button`, `Input`, `Select`, `Checkbox`, `Badge`, `Card`, `Alert`, `Skeleton`

### API endpoints

Per [08-technical-ui-architecture.md](./08-technical-ui-architecture.md) Phase 1 table.

### Data

- Onboarding answers JSON schema (workspace-scoped)
- Twin snapshot JSON schema (versioned)
- Workspace state: `ONBOARDING_IN_PROGRESS` → `TWIN_COMPILED` → `ACTIVE`

---

## Permissions (Phase 1)

| Actor                 | Access                                  |
| --------------------- | --------------------------------------- |
| Unauthenticated       | Public routes only                      |
| Authenticated founder | Own workspace onboarding + admin routes |
| Other roles           | Not implemented; invite CTA only        |

Enforce via middleware + API `ActorContext`; founder role assigned on workspace creation.

---

## Acceptance criteria

### Authentication

- [ ] User can sign up with email and password
- [ ] User receives verification flow (or dev bypass documented)
- [ ] User can sign in and sign out
- [ ] Session persists across refresh
- [ ] Unauthenticated access to `/:workspace/admin` redirects to sign-in

### Onboarding

- [ ] All 5 steps render per wireframe on desktop and mobile
- [ ] Answers auto-save; user can leave and resume
- [ ] Agency business type loads digital agency defaults in copy
- [ ] Validation prevents continue on required fields
- [ ] Review step shows all answers editable

### Business Twin

- [ ] Completing onboarding compiles Twin within 3 seconds (no LLM blocking)
- [ ] Twin shows: business name, type, size, location, services, operating model summary
- [ ] Expertise pack name visible ("Digital Agency Expertise")
- [ ] Twin page accessible from admin nav and home card

### Setup plan

- [ ] At least 3 module recommendations displayed with outcome labels (Install now / Deferred)
- [ ] Each recommendation shows Proof chip linking to source manifest ID
- [ ] Recommendations are dry-run only — no module activation Action
- [ ] Setup checklist shows Phase 2+ next steps

### Founder home

- [ ] Setup progress bar reflects onboarding + post-onboarding checklist
- [ ] Pulse shows intentional empty state (not error)
- [ ] Quick actions: Define services (disabled/Phase 2), Invite team (disabled), Ask Flow (disabled)

### Design system

- [ ] Light and dark mode toggle works
- [ ] Tokens drive all colors; no hardcoded hex in components
- [ ] Focus visible on all interactive elements
- [ ] Reduced motion respected
- [ ] Matches calm, content-first spec in [05-design-system-specification.md](./05-design-system-specification.md)

### Quality

- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] New unit tests for onboarding validation and Twin compile mapping
- [ ] No secrets in client bundle
- [ ] Workspace isolation: user A cannot read user B workspace

---

## Definition of done

Phase 1 is **done** when:

1. A new user can complete the full flow **sign-up → onboarding → Twin → founder home** without developer assistance
2. All acceptance criteria above are checked
3. Demo path works with **Northstar Creative** pre-fill option (sandbox/demo mode flag)
4. Product owner signs off on staged preview
5. No routes outside Phase 1 scope are exposed in navigation
6. Planning docs updated if implementation diverged (ADR or doc patch)

---

## Dependencies

| Dependency                                                | Owner       | Status                         |
| --------------------------------------------------------- | ----------- | ------------------------------ |
| Supabase project for auth + DB                            | Engineering | Required before implementation |
| API dev server fix                                        | Engineering | Recommended pre-flight         |
| PO approval of this contract                              | Product     | **Pending**                    |
| Agency demo content ([07](./07-content-and-demo-data.md)) | Design      | Approved in this folder        |
| Design tokens ([05](./05-design-system-specification.md)) | Design      | Approved in this folder        |

---

## Risks

| Risk                              | Mitigation                                         |
| --------------------------------- | -------------------------------------------------- |
| Twin feels "empty" without LLM    | Rich template from agency pack + onboarding fields |
| Scope creep into Phase 2 services | Hard route guard; disabled CTAs                    |
| Supabase setup friction           | Document local stack; dev bypass for auth          |
| API/NestJS wiring delay           | BFF in Next.js for Phase 1 only (ADR if chosen)    |

---

## Approval gate

**Do not begin Phase 1 implementation code until:**

1. Product owner approves `09-phase-1-implementation-contract.md`
2. Product owner resolves remaining decisions in [README.md](./README.md) PO question list (below)
3. Separate implementation prompt issued

---

## Estimated delivery slices (implementation planning only)

| Slice | Deliverable                                 |
| ----- | ------------------------------------------- |
| 1.1   | Auth + middleware + public routes           |
| 1.2   | Design tokens + UI primitives + admin shell |
| 1.3   | Onboarding wizard + API persistence         |
| 1.4   | Twin compile + reveal + setup plan          |
| 1.5   | Founder home + settings + polish + tests    |

Each slice ends with demoable increment to product owner.
