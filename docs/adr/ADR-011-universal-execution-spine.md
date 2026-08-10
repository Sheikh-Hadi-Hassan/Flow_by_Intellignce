# ADR-011: All Privileged Actions Execute Through The Universal Execution Spine

Status: Accepted

## Context

Flow will eventually receive action requests from UI, voice, AI agents, workflows, APIs, and background jobs. These sources must not bypass authorization, evidence, approval, tool control, or audit requirements.

## Decision

All privileged or meaningful side-effecting actions execute through the Universal Execution Spine:

Actor Context -> Action Request -> Action Wall -> Evidence Validation -> Approval Policy Evaluation -> Tool Registry -> Tool Execution -> Audit Event -> Execution Result.

AI agents do not receive privileged bypass access. Request source does not grant authority.

## Consequences

Future modules and agents must expose actions as controlled tools/domain services instead of direct arbitrary database mutation. Denied, approval-blocked, failed, and executed attempts become auditable.

The v1 implementation uses in-memory policy and audit adapters for proof. Durable authorization policy storage, approval persistence, and audit persistence remain future work.

## Alternatives Considered

- Direct tool execution from agents or UI: rejected because it bypasses deterministic authorization and audit.
- Prompt-only authorization: rejected because prompts are not security controls.
- Full authorization vendor now: deferred to avoid premature framework stacking.
