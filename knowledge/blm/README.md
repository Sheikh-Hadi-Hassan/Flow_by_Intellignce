# Flow BLM Knowledge Source Vault

This directory is the permanent repository-native source vault for approved Flow BLM source documents. It records where the original documents live, how they are classified, which version is present, and which Task 001 governance concepts must authorize later extraction or publication.

All BLM knowledge-engineering tasks must begin by reading `knowledge/blm/manifests/sources.manifest.json`.
Do not rely on remembered document names or machine-local paths.

## Source Groups

- `GLOBAL_CORE`: global BLM business knowledge source material. These documents may be candidates for governed extraction, mapping, context, or evaluation use after Task 001 review.
- `CURRICULUM`: curriculum modules. These are learning/curriculum sources and are not automatically universal runtime knowledge.
- `EVALUATION`: synthetic case studies, demos, and benchmark fixtures. These must not be promoted to global BLM knowledge.
- `FLOW_INTERNAL`: Flow strategy, fundraising, and product planning context. These remain isolated from universal runtime knowledge and model prompts unless a future task explicitly authorizes that use.

## Originals vs Compiled Assets

`knowledge/blm/sources/` preserves the original supplied documents. Do not rewrite these files into summaries and discard the originals.

`knowledge/blm/compiled/` is reserved for later governed compilers. Task 007.0 does not publish compiled BLM knowledge.

## Governance

The Task 001 source-governance contracts remain authoritative:

- `BusinessSource`
- `SourceRelease`
- `SourceLicenseProfile`
- `BusinessKnowledgeUnit`

The source vault prepares deterministic seed candidates for those contracts but does not automatically grant model-training or commercial-training permission.

Documents are not automatically truth. Later extraction must classify facts, inferences, recommendations, and assumptions, then link every extracted knowledge unit to source provenance and review status.

Do not load these documents wholesale into every LLM prompt. Future context compilers must select only task-relevant source-backed knowledge and must preserve permission, authority, and tenant boundaries.

## Adding A Source

1. Place the original file under the correct `knowledge/blm/sources/<group>/` directory.
2. Add one record to `knowledge/blm/manifests/sources.manifest.json`.
3. Set `sourceGovernanceRequired: true`.
4. Add or update the Task 001 governance mapping.
5. Regenerate `knowledge/blm/manifests/checksums.manifest.json`.
6. Run `pnpm blm:knowledge:sources:validate`.

## Updating A Version

Add the new file as a new versioned source record or update the existing record only when the source is truly the same release. Preserve superseded source files unless a future retention policy says otherwise.

## Superseding A Source

Use release metadata to identify the superseding source and keep the older source available for audit. Do not silently replace source files.

## Evaluation And Internal Isolation

Synthetic evaluation documents belong to `EVALUATION` and are fixture material only. Flow-internal strategy documents belong to `FLOW_INTERNAL` and must not become global runtime knowledge.

## Commands

- `pnpm blm:knowledge:sources:list`
- `pnpm blm:knowledge:sources:validate`
- `pnpm blm:knowledge:sources:test`
