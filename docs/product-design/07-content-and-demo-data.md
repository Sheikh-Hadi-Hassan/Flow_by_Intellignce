# 07 — Content and Demo Data

## Demo workspace

| Field              | Value                                                         |
| ------------------ | ------------------------------------------------------------- |
| **Workspace name** | Northstar Creative                                            |
| **Workspace slug** | `northstar-creative`                                          |
| **Industry**       | Creative & performance marketing agency                       |
| **Niche**          | B2B technology and robotics brands                            |
| **Size**           | 35 people (28 FTE, 7 regular contractors)                     |
| **HQ**             | Austin, Texas, USA                                            |
| **Currency**       | USD                                                           |
| **Jurisdiction**   | Texas / US federal                                            |
| **Fiscal year**    | January–December                                              |
| **Working hours**  | Mon–Fri 9:00–18:00 CT; async-friendly                         |
| **Expertise pack** | Digital Agency (`flow.concept.expertise-pack.digital-agency`) |

Aligned with compiled knowledge scenario `35-person-digital-agency` in `knowledge/blm/compiled/modules/digital-agency-module-recommendations-v1.json`.

---

## Personas

### Maya Chen — Founder & CEO

- **Portal:** Admin
- **Role:** `founder`
- **Goals:** Utilization, margin, cash flow, winning the right clients
- **Voice use:** Weekly check-ins, approval decisions on the move
- **Quote:** "I need to know if Acme is going to erode margin before it happens."

### Jordan Ellis — Account Director

- **Portal:** Admin / Employee
- **Role:** `account_manager`
- **Goals:** Discovery, briefs, proposals, client relationships
- **Quote:** "The brief should write itself from the discovery call — I just want to refine it."

### Sam Rivera — Operations Lead

- **Portal:** Admin
- **Role:** `operations_lead`
- **Goals:** Resourcing, delivery risk, contractor coordination
- **Quote:** "Show me who is overallocated before I promise a launch date."

### Priya Patel — Project Manager

- **Portal:** Employee
- **Role:** `project_manager`
- **Goals:** Task ownership, milestones, client approvals
- **Quote:** "I need a plan I can defend — not a generic Gantt."

### Alex Kim — Senior Designer

- **Portal:** Employee
- **Role:** `creative_lead`
- **Goals:** Clear briefs, review cycles, asset handoff
- **Quote:** "Tell me exactly what 'done' means for this deliverable."

### Robin Tate — Finance Coordinator

- **Portal:** Admin
- **Role:** `finance_admin`
- **Goals:** Invoicing, AR, QuickBooks reconciliation
- **Quote:** "Invoices should match the contract — no spreadsheet archaeology."

### Dana Okonkwo — Client Marketing Director (Acme Robotics)

- **Portal:** Client
- **Role:** `client_contact`
- **Organization:** Acme Robotics (client)
- **Goals:** Approve scope, track deliverables, pay on time
- **Quote:** "I want to see what's in scope without emailing Jordan three times."

### Luis Morales — Motion Designer (Contractor)

- **Portal:** Vendor
- **Role:** `contractor`
- **Goals:** Clear brief, deadline, payment status
- **Quote:** "Just tell me what to deliver and when I get paid."

---

## Agency services (Phase 2 seed)

### 1. Brand Strategy Retainer

| Field                | Content                                                                       |
| -------------------- | ----------------------------------------------------------------------------- |
| Type                 | Recurring retainer                                                            |
| Typical term         | 6–12 months                                                                   |
| Deliverables         | Brand audit, positioning, messaging framework, monthly strategy sessions      |
| Questionnaire themes | Brand maturity, competitors, audience, success metrics, approval stakeholders |

### 2. Campaign Launch

| Field                | Content                                                            |
| -------------------- | ------------------------------------------------------------------ |
| Type                 | Fixed-fee project                                                  |
| Typical duration     | 8–14 weeks                                                         |
| Deliverables         | Creative concept, channel plan, asset production, launch reporting |
| Questionnaire themes | Product, launch date, channels, budget, KPIs, legal claims         |

### 3. Website Redesign

| Field                | Content                                                          |
| -------------------- | ---------------------------------------------------------------- |
| Type                 | Fixed-fee project                                                |
| Typical duration     | 12–20 weeks                                                      |
| Deliverables         | UX audit, IA, design system, development, QA, launch support     |
| Questionnaire themes | Current site pain, CMS, integrations, accessibility requirements |

---

## Demo clients

### Acme Robotics (primary demo arc)

| Field           | Value                           |
| --------------- | ------------------------------- |
| Industry        | Industrial robotics             |
| Relationship    | Active prospect → client        |
| Primary contact | Dana Okonkwo                    |
| Opportunity     | Q4 product launch campaign      |
| Budget range    | $75,000–$95,000                 |
| Timeline        | Kickoff October; launch January |

### Brightline Health (secondary)

| Field        | Value                   |
| ------------ | ----------------------- |
| Industry     | Healthcare SaaS         |
| Relationship | Retainer client         |
| Service      | Brand Strategy Retainer |
| MRR          | $12,500/month           |

### Cedar Labs (pipeline)

| Field        | Value                             |
| ------------ | --------------------------------- |
| Industry     | Developer tools                   |
| Relationship | Early lead                        |
| Service      | Website Redesign (qualified lead) |

---

## Demo opportunity — Acme Q4 Launch

| Field             | Value                                                                                                |
| ----------------- | ---------------------------------------------------------------------------------------------------- |
| Name              | Acme Q4 Product Launch Campaign                                                                      |
| Stage (full demo) | DISCOVERY → BRIEF_READY → PROPOSAL                                                                   |
| Value             | $85,000                                                                                              |
| Services          | Campaign Launch + optional influencer package                                                        |
| Discovery assets  | Call transcript (synthetic), meeting notes                                                           |
| Brief highlights  | Launch new cobot line; audiences: plant managers, procurement; channels: LinkedIn, trade pubs, event |

---

## Demo proposal packages (Phase 4 seed)

### Growth Package — $52,000

- Creative concept and messaging
- 6 channel assets (LinkedIn, email, landing page, trade ad, video storyboard, sell sheet)
- Media plan (Flow does not buy media; plan only)
- 12-week timeline

### Scale Package — $78,000

- Everything in Growth
- Additional ABM sequence
- Event booth creative kit
- Weekly performance readouts

### Optional add-on — Influencer program — $8,000

- 3 micro-influencer partnerships
- Requires client legal review (flag in assumptions)

**Target margin:** 36–40% (Logic-calculated; not LLM-estimated)

---

## External systems (demo acknowledgements)

Referenced as connected or planned — not live integrations in early phases:

| System              | Role                     | Policy                                        |
| ------------------- | ------------------------ | --------------------------------------------- |
| QuickBooks          | Authoritative accounting | `EXTERNAL_AUTHORITATIVE` for GL               |
| ClickUp             | Legacy task tracking     | `SHARED_WITH_RECONCILIATION` during migration |
| Spreadsheet tracker | Legacy delivery tracker  | Deprecated in setup plan                      |
| Slack               | Communication            | Integration Phase 7+                          |

---

## Copy and vocabulary

### Use (agency-native)

- Brief, scope, retainer, campaign, deliverable, milestone, SOW, change order
- Client (not "customer" in UI copy)
- Contractor (not "vendor" for creative freelancers)
- Approval, sign-off, handoff, review round

### Avoid

- SKU, warehouse, inventory, patient chart (unless industry pack changes)
- "AI magic," "supercharge," "unlock"
- Generic "record," "entity," "object" in user-facing copy

### System terms (use consistently)

- **Business Twin** — not "AI profile" or "company chatbot"
- **Ask Flow** — not "assistant" or "copilot" in product chrome
- **Guard** — not "permission check" in user-facing approval UI
- **Proof** — not "sources" alone; always paired with claim type
- **Pulse** — not "notifications" or "alerts" in primary nav label
- **Action** — verb phrases in Guard preview ("Send proposal," not "Execute action")

---

## Onboarding default answers (Phase 1 demo path)

Pre-fill for demo/sandbox workspace creation:

```json
{
  "businessName": "Northstar Creative",
  "businessType": "creative_marketing_agency",
  "teamSize": 35,
  "location": "Austin, TX, US",
  "currency": "USD",
  "jurisdiction": "US-TX",
  "workingHours": "Mon-Fri 09:00-18:00 America/Chicago",
  "services": [
    "Brand Strategy Retainer",
    "Campaign Launch",
    "Website Redesign"
  ],
  "tools": ["QuickBooks", "ClickUp", "Slack", "Google Workspace"],
  "approvalHabits": "Founder approves proposals over $25k; account managers draft",
  "billingModel": "Mixed retainers and fixed-fee projects"
}
```

---

## Phase 1 content scope

Phase 1 uses:

- Workspace and onboarding copy
- Twin summary generated from onboarding answers
- Module recommendation labels from `business-module-registry-v1.json` and `digital-agency-module-recommendations-v1.json`
- Setup plan checklist (static template + dynamic module list)

Phase 1 does **not** seed Acme opportunity, proposals, or projects.

---

## Content governance

- Demo data is **synthetic** — no real company names beyond fictional examples
- Workspace data is **private** — never used for global model training (state in onboarding copy and privacy policy)
- BLM compiled knowledge is **governed reference**, not workspace truth — Twin compiles from workspace answers + authorized imports
