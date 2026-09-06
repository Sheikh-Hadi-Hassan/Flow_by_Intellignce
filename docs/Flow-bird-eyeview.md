# Flow — bird eyeview

> Developer handoff / bird's-eye overview of the Flow by Intellignce application.

**Audience:** Incoming engineer taking over the codebase  
**Prepared:** 2026-09-03  
**Current milestone freeze:** Stop after **DEMO-02D** (Business Registry / BB-01). Do **not** start DEMO-03 unless product explicitly unfreezes it.  
**Overall product status:** Foundation + commercial spine + Mission Control V2 + Ask Flow + Building Blocks (CRM Core + Business Registry). Northstar demo depth-first plan is mid-stream (**DEMO-02 PARTIAL**).

This document is the practical handoff: what Flow is, what exists, what is frozen, what is broken or incomplete, how to run it, and what to do next. Prefer linked evidence over memory.

---

## 1. One-paragraph product summary

Flow is an **AI-native Business Operating System** for software houses, digital agencies, and service businesses. It is **not** a fixed CRM. The platform recommends and activates **trusted building blocks** after founder approval. AI may plan and propose; it must not bypass the **Action Wall**, invent production React/SQL, or change deterministic financial math. The tenant boundary is the **workspace**. The demo company is **Northstar Creative** (`northstar-creative`), with a locked demo clock and canonical organisation ID.

---

## 2. Hard product / engineering rules (read first)

| Rule | Meaning |
|---|---|
| `AI_PERMISSION <= CURRENT_USER_PERMISSION` | AI never gets more authority than the acting user |
| Action Wall | Deterministic authz for user and AI actions (`ALLOW` / `DENY` / `REQUIRES_APPROVAL`) |
| Workspace isolation | Every API, RLS policy, Ask tool, and seed must respect `workspace_id` |
| No second legal-entity table | Business Registry extends `organizations` / `organization_locations` |
| No arbitrary model codegen | No production React/SQL from the model; manifests are code-defined |
| Mission Control V2 frozen | Do not redesign Mission Control while closing DEMO-02 |
| Evidence before PASS | Compilation/screenshots alone never justify overall PASS |
| Depth-first demos | Finish one DEMO milestone and **stop** |

Project skills (use before architectural work):

- `.codex/skills/flow-system-architect/SKILL.md`
- `.codex/skills/flow-action-wall/SKILL.md`
- `.codex/skills/flow-agent-architecture/SKILL.md`
- `.codex/skills/flow-workflow-architecture/SKILL.md`
- `.codex/skills/flow-evidence-and-audit/SKILL.md`

Truth/evidence rules: `.cursor/rules/00-flow-truth-and-evidence.mdc`  
Git/secret safety: `.cursor/rules/05-flow-git-and-secret-safety.mdc`

---

## 3. Repository map

```text
apps/web                 Next.js UI (shell, Mission Control, Ask Flow, commercial, registry, CRM)
apps/api                 NestJS API (workspace, commercial, building-blocks, security)
packages/contracts       Shared typed contracts (Action Wall, building blocks, registry seed)
packages/database        Persistence adapters + in-memory stores + RLS integration tests
packages/commercial      Deterministic commercial / money math
packages/auth            Auth boundary
packages/domain          Domain boundary
packages/config          Shared config
packages/observability   Observability
packages/testing         Test helpers
packages/blm-*           Business Language Model contracts/core/providers/evaluation
supabase/migrations      Authoritative Postgres schema + RLS
docs/                    Architecture, ADRs, verification, demo-data, quality
.cursor/quality/         Evidence manifests / closure requests
knowledge/blm/           Compiled BLM knowledge artifacts (generated)
```

**Stack:** TypeScript, pnpm monorepo, Next.js (web), NestJS (api), PostgreSQL via Supabase, Vitest, Playwright.

**Node:** `>=22`, **pnpm:** `>=11` (`packageManager: pnpm@11.16.0`).

---

## 4. Architecture in practice

### 4.1 Layers

1. **Platform** — identity, workspace, shell, design tokens, audit, events, Ask Flow, Action Wall, Module Registry  
2. **Building-block contracts** — typed manifests, config schemas, lifecycle, permissions, AI tools  
3. **First-party blocks** — CRM Core (`crm.core`), Business Registry (`registry.business`)  
4. **Commercial / lifecycle spine** — opportunities, discovery, proposals, contracts, projects, capacity (earlier phases; still present)  
5. **Mission Control** — founder operating canvas (V2 visual language is the reference UI)

### 4.2 Key ADRs (do not contradict casually)

| ADR | Decision |
|---|---|
| ADR-002 | Modular monolith initially |
| ADR-003 / 004 | Next.js frontend / NestJS backend |
| ADR-005 / 006 | PostgreSQL primary; Supabase as initial platform |
| ADR-008 | Action Wall deterministic authorization |
| ADR-009 / 015 | Multi-tenant workspace isolation |
| ADR-014 | PostgreSQL RLS as defense-in-depth |
| ADR-016 / 019 | Organization is business entity inside workspace; single primary org UX |
| ADR-020 / 021 | Trusted Module Registry; activation ≠ definition |
| ADR-023 | First-party entities use typed domain storage |
| ADR-024 / 025 | No executable custom metadata; AI schema changes draft-first |
| ADR-026 | Building blocks sit on the Module Registry |

Canonical reads:

- `docs/architecture/architecture-v1.md`
- `docs/architecture/universal-execution-spine-v1.md`
- `docs/security/security-model-v1.md`
- `docs/product-architecture/AI-COMPOSABLE-BUILDING-BLOCKS.md`

### 4.3 Execution spine (mental model)

```text
User / Ask Flow
  → Intent / Planner
  → Tool Registry
  → Action Wall (authz)
  → Evidence / Approval policy
  → Domain service / persistence
  → Audit
  → Result (with provenance)
```

Prompts are **not** a security boundary.

---

## 5. What has been built (by area)

### 5.1 Application shell

- Authenticated workspace chrome: `WorkspaceHeader`, `AppShell`, lifecycle nav  
- Global Ask Flow dock clearance via CSS vars (`--ask-flow-dock-height`, etc.)  
- Mobile ≤430px: overflow menu, 44×44 targets, single workspace identity (no duplicate “Flow”)  
- Route pattern: `/{workspace}/admin/...`  
- Verification: `docs/verification/application-shell/SHELL-01-NAVIGATION-VERIFICATION.md`

### 5.2 Mission Control V2 (frozen for DEMO-02 work)

- Canvas: business impact hero, signal ledger, operating body, Ask command surface  
- Demo seed / selectors / history helpers under `apps/web/src/lib/mission-control/`  
- Visual language is the **reference** for registry and other admin surfaces  
- Do not redesign MC while closing Business Registry  
- Verification under `docs/verification/mission-control/`

### 5.3 Ask Flow (global assistant)

- Global dock + provider: `apps/web/src/components/ask/`  
- Local/assistant pipeline: `apps/web/src/lib/ask-flow/assistant/` (planner, tools, compose, CRM + registry tools)  
- API route: `apps/web/src/app/api/ask/route.ts`  
- Context carries workspace, org, route, demo state, snapshot, role, permissions  
- Registry answers must match page state (populated / incomplete / restricted)  
- Verification: `docs/verification/ask-flow/`

### 5.4 Building Blocks platform

- Manifests + installation lifecycle in `@flow/contracts`  
- Admin registry UI: Building Blocks screen  
- Lifecycle: `available → recommended → configuring → awaiting_approval → active → …`  
- AI may recommend; founder must approve activation  
- ADR-026 + `docs/product-architecture/AI-COMPOSABLE-BUILDING-BLOCKS.md`

### 5.5 CRM Core (BB-00 / BB-02 precursor)

- Reuses `crm_clients` / `crm_contacts` — no parallel CRM domain  
- Segments, duplicates, client screens under admin  
- Ask CRM tools register when block is active  
- Verification notes: `docs/verification/building-blocks/BB-00-CRM-CORE-REFERENCE.md`

### 5.6 Business Registry / BB-01 (DEMO-02 → DEMO-02D) — current focus

**Route:** `/northstar-creative/admin/settings/business`

| Piece | Location |
|---|---|
| Contracts seed / safety / permissions | `packages/contracts/src/building-blocks/registry-business/` |
| Canonical org ID | `NORTHSTAR_ORG_ID` = `00000000-0000-4000-b001-000000000001` |
| Demo clock | `2026-09-03T08:12:00-05:00` / `America/Chicago` |
| Migrations | `20260907000100_business_registry.sql` + **`20260908000100_business_registry_rls_closure.sql`** |
| In-memory persistence | `packages/database/src/building-block-persistence.ts` |
| API | `apps/api/src/building-blocks/` |
| UI | `apps/web/src/components/business-registry/BusinessRegistryScreen.tsx` |
| Client store/hooks | `apps/web/src/lib/business-registry/` |
| Ask tools | `apps/web/src/lib/ask-flow/assistant/registry-tools.ts` |
| RLS harness + tests | `packages/database/src/fixtures/business-registry-rls-harness.sql` + `business-registry-rls.integration.test.ts` |
| E2E | `apps/web/e2e/business-registry*.spec.ts` |
| Verification | `docs/verification/demo-data/DEMO-02-BUSINESS-REGISTRY.md` |
| PO sheet | `docs/verification/demo-data/screenshots/DEMO-02-PO-REVIEW.png` |

**Shipped behaviour (DEMO-02 / 02C / 02D):**

- One fictional registered company (Northstar Creative LLC), Chicago HQ + Brooklyn remote  
- Documents/insurance metadata, masked tax/bank, signatories, compliance owners, audit  
- DEMO- prefix safety; production slug seed rejection  
- Role-aware presentation (founder / finance / operations / employee)  
- Ask Flow reconciliation with page `demoState` / role / snapshot  
- Dock clearance so resting dock does not cover content  
- Mobile header: hide wordmark ≤1080; hide centre title ≤430 to avoid identity collision  
- RLS **closure migration authored**: typed compliance policies, signatory read, tax/bank/ownership satellites, `registry.audit.read`, invoker delete trigger  

**Not closed:**

- Live Postgres RLS matrix (Docker Desktop I/O blocker)  
- Product-owner visual approval of contact sheet  
- Document binary upload (metadata only by design for now)

### 5.7 Commercial / lifecycle spine (earlier phases — still in tree)

Present and largely verified in prior phase reports:

- Opportunities, discovery/questionnaire, briefs  
- Proposals / contracts foundations  
- Project engine / resource capacity foundations  
- Commercial golden-path e2e helpers  

Treat these as **existing product surface**, not “unbuilt,” but they are **not** the current Northstar depth-first focus. DEMO-03+ will deepen CRM/sales/etc. using the milestone plan—not by inventing parallel tables.

### 5.8 Business Language Model (BLM)

- Packages: `blm-contracts`, `blm-core`, `blm-evaluation`, providers (`groq`, `openai`)  
- Knowledge compile scripts under root `package.json` (`blm:knowledge:*`, `blm:eval:*`)  
- Replaceable extraction provider (ADR-045)  
- Keep BLM output untrusted until deterministic validation

### 5.9 Demo data programme (Northstar)

Authoritative plan: `docs/demo-data/NORTHSTAR-MILESTONE-PLAN.md`

| Milestone | Intent | Status (as of handoff) |
|---|---|---|
| DEMO-01 | Docs: model, dictionary, scenarios, provenance | Done (docs only) |
| DEMO-02 | Business Registry BB-01 | **PARTIAL** — UI/Ask/tests largely green; live RLS + PO approval open |
| DEMO-03 | CRM clients/contacts depth | **Not started — stop before this** |
| DEMO-04…10 | Sales → finance → MC reconciliation → full a11y | Future |

Supporting docs: `NORTHSTAR-DATA-MODEL.md`, `NORTHSTAR-DATA-DICTIONARY.md`, `NORTHSTAR-SCENARIO-CATALOGUE.md`, `NORTHSTAR-PROVENANCE-PLAN.md`, `CRM-REFERENCE-ANALYSIS.md`.

---

## 6. Critical analysis — what is strong vs fragile

### 6.1 Strengths

- Clear ADRs and Action Wall / RLS story on paper and in migrations  
- Typed building-block manifests prevent “AI invents a CRM”  
- Mission Control V2 gives a coherent visual language  
- Demo clock + DEMO- safety reduce fictional-data risk  
- Evidence culture (manifests, critic reports, Playwright screenshots) is real, not ceremonial  
- Registry Ask tools are wired to live page state (avoids contradictory answers)

### 6.2 Systemic risks

| Risk | Why it matters | Fix direction |
|---|---|---|
| **Dual persistence** | Much demo UI still hydrates from **in-memory / contracts seed** while Postgres migrations exist | Drive non-demo workspaces through API + Postgres; keep Northstar seed identical to SQL IDs; add integration tests that hit both |
| **Live RLS unverified** | Policies can look correct in SQL and still leak until exercised with JWT roles | Repair Docker / stand up isolated Postgres; run `FLOW_DB_INTEGRATION_TESTS=1` suite; never use production `DATABASE_URL` |
| **README drift** | Root README still reads like “foundation only” | Update README status section to match reality (MC, Ask, BB-01, commercial spine) |
| **Partial quality gates** | Visual PASS blocked on PO; Security PASS blocked on live DB | Explicit checklists in verification docs; do not claim overall PASS |
| **Demo vs production auth** | Prototype/demo session paths can mask missing real authz | Keep prototype gated; ensure Nest + RLS remain authoritative for real workspaces |
| **Ask flakiness under load** | Playwright Ask steps have intermittently timed out | Harden `/api/ask`, increase e2e resilience, keep request context required fields |
| **Large uncommitted surface** | Working tree often has many DEMO-02 / MC / Ask files | Stage explicit paths only; secret-scan before commit; avoid `git add .` |
| **Mission Control metrics** | Some MC numbers still seed/hardcoded until DEMO-09 | Do not “fix” MC totals ad hoc; wait for reconciliation milestone |

### 6.3 DEMO-02D open defects (actionable)

1. **Security PARTIAL — live RLS**  
   - **Blocker:** Docker Desktop containerd I/O errors; cannot pull/run disposable Postgres; local Supabase port refused; Homebrew `psql` unavailable.  
   - **Do not** point tests at production Supabase pooler URL in `.env.local`.  
   - **Fix:** Repair Docker storage **or** install local Postgres; create isolated DB; apply harness + migrations through `20260908000100`; run:

```bash
cd packages/database
FLOW_DB_INTEGRATION_TESTS=1 DATABASE_URL='postgresql://…local-only…' pnpm exec vitest run src/business-registry-rls.integration.test.ts
# Optional pre-repair leak demo:
FLOW_DB_RLS_EXPECT_LEAKS=1 FLOW_DB_INTEGRATION_TESTS=1 DATABASE_URL='…' pnpm exec vitest run src/business-registry-rls.integration.test.ts
```

2. **Visual PARTIAL — PO approval**  
   - Contact sheet: `docs/verification/demo-data/screenshots/DEMO-02-PO-REVIEW.png`  
   - Frames `d02d-01` … `d02d-12` use exact viewports + `object-fit: contain`.  
   - **Fix:** Product owner reviews sheet and records approval (do not forge).

3. **Apply closure migration in real environments**  
   - `20260908000100` is authored; until applied, production/local DBs still have DEMO-02C leaky membership SELECTs on compliance/signatories and sensitive org columns.

---

## 7. Main modules — ownership cheat sheet

| Module | Owns | Primary paths |
|---|---|---|
| Shell / nav | Header, layout, dock clearance | `apps/web/src/components/shell/`, `styles/workspace-header.css` |
| Mission Control | Founder canvas + seeds/selectors | `components/mission/`, `lib/mission-control/` |
| Ask Flow | Global assistant UX + tools | `components/ask/`, `lib/ask-flow/`, `app/api/ask/` |
| Business Registry | Org identity, locations, compliance metadata | `components/business-registry/`, `lib/business-registry/`, contracts `registry-business` |
| CRM Core | Clients, contacts, duplicates, segments | `components/crm-core/`, building-blocks CRM |
| Building Blocks admin | Install/approve/configure blocks | `components/building-blocks/`, API `building-blocks/` |
| Commercial | Opportunities, money math, golden path | `components/commercial/`, `packages/commercial`, API `commercial/` |
| Questionnaire / discovery | Discovery facts / BLM extraction UX | `components/questionnaire/`, BLM packages |
| Database boundary | Persistence + migrations consumers | `packages/database/`, `supabase/migrations/` |
| Contracts | Shared types, Action Wall, seeds | `packages/contracts/` |
| Security / identity | Authz helpers, RLS functions | `supabase/migrations/20260810*`, `docs/security/` |

---

## 8. How to run locally

```bash
pnpm install
cp .env.example .env.local   # fill local values; never commit secrets
pnpm --filter @flow/commercial build
pnpm --filter @flow/database build
pnpm dev                     # web + api (see root package.json)
```

Useful checks:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm quality:secret-scan
pnpm --filter @flow/web exec playwright test e2e/business-registry-po-review.spec.ts --project=chromium-light
```

**Env warning:** `.env.local` may contain a **production/pooler** `DATABASE_URL`. For RLS work, override with an **isolated local** URL only. Never run destructive migrations against production.

Demo entry:

- Workspace slug: `northstar-creative`  
- Registry: `/northstar-creative/admin/settings/business`  
- Useful query flags used in e2e: `?state=partial`, `?role=employee`

---

## 9. Testing & evidence expectations

Mandatory verdict categories (every phase closure):

| Category | Evidence |
|---|---|
| Functionality | Unit/API/persistence tests |
| Visual design | Screenshots + critic/PO |
| Accessibility | axe + keyboard/touch |
| Security | Authz + **live** RLS where claimed |
| Data integrity | IDs, DEMO- safety, calc tests |
| Browser | Playwright journey |
| Performance | Metrics or explicit N/A |

**Overall PASS** requires every category PASS. Unknown = PARTIAL.

Current DEMO-02D evidence file: `.cursor/quality/evidence-manifest.json`

Critic reports live under `docs/quality/critic-reports/`.

---

## 10. Permission matrix (Business Registry — target)

| Role | Profile | Locations | Docs | Tax/bank | Signatories | Audit |
|---|---|---|---|---|---|---|
| Founder/Admin | Full | Manage | Manage | Manage | Manage | Read |
| Finance | Read | Read | No | Manage | No | No |
| Operations | Read | Manage | No | No | No | No |
| Employee | Public identity only | No | No | No | No | No |
| Anonymous | Denied | | | | | |
| Cross-workspace | Denied on other workspace | | | | | |

Application-layer presentation: `permissionsForRegistryRole` + `presentBusinessRegistry` in contracts seed.  
Postgres-layer: closure migration policies + satellites.

---

## 11. What to improve next (prioritized)

### P0 — Unblock DEMO-02 overall PASS

1. Repair local Docker / Postgres; run live RLS matrix green  
2. Apply `20260908000100` on that isolated DB (and document apply path for staging)  
3. Obtain PO approval on `DEMO-02-PO-REVIEW.png`  
4. Update verification doc + evidence manifest Security/Visual to PASS only with evidence  

### P1 — Harden before DEMO-03

1. Align API persistence with Postgres for registry (not only in-memory) for non-demo workspaces  
2. Stabilize Ask e2e (timeouts / error surfaces)  
3. Refresh root README so new developers are not misled by “foundation only”  
4. Confirm secret-scan + explicit-path commits for the large DEMO-02 working tree  

### P2 — DEMO-03 (only when unfrozen)

Follow `NORTHSTAR-MILESTONE-PLAN.md` § DEMO-03:

- Extend CRM Core clients/contacts/interactions  
- Keep Brightline duplicates / MC named clients  
- Do **not** invent a second company table  
- Reuse contracts + Action Wall + Ask tool registration pattern from BB-01  

### P3 — Later milestones

Sales pipeline locks, CUAD contracts, projects/tasks, employees/capacity, invoices/profitability, then DEMO-09 MC metric reconciliation, then DEMO-10 full a11y sweep.

---

## 12. Explicit non-goals / do-not-touch (unless asked)

- Redesigning Mission Control V2 during DEMO-02 closure  
- Starting DEMO-03+ without milestone unfreeze  
- Creating `legal_entities` / `companies` parallel identity tables  
- Exposing service-role keys to the browser  
- Forging PASS evidence or PO approval  
- Changing locked Northstar financial/MC snapshot numbers without coordinated reconciliation  
- `git add .` / force-push main / committing `.env*`

---

## 13. Suggested first week for the incoming developer

1. Read this handoff + `AGENTS.md` + ADR-008, 014, 015, 026  
2. Run web against `northstar-creative` admin + Business Registry + Ask Flow  
3. Skim `DEMO-02-BUSINESS-REGISTRY.md` and the PO contact sheet  
4. Run focused unit + Playwright registry suites  
5. Attempt isolated Postgres RLS (P0) — document exact blocker if still impossible  
6. Map one write path end-to-end (e.g. update profile → audit → Ask answer)  
7. Only then propose DEMO-03 scope with product  

---

## 14. Key links (bookmark)

| Topic | Path |
|---|---|
| Milestone plan | `docs/demo-data/NORTHSTAR-MILESTONE-PLAN.md` |
| DEMO-02 verification | `docs/verification/demo-data/DEMO-02-BUSINESS-REGISTRY.md` |
| Evidence manifest | `.cursor/quality/evidence-manifest.json` |
| Building blocks architecture | `docs/product-architecture/AI-COMPOSABLE-BUILDING-BLOCKS.md` |
| Architecture v1 | `docs/architecture/architecture-v1.md` |
| Security model | `docs/security/security-model-v1.md` |
| Quality gates | `docs/quality/FLOW_QUALITY_GATES.md` |
| Dependency register | `docs/research/dependency-register-v1.md` |
| Contributing | `CONTRIBUTING.md` |

---

## 15. Honest status snapshot (2026-09-03)

| Category | DEMO-02D verdict |
|---|---|
| Functionality | **PASS** |
| Visual design | **PARTIAL** (PO approval pending) |
| Accessibility | **PASS** |
| Security | **PARTIAL** (live RLS blocked by Docker I/O) |
| Data integrity | **PASS** |
| Browser verification | **PASS** (registry Playwright suites; treat as green when latest local run confirms) |
| **Overall** | **PARTIAL** |

**Stop after DEMO-02D. Do not begin DEMO-03 until product says so.**

---

*End of handoff. If anything in this file conflicts with a newer `.cursor/quality/evidence-manifest.json` or verification doc, the newer evidence wins.*
