# FLOW CODEX SKILL ROUTER v1

Rule: load the primary skill route for the task class, add optional skills only when their condition is present, and treat security gates as checkpoints rather than always-on context.

| Task | Primary Skills | Optional Skills | Security Gates | Do Not Load | Rationale |
|---|---|---|---|---|---|
| 01. Product architecture | writing-plans; workflow | frontend-design; mcp-builder | threat-model if permissions/actions involved | provider deploy skills; Zoom/provider skills | Keep product shape, workflows, and scope available without provider bias. |
| 02. Backend architecture | writing-plans; supabase; workflow | mcp-builder; nextjs | threat-model for trust boundaries | frontend-design; web-perf | Backend decisions need DB/workflow context, not UI/perf context. |
| 03. Database schema | supabase-postgres-best-practices; supabase | writing-plans | threat-model if tenant/user data; security-diff-scan before merge | frontend-design; Cloudflare/Vercel skills | Schema quality and RLS isolation dominate. |
| 04. PostgreSQL optimization | supabase-postgres-best-practices | web-perf only if user-facing latency | security-diff-scan if policy/security changes | frontend/UI skills | Use DB-specific guidance, not app-wide context. |
| 05. Supabase | supabase | supabase-postgres-best-practices | security-diff-scan for auth/RLS/storage/user data | Cloudflare/Vercel unless deployment target | Supabase router first; add Postgres only for schema/RLS/perf. |
| 06. Authentication | supabase; writing-plans | auth only if Clerk/Auth0/Descope chosen | threat-model; security-diff-scan before merge | Zoom oauth; frontend-design unless UI flow | Provider auth skills are on-demand, not authority. |
| 07. Authorization / Action Wall | supabase-postgres-best-practices; workflow | mcp-builder | threat-model; agentic-actions-auditor | frontend-design; provider deploy | Authorization must be deterministic backend policy. |
| 08. Multi-tenancy | supabase-postgres-best-practices; writing-plans | supabase | threat-model; security-diff-scan | UI/perf/provider skills | Tenant isolation is DB and policy architecture. |
| 09. AI agent development | mcp-builder; workflow | agents-sdk only if Cloudflare selected; building-ai-agent-on-cloudflare | threat-model; agentic-actions-auditor | frontend-design; Zoom skills | Start with authority/tool model, then provider implementation. |
| 10. Tool Registry | mcp-builder; supabase-postgres-best-practices | workflow | threat-model; security-diff-scan | frontend-design; provider deploy | Registry is contracts, permissions, and audit metadata. |
| 11. MCP | mcp-builder | building-mcp-server-on-cloudflare if Cloudflare target | threat-model; agentic-actions-auditor | Zoom skills; frontend-design | Generic MCP first; hosted platform second. |
| 12. Workflow engine | workflow; test-driven-development | temporal-developer if Temporal chosen | threat-model for critical actions | frontend-design; provider docs | Define states and invariants before runtime. |
| 13. Agentic workflow | workflow; mcp-builder | agents-sdk/provider agent skill | threat-model; agentic-actions-auditor | UI-only skills | Agent steps need authority, evidence, approval, undo. |
| 14. Background jobs / queues | workflow | temporal-developer; workers-best-practices if Cloudflare | threat-model if action side effects | frontend-design | Queue/runtime choice is implementation detail. |
| 15. Document intelligence | writing-plans | Azure/OpenAI document skill when selected | threat-model for untrusted file ingestion | Next/React unless UI involved | Documents are untrusted inputs and provenance sources. |
| 16. Evidence/provenance | workflow; supabase-postgres-best-practices | mcp-builder | threat-model if evidence authorizes actions | frontend-design except evidence UI | Evidence model belongs in DB/workflow/tool contracts. |
| 17. Memory | writing-plans; workflow | mcp-builder | threat-model for personal/business memory | provider integrations | Memory policy is product/security architecture. |
| 18. Audit/rollback | workflow; supabase-postgres-best-practices | test-driven-development | threat-model; security-diff-scan | frontend-design unless UI | Rollback must be modeled, stored, and testable. |
| 19. API development | nextjs; supabase | mcp-builder for tool-facing APIs | security-diff-scan for privileged endpoints | Zoom rest-api unless Zoom | Use app/backend stack, not generic provider APIs. |
| 20. Webhooks | workflow | provider webhook skill only for selected provider | threat-model; security-diff-scan | Zoom webhooks unless Zoom | Webhook security is signature, replay, idempotency. |
| 21. Realtime/WebSockets | supabase; workflow | websockets only if Zoom; agents-sdk if Cloudflare agents | threat-model if privileged events | frontend-design unless UI | Use actual realtime provider, not generic named Zoom skill. |
| 22. Frontend architecture | nextjs; react-best-practices | frontend-design | security-diff-scan for auth-sensitive UI assumptions | Supabase DB detail unless data model | Framework/component boundaries matter most. |
| 23. React development | react-best-practices | frontend-design; webapp-testing for proof | security gate only for auth/action UI | DB/deploy skills | Keep component context lean. |
| 24. Next.js development | nextjs; react-best-practices | supabase if SSR/auth/data | security-diff-scan for server actions/auth | Cloudflare unless target | Next server/client boundaries are central. |
| 25. UI/UX design | frontend-design | web-design-guidelines | security only for critical action UX | DB/deploy/security scans | Use one creative UI skill, not all frontend skills. |
| 26. Accessibility | frontend-design | web-design-guidelines; frontend-design-review | Advisory unless legal/critical flow | DB/provider skills | Accessibility is UI review context only. |
| 27. Frontend review | frontend-design-review | webapp-testing; web-design-guidelines | security-diff-scan if action/auth UI | DB/deploy unless issue found | Review skill after implementation, not before every edit. |
| 28. Testing | test-driven-development | webapp-testing; property-based-testing | security gate if testing permissions/security invariants | frontend-design unless UI test | Match test skill to risk. |
| 29. TDD | test-driven-development | property-based-testing for invariants | security-diff-scan after sensitive diff | UI/design unless feature needs it | Use before implementation. |
| 30. Debugging | systematic-debugging | webapp-testing for UI; supabase for DB | security gate only if vulnerability suspected | planning/design unless root cause needs it | Debugging needs causal evidence. |
| 31. Performance optimization | react-best-practices; web-perf | supabase-postgres-best-practices for DB | security gate only if changing auth/cache boundaries | frontend-design unless UX change | Measure before optimizing. |
| 32. Code review | verification-before-completion | code-maturity-assessor | security-diff-scan for sensitive code | provider skills not in diff | Review should be scoped to changed behavior. |
| 33. Security review | security-diff-scan | threat-model; deep-security-scan | Required security workflow itself | frontend-design; provider skills unless relevant | Do not load every security skill. |
| 34. Cloudflare | workers-best-practices | agents-sdk; building-ai-agent-on-cloudflare; building-mcp-server-on-cloudflare | threat-model for bindings/secrets/actions | Vercel/Azure/Zoom skills | Cloudflare only when target is explicit. |
| 35. Deployment | verification-before-completion | provider deploy/observability skill for chosen target | security-diff-scan for secrets/config/migrations | frontend-design | Deploy target and rollback proof drive context. |
| 36. CI/CD | writing-plans | agentic-actions-auditor if AI Actions; provider CI skill | security-diff-scan for privileged workflows | UI/DB unless pipeline touches them | CI/CD is high-risk when agents/secrets exist. |
| 37. Observability | observability only if Vercel; provider-neutral docs otherwise | web-perf | security gate if logs may expose secrets | frontend-design | Installed skill is Vercel-specific. |
| 38. Dependency review | supply-chain-risk-auditor | security-diff-scan; property-based-testing | Required for dependency additions/updates | UI/design/provider unrelated | Dependency risk deserves a focused gate. |
