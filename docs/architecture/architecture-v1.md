# Architecture v1

## System Context

Flow by Intellignce is an AI-native Business Operating System for software houses, digital agencies, and service businesses. The initial implementation is a TypeScript monorepo with a Next.js web app, NestJS API, shared contracts, PostgreSQL as the primary datastore, and Supabase as the initial PostgreSQL platform.

This foundation deliberately avoids business modules. It creates the boundaries required for future modules, agents, workflows, tools, evidence, approvals, and auditability.

## Monorepo Structure

```text
apps/web                 Next.js React application shell
apps/api                 NestJS API shell
packages/contracts       Provider-neutral contracts
packages/config          Shared configuration boundary
packages/database        Database boundary and migration notes
packages/domain          Domain boundary placeholder
packages/auth            Auth boundary placeholder
packages/observability   Correlation/observability boundary
packages/testing         Shared test helpers
docs                     Product, architecture, security, research, ADRs
supabase                 Migration-driven database foundation
```

## Frontend / Backend Boundary

The frontend presents Flow's user experience and calls backend APIs or controlled realtime channels. It must not enforce authoritative permissions by itself.

The backend owns deterministic authorization, execution, workflow state, evidence handling, audit emission, and authoritative business mutations.

## Module Strategy

Initial conceptual layers:

- Foundation: identity, workspace, tenancy, roles, permissions, authorization, approvals, audit, evidence.
- AI Platform: agent contracts, model/provider abstraction, Tool Registry, planning contracts, AI context scope, skill contracts, memory contracts.
- Workflow Platform: definitions, instances, steps, state transitions, retries, waiting, approvals, idempotency, compensation.
- Business Modules: future CRM, projects, proposals, invoices, documents, HR, inventory, finance.
- Shared: contracts, config, testing, observability.

Business modules must have explicit boundaries and data ownership.

## Data Ownership

Tenant-owned records must carry workspace identity where appropriate. Business modules own their domain data. Shared foundation packages define contracts but should not become a giant application service.

## Tenant Strategy

Workspace isolation is structural. APIs, database policies, AI context construction, tools, search, memory, documents, reports, background jobs, and workflow execution must prevent cross-workspace data access.

The initial Supabase migration enables RLS on foundation tables and uses membership-based workspace visibility as the first tenant primitive.

## Action Wall

The Action Wall is the deterministic authorization boundary for AI and user-initiated actions. It answers:

Can Actor X perform Action Y on Resource Z inside Workspace W under Context C?

The result is not just boolean. It can be `ALLOW`, `DENY`, or `REQUIRES_APPROVAL`, with structured reasoning and metadata.

## AI Execution Boundary

AI may plan, recommend, draft, and request actions. AI must not directly mutate arbitrary database state. Execution flows through:

User -> Intent -> Agent/Planner -> Tool Registry -> Authorization -> Evidence -> Approval Policy -> Domain Service -> Database -> Audit -> Result

`ActionExecutionEngine` is the v1 Universal Execution Spine implementation for this path. See `docs/architecture/universal-execution-spine-v1.md`.

## Tool Registry

Tools declare identifier, description, schemas, risk level, required permission, approval policy, evidence requirements, execution handler, and audit metadata. The foundation includes only the harmless `system.echo` architecture proof.

## Workflow Boundary

Workflows must define state, transitions, retries, waiting, approval points, idempotency, and compensation before a runtime is selected. Temporal, Cloudflare Workflows, queues, or other engines are implementation choices, not architecture defaults.

## Evidence

Important AI recommendations and actions should preserve provenance. Claims must distinguish `FACT`, `INFERENCE`, `RECOMMENDATION`, and `ASSUMPTION`.

## Approvals

Critical actions are draft-first or approval-controlled. Approval policies are scoped by actor, workspace, role, module, resource, action, and workflow where required. "Always allow" never means unlimited authority.

## Audit

Meaningful mutations should record actor, workspace, resource, action, tool, reason, evidence, approval, previous state, resulting state, timestamp, and correlation ID.

## Undo / Compensation

Where safe, true rollback should be supported. Where physical undo is impossible, such as an external email already sent, use compensating actions and explicit state handling.

## Provider Neutrality

Supabase is the initial PostgreSQL platform, not a permanent architecture dependency. Next.js, NestJS, Supabase, OpenAI, Cloudflare, Temporal, Vercel, and other providers must remain behind boundaries where future replacement has practical value.
