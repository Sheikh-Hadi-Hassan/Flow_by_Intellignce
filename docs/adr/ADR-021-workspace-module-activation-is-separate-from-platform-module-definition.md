# ADR-021: Workspace Module Activation Is Separate From Platform Module Definition

Status: Accepted

## Context

Platform module availability and workspace-specific enablement are different
states.

## Decision

Keep platform `ModuleDefinition` separate from `WorkspaceModuleActivation`.
Definitions describe trusted capability packages. Activations record a
workspace's enabled module, version, validated configuration, and actor.

## Consequences

Workspace A activation does not affect Workspace B. Future organization-level
configuration can extend activation state without mutating global definitions.
