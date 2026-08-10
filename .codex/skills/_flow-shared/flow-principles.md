# Flow Principles Reference

This file is the shared reference for project-local Flow skills. Load it when a Flow-specific skill needs the common invariant set in detail. Do not copy this entire reference into every task response.

## Product Context

Flow is an AI-native Business Operating System for software houses, digital agencies, and service businesses first, with a long-term modular foundation for many industries.

Flow should support:

- Modular business entities, modules, templates, skills, tools, workflows, and agents.
- Global skills, workspace-local business skills, and personalized user skills.
- Conversation-first and voice-oriented interaction.
- Evidence-backed recommendations and controlled actions.
- Draft-first critical actions, approval policies, audit logs, and rollback or compensating actions.
- Deterministic computation for permissions, execution, business state, and mathematical truth.

## Non-Negotiable Invariants

1. `AI_PERMISSION <= CURRENT_USER_PERMISSION`.
2. Prompt instructions are not a security boundary.
3. Authorization must be enforced by deterministic backend systems.
4. Workspace data must not leak across tenants.
5. Unauthorized information should not enter model context when avoidable.
6. AI must not directly mutate arbitrary database state.
7. Important actions execute through controlled tools or domain services.
8. Critical actions are draft-first or approval-controlled.
9. Approval policies are scoped. "Always allow" never means unlimited authority.
10. Important recommendations and actions distinguish fact, inference, recommendation, and assumption.
11. LLMs are not authoritative calculators for financial values, totals, quantities, balances, formulas, or other deterministic truth.
12. Important actions record actor, workspace, action, tool, reason, evidence, approval, previous state, resulting state, workflow context, and timestamp.
13. True rollback should be provided where practical. Where impossible, design compensating actions.
14. Do not couple Flow core to one industry, AI provider, cloud, workflow engine, UI framework, or business module without an approved ADR.

## Canonical Controlled Action Path

User -> Intent -> Planner -> Permission Check -> Evidence Check -> Tool or Domain Service -> Draft/Approval -> Execution -> Audit -> Result

Any shortcut around permission checks, evidence checks, approval policy, or auditability is a design defect unless a documented, scoped exception exists.

## Instruction Precedence

1. Platform and system safety constraints.
2. Explicit current task requirements.
3. Approved Flow architectural invariants.
4. Flow security rules.
5. Relevant Flow-specific skill.
6. Relevant approved generic skill.
7. Provider, framework, or library recommendations.

A provider or framework recommendation must never override a Flow invariant.

