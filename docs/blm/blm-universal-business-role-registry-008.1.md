# BLM Universal Business Role Registry 008.1

Phase 008.1 defines BusinessRole as a governed business-context object, separate from security and workspace authorization roles.

## Role Ontology

A `BusinessRolePacket` links a role to mission, accountabilities, decisions, business objects, variables, metrics, evidence, workflows, documents, language, dependencies, authority boundaries, risks, and evaluation cases.

Business roles describe how work is normally understood. They do not grant permission.

## Role vs Security Role

- `SecurityRole`: authorization labels such as `ADMIN`, `EDITOR`, `MEMBER`, `VIEWER`.
- `BusinessRole`: business-function lenses such as CFO, COO, CISO, Controller, Founder / Owner.
- `WorkspaceRoleAssignment`: workspace-specific membership and security-role state.
- `BusinessRoleAssignment`: workspace/user mapping to business-role context.

The Action Wall and workspace permissions override any normative role authority.

## Overlays

Universal packets are immutable. Context is adapted by overlays:

- scale overlays, such as SMB CFO owning broader finance/procurement/legal coordination
- industry overlays
- jurisdiction overlays
- workspace overlays, such as "Head of Finance" mapped to CFO-like context

Overlays can add or remove accountabilities and metrics, but cannot grant execution authority.

## Alias Resolution

Role alias resolution returns candidates, not guesses. Ambiguous abbreviations such as `CRO` return both Chief Revenue Officer and Chief Risk Officer unless business context makes one materially stronger. If ambiguity affects a decision, BLM must ask.

## Decision Ownership

Role decision links support `PRIMARY_OWNER`, `CO_OWNER`, `APPROVER`, `REVIEWER`, `CONSULTED`, `INFORMED`, `EXECUTOR`, and `CONTROL_OWNER`. Links are normative and configurable by workspace.

## Metric Mapping

Role packets reference existing canonical metric IDs. Missing metrics must be recorded as `METRIC_GAP`; do not create duplicate metric definitions in the role registry.

## Role Context Compilation

`BusinessRoleContextCompiler` compiles only relevant role packets and peer-role lenses for a request. It includes key variables, metric IDs, evidence requirement IDs, authority boundaries, language patterns, dependencies, and multi-role perspectives.

## Multi-Role Reasoning

Multi-role output is a lens over shared evidence:

- Role Perspective
- Key Concern
- Evidence
- Metric
- Trade-off
- Recommendation Boundary
- Conflict
- Enterprise Resolution

It does not instantiate independent personas.

## ROLE_GAP Feedback

Role-focused evaluation failures create structured repair requests with the failing evaluation ID, role ID, missing capability, decision, metric, language mapping, evidence expectation, or authority mapping.

## Adding Roles

Add a seed entry to the registry, map it to a role family, provide aliases and abbreviations, attach source refs, keep authority advisory, and add confusion/evaluation coverage where needed.

## Sources

The registry stores source ID, URL, version/date, rights metadata, provenance, confidence, and freshness. External references are summarized, not copied.
