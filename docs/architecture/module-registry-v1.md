# Module Registry v1

## ModuleDefinition

A Flow module is a trusted platform capability package, not arbitrary customer
code. First-party module manifests are code-defined and are the authoritative
source for module identity, version, status, capabilities, dependencies,
entity metadata, actions, and configuration schema.

Database records may store normalized metadata, workspace activation state,
configuration, and version state. They must not become a second executable
source of truth.

## Trusted Module Code

Registry metadata describes capabilities. It does not execute JavaScript,
shell commands, SQL, or remote URLs. Platform module behavior remains
reviewed, deployed application code.

## WorkspaceModuleActivation

Workspace activations are local state:

- workspace
- module key
- version
- status
- typed configuration
- enabled actor
- timestamps

Platform module availability is separate from workspace activation. Workspace
A enabling a module does not affect Workspace B.

## Capabilities

Capabilities are stable strings such as `organization.profile` and
`organization.units`. Future templates, agents, UI surfaces, tools, and
workflows can query enabled capabilities without hardcoding every module name.

## Dependencies

Module dependencies are explicit. The v1 registry prevents missing dependency
activation, self-dependency, and obvious dependency cycles with a deterministic
graph check. It does not implement a marketplace or SAT solver.

## Configuration

Module configuration is validated against a typed schema before activation.
JSONB storage is acceptable only as storage for already-validated
configuration. Invalid configuration must not activate.

## Action Wall And Audit

Registry mutations use the existing execution architecture:

Actor Context -> Action Request -> Action Wall -> Tool Registry -> Registry
Service -> Audit.

The v1 proof tool is `module.enable`. It enables only trusted code-defined
modules and produces an audit event through the Universal Execution Spine.

## RLS

Workspace module activations are workspace-owned and protected by RLS.
Platform module definitions are readable metadata, while workspace activation
and configuration require active membership and specific permissions.

## Future Templates And AI

Future templates and AI onboarding may propose module activation and
configuration, but must use registry services and approval-aware flows. They
must not directly mutate arbitrary metadata tables or invent executable module
implementations.
