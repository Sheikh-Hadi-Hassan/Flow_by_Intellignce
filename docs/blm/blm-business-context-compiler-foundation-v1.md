# BLM Business Context Compiler Foundation v1

## Purpose

The BLM Business Context Compiler creates a bounded,
authorization-aware business context bundle before any model reasoning layer
receives business knowledge or workspace data.

It is a deterministic selection layer. It does not reason with a model, execute
skills, call tools, mutate business state, perform retrieval over unrestricted
workspace data, or decide outcomes.

## Input Contract

`BusinessContextRequest` contains:

- `workspace`
- `actor`
- `task`
- `referencedConceptIds`
- optional `referencedRecordIds`
- optional `requestedDomainIds`
- optional `requestedCapabilityIds`
- `channel`
- optional `budget`
- `knowledgeReleaseId`
- optional `workspaceContextVersion`

The compiler validates that the actor belongs to the requested workspace, that
the task is non-empty, and that semantic references are valid Flow semantic IDs.

## Output Contract

`CompiledBusinessContextBundle` contains:

- task, actor, and workspace context
- selected BusinessProfile summary
- relevant domains
- relevant concepts and relationships
- process patterns, metrics, formulas, and rules
- psychology insights
- diagnostic and decision patterns
- available business skills as context only
- workspace policies
- authorized and redacted record snapshots
- authority constraints
- context limits
- inclusion reasons
- provenance
- deterministic fingerprint
- compiler explanation

## Domain Selection

Domain selection is deterministic and ordered by:

1. explicit requested domains
2. domains implied by explicit concept references
3. task text and task key hints
4. diagnostic and decision pattern requirements
5. bounded cross-domain expansion for analysis, diagnostic, decision-support,
   and planning tasks

Read-style requests do not automatically expand into every adjacent domain.
This keeps inventory availability checks from pulling unrelated procurement or
manufacturing context unless the task asks for it.

## Context Expansion

Concept selection prioritizes:

1. explicit concept references
2. task-specific concept hints
3. diagnostic and decision inputs
4. relationship-expanded concepts
5. bounded domain coverage

Metrics prioritize task-specific and diagnostic metrics before broad domain
metrics. Formulas, rules, processes, and skills are selected from the selected
domain packs and bounded by the request budget.

## Authorization And Redaction

The compiler never scans workspace data directly. It receives records only
through a `BusinessRecordProvider` that filters by workspace, semantic IDs,
record IDs, actor permissions, and limit.

Record fields can require separate permissions. Restricted sensitive fields are
included as `[REDACTED]` with redaction metadata instead of raw values.

Policies are also provider-backed and permission-filtered.

## Budget Strategy

The default budget limits domains, concepts, relationships, records, skills,
rules, formulas, metrics, evidence, estimated characters, and relationship
depth. A request can tighten those limits.

Security constraints are not budgeted away.

## Skill Boundary

Business skills are compiled as context. The bundle can state a skill's
execution authority, permissions, approval policy, and binding availability,
but it does not execute that skill and does not grant authority.

Known executable or deterministic skills remain subject to their existing
permission, deterministic engine, Action Wall, and approval boundaries.

## Fingerprint

The fingerprint is derived from selected knowledge release, workspace context
version, task, channel, actor identity and permissions, selected domains,
concepts, records, policies, redactions, and skills.

Identical inputs produce identical fingerprints. Changes to workspace context,
authorization, policy versions, record versions, or selected context alter the
fingerprint.

## Proof Scenarios

The foundation test suite covers:

- unpaid client invoice
- sales decline diagnostic
- discount decision support
- inventory availability
- project margin diagnostic
- authorization and redaction
- tenant isolation
- budget enforcement
- skill selection without execution
- fingerprint determinism
- channel-independent context selection
- no dependency on model routing, retrieval stacks, execution, or Semantica
  internals

## Non-Goals

This chapter does not add model routing, local or cloud model inference, speech
recognition, text-to-speech, embeddings, vector stores, RAG, skill execution,
Action Wall mutations, Composition Resolver integration, automatic workspace
configuration, or privileged workspace data access.
