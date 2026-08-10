# FLOW CODEX CONTEXT STRATEGY v1

Goal: Codex should always have the smallest stable safety context, then load project, skill, and source context only when the task requires it.

| Knowledge Type | What Belongs There | Authoritative Location | Reason |
|---|---|---|---|
| Always Know | Non-negotiable operating rules: AI_PERMISSION <= CURRENT_USER_PERMISSION, prompt is not a security boundary, do not mutate/install/deploy without explicit scope/approval. | AGENTS.md | Short, stable, project-wide rules only. |
| Product Vision | Flow as AI-native Business Operating System, target users, modularity, long-term extensibility. | Project documentation | Too large and evolving for every task prompt. |
| Architecture Decisions | Chosen stack, tenancy model, permission model, workflow runtime, provider decisions. | ADR documents | ADRs preserve history and stop re-litigating choices. |
| Flow-Specific Operating Patterns | Action Wall, agent architecture, evidence/audit, workflow, UI system. | Flow-specific skills | Loaded only when relevant but reusable across tasks. |
| Implementation Details | Current module APIs, schemas, local conventions. | Source code and local docs | Code remains the source of truth for implementation. |
| Task Procedure | TDD, debugging, verification, specific provider instructions. | Task-specific skill context | Load only at the right task moment. |
| Business Invariants | Permission, math, rollback, status transitions, idempotency. | Tests plus database constraints | Executable proof beats prose. |
| Small Clarifying Comments | Non-obvious local decisions inside complex code. | Source code comments | Use sparingly; do not duplicate architecture docs. |
| Release Evidence | Build/test/browser/deployment proof and residual risks. | Release notes or verification reports | Historical evidence belongs outside skill bodies. |

## Conflict Resolution

| Skill A | Skill B | Conflict | Recommended Authority | Reason |
|---|---|---|---|---|
| agents-sdk | flow-system-architect / mcp-builder | Cloudflare-specific agent assumptions can become architecture prematurely. | flow-system-architect | Choose provider after Flow authority/tool model is defined. |
| auth | supabase / flow-action-wall | Auth provider setup does not define authorization policy. | flow-action-wall plus backend/RLS | Authentication identifies user; backend authorization controls actions. |
| workflow | temporal-developer | Generic workflow modeling vs Temporal runtime patterns. | flow-workflow-architecture | Runtime comes after workflow invariants. |
| nextjs | Cloudflare/Vercel provider skills | Framework guidance can imply provider deployment. | ADR documents | Deployment target must be explicit. |
| frontend-design | frontend-design-review | Build guidance vs review checklist can duplicate or conflict. | frontend-design for build, frontend-design-review for review | Separate creation from QA. |
| react-best-practices | frontend-design | Performance rules can fight visual ambition. | Task objective and Flow UI system | Operational UI must balance density, clarity, and performance. |
| supabase | supabase-postgres-best-practices | Router vs deep database rules. | supabase-postgres-best-practices for schema/RLS | Use the narrower DB authority for persistence security. |
| security-diff-scan | deep-security-scan | Diff scope vs exhaustive repository scope. | security-diff-scan for PRs, deep-security-scan for releases | Avoid over-scanning routine diffs. |
