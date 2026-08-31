# 00 — Product North Star

## What Flow is

Flow by Intellignce is an **AI-native Business Operating Intelligence platform**. It is not an ERP with a chatbot attached and not merely a voice-controlled ERP.

Flow creates a living **Business Twin** of a company and uses governed intelligence to:

1. **Understand** the business (structure, services, clients, constraints, policies)
2. **Calculate** authoritative results through deterministic business logic
3. **Recommend** next actions with evidence and uncertainty made visible
4. **Execute** work only through **Guard** and **Action**, with human approval where required

## System language

Preserve these product terms in all UX, documentation, and demo content:

| Term                     | Meaning                                                                                                           |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| **Flow OS**              | The platform: workspaces, modules, portals, intelligence, and execution boundary                                  |
| **Business Twin** (Twin) | The workspace's compiled model of how the business operates — not a chat persona                                  |
| **Ask Flow**             | Contextual intelligence entry point in Business Mode; also the reasoning surface in Voice Mode                    |
| **Pulse**                | Operational awareness: delivery risk, utilization, cash, scope, and approval backlog                              |
| **Proof**                | Provenance for facts, calculations, recommendations, and actions (FACT / INFERENCE / RECOMMENDATION / ASSUMPTION) |
| **Guard**                | User-facing name for governed authorization and approval (maps to Action Wall in backend)                         |
| **Action**               | A governed capability to create, read, update, archive, submit, approve, reject, or restore records               |

### Intelligence stack (product view)

```text
BUSINESS → TWIN → BLM → LOGIC → PROOF → GUARD → ACTION
```

| Layer        | Product role                                                                        |
| ------------ | ----------------------------------------------------------------------------------- |
| **Business** | Workspace records, people, clients, documents, money, delivery                      |
| **Twin**     | Compiled business model: services, policies, vocabulary, operating patterns         |
| **BLM**      | Business Language Model — reasoning, semantics, skill selection, evidence handling  |
| **Logic**    | Deterministic formulas and rules; authoritative numbers never improvised by the LLM |
| **Proof**    | Source, date, freshness, authority, and claim type for every important output       |
| **Guard**    | Permission, approval, preview, and audit gate before side effects                   |
| **Action**   | Executed change with reversibility or compensation where possible                   |

## Who it is for

### Generic platform, agency-first demo

The architecture must support **service-based SMBs** generically:

- Creative and marketing agencies
- Consulting firms
- Law firms
- Clinics
- Professional-services firms
- Other project-based service businesses

The **first complete demo** specializes content, examples, workflows, roles, services, and terminology for a **creative/marketing agency**. Generic structures live underneath; the visible experience must feel agency-native, not templated.

## Experience modes

Two complementary modes share the same Twin, records, Logic, Guard, and Action model:

### Voice Active Mode

- Voice-first, one focused question or decision at a time
- Clear listening, thinking, evidence, approval, and completion states
- Tappable suggestions and structured answer controls
- Keyboard always available; never required
- No autoplay voice; no continuous microphone without explicit activation
- No fake AI activity or fabricated results
- Important actions require visible review and Guard approval

### Traditional Business Mode

- Dashboards, lists, tables, timelines, calendars, kanban, forms, documents, reports
- Optimized for repetitive employee workflows
- Ask Flow available contextually without obstructing operations
- AI recommendations never block ordinary task completion

Users move between modes without changing underlying records, calculations, or permissions.

## Visual north star

- Extremely clean, minimal, professional, calm, content-first
- Excellent light and dark modes
- Responsive desktop, tablet, mobile
- Strong typography and information hierarchy
- Compact but readable business-data density
- Clear states, permissions, Proof, and approvals
- Accessible contrast and keyboard navigation
- Reduced-motion support; restrained, confident motion
- Avoid unnecessary gradients, glows, decorative AI imagery, visual noise, excessive nested cards
- Avoid making every section a floating dashboard widget
- Whitespace intentional; comprehension and task completion over novelty

## Design principles

1. **Governed intelligence** — The LLM advises and drafts; Logic calculates; Guard authorizes; Action mutates.
2. **Workspace isolation** — No cross-tenant data in UI, API, AI context, or memory.
3. **Draft-first** — Significant changes are previewed before commit.
4. **Evidence before authority** — Proof accompanies recommendations and calculations.
5. **Role-appropriate surfaces** — Four portals; each sees only what its role allows.
6. **Lifecycle continuity** — Opportunity → brief → proposal → contract → project → invoice without manual re-entry.
7. **Agency authenticity** — Demo language reflects how agencies actually sell, scope, deliver, and bill.

## Non-goals (current planning horizon)

- Full ERP replacement for every industry in v1
- Autonomous execution without Guard
- Global training on private workspace data
- Production deployment and billing infrastructure (later phases)

## Success measure for the product

A founder at a 35-person creative agency can onboard, see their Twin, understand recommended modules, and believe Flow understands how their business actually runs — before any CRM or invoicing screen exists.
