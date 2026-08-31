# ADR-034: BLM Is The Model-Independent Business Brain

## Status

Accepted

## Context

Flow already has identity, workspace isolation, Module Registry, Universal
Entity System, Action Wall, Semantica adapter, Business Semantic Model, and
Component Registry foundations.

The previous direction treated business composition as a central BLM outcome.
Composition remains important, but it is one capability within the larger BLM:
a governed business intelligence, reasoning, and execution layer.

## Decision

Define BLM as a model-independent Business Intelligence, Reasoning, and
Execution Layer that turns a general-purpose LLM or SLM into a governed
business expert.

Add `BusinessDomainPack`, `BusinessExpertiseRegistry`,
`BusinessSkillDefinition`, execution authority, source governance, formulas,
rules, process patterns, document definitions, metric definitions, business
context bundle, model capability profile, evaluation cases, source manifest,
domain coverage manifest, and four proof domain packs.

Do not start the Composition Resolver in this chapter.

## Consequences

BLM is broader than `@flow/blm-contracts`, broader than Semantica, and not tied
to any model vendor. AI can advise, draft, or select candidate skills, but
authoritative calculations and privileged mutations require deterministic
authority and existing Flow authorization boundaries.

External business sources can influence Flow only through explicit provenance
and license governance. Review-required or restricted sources cannot become
trusted imported knowledge.

## Alternatives Considered

- Train or fine-tune a model now: rejected because governance, deterministic
  authority, and evaluation foundations must exist first.
- Make Semantica the BLM: rejected because Semantica is a provider capability,
  not the whole business brain.
- Treat Domain Packs as ModuleDefinitions: rejected because knowledge and
  executable software remain separate.
- Begin Composition Resolver now: deferred by chapter scope.
