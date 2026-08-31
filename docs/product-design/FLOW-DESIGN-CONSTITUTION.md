# FLOW UX RESEARCH & UI DESIGN CONSTITUTION

> **Start with the job, not the screen.**  
> **Start with the decision, not the data.**  
> **Show the answer before the evidence.**  
> **Automate routine work; surface exceptions.**  
> **AI prepares and explains; governed systems establish truth.**  
> **Every pixel must earn attention.**  
> **Automate operations. Escalate judgment.**

## 1. Product standard

Flow is an AI-native Business Operating System for service businesses. We are not designing screens around features or database objects. We are designing an operating environment where humans understand, decide, approve and act while Flow safely handles as much operational work as possible.

Our product-design benchmark is the discipline visible across RonDesignLab's operational products: strong information hierarchy, contextual data, deliberate density, meaningful visualization, progressive disclosure, contextual actions, polished interaction and job-centered interfaces.

Never copy another product's screen. Study why it exists, what dominates, what is suppressed, what decision it supports, how complexity is progressively revealed, how actions sit next to the information they affect, and how desktop transforms into mobile. Then create the Flow version.

## 2. Never start with UI

Before designing a major screen, answer all of the following:

1. **Business** — What business process are we improving?
2. **Actor** — Founder, employee, client, or Flow?
3. **Situation** — What happened immediately before this?
4. **Job** — What is the person trying to accomplish?
5. **Question** — What single business question must this surface answer?
6. **Decision** — What judgment may the human need to make?
7. **Flow responsibility** — What can Flow observe, interpret, recommend, prepare, execute, or track?
8. **Evidence** — What information is needed to trust the answer?
9. **Consequence** — What changes after the action?

Only then may interface design begin.

## 3. One-question rule

Every major Flow surface has one primary business question.

- **Founder NOW** — What needs my attention?
- **Opportunity** — Is this business worth pursuing?
- **Discovery** — Do we understand enough to define the engagement?
- **Engagement Plan** — Should we commit to delivering this at these economics?
- **Contract** — Is the agreement consistent with what we approved?
- **Mobilization** — Are we ready to deliver what we sold?
- **Delivery** — Are we going to deliver what we promised?
- **Capacity** — Can we take this work without damaging existing commitments?
- **Business** — Is the business becoming healthier or weaker?

If the question cannot be written in one sentence, the surface is not ready to design.

## 4. Start from the decision, not the fields

Never begin with “what fields do we have?” Begin with “what does the user need to know?” Raw data supports the answer; it does not control hierarchy.

Bad hierarchy:

- project name
- status
- start/end dates
- owner
- tasks
- hours
- budget

Better hierarchy:

> **ARE WE ON TRACK?**  
> Yes — 91% confidence  
> Next commitment: Brand approval · Sep 14  
> Primary risk: Client approval  
> Commercial impact: None currently

## 5. Three-second hierarchy test

Within roughly three seconds, a user should perceive:

1. one dominant answer,
2. two to four supporting signals,
3. then detail.

If ten cards have equal visual weight, redesign.

Default information order:

**Primary answer → important signals → recommended action → supporting context → detail → raw evidence**

## 6. Design information in four depths

Every complex surface should support:

- **Glance** — understand state immediately.
- **Scan** — understand why it matters.
- **Inspect** — inspect supporting evidence.
- **Investigate** — reach complete records/history/raw evidence.

Founders should almost never need the deepest level for routine operation.

## 7. Never make the user assemble the answer

Flow must turn information into interpretation and action.

Do not show four unrelated metrics and expect the founder to infer the operating state.

Prefer:

> **Acme remains on schedule, but client approval is now the critical dependency.**

Then show the supporting values.

**Information → interpretation → consequence → recommendation → action**

## 8. Comparison is a core design tool

Isolated numbers are weak. Relationships create meaning.

Core Flow comparisons:

- Committed ↔ Current
- Planned ↔ Actual
- Capacity ↔ Demand
- Price ↔ Cost
- Forecast ↔ Actual
- Policy ↔ Contract
- Approved ↔ Requested
- Before ↔ After
- Expected ↔ Observed
- Baseline ↔ Change

Example: prefer `412h committed → 446h current (+34h)` over `Current effort: 446h`.

## 9. Design around exceptions

Routine operations should increasingly disappear. Flow should surface decisions, exceptions, risks, changes, uncertainty and opportunities.

If 100 operations happened and 97 were normal, summarize **97 handled by Flow** and elevate only the three requiring judgment.

Founder attention is scarce product capacity.

## 10. Flow must have a responsibility

Every screen contract must explicitly state:

### Human responsibility
What requires judgment, relationship skill, creativity, negotiation or authority?

### Flow responsibility
What can Flow observe, interpret, recommend, prepare, execute and track?

If Flow has no useful responsibility, challenge whether the surface belongs in an AI-native Business OS.

## 11. AI is not a chat feature

AI is embedded in the operating workflow:

- Opportunity → assess fit.
- Discovery → identify missing information.
- Engagement → evaluate economics.
- Contract → detect deviations.
- Mobilization → identify readiness blockers.
- Delivery → predict risk.
- Capacity → simulate scenarios.

Chat and voice are access methods, not the intelligence architecture.

## 12. AI must produce operable objects

Prefer structured objects over long prose:

- Decision
- Recommendation
- Simulation
- Insight
- Evidence
- Action Preview
- Exception
- Flow Run

A recommendation should show what Flow recommends, why, evidence, impact, confidence, authority and what happens after approval.

## 13. Trust must be designed

Consequential Flow recommendations require:

- **What** — proposed action.
- **Why** — reasoning.
- **Evidence** — supporting facts/source records.
- **Impact** — what changes.
- **Confidence** — uncertainty in interpretation.
- **Authority** — who can approve.
- **Action** — execution consequence.

Never ask users to trust “AI says so.”

## 14. Deterministic truth beats AI confidence

LLM output is not authoritative business truth. Where applicable, money, margin, permissions, scope baseline, approval state, contract state, governed dates, capacity constraints and lifecycle state come from deterministic systems/database truth.

AI may interpret, summarize, recommend, prepare and explain. It must not visually present inference as authoritative fact.

## 15. Provenance vocabulary

Use these meanings consistently across Flow:

- **CONFIRMED** — direct authoritative evidence.
- **INFERRED** — Flow interpretation.
- **MISSING** — required information unavailable.
- **CONFLICTING** — sources disagree.
- **SIMULATED** — hypothetical future state.
- **DRAFT** — prepared but not authoritative.
- **APPROVED** — governed/human-authorized state.

## 16. Remove work about work

Challenge any human interaction whose reason is “because the software needs the field.” Flow should eliminate unnecessary record creation, status updates, copy/paste, categorization, task creation, meeting-note cleanup, follow-up drafting, navigation, reporting and reconciliation.

Humans should spend time on judgment, relationships, creativity, negotiation, leadership and exceptions.

## 17. Navigation is a cost

Before adding a route ask whether the work can be understood or handled in current context.

Prefer inline expansion, drawers, context panels, popovers, progressive disclosure and command actions where appropriate.

Avoid deep chains such as Dashboard → Projects → Project → Tasks → Task → Details → Edit.

## 18. Do not build database navigation

Primary navigation represents the operating model, not table names.

Founder: **NOW / DECISIONS / FLOW / BUSINESS**  
Employee: **TODAY / MY WORK / PROJECTS / ASK FLOW**

Clients, contacts, tasks, invoices, notes and documents can exist as contextual objects/indexes underneath.

## 19. No card-first design

Never begin by drawing cards. Begin with information hierarchy.

Ask:

- What should dominate?
- What belongs together?
- What needs separation?
- What can disappear?

Then choose containment only if it communicates structure.

Prefer semantic surfaces: Canvas, Instrument, Module, Console, Workspace, Rail, Sheet.

## 20. Visualize when shape matters

Use visualization when shape/relationship carries meaning: timeline, capacity, pipeline, margin trend, forecast, dependencies, scope change, progress, resource demand and cash movement.

Do not draw a chart merely because data exists.

## 21. Density follows the job

- **Low density** — Founder NOW, Client Portal.
- **Medium density** — Opportunity, Discovery, Delivery.
- **High density** — Capacity, Planning, Business analytics.

Density is part of task design, not a universal style preference.

## 22. Visual restraint

Default visual language:

- neutral surfaces,
- strong typography,
- one configurable accent,
- restrained borders,
- very restrained shadows,
- purposeful whitespace,
- precise alignment,
- limited radius families,
- minimal decoration.

Avoid rainbow statuses, gradient AI blobs, glowing purple controls, excessive pills, huge shadows, glassmorphism everywhere, arbitrary illustrations and decorative dot wallpaper.

Premium means controlled.

## 23. Flow dot/machine language has semantics

Dots can communicate machine activity, processing, state, progress, relationships and background operations. If a dot pattern communicates nothing, remove it.

## 24. Motion explains change

Animation should answer **what just happened?**

Use it for state transitions, Flow processing, approval consequences, new evidence, simulation changes, background completion and risk emergence.

Do not animate because the component library supports animation.

## 25. Mobile = different priorities

Never transform desktop by stacking everything vertically.

Re-ask the job:

- Founder mobile → What needs me?
- Employee mobile → What do I do next?
- Client mobile → What do you need from me?

Ask Flow / voice becomes more prominent on mobile.

## 26. Real data before beauty review

Never approve a major screen using `Project 1`, `John Doe`, `$10,000`, or lorem ipsum.

Use realistic Northstar scenarios including long names, multiple projects, missing information, conflicting evidence, overcapacity, late clients, low margin, no results and large result sets.

## 27. Design every state

Every meaningful component/surface must consider:

Default, Hover, Focus, Selected, Loading, Processing, Empty, Partial, Success, Warning, Critical, Disabled, Permission denied, AI unavailable, Data unavailable, Stale, Conflict, Draft, Approved.

## 28. Research before redesign

For each workflow research:

- existing behavior,
- tools involved,
- workarounds,
- repetition,
- context switching,
- delay,
- uncertainty,
- real human judgment,
- trust boundaries,
- tasks users would happily delegate permanently.

Do not ask only “would you like AI here?”

## 29. Research must become product behavior

Every research finding maps through:

**Observation → friction → design principle → product behavior → UI consequence → success measure**

Research is not complete until it changes the product model.

## 30. Design with a hypothesis

Every meaningful UX decision should be testable.

Example:

> We believe showing only exceptions on Founder NOW will reduce daily operational scanning because normal operations can be safely summarized by Flow.

Test it. “It looks cleaner” is not a hypothesis.

## 31. Benchmark principles, not pixels

When studying RonDesignLab, Linear, Stripe, Notion, Superhuman or others, record:

- problem being solved,
- primary information,
- hierarchy,
- interaction model,
- density,
- progressive disclosure,
- navigation behavior,
- action placement,
- responsive transformation,
- why it works.

Then translate the principle into Flow.

## 32. 3 seconds / 30 seconds / 3 minutes

Every major workspace should support:

- **3 seconds** — What is happening?
- **30 seconds** — Why does it matter?
- **3 minutes** — What evidence supports it and what should I do?

If all three require the same amount of reading, hierarchy failed.

## 33. Founder interruption test

For every item on Founder NOW ask: **is this worth interrupting the founder?**

- If Flow can safely resolve it → Flow resolves it.
- If an employee can resolve it → route it there.
- If no action is required → summarize it.
- If founder judgment is genuinely required → elevate it.

## 34. “So what?” test

For every metric ask:

1. So what?
2. What is the consequence?
3. What should we do?

Complete information chain:

**Data → Meaning → Consequence → Recommendation → Action**

## 35. Design review scorecard

Score every major screen before implementation:

| Dimension | Score |
| --- | ---: |
| Primary question immediately clear | /10 |
| Information hierarchy | /10 |
| Cognitive load | /10 |
| Context preservation | /10 |
| Decision support | /10 |
| Flow intelligence integration | /10 |
| Trust/evidence | /10 |
| Action clarity | /10 |
| Visual sophistication | /10 |
| Responsive behavior | /10 |
| Accessibility | /10 |
| Real-data resilience | /10 |

**Do not implement below 96/120.**

Anything below **8/10 for hierarchy, cognitive load, decision support, or action clarity** automatically returns to design.

## 36. Implementation does not invent UX

Approved flow:

**Research → Product behavior → Wireframe → Visual system → Prototype → Validation → Specification → Implementation**

Cursor/Codex may solve engineering details. It must not silently redesign product behavior because implementation is easier another way.

Likewise design may not alter deterministic business truth merely because another interaction looks nicer.

## 37. Final Flow test

Before approving a surface ask:

- Does it help the human understand?
- Does it improve a decision?
- Does it remove operational work?
- Does it expose important change?
- Does it preserve business truth?
- Does it show evidence where trust matters?
- Does it give Flow useful responsibility?
- Does it keep the human in control where judgment matters?
- Could we remove anything?
- Would this still be valuable if the AI visual effects were removed?

If the last answer is no, we designed an AI gimmick. If yes—and AI removes additional work—we designed Flow.

## Mandatory project behavior

This constitution is mandatory context for every future Flow research, design, prototype, review and frontend implementation task. It sits above visual preference and below deterministic business/security rules.

When a conflict appears:

1. business truth/security/lifecycle constraints win,
2. this product/design constitution governs UX behavior,
3. the Flow Design System governs visual implementation,
4. implementation convenience comes last.
