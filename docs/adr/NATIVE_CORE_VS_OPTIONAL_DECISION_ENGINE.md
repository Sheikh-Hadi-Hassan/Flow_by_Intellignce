# ADR: Native Deterministic Core vs Optional Decision Engine

Status: Accepted

Date: 2026-08-12

## Context

Flow needs deterministic business calculations and future decision-table support
without giving AI-generated code execution authority. The runtime must be
portable across Flow Cloud, local customer runtimes, ERP sidecars, and future
signed logic packs.

## Decision

Use a native trusted deterministic kernel as the authoritative calculation core.
Keep a `BusinessDecisionEnginePort` for future optional decision-table adapters.
Do not add GoRules/Zen, OPA, Camunda, or another rule engine as a core
dependency in this chapter.

## Rationale

- Determinism: native trusted implementations can be versioned, fingerprinted,
  and tested directly against approved logic IDs.
- Decimal precision: money calculations need explicit fixed-scale decimal
  behavior and final-stage rounding policies.
- Security: no `eval`, dynamic JavaScript, shell execution, or model-provided
  executable source is allowed.
- Bundle size and portability: no heavy rule/runtime dependency is needed for
  the current SMB calculation set.
- Licensing and maintenance: optional adapters can be evaluated later behind a
  port once real decision-table complexity justifies them.

## Consequences

Decision tables, policy rules, and diagnostic rules remain extensible through
ports. Calculation authority stays with reviewed native implementations mapped
from approved logic IDs and versions.
