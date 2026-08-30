# ADR-045: Discovery Extraction Uses Replaceable BLM Provider

## Status

Accepted — Phase 2.1

## Context

Phase 2 discovery saved meeting notes and used a regex fixture extractor inline. Phase 2.1 requires evidence-linked, schema-validated, provider-backed extraction without bypassing human verification or deterministic commercial logic.

## Decision

1. Add `discovery_extraction_runs` and extend `extracted_facts` with candidate metadata (additive migration).
2. Implement `DiscoveryExtractionProvider` in `@flow/commercial/discovery` with fixture default and OpenAI-compatible transport.
3. Split API: save notes (`/notes`) vs analyze (`/analyze`) with idempotency and audit.
4. Reuse existing `extracted_facts`, `evidence_references`, verify flow, and scope writes — no parallel fact store.

## Consequences

- Real model quality depends on `BLM_*` configuration; fixture remains for tests and Northstar.
- Old clients must call `/analyze` after `/notes` to receive draft facts.
- Provider output is never authoritative; verification remains human-gated.
