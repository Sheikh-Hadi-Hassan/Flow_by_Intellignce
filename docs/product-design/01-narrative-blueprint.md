# 01 — Narrative Blueprint

## Demo company

**Northstar Creative** — a 35-person B2B creative and performance marketing agency in Austin, Texas. See [07-content-and-demo-data.md](./07-content-and-demo-data.md) for full personas and records.

## Primary persona

**Maya Chen**, Founder & CEO. She sells retainers and project-based campaigns, worries about scope creep, utilization, and cash flow, and wants one place that understands the business — not another tool to configure.

## Experience arc (long-term)

This is the full story Flow must eventually support. Phases implement slices of this arc.

### Act 1 — Arrival

Maya hears about Flow OS. She signs up, creates a workspace, and Flow welcomes her in **Business Mode** with a calm onboarding path — not a chat gimmick.

Flow asks structured questions: business type, team size, locations, clients, vendors, currencies, jurisdiction, working hours, approval habits. Maya selects **creative/marketing agency**. Flow recognizes the pattern and loads the **Digital Agency Expertise Pack**.

### Act 2 — Twin birth

Flow summarizes what it learned as Maya's **Business Twin**: operating model, service mix, capacity constraints, current tools (QuickBooks, ClickUp), and recommended modules. Maya reviews a **setup plan** — what to connect, what to configure, what can wait.

She does not see internal BLM jargon. She sees: _"Your agency sells strategy, creative production, and paid media. You run blended teams with contractors. You need lead-to-cash and delivery-to-margin visibility."_

### Act 3 — Services and discovery

Maya defines agency services: Brand Strategy Retainer, Campaign Launch, Website Redesign. Each service gets a **questionnaire** used in client discovery.

A new opportunity arrives: **Acme Robotics** wants a Q4 product launch campaign. Maya links a discovery call transcript and meeting notes. Flow interviews her (Voice or form) to fill gaps. A **creative brief** emerges with goals, audience, deliverables, constraints, and assumptions — each claim tagged with **Proof**.

### Act 4 — Proposal and contract

Flow turns the brief into an interactive **proposal**: packages, optional influencer add-on, timeline, assumptions, pricing cards. Maya previews margin impact (Logic, not LLM math). She sends a client-safe link.

Acme's marketing director approves in the **Client Portal**. The proposal becomes a **contract** without re-keying scope or price.

### Act 5 — Delivery

A **Project Manager Agent** (human-reviewed) proposes phases, milestones, tasks, dependencies, owners, and review points. Maya assigns work. **Pulse** flags scope creep on the influencer line item. Employees work in **Employee Portal**; contractors in **Vendor Portal**.

### Act 6 — Money and reporting

Milestone invoices generate from the project schedule. Deposits, retainers, and overdue AR surface in Pulse. Maya sees project margin, utilization, and client profitability in founder reports — every number traceable to **Proof**.

Throughout, Maya can switch to **Voice Active Mode**: _"What's at risk on Acme this week?"_ — one answer, evidence attached, no theatrics.

## Narrative beats by mode

### Business Mode beats

| Beat       | User need           | Flow response                               |
| ---------- | ------------------- | ------------------------------------------- |
| Orient     | "Where am I?"       | Workspace home, Pulse summary, next actions |
| Configure  | "Set up my agency"  | Services, questionnaires, team, policies    |
| Sell       | "Win this client"   | Opportunity, discovery, brief, proposal     |
| Commit     | "Get signature"     | Client approval, contract conversion        |
| Deliver    | "Run the work"      | Project plan, tasks, assignments, reviews   |
| Collect    | "Get paid"          | Invoices, AR, profitability                 |
| Understand | "How are we doing?" | Reports with Proof drill-down               |

### Voice Mode beats

| Beat     | User need          | Flow response                                  |
| -------- | ------------------ | ---------------------------------------------- |
| Listen   | User activates mic | Single focused prompt; visible listening state |
| Clarify  | Ambiguous request  | One follow-up question with tappable options   |
| Reason   | Complex question   | Thinking state; BLM + Twin context             |
| Prove    | "How do you know?" | Proof drawer: sources, claim types, freshness  |
| Guard    | Action requested   | Preview + approval card; no silent execution   |
| Complete | Action approved    | Confirmation + audit reference                 |

## Emotional tone

- **Confident, not flashy** — Flow knows business operations; it does not perform "AI magic."
- **Respectful of time** — Employees get speed; founders get clarity.
- **Transparent** — Uncertainty and missing information are stated plainly.
- **Agency-native** — Language says "brief," "scope," "retainer," "campaign," "deliverable" — not generic "item" and "record."

## Anti-patterns (never in narrative or UI copy)

- "As an AI language model…"
- Fabricated metrics or client names without workspace data
- Auto-executed payments, contracts, or scope changes
- Cross-portal leakage ("As you know, your margin is…" to a client)
- Generic ERP wording pasted under an agency logo

## Chapter map to implementation phases

| Narrative act               | Primary phase |
| --------------------------- | ------------- |
| Arrival + Twin birth        | Phase 1       |
| Services + questionnaires   | Phase 2       |
| Opportunity + brief         | Phase 3       |
| Proposal + contract         | Phase 4       |
| Project + tasks             | Phase 5       |
| Invoicing + vendors         | Phase 6       |
| Portals                     | Phase 7       |
| Voice + Ask Flow + Guard UX | Phase 8       |
| Reporting + white-label     | Phase 9       |
