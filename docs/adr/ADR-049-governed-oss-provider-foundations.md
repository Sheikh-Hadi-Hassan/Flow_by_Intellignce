# ADR-049: Govern Mandatory OSS Provider Foundations

## Status

Accepted for governance. Provider contracts are implemented by ADR-050. The
Twenty adapter and pinned local CRM profile are implemented by ADR-052; Penpot
and Documenso adapters remain unimplemented.

## Decision

Flow remains the customer-facing business authority and orchestration layer. Three mandatory self-hosted foundations are approved behind Flow-owned provider contracts:

| Foundation   | Exact source pin                                               | License boundary                                                                   | Flow contract         | Provider authority                    |
| ------------ | -------------------------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------- | ------------------------------------- |
| Twenty CRM   | `twenty/v2.38.1` at `2f318d55124a6557fb75eb5bf200ec4e20158389` | Mixed AGPL-3.0/MIT/commercial; enterprise-marked files and enterprise paths denied | `FlowCrmProvider`     | Companies, contacts, opportunities    |
| Penpot       | `2.17.0` at `bdce5817ea86d028db29113d9ecdadcf07097b36`         | MPL-2.0                                                                            | `FlowStudioProvider`  | Visual layout and design assets only  |
| Documenso CE | `v2.16.0` at `3cf2963cd03d8b24770b7490bdb20e596baa5d65`        | AGPL-3.0; `packages/ee/` denied                                                    | `FlowSigningProvider` | Signature execution and evidence only |

The authoritative machine-readable record is `docs/oss/oss-foundations.json`. It preserves each upstream Git remote and immutable tag-to-commit pair. `scripts/oss-governance.mjs` validates pins and scans tracked and untracked integration source for prohibited commercial paths and license markers. CI runs the offline governance check; maintainers can also verify tag resolution against upstream with `pnpm oss:governance:verify-remotes`.

## Authority Boundary

Twenty may store and serve CRM company, contact, and opportunity records through `FlowCrmProvider`. Flow remains authoritative for workspace membership, authorization, services, questionnaires, discovery, approved briefs, commercial calculations, proposals, contracts, delivery, finance, BLM, Action Wall, and audit evidence.

Penpot may edit visual layout and design assets through `FlowStudioProvider`. It cannot set client identity, scope, price, tax, approvals, contract state, signature state, or invoice balance.

Documenso CE may execute signing and return evidence through `FlowSigningProvider`. A webhook is untrusted input. Flow must verify provider state, signer/document identity, checksum, workspace, replay key, and contract transition before recording execution.

No LLM may call these providers directly. Protected writes continue through entity resolution, deterministic policy, Tool Registry, Action Wall, application service, provider/domain mutation, and audit/evidence. Provider events and mutations must be idempotent and replay-safe.

## License Boundary

- Do not copy, import, build, or ship Twenty files carrying `@license Enterprise` or the denied enterprise source paths in the registry.
- Do not copy, import, build, or ship Documenso `packages/ee/` without a separately approved commercial license.
- Preserve upstream copyright, license, source-offer, and network-use notices required by AGPL-3.0.
- Track Penpot file modifications and preserve MPL-2.0 notices and source availability obligations for modified covered files.
- Preserve Flow branding without removing legally required upstream notices or implying ownership of upstream trademarks.
- A focused legal review remains mandatory before commercial release. This ADR is engineering governance, not legal advice.

## Local Runtime Policy

The M1 development machine may run at most one heavy provider profile at a time. Future orchestration will expose `crm`, `studio`, and `sign` profiles plus a minimal `demo` composition; this ADR does not add those runtimes. Persistent provider data and disposable images/build caches must remain separable and cleanable.

## Consequences

- Provider implementation cannot begin from `main`, `latest`, a range, or an unverified enterprise path.
- Upgrades require a registry change, tag-to-commit verification, license-boundary review, security review, and focused provider tests.
- Flow UI and Ask Flow must call the same application service; neither may use an upstream provider as a parallel source of business truth.
- No upstream source is vendored and no runtime is started by this decision.
