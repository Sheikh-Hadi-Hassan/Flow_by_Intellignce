# BLM Business Brain Architecture v1

## Mission

BLM is a model-independent Business Intelligence, Reasoning, and Execution
Layer that converts a general-purpose LLM or SLM into a governed business
expert.

BLM is not a chatbot, not Semantica, not a newly trained foundation model, not
an ontology alone, and not just `@flow/blm-contracts`.

## Architecture Layers

Base LLM or SLM flows through the BLM Business Intelligence Layer, then through
Flow skills, actions, and deterministic engines, then through Action Wall and
authorization, and only then to Flow modules, entities, and records.

The current implementation adds canonical contracts and deterministic registry
primitives in `@flow/blm-contracts`. Future package boundaries remain:

- `@flow/blm-contracts`: shared definitions and proof knowledge.
- future `@flow/blm-core`: deterministic registry and reasoning primitives.
- `services/blm-semantic-kernel`: Semantica-backed semantic provider.
- future BLM runtime/orchestrator: context, model, skill, and execution routing.

## Conceptual Systems

BLM v1 defines foundations for:

- Business Semantic Kernel
- Business Expertise Registry
- Business Domain Packs
- Business Knowledge Provider
- Business Skill Registry
- Business Rule and Formula Registry
- Business Process Pattern Registry
- Business Document Registry
- Business Metric Registry
- Business Context Compiler interface
- Model Router interface
- Deterministic Execution Authority model
- Source Provenance
- BLM Evaluation contracts

Only foundational contracts, proof data, and deterministic lookup are
implemented now.

## Domain Packs

A Business Domain Pack is curated business expertise, not a software module and
not an industry template. It may contain concepts, relationships, capabilities,
terminology, process patterns, rules, formulas, documents, metrics, skills,
mappings, examples, evaluations, and provenance.

The four v1 proof packs are:

- `flow.concept.blm.domain.universal-core`
- `flow.concept.blm.domain.crm-sales`
- `flow.concept.blm.domain.finance-accounting`
- `flow.concept.blm.domain.inventory-procurement`

These are foundation packs, not complete ERP coverage.

## Business Skills

`BusinessSkillDefinition` records what BLM can do. It includes input/output
contracts, reads/writes, required capabilities, required permissions,
preconditions, postconditions, risk class, execution authority, optional tool or
Action Wall binding, idempotency policy, approval policy, and provenance.

The language model may help explain, draft, or select skills. It is never the
source of truth for privileged mutations or authoritative calculations.

## Execution Authority

Execution authority is explicit:

- `KNOWLEDGE_ONLY`
- `LLM_ADVISORY`
- `LLM_DRAFT`
- `DETERMINISTIC_REQUIRED`
- `APPROVAL_REQUIRED`
- `EXECUTABLE`

Authoritative calculations require deterministic authority. High-risk mutation
skills require permission and Action Wall metadata.

## Deterministic Boundary

Formulas and rules are represented, not executed by a new expression engine.
Future deterministic engines can bind to these definitions. v1 records examples
such as gross profit, gross margin, invoice/quote total, quote approval
thresholds, closed-period posting rules, and inventory availability rules.

## Global Vs Tenant Knowledge

Global BLM knowledge includes canonical concepts, domain packs, skills,
formulas, process patterns, document definitions, metrics, source mappings, and
source provenance.

Tenant BLM knowledge includes BusinessProfile, terminology aliases, policies,
thresholds, account structure, pricing rules, approval chains, records,
enabled capabilities, user context, and workspace-specific processes.

Global definitions must not carry `workspaceId`. Tenant overlays require a
workspace ID and remain isolated.

## Source Governance

Every externally derived definition must be traceable to a
`BusinessKnowledgeSource`. The v1 manifest records source type, canonical
location, upstream project, version/commit where applicable, license, license
status, attribution requirements, permitted usage, import policy, mapping
policy, provenance, decision, and ingestion status.

No external repository source was ingested into Flow. Review-required and
restricted sources cannot become trusted imported knowledge.

## External Adoption Matrix

Mantle UDM/USL are the highest-priority business-domain references and are
marked `ADAPT`. gist, W3C ORG, PROV-O, SKOS, FIBO, and UBL are used as selective
mapping/adaptation references. OAGi Score, Accord Cicero, MCP, OFBiz, ERPNext,
and Odoo remain reference-only or deferred according to license and runtime
boundary. HR Open, GS1 EPCIS, XBRL GL, BPMN, DMN, and ISIC require additional
review before any import.

## Model Independence

BLM contracts do not depend on OpenAI, Anthropic, Google, Meta, Qwen, or any
other model provider. Future routing can select cloud LLM, local SLM,
specialized model, deterministic engine, or no-model execution without changing
business semantics.

## Semantica Boundary

Semantica remains behind `services/blm-semantic-kernel`. It may support graph,
provenance, conflict, temporal semantics, and decision traces. It is one BLM
capability, not BLM itself. Business expertise contracts do not import
Semantica-specific classes.

## MCP Boundary

Flow's `BusinessSkillDefinition` is canonical. Future adapters may expose
approved BLM skills through MCP or bind external MCP tools into skills. BLM is
not internally dependent on MCP.

## Component Registry Relationship

Domain Pack answers: what does sales mean and how does it work?

Component Registry answers: what trusted Flow capability implements Lead
Management?

Business Skill answers: what can BLM do about this lead?

Future Composition Engine answers: what components should this business
activate?

## Training Strategy

No model training, fine-tuning, embedding store, vector DB, RAG pipeline, or
cloud LLM call is part of this chapter. BLM first needs governed knowledge,
skills, authority metadata, provenance, and evaluation fixtures.

## Coverage Strategy

The long-term strategy is universal domain packs plus thin industry/workspace
specialization, guided by ISIC classification, BusinessProfile, enabled
capabilities, and tenant configuration. The v1 coverage manifest marks only the
four proof packs as `FOUNDATION`; all broader tracks remain `NOT_STARTED`.

## Security Invariants

Business expertise is not permission. Model recommendation is not permission.
Tool availability is not permission. Every mutation must pass workspace
isolation, roles, permissions, Action Wall, approval separation, and audit.

## Evaluation Strategy

`BLMEvaluationCase` fixtures are deterministic. v1 includes proof cases for
source provenance, CRM lifecycle/capability selection, finance gross
profit/margin expected outputs, and inventory availability/reservation
semantics. Future benchmark metadata records BizBench and FinQA without
downloading datasets.
