# ADR-029: Flow Audit And Semantic Provenance Remain Separate

Status: Accepted

## Context

Flow needs both software action audit and fact/source provenance.

## Decision

Flow Audit records what happened in the software. Semantic Provenance records
where a fact, relationship, inference, or decision came from.

## Consequences

Semantic provenance may link to Flow evidence and audit identifiers, but it
does not replace canonical audit.
