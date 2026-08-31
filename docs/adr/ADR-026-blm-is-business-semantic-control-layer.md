# ADR-026: BLM Is A Business Semantic Control Layer

Status: Accepted

## Context

Flow needs business intent and semantic understanding before requests reach
general-purpose model reasoning.

## Decision

BLM is a business semantic/control layer, not a general foundation model. It
normalizes language, resolves business concepts, prepares context, and routes
reasoning.

## Consequences

BLM does not execute actions and does not replace deterministic Flow systems.
