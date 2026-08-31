# Flow BLM Architecture v0.1

## Purpose

Flow BLM means Business Language Model / Business Language Layer. It is a
business semantic and intent layer, not a new foundation model. It sits between
user language and Flow's deterministic execution foundation.

## Architecture

User Voice / Text -> Language Normalization -> Business Intent Interpreter ->
Business Semantic Resolver -> Business Context Graph -> Module + Entity
Registry -> Business Context Package -> Model Router -> Draft / Proposed Plan
-> Action Wall -> Universal Execution Spine.

The BLM does not execute privileged actions. It can classify, extract, resolve,
route, and draft context. Authority remains with authentication, workspace
membership, Action Wall, approvals, tools, and audit.

## Process Boundary

Flow's core backend remains TypeScript/NestJS. Semantica is Python and is kept
behind an internal service boundary in `services/blm-semantic-kernel`.

v0.1 chooses a simple service/process boundary over embedding Python inside
Nest controllers. MCP remains an interoperability/tool protocol, not the core
backend transport.

v0.2 validates native Semantica behind the same boundary with a dedicated
Python 3.11.15 environment. The adapter mirrors Flow entities, relationships,
facts, and decision traces into Semantica when native APIs are available, but
the TypeScript core never imports Python and never treats Semantica as an
authorization source.

## Failure Mode

Flow must continue to authenticate users, authorize actions, and execute
deterministic business operations if the semantic service is unavailable.
Semantic intelligence can degrade to unavailable; core business truth cannot.

## No Production Integration

This phase does not make Semantica a mandatory runtime dependency. It creates
contracts, a POC service, a deterministic fallback provider, benchmark data,
and documentation.

The native validation keeps that production posture. Semantica can enrich
semantic graph, provenance, conflict, temporal, and decision workflows through
`SemanticaBusinessSemanticProvider`, while Flow continues to operate through the
deterministic provider when the semantic service is unavailable.
