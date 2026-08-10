# FLOW TRUE CORE SKILL STACK v1

Principle: Core means Codex should need the skill during most meaningful Flow development tasks. Good but provider-specific, review-only, or checkpoint-only skills are not Core.

Original Core Candidates: 29
Final True Core: 12

## Core Stack

| Skill | Primary Capability | Expected Trigger Frequency | Why Core | What It Replaces | Potential Conflict | Context Cost | Final Decision |
|---|---|---|---|---|---|---|---|
| using-superpowers | Skill routing discipline | Every task start | It is the meta-router that prevents accidental skill bypass. | Ad hoc skill selection | Can over-trigger process-heavy behavior | Low | CORE |
| writing-plans | Planning and scope control | Multi-step implementation, architecture, migration, or release tasks | Flow needs explicit task boundaries, approval gates, and sequencing. | Unstructured planning | Can be excessive for one-command tasks | Low-Medium | CORE |
| systematic-debugging | Evidence-first debugging | Bugs, failing tests, unexpected runtime behavior | Most non-trivial Flow work will hit integration failures; this keeps fixes causal. | Guess-and-check debugging | Can slow tiny obvious fixes | Medium | CORE |
| test-driven-development | Behavior-first implementation | Business rules, workflow logic, permissions, calculations, bug fixes | Flow has permission, audit, rollback, and deterministic logic where tests must shape code. | Implementation-first feature work | Can conflict with pure exploratory spikes | Low-Medium | CORE |
| verification-before-completion | Completion evidence gate | Before claiming work is done | Keeps Codex from reporting success without test/build/browser/deployment evidence. | Premature final summaries | Overlaps with verification/webapp-testing | Low | CORE |
| supabase | Supabase router | Any Supabase database, auth, storage, realtime, edge function, CLI, or migration task | Supabase is central enough to route current backend/database work. | Generic backend advice | Loads broad Supabase guidance; use detail skill only when needed | Medium | CORE |
| supabase-postgres-best-practices | Postgres/RLS/database rigor | Schema, migration, RLS, policy, function, index, performance tasks | Tenant isolation and AI_PERMISSION <= CURRENT_USER_PERMISSION depend on deterministic DB/RLS enforcement. | Generic SQL guesses | Overlaps supabase-best-practices | Low-Medium | CORE |
| mcp-builder | Tool/MCP architecture | Designing or building tool servers, resources, prompts, external-service connectors | Flow depends on controlled tools and AI-driven CRUD through explicit contracts. | Ad hoc tool API design | Can bias toward MCP for plain internal APIs | Medium | CORE |
| workflow | Workflow modeling | Business processes, approval paths, action wall flows, multi-step task modeling | Flow is workflow-heavy; this skill helps encode states, transitions, and execution boundaries. | Implicit business process logic | Installed skill is Vercel WDK-flavored; keep generic lessons only | Medium | CORE |
| nextjs | Next.js application architecture | Routing, rendering, server/client boundaries, API routes if Flow uses Next.js | Likely current frontend/app stack; high leverage for ordinary app development. | Generic web architecture | Vercel/App Router bias; demote if Flow chooses another framework | Medium | CORE |
| react-best-practices | React component/performance conventions | React component, hook, state, rendering, data-fetching work | Most Flow UI work will be React-heavy; it reduces component drift. | Raw React implementation | Vercel performance bias; pair with project conventions | Medium | CORE |
| frontend-design | Product UI design quality | New or substantially changed Flow UI surfaces | Flow needs a custom frontend, not copied ERP UI. This is the lightest creative/build guidance. | Generic functional UI | Can conflict with dense operational UI constraints if over-stylized | Low-Medium | CORE |

## Removed From Core

This does not mean uninstall. It means the skill should not be loaded as always-active Flow context.

| Skill | Why Removed from Core | New Classification | When It Should Be Used |
|---|---|---|---|
| agents-sdk | Cloudflare Agents SDK-specific, not generic agent architecture. | ON-DEMAND | Use when Cloudflare Agents SDK is explicitly chosen or inspected. |
| temporal-developer | Powerful but platform choice not settled; workflows can be modeled generically first. | ON-DEMAND | Use when Temporal is selected or a durable workflow implementation is being built. |
| supabase-best-practices | Overlaps `supabase-postgres-best-practices`; keep one DB detail authority. | ON-DEMAND | Use only for Supabase-specific performance docs not covered by Postgres skill. |
| auth | Current installed skill is Clerk/Descope/Auth0/Vercel-oriented, not Flow auth authority. | ON-DEMAND | Use for concrete provider integration after architecture is decided. |
| oauth | Installed skill is Zoom OAuth despite generic name. | ON-DEMAND | Use only for Zoom OAuth. |
| frontend-design-review | Review-stage skill, not needed during most build tasks. | ON-DEMAND | Use before shipping meaningful UI changes. |
| webapp-testing | Verification tool skill, not always-active architecture. | ON-DEMAND | Use for browser workflow proof, screenshots, logs, and regressions. |
| security-diff-scan | Security checkpoint, not everyday context. | SECURITY GATE | Use for PR/diff-sensitive security review. |
| threat-model | Security/design checkpoint, not permanent context. | SECURITY GATE | Use before auth, authorization, agent, workflow, and external-action designs. |
| building-ai-agent-on-cloudflare | Provider-specific Cloudflare implementation. | ON-DEMAND | Use only if Flow targets Cloudflare Agents. |
| building-mcp-server-on-cloudflare | Provider-specific hosted MCP implementation. | ON-DEMAND | Use only if deploying MCP on Cloudflare Workers. |
| observability | Installed skill is Vercel observability-specific. | ON-DEMAND | Use when instrumenting Vercel or choosing observability implementation. |
| rest-api | Installed skill is Zoom REST API despite generic name. | ON-DEMAND | Use only for Zoom REST APIs. |
| webhooks | Installed skill is Zoom webhook-specific. | ON-DEMAND | Use only for Zoom webhooks. |
| websockets | Installed skill is Zoom WebSocket-specific. | ON-DEMAND | Use only for Zoom WebSockets. |
| workers-best-practices | Cloudflare Workers-specific provider guidance. | ON-DEMAND | Use when writing or reviewing Workers code. |
| web-perf | Performance diagnostic skill, not needed for most tasks. | ON-DEMAND | Use for measured performance investigations or optimization passes. |

## Provider-Specific Rule

Cloudflare, Vercel, Azure, Zoom, Google, Microsoft, Twilio, Shopify, HubSpot, and similar skills stay ON-DEMAND unless Flow has explicitly selected that provider for the active subsystem. Provider availability must not become architecture by accident.
