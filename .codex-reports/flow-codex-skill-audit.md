# FLOW - CODEX SKILLS AUDIT & OPTIMIZATION

Scope: read-only audit of installed Codex skills. No skills, plugins, app code, or configuration were modified, disabled, moved, or uninstalled. Classification is based on recursive inventory, frontmatter/path/name signals, sampled SKILL.md body risk indicators, and targeted inspection of the user-specified candidate skills.

## Inventory Counts

- Recursive SKILL.md files discovered: 932
- Top-level local skill directories with SKILL.md: 887
- Relevant to Flow now: 471
- Core candidates: 29
- On-demand candidates: 431
- Security-gate candidates: 26
- Future/domain candidates: 321
- Disable candidates: 125
- Uninstall candidates: 0
- Manual security review candidates: 507
- Missing Flow-specific skills proposed: 6

Category counts:

- A - CORE / FREQUENT: 29
- B - TASK-TRIGGERED: 15
- C - SECURITY GATE: 26
- D - UI/UX: 105
- E - INFRASTRUCTURE / DEPLOYMENT: 311
- F - DOMAIN-SPECIFIC / FUTURE: 321
- G - DUPLICATE / OVERLAPPING: 40
- H - IRRELEVANT TO FLOW: 85

Risk counts:

- LOW: 53
- LOW-MEDIUM: 372
- MEDIUM: 507

## TABLE 1: FLOW CODEX SKILL AUDIT

The complete 932-row table is in `flow-codex-skill-audit-inventory.md` and `flow-codex-skill-audit-inventory.csv`. It contains: Skill, Category, Priority, Purpose, Flow Use Case, Expected Frequency, Context/Token Cost, Overlap, Security Risk, Recommendation.

| Category | Count | Recommendation |
|---|---:|---|
| A - CORE / FREQUENT | 29 | Keep small and always useful for Flow work. |
| B - TASK-TRIGGERED | 15 | Keep on demand. |
| C - SECURITY GATE | 26 | Keep as gates before sensitive work. |
| D - UI/UX | 105 | Keep for UI build/review cycles. |
| E - INFRASTRUCTURE / DEPLOYMENT | 311 | Keep on demand; trigger only with target. |
| F - DOMAIN-SPECIFIC / FUTURE | 321 | Park until product scope needs it. |
| G - DUPLICATE / OVERLAPPING | 40 | Investigate/disable only after approval. |
| H - IRRELEVANT TO FLOW | 85 | Conservative disable candidates; no uninstall yet. |

## TABLE 2: FLOW CORE SKILL STACK

| Skill | Why Core | Trigger | Not For | Replaces |
|---|---|---|---|---|
| using-superpowers | Skill-aware routing discipline | Every task start | Subagent-only tasks per its stop marker | None; meta-router |
| writing-plans | Scoped plans and approval gates | Multi-step architecture/product changes | Tiny one-command tasks | Ad hoc planning |
| systematic-debugging | Evidence-first defect work | Bug, failing test, unexpected behavior | Greenfield feature planning | Guess-and-check debugging |
| test-driven-development | Behavior locked before risky implementation | Business rules, workflows, calculations, RLS-sensitive flows | Pure copy/UI polish | Loose implementation-first changes |
| verification-before-completion | Final proof before claiming done | End of material changes | Trivial read-only answers | Premature completion summaries |
| agents-sdk | Agent architecture guidance | Flow agent/runtime design | Non-agent UI work | Generic agent snippets |
| mcp-builder | Tool/server integration guidance | Flow tools, MCP resources, connector boundaries | Plain REST clients | Hand-rolled MCP patterns |
| workflow | Approval/action/process modeling | Action routing, state machines, audit trails | Single-screen UI tweaks | Implicit business logic |
| temporal-developer | Durable workflow patterns | Long-running actions, retries, auditability | Simple synchronous actions | Cron/ad hoc jobs |
| supabase | Supabase usage router | Auth, storage, DB, edge functions | Non-Supabase backends | Generic DB advice |
| supabase-postgres-best-practices | Postgres/RLS schema rigor | Schema, RLS, migrations, policies | Non-DB UI work | Generic SQL patterns |
| auth | Identity/session boundaries | Login, session, account flows | Unauthenticated static UI | Ad hoc auth code |
| oauth | Delegated access safety | Provider integrations | Email/password auth only | Custom OAuth guesses |
| nextjs | Next.js app patterns | Routing, rendering, API routes | Non-Next projects | Generic React-only advice |
| react-best-practices | React conventions | Components, hooks, state | Backend-only tasks | Inconsistent component patterns |
| frontend-design | Build-quality UX | New user-facing Flow surfaces | Backend-only work | Raw functional UI |
| frontend-design-review | Visual/interaction QA | Before shipping UI | No UI changed | Self-review without rubric |
| webapp-testing | Browser workflow verification | Critical user workflows | Library-only unit code | Untested manual claims |
| security-diff-scan | Focused changed-code review | Sensitive diffs | No security-relevant change | Broad noisy scans |
| threat-model | Risk model before design | Auth, agents, external tools | Pure styling | Implicit security assumptions |
| agentic-actions-auditor | Action wall and evidence audit | External side effects/autonomous agents | Static read-only pages | Unreviewed agent actions |

## TABLE 3: FLOW ON-DEMAND SKILL ROUTER

| Work Type | Skill Route | Trigger Notes |
|---|---|---|
| Architecture | writing-plans, workflow, agents-sdk, temporal-developer | Use for new modules, state machines, action routing, durable workflows. |
| Database | supabase, supabase-postgres-best-practices | Use for schema, migrations, RLS, functions, Postgres design. |
| Authentication | auth, oauth, supabase | Use for identity/session/provider flows. |
| Authorization | supabase-postgres-best-practices, threat-model, security-diff-scan | Use for RLS, policies, roles, action authorization. |
| Agent development | agents-sdk, agentic-actions-auditor, verification-before-completion | Use for agent behavior, evidence, approval walls. |
| Tool development | mcp-builder, rest-api, webhooks | Use for tool contracts and service interfaces. |
| MCP | mcp-builder, building-mcp-server-on-cloudflare | Use for MCP servers/resources/tools and hosted MCP. |
| Workflow development | workflow, temporal-developer, test-driven-development | Use for deterministic and auditable workflows. |
| Document intelligence | azure-ai-document-intelligence-* or openai-docs as needed | On-demand only unless Flow document ingestion becomes active. |
| Memory | using-superpowers, writing-skills/skill-creator when creating Flow skills | Use for repeatable operating procedures, not transient facts. |
| Security review | threat-model, security-diff-scan, deep-security-scan, supply-chain-risk-auditor | Use before sensitive merges, dependencies, deploy, agent side effects. |
| API development | rest-api, webhooks, websockets | Use for REST, callbacks, realtime channels. |
| Frontend development | nextjs, react-best-practices, frontend-design | Use for Flow UI implementation. |
| UI review | frontend-design-review, web-design-guidelines, frontend-testing-debugging | Use before shipping user-visible changes. |
| Testing | test-driven-development, property-based-testing, webapp-testing | Use based on behavior risk and determinism needs. |
| Debugging | systematic-debugging, frontend-testing-debugging | Use for failures and regressions. |
| Performance optimization | web-perf, observability | Use for runtime, bundle, and operational performance. |
| Deployment | verification-before-completion, observability, provider deploy skills | Use after local validation and with explicit deploy target. |
| Cloudflare | workers-best-practices, building-ai-agent-on-cloudflare, building-mcp-server-on-cloudflare | Use when Cloudflare Workers/Agents/MCP are in scope. |
| Code review | code-maturity-assessor, security-diff-scan, spec-to-code-compliance | Use for review against architecture/security/spec. |

## TABLE 4: SKILLS TO REMOVE OR DISABLE (CONSERVATIVE)

| Skill/Group | Category | Reason | Recommendation | Uninstall? |
|---|---|---|---|---|
| Generic nested duplicates: web, ios, android, linux, macos, windows, react-native, flutter, electron, unity, unreal | G | Duplicate basename triggers across provider packs | Disable only if observed trigger noise; prefer parent/provider skill routing | Do not uninstall yet |
| Life-science/research pack: alphafold, biorxiv, bindingdb, biobank, biostudies, boltz variants | H | No current Flow product need found | Disable after approval if reducing trigger surface is desired | Uninstall only after backup/export |
| Finance/market/vendor packs: daloopa, moodys, trading/finance-specific skills | H/F | Likely unrelated to current Flow foundation | Park or disable; keep if future domain modules are planned | No immediate uninstall |
| Provider SDK language matrix skills, especially many Azure Java/.NET/Rust variants | F | Useful only for specific SDK work; high count adds trigger noise | Keep Python/TS-relevant variants on-demand, disable unused languages after approval | No immediate uninstall |
| Duplicate skill-creator/plugin-creator copies | G | System and user-installed variants overlap | Prefer system copy unless user-installed version has needed customizations | Investigate source before disabling |
| Vercel/Next overlapping skills from next-skills and agent-skills | G/F | Likely multiple routers for same deployment/frontend work | Keep `nextjs` and current Vercel plugin capability; disable stale duplicates after approval | No immediate uninstall |

## SKILL SUPPLY-CHAIN & PROMPT-INJECTION REVIEW

| Severity | Finding | Evidence | Recommendation |
|---|---|---|---|
| CRITICAL | None found in automated and targeted inspection. | No sampled SKILL.md contained direct exfiltration, credential theft, or destructive self-executing behavior. | No emergency action. |
| HIGH | None found requiring immediate disablement. | Risk scan found shell/remote/credential patterns, but they appear aligned with task domains such as installers, cloud deploy, auth, or package tooling. | Keep read-only unless a specific skill over-triggers or executes unexpected commands. |
| MEDIUM | 507 skills combine sensitive indicators such as remote docs, shell/package execution, credentials, browser/cloud access, or global config. | Exact rows are marked MEDIUM in the inventory CSV. | Manually review before using on production credentials, deployment, email/calendar/drive, or global configuration. |
| LOW-MEDIUM | 372 skills mention one sensitive capability. | Usually expected for SDK, auth, deploy, browser, or provider-integration skills. | Allow task-triggered use with normal approval/evidence discipline. |
| LOW | Remaining skills mostly provide static guidance. | No notable risky pattern found in sampled body scan. | Keep. |

Prompt-injection exposure is highest in skills that instruct the model to fetch live remote docs or read third-party repository content. Treat those sources as untrusted input: use official docs where possible, avoid executing copied commands blindly, and never pass secrets into commands suggested by remote content without inspection.

## Conflicts And Overlaps

- Superpowers process skills can over-trigger if every task is forced through a heavyweight ritual. Keep `using-superpowers`, but pair it with concise routing and avoid loading unrelated references.
- `verification`, `verification-before-completion`, `webapp-testing`, and frontend testing skills overlap. Use `verification-before-completion` as the final evidence gate, `webapp-testing` for browser workflows, and `frontend-testing-debugging` only when UI debugging is active.
- `supabase`, `supabase-best-practices`, and `supabase-postgres-best-practices` overlap. Use `supabase` as router, `supabase-postgres-best-practices` for schema/RLS/migration detail, and avoid loading all Supabase skills for simple queries.
- `frontend-design`, `frontend-design-review`, `web-design-guidelines`, `react-best-practices`, and `composition-patterns` overlap. Use build vs review separation: design/build first, review after implementation.
- Cloudflare/Workers/MCP/agent skills overlap. Use `workers-best-practices` for platform constraints, `building-ai-agent-on-cloudflare` for agent runtime, and `building-mcp-server-on-cloudflare` for hosted MCP.
- Nested generic skills with names like `web`, `ios`, `android`, `deploy`, and `preset` are duplicate trigger risks because their basename is not self-describing outside the parent directory.

## Missing Capabilities

| Proposed Skill | Purpose |
|---|---|
| flow-architecture-decision-record | Capture ADRs for Flow agent/workflow/security decisions with approval/evidence fields. |
| flow-action-wall | Enforce Flow external-action policy: preview, approval, execution, evidence, undo/rollback plan. |
| flow-rls-review | Focused Supabase RLS/policy/migration review tailored to Flow data model. |
| flow-deterministic-calculations | Guardrails for business calculations, idempotency, rounding, replayable evidence, property tests. |
| flow-release-verification | End-to-end release checklist across tests, migrations, deployment target, browser proof, observability. |
| flow-agent-memory-policy | Rules for what agents may store, summarize, retrieve, or forget in Flow memory systems. |

## Final Recommendation

Recommended Flow Codex Configuration v1:

1. Keep a small always-available core: process discipline, architecture/workflow, agents/MCP, Supabase/Postgres/RLS, auth/OAuth, Next/React/frontend, testing, verification, and focused security gates.
2. Keep provider, SDK, cloud, document, and integration skills on demand only. They are useful but should not shape routine Flow work.
3. Do not uninstall anything immediately. First disable or de-prioritize duplicate generic nested skills and clearly irrelevant domain packs after user approval.
4. Add Flow-specific skills for action walls, RLS review, deterministic calculations, release verification, and architecture decision records. These would reduce repeated context loading more than deleting broad provider packs.
5. Estimated complexity reduction: 55-70% fewer skills need to be considered during ordinary Flow development if routing uses the core stack plus on-demand gates instead of the full 932-entry install set.
