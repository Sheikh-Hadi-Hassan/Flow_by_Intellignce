# ADR-020: Flow Uses A Trusted Module Registry

Status: Accepted

## Context

Flow needs discoverable capabilities without hardcoding every future business
module into platform core.

## Decision

Use a trusted Module Registry. First-party module manifests are code-defined
and reviewed. Registry metadata describes capabilities, dependencies, actions,
entity definitions, and configuration schemas.

## Consequences

The registry supports future templates and AI business configuration while
avoiding arbitrary customer-uploaded executable plugins.
