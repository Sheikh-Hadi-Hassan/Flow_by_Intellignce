# ADR-046: Ask Flow Authorization Context Is Server-Owned

Status: Accepted

## Context

Ask Flow receives conversational input from the browser, but browser-provided
identity, permissions, active building blocks, tools, and prior tool claims are
not authoritative. Trusting those fields lets a modified request influence
classification and capability selection before execution-time checks run.

The current Ask API supports the public Northstar demo. Authenticated workspace
Ask contexts are not yet connected to the existing persisted membership
resolver.

## Decision

- The Ask API rebuilds the Northstar context from the canonical server-side demo
  viewer, CRM role policy, and registry policy.
- The Northstar Ask demo activates `crm.core` and `registry.business`
  server-side; browser building-block claims cannot change that set.
- Client input is limited to the message, workspace selector, and history text.
- Permitted tools are selected from the registered tool catalogue using the
  server permissions and active building blocks.
- Browser history tool fields are discarded until server-owned conversation
  state exists.
- Tool execution keeps its independent workspace, permission, building-block,
  and Action Wall checks.
- Non-Northstar workspaces remain denied until the existing authenticated
  membership resolver can supply their server context.

## Consequences

Forged request fields cannot grant Ask Flow authority or follow-up confidence.
The demo remains deterministic and read-capable. Supporting authenticated
workspaces later requires wiring the existing membership and installation
sources into this boundary, not accepting those claims from the browser.
