# Exact Numeric Storage

## Status

Accepted.

## Context

Authoritative business calculations must not rely on binary floating-point representation. The deterministic runtime currently uses fixed-scale `BigInt`, but future formulas may require different scale and precision semantics.

## Decision

Do not persist authoritative money or calculation results as `float`, `real`, or `double precision`. Persist authoritative result values as exact structured metadata, fingerprints, and, where numeric database columns are introduced, use exact `numeric` with explicit scale/precision semantics owned by the relevant formula contract.

Percentages remain fractional in canonical logic. For example, 15 percent is `0.15`, not ambiguous `15`.

## Consequences

- Calculation audit rows store fingerprints and metadata rather than private input/output blobs.
- Future exact numeric columns must document precision and scale per formula, not globally assume two decimal money or four decimal ratios.
- Deterministic formula execution remains outside prompts and model reasoning.
