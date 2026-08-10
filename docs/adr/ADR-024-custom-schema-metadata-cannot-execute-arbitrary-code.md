# ADR-024: Custom Schema Metadata Cannot Execute Arbitrary Code

Status: Accepted

## Context

Module and entity metadata will eventually be influenced by templates, admins,
and AI proposals. That metadata must not become an uncontrolled plugin runtime.

## Decision

Custom schema metadata cannot contain executable JavaScript, shell commands,
SQL bodies, implementation URLs, or other executable handlers. It may describe
types, fields, relationships, configuration, and capabilities.

## Consequences

Flow can support configuration and templates without allowing customer or AI
metadata to execute arbitrary code.
