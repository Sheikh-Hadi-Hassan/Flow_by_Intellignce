# FLOW SECURITY GATE STACK v1

Security skills are checkpoints, not permanent context. The backend, database, and workflow engine must enforce security deterministically; prompts are not a security boundary.

| Trigger | Required Skill(s) | Optional Skill(s) | Expected Output | Blocking or Advisory |
|---|---|---|---|---|
| Authorization design / Action Wall | threat-model; supabase-postgres-best-practices | security-diff-scan; agentic-actions-auditor | Permission matrix, backend enforcement point, and proof that AI_PERMISSION <= CURRENT_USER_PERMISSION | Blocking |
| Database/RLS change | supabase; supabase-postgres-best-practices | threat-model; security-diff-scan | RLS/policy/migration review with tenant isolation evidence | Blocking |
| New AI tool | mcp-builder; threat-model | agentic-actions-auditor; security-diff-scan | Tool contract, permission scope, audit evidence, failure/undo behavior | Blocking |
| New external integration | mcp-builder; threat-model | oauth; provider-specific skill; supply-chain-risk-auditor | Trust boundary, credentials, scopes, rate limits, data retention, approval rules | Blocking for credentials/actions |
| New workflow execution path | workflow; test-driven-development | temporal-developer; threat-model | State machine, retries, idempotency, compensating actions, approval points | Blocking |
| Agentic workflow | workflow; mcp-builder; threat-model | agents-sdk or provider skill; agentic-actions-auditor | Agent authority, tool access, evidence, action wall, human approval model | Blocking |
| File/document ingestion | threat-model | security-scan; supply-chain-risk-auditor | Untrusted input handling, storage policy, parsing limits, provenance metadata | Blocking |
| Secret/credential handling | threat-model | security-diff-scan; provider-specific skill | Secret location, rotation, runtime access boundary, log redaction check | Blocking |
| Dependency addition/update | supply-chain-risk-auditor | security-diff-scan; property-based-testing | Package risk, lockfile status, install scripts, maintainer/project health | Blocking for runtime/security packages |
| Deployment | verification-before-completion | observability; workers-best-practices or Vercel skill | Build/test proof, target confirmation, rollback path, no secret exposure | Blocking |
| Pre-merge security review | security-diff-scan | threat-model; spec-to-code-compliance | Diff-scoped findings with severity and evidence | Blocking for auth/data/actions/deploy changes |
| Pre-release security review | deep-security-scan | code-maturity-assessor; security-scan | Release-level risk register and explicit residual risks | Blocking for production release |

## Security Review Priority

| Priority | Review Scope | Skills / Groups | Rule |
|---|---|---|---|
| P0 | Review before using | `mcp-builder`, `supabase`, `supabase-postgres-best-practices`, provider deployment skills, `workers-best-practices`, `agents-sdk`, Cloudflare agent/MCP skills | These can shape permissions, execute commands, deploy, fetch docs, or touch credentials. |
| P1 | Review before first meaningful use | `auth`, `oauth`, `workflow`, `temporal-developer`, `observability`, `security-diff-scan`, `agentic-actions-auditor`, external connector skills | Relevant to Flow but may carry provider assumptions or broad access patterns. |
| P2 | Review only if activated | Azure SDK matrix, Google/Microsoft/Slack/Stripe/HubSpot/Twilio/Zoom/provider packs, document intelligence skills | Useful only for selected integrations. |
| P3 | No immediate review required | Static UI/design/reference skills, irrelevant domain packs kept inactive, duplicate nested generic skills | Do not spend review time until they are routed into active work. |

P0 Security Reviews: 8
P1 Security Reviews: 8
