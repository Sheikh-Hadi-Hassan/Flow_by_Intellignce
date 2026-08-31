# ADR-028: Semantica Runs Outside The TypeScript Core

Status: Accepted

## Context

Flow's backend is TypeScript/NestJS. Semantica is Python.

## Decision

Run Semantica behind an isolated service/process boundary. Do not embed Python
execution in Nest controllers.

## Consequences

The TypeScript core remains stable if the semantic service is unavailable.
MCP remains optional interoperability, not the core backend transport.
