# ADR-042 — Phase 2 commercial money uses integer minor units

## Status

Accepted.

## Context

ADR Exact Numeric Storage forbids float/real/double for authoritative values. Phase 2 commercial records need a simple, testable representation for prices, costs, and margins.

## Decision

- Persist currency amounts as `bigint` minor units plus ISO-4217 `currency` (`CHAR(3)`).
- Persist percentages as integer basis points (`10000` = 100%).
- Round with half-up division in `bigint` (never JavaScript `number` for money).
- Hours are integer minutes. Labour = `minutes * rate_per_hour_minor / 60` with half-up.

## Consequences

- Completeness scores may use integer 0–100.
- Existing BLM `FixedDecimal` remains for BLM logic; Phase 2 commercial math lives in `@flow/commercial`.
