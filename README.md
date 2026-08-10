# Flow by Intellignce

Flow is an AI-native Business Operating System for software houses, digital agencies, and service businesses. This repository is currently in the architecture foundation phase.

## Current Status

This is the first implementation foundation. It establishes the monorepo, minimal web and API shells, shared contracts, database foundation, security model, ADRs, and verification gates. It does not implement CRM, invoices, documents, AI agents, workflows, voice, or production deployment.

## Architecture Summary

- Language: TypeScript.
- Frontend: Next.js and React.
- Backend: NestJS.
- Database: PostgreSQL, initially through Supabase.
- Repository: pnpm monorepo.
- Core rule: `AI_PERMISSION <= CURRENT_USER_PERMISSION`.
- AI execution must flow through controlled tools, deterministic authorization, evidence checks, approval policy, domain services, audit, and result handling.

## Repository Structure

```text
apps/web                 Minimal Next.js application shell
apps/api                 Minimal NestJS API shell
packages/contracts       Provider-neutral shared contracts
packages/config          Shared configuration boundary
packages/database        Database boundary and migration notes
packages/domain          Domain boundary placeholder
packages/auth            Auth boundary placeholder
packages/observability   Observability boundary placeholder
packages/testing         Shared testing helpers
docs/architecture        Architecture documents
docs/security            Security model
docs/adr                 Architecture Decision Records
docs/research            Dependency and research records
supabase/migrations      Migration-driven database foundation
```

## Local Setup

```bash
pnpm install
cp .env.example .env.local
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Core Commands

```bash
pnpm dev
pnpm build
pnpm test
pnpm lint
pnpm typecheck
pnpm format:check
```

## Security Warning

Never commit `.env`, service-role keys, API keys, credentials, or private secrets. Supabase service-role credentials are server-only and must never be exposed to frontend code.

Prompts are not a security boundary. Authorization must be enforced in deterministic backend systems.
