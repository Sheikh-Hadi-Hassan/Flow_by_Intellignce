# Flow UI Operating Language V3

Status: implementation direction  
Branch: `design/flow-operating-language-v3`

## Product principle

Flow is not a CRM, PM tool, ERP, finance dashboard, or chatbot with a sidebar.

**Flow operates the business. Humans make the decisions.**

The UI therefore needs to make four things immediately legible:

1. what requires human judgment;
2. what Flow already handled;
3. what business truth Flow is using;
4. what is likely to happen next.

If a screen mainly helps a user maintain software state, the interaction should be challenged.

---

## What the Ledgerix research contributes

Ledgerix is useful as a visual-quality and information-design benchmark, not as a product architecture or source-code dependency.

Useful principles to adapt:

- large business values can carry more hierarchy than a page title;
- contextual labels should be compact and restrained;
- information density can be high without visual noise;
- charts should read as operating instruments, not generic dashboard widgets;
- layout hierarchy should rely on typography, alignment, spacing and thin separators before bordered cards;
- AI should be embedded in business context rather than isolated in decorative chat boxes;
- mobile should be compact and action-first, not a vertical stack of desktop cards;
- progressive disclosure is preferable to showing every field simultaneously.

Do not copy Ledgerix branding, screens, assets or finance-first information architecture.

Flow should ultimately feel **more operational** than Ledgerix because Flow must prepare and operate an entire service-business lifecycle.

---

## Flow's distinctive layer

The recognizable Flow layer is:

**premium operating instrument + intelligent business workspace + contextual AI + restrained machine language**

The visual character must survive when the accent is changed or removed.

Identity comes from, in order:

1. typography;
2. information hierarchy;
3. machine/dot grammar;
4. geometry;
5. density;
6. motion;
7. color.

Color must not compensate for weak information design.

---

## Color system

Flow uses:

- neutral light surfaces;
- neutral dark surfaces;
- exactly one arbitrary workspace accent.

The accent is globally swappable.

Derived surfaces may vary in opacity/lightness but must remain the same hue.

Legacy status tokens remain for compatibility but resolve into the same accent/neutral system. Status meaning must also be encoded with:

- copy;
- icon/symbol;
- fill/outline;
- pattern;
- density;
- motion when appropriate.

Never rely on hue alone.

### State grammar

- `●` complete / confirmed / active
- `◌` processing / in motion
- `○` queued / not connected / inactive
- `×` blocked / interrupted
- `!!!` attention / explicit intervention

Dots describe machine state and progress. They are not decorative wallpaper.

---

## Typography

Current implementation direction:

- **Space Grotesk** — human/product voice, headings, readable interface text;
- **Space Mono** — machine/system voice, metadata, compact operating labels, IDs and numeric instruments;
- future Flow Matrix / dot glyph layer — processing, progress, gauges and signature system moments.

Do not set long-form interface copy in a dot font.

The key visual principle is contrast between a calm readable human voice and a precise machine voice.

---

## Surface vocabulary

Do not call every rounded rectangle a card.

Use semantic surfaces:

### Canvas
Major operational composition. Hierarchy mainly comes from placement, typography and separators.

### Instrument
One important business signal or control.

### Decision Object
Human judgment object containing recommendation, evidence, impact and control.

### Insight Object
Flow-generated interpretation tied to business evidence.

### Evidence
Inspectable provenance for an important Flow claim.

### Simulation Object
Projected scenario that does not modify reality until approved/executed.

### Console
High-density operational environment such as capacity planning.

### Flow Run
Observable record of autonomous/background work.

### Exception Object
A situation Flow cannot safely resolve within current authority/evidence.

---

## Founder NOW

Founder NOW is the first reference experience.

It is not a dashboard.

The first question is:

> What requires me right now?

Hierarchy:

1. greeting/context;
2. count of things requiring judgment;
3. highest-value Decision Object;
4. Flow assessment/evidence;
5. Flow handled;
6. operating truth / missing truth;
7. contextual Ask Flow command.

Do not begin with a row of KPI cards.

### Current implementation rule

Until operational runtime data exists, Founder NOW must only use real prototype/workspace state such as:

- Business Twin completeness;
- setup readiness;
- selected services;
- confirmed setup checks;
- missing information;
- unconnected operating inputs.

Do not fabricate fake AI runs, revenue, capacity or delivery signals merely to make the screen look complete.

---

## Ask Flow

Ask Flow is a contextual operating command, not a permanently open generic chatbot.

Context examples:

- `ASK FLOW · FOUNDER NOW`
- `ASK FLOW · DISCOVERY`
- `ASK FLOW · ACME PROJECT`
- `ASK FLOW · CAPACITY`
- `ASK FLOW · PROPOSAL`

Responses should prefer operable objects over prose.

Example question:

> Can we start Acme next Monday?

Preferred response shape:

- scenario name;
- recommendation;
- capacity impact;
- timeline impact;
- margin impact;
- dependency impact;
- evidence/assumptions;
- executable actions.

Do not answer important operating questions with six paragraphs when a Simulation Object would be clearer.

---

## Evidence and confidence

Important AI recommendations must be inspectable.

A recommendation should expose:

1. recommendation;
2. reason;
3. evidence;
4. business impact;
5. human control.

Confidence should only appear where uncertainty genuinely exists.

Preferred semantic language:

- Confirmed — direct evidence;
- High confidence — strong inference;
- Uncertain — needs verification;
- Conflicting — sources disagree.

Commercial/legal truth never becomes authoritative merely because an LLM is confident.

---

## Three reference experiences before rollout

Do not redesign every route simultaneously.

The design language must first survive three different density modes:

### 1. Founder NOW — low density

Proves decision hierarchy, operating truth, trust, embedded intelligence and visual character.

### 2. Mobilization / Delivery Workspace — medium density

Proves lifecycle continuity, readiness, commitment-vs-reality, evidence, approvals and execution.

### 3. Capacity Console — high density

Proves serious business operation, people × time planning, tentative vs committed demand, simulation and dense visualization.

If these three screens look like generic SaaS, stop and correct the design language before propagating it.

---

## Current Phase 4 product slice

Primary product sequence:

**Executed Contract → Mobilization → Execution Plan Review → Guard Approval → Published Project → Delivery Workspace**

Mobilization should behave like an operating console, not a project setup wizard.

Flow prepares:

- phases;
- milestones;
- deliverables;
- tasks;
- dependencies;
- required roles;
- effort;
- schedule;
- acceptance criteria.

Then deterministic validation establishes readiness.

Never let AI override deterministic authorization, business calculations, tenant boundaries, RLS, audit history or lifecycle rules.

---

## Commitment vs Reality

This should become a signature Flow capability.

Every active engagement continuously compares what was committed with what is actually happening across:

- scope;
- deliverables;
- effort;
- timeline;
- cost;
- margin;
- dependencies;
- client obligations.

This enables Flow to detect scope leakage and prepare a change-order decision before margin erosion appears later in reporting.

---

## Capacity Console

Capacity is **People × Time**, not employee cards with progress bars.

Visual layers:

- committed allocation — solid;
- tentative demand — patterned/ghost;
- unavailable time — neutral interruption;
- overload — explicit state + annotation, not merely a different hue.

Primary interaction is simulation:

> Can we accept another project starting October 5?

Flow should compare options and show operating consequences.

---

## Chart grammar

Charts are operating instruments.

Rules:

- thin, intentional lines;
- muted background data;
- minimal axes;
- direct labels;
- large adjacent values;
- contextual annotations;
- one accent;
- no default chart-library palettes;
- no unnecessary legends.

Multiple datasets are differentiated with line style, opacity, fill, dots, patterns and direct labeling — not rainbow hues.

---

## Motion grammar

Motion communicates system behavior.

Use motion for:

- Flow processing;
- state transition;
- new evidence;
- simulation vs reality;
- approval causing downstream work;
- lifecycle progression;
- risk emergence;
- Flow Run completion.

Semantic motions:

- ENTER
- EXPAND
- TRANSFER
- PROCESS
- CONFIRM

Respect reduced-motion preferences.

---

## Responsive principle

Mobile is not shrunk desktop.

Founder mobile prioritizes:

- NOW;
- Decisions;
- Ask Flow.

Employee mobile prioritizes:

- Today;
- Work;
- Ask Flow.

Client mobile prioritizes:

- current status;
- action needed;
- approval.

Large consoles transform into focused drill-downs rather than vertically stacked desktop panels.

---

## Engineering constraints

This is a frontend/design-system transformation.

Do not:

- rewrite APIs for visual convenience;
- change database schemas unnecessarily;
- weaken RLS or tenant boundaries;
- remove audit history;
- replace deterministic calculations with AI;
- alter lifecycle rules without a product/domain decision;
- fake missing backend behavior;
- introduce autonomous actions outside approved policy.

Where runtime data is unavailable, show an explicit unavailable/not-connected state.

---

## Quality gate

The result must not look like:

- generic shadcn dashboard;
- generic Tailwind admin;
- HubSpot clone;
- Monday/Asana clone;
- ChatGPT with a sidebar;
- a finance dashboard wearing Flow branding.

The target is:

**premium operating instrument + intelligent business workspace + contextual AI**

Final check:

> Does this remove operational work, improve judgment, protect business truth, or safely allow Flow to do more?

If not, do not build it.
