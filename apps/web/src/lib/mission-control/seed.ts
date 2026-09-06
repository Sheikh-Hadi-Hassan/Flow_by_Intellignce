/**
 * Northstar Creative Mission Control seed.
 *
 * Deterministic by construction: every timestamp is a pre-rendered label and
 * every number is a literal, so the screen looks identical on every render and
 * in every screenshot. Nothing here touches a real workspace — the demo adapter
 * is only reachable for the Northstar slug.
 *
 * Extends the existing Northstar universe (Acme Robotics, Maya Chen, and the
 * eight seeded resources in northstar-store.ts) rather than inventing a second
 * fictional agency.
 */

import { NORTHSTAR_SLUG } from "../prototype/defaults";
import type {
  ActivityEvent,
  AskFlowContext,
  CapacityRow,
  ClientAction,
  DeliveryRisk,
  EvidenceRef,
  InvoiceSignal,
  MissionControlData,
  MissionDecision,
  MissionHeadline,
  MissionMetric,
  MissionNotification,
  MissionOpportunity,
  MissionProject,
  MissionViewer,
  PipelineStageSignal,
  PulsePoint,
} from "./types";
import { formatMoney, joinReadable } from "./format";

export const MISSION_CURRENCY = "USD";

const usd = (minor: string) => ({ minor, currency: MISSION_CURRENCY });

const MAYA = {
  id: "ns-res-maya",
  name: "Maya Chen",
  role: "Founder",
  initials: "MC",
} as const;
const JORDAN = {
  id: "ns-res-ops",
  name: "Jordan Ellis",
  role: "Operations lead",
  initials: "JE",
} as const;
const AVERY = {
  id: "ns-res-strategist",
  name: "Avery Brooks",
  role: "Brand strategist",
  initials: "AB",
} as const;
const SAM = {
  id: "ns-res-designer",
  name: "Sam Rivera",
  role: "Designer",
  initials: "SR",
} as const;

const base = `/${NORTHSTAR_SLUG}/admin`;

const evidence = {
  meridianPricing: {
    id: "ev-meridian-pricing",
    kind: "calculation",
    label: "Deterministic scope calculation",
    source: "Meridian Health · proposal v3",
    capturedAtLabel: "Today, 08:12",
    claim: "FACT",
    trust: "high",
    excerpt:
      "Delivery cost $76,880 · recommended price $124,000 · margin 38%",
    href: `${base}/lifecycle/proposals`,
  },
  marginPolicy: {
    id: "ev-margin-policy",
    kind: "system-record",
    label: "Workspace pricing policy",
    source: "Settings · margin floor 40%",
    capturedAtLabel: "Set 12 Aug",
    claim: "FACT",
    trust: "high",
    href: `${base}/settings`,
  },
  averyCapacity: {
    id: "ev-avery-capacity",
    kind: "calculation",
    label: "Capacity engine result",
    source: "Avery Brooks · week of 31 Aug",
    capturedAtLabel: "Today, 06:00",
    claim: "FACT",
    trust: "high",
    excerpt: "Committed 44 hours against 40 available — 110% utilisation",
    href: `${base}/team`,
  },
  northwindRedlines: {
    id: "ev-northwind-redlines",
    kind: "document",
    label: "Client redlines",
    source: "Northwind Bank · contract v2 markup",
    capturedAtLabel: "Yesterday, 17:40",
    claim: "FACT",
    trust: "high",
    excerpt: "Section 6 payment terms changed from Net 30 to Net 60.",
    href: `${base}/lifecycle/contracts`,
  },
  receivablesLedger: {
    id: "ev-receivables",
    kind: "system-record",
    label: "Receivables ledger",
    source: "5 open invoices",
    capturedAtLabel: "Today, 07:00",
    claim: "FACT",
    trust: "high",
    href: `${base}/lifecycle/reporting`,
  },
  vendorInvoice: {
    id: "ev-vendor-invoice",
    kind: "document",
    label: "Contractor invoice",
    source: "Motion studio · INV-8841",
    capturedAtLabel: "Yesterday, 16:20",
    claim: "FACT",
    trust: "high",
    excerpt: "34 hours billed for a second animation pass · $4,200",
    href: `${base}/lifecycle/projects`,
  },
  vendorPurchaseOrder: {
    id: "ev-vendor-po",
    kind: "system-record",
    label: "Approved purchase order",
    source: "Halcyon Energy · Rebrand · PO-114",
    capturedAtLabel: "12 Aug",
    claim: "FACT",
    trust: "high",
    excerpt: "Approved vendor budget $38,400",
    href: `${base}/lifecycle/projects`,
  },
} as const satisfies Record<string, EvidenceRef>;

const pipelineEvidence: EvidenceRef = {
  id: "ev-pipeline-rollup",
  kind: "calculation",
  label: "Weighted pipeline roll-up",
  source: "8 open opportunities × close probability",
  capturedAtLabel: "Today, 07:00",
  claim: "FACT",
  trust: "high",
  href: `${base}/opportunities`,
};

const deliveryEvidence: EvidenceRef = {
  id: "ev-delivery-value",
  kind: "system-record",
  label: "Executed contract values",
  source: "5 active projects",
  capturedAtLabel: "Today, 07:00",
  claim: "FACT",
  trust: "high",
  href: `${base}/lifecycle/projects`,
};

const forecastEvidence: EvidenceRef = {
  id: "ev-forecast",
  kind: "calculation",
  label: "Quarter forecast model",
  source: "Committed revenue + weighted close within 90 days",
  capturedAtLabel: "Today, 07:00",
  claim: "INFERENCE",
  trust: "medium",
  href: `${base}/lifecycle/reporting`,
};

const capacityEvidence: EvidenceRef = {
  id: "ev-capacity-week",
  kind: "calculation",
  label: "Team capacity engine",
  source: "8 resources · week of 31 Aug",
  capturedAtLabel: "Today, 06:00",
  claim: "FACT",
  trust: "high",
  href: `${base}/team`,
};

const riskEvidence: EvidenceRef = {
  id: "ev-at-risk",
  kind: "system-record",
  label: "Blocking and elevated delivery risks",
  source: "2 risks across 2 projects",
  capturedAtLabel: "Today, 06:30",
  claim: "FACT",
  trust: "high",
  href: `${base}/lifecycle/projects`,
};

const clientActionEvidence: EvidenceRef = {
  id: "ev-client-actions",
  kind: "system-record",
  label: "Outstanding client requests",
  source: "4 items awaiting a client response",
  capturedAtLabel: "Today, 07:00",
  claim: "FACT",
  trust: "high",
  href: `${base}/clients`,
};

const approvalEvidence: EvidenceRef = {
  id: "ev-approval-queue",
  kind: "system-record",
  label: "Founder approval queue",
  source: "3 decisions routed by workspace policy",
  capturedAtLabel: "Today, 08:12",
  claim: "FACT",
  trust: "high",
  href: `${base}/opportunities`,
};

export const missionViewer: MissionViewer = {
  person: MAYA,
  workspaceName: "Northstar Creative",
  workspaceSlug: NORTHSTAR_SLUG,
  permissions: [
    "opportunity.read",
    "opportunity.manage",
    "proposal.approve",
    "contract.approve",
    "project.manage",
    "finance.read",
    "organization.read",
    "organization.update_profile",
    "location.read",
    "location.manage",
    "registry.document.manage",
    "registry.tax.manage",
    "registry.signatory.manage",
    "registry.compliance.manage",
  ],
};

export const missionDecisions: readonly MissionDecision[] = [
  {
    id: "dec-meridian-margin",
    title: "Meridian Health proposal prices 2% under your margin floor",
    clientName: "Meridian Health",
    urgency: "critical",
    dueLabel: "Client expects it today",
    whatHappened:
      "Proposal v3 was rebuilt after Meridian added two wayfinding audits. The deterministic calculation returns a 38% margin against your 40% floor, so it stopped at your desk instead of going out.",
    whyItMatters:
      "It is the largest open proposal in the pipeline and the client has a board review on Thursday. Holding it past today pushes the decision a full week.",
    impacts: [
      {
        id: "imp-meridian-revenue",
        kind: "revenue",
        label: "Contract value",
        detail: "Largest open proposal this quarter",
        direction: "gain",
        amount: usd("12400000"),
      },
      {
        id: "imp-meridian-margin",
        kind: "margin",
        label: "Margin gap",
        detail: "38% margin against a 40% floor",
        direction: "loss",
        amount: usd("248000"),
      },
      {
        id: "imp-meridian-delivery",
        kind: "delivery",
        label: "Start date",
        detail: "Slips a week if this waits for the next board cycle",
        direction: "loss",
        deltaDays: 7,
      },
    ],
    evidence: [evidence.meridianPricing, evidence.marginPolicy],
    owner: JORDAN,
    recommendation: {
      summary: "Approve at 38% and recover the margin in the change order",
      rationale:
        "The gap is $2,480 on a $124,000 contract. The two added audits are already scoped as a change order, which restores the floor at signature.",
      confidenceBps: 8200,
      authority: {
        outcome: "ALLOW",
        reason: "Workspace policy routes proposal approval to the founder.",
        requiredPermission: "proposal.approve",
      },
    },
    actions: ["approve", "revise", "reject"],
    href: `${base}/lifecycle/proposals`,
  },
  {
    id: "dec-avery-overallocation",
    title: "Avery Brooks is committed 4 hours beyond capacity next week",
    clientName: "Vantage Logistics",
    urgency: "high",
    dueLabel: "Before Monday's plan publishes",
    whatHappened:
      "Vantage Brand Ops and Meridian Wayfinding both scheduled strategy work in the week of 31 August. The capacity engine puts Avery at 110% utilisation.",
    whyItMatters:
      "Avery is the only strategist assigned to both. Left alone, the Vantage milestone slips and the over-allocation moves onto the published plan.",
    impacts: [
      {
        id: "imp-avery-capacity",
        kind: "capacity",
        label: "Over-allocation",
        detail: "4 hours above a 40 hour week",
        direction: "loss",
        valueLabel: "+4 hours",
      },
      {
        id: "imp-avery-delivery",
        kind: "delivery",
        label: "Vantage milestone",
        detail: "Positioning review moves if nothing changes",
        direction: "loss",
        deltaDays: 4,
      },
      {
        id: "imp-avery-value",
        kind: "revenue",
        label: "Delivery value exposed",
        detail: "Vantage Brand Ops contract",
        direction: "loss",
        amount: usd("5200000"),
      },
    ],
    evidence: [evidence.averyCapacity],
    owner: JORDAN,
    recommendation: {
      summary: "Move the Vantage positioning review to Taylor Kim",
      rationale:
        "Taylor sits at 70% with matching strategy skills and has already run positioning for Kestrel. That brings Avery back to 90% without touching the milestone date.",
      confidenceBps: 7400,
      authority: {
        outcome: "ALLOW",
        reason: "You own resource plan changes before publication.",
        requiredPermission: "project.manage",
      },
    },
    actions: ["approve", "revise", "reject"],
    href: `${base}/team`,
  },
  {
    id: "dec-northwind-terms",
    title: "Northwind Bank returned contract redlines moving you to Net 60",
    clientName: "Northwind Bank",
    urgency: "high",
    dueLabel: "Redlines expire Friday",
    whatHappened:
      "Northwind's legal team accepted scope and fees but rewrote section 6, changing payment terms from Net 30 to Net 60 across the retainer.",
    whyItMatters:
      "This is the biggest contract in the pipeline and the terms change lands while $27,750 is already overdue elsewhere.",
    impacts: [
      {
        id: "imp-northwind-value",
        kind: "revenue",
        label: "Retainer value",
        detail: "Twelve month always-on retainer",
        direction: "gain",
        amount: usd("18000000"),
      },
      {
        id: "imp-northwind-cash",
        kind: "cash",
        label: "Cash delay",
        detail: "First two invoices land 30 days later",
        direction: "loss",
        amount: usd("2950000"),
        deltaDays: 30,
      },
    ],
    evidence: [evidence.northwindRedlines, evidence.receivablesLedger],
    owner: MAYA,
    recommendation: {
      summary: "Counter at Net 45 with a kickoff deposit",
      rationale:
        "A 25 percent deposit at kickoff covers the delay on the first two invoices, and Net 45 is inside the terms Northwind already accepted on the pilot.",
      confidenceBps: 6600,
      authority: {
        outcome: "REQUIRES_APPROVAL",
        reason:
          "Payment term changes above 30 days need a second approver under workspace policy.",
        requiredPermission: "contract.approve",
      },
    },
    actions: ["approve", "revise", "reject"],
    href: `${base}/lifecycle/contracts`,
  },
];

/**
 * Only the dense state carries this. It is a real fourth decision rather than a
 * copy of another, so the dense layout is stressed without the screen
 * contradicting itself.
 */
export const missionVendorDecision: MissionDecision = {
  id: "dec-halcyon-vendor",
  title:
    "A contractor invoice for Halcyon Energy is $4,200 over the approved budget",
  clientName: "Halcyon Energy · Rebrand",
  urgency: "normal",
  dueLabel: "Vendor payment run is Friday",
  whatHappened:
    "The motion studio billed 34 extra hours for a second animation pass that was agreed in a review call but never added to the purchase order.",
  whyItMatters:
    "Paying it as billed puts the Halcyon project over its vendor budget, and refusing it holds the final delivery that is already with the client.",
  impacts: [
    {
      id: "imp-halcyon-overage",
      kind: "margin",
      label: "Budget overage",
      detail: "$4,200 above the approved $38,400 purchase order",
      direction: "loss",
      amount: usd("420000"),
    },
    {
      id: "imp-halcyon-delay",
      kind: "delivery",
      label: "Delivery hold",
      detail: "Final animation stays unreleased while the invoice is open",
      direction: "loss",
      deltaDays: 2,
    },
  ],
  evidence: [evidence.vendorInvoice, evidence.vendorPurchaseOrder],
  owner: JORDAN,
  recommendation: {
    summary: "Pay the overage and bill it to Halcyon as approved scope",
    rationale:
      "The second pass is in the review recording and the Halcyon contract allows scope added in writing, so the cost is recoverable rather than absorbed.",
    confidenceBps: 7200,
    authority: {
      outcome: "REQUIRES_APPROVAL",
      reason:
        "Vendor spend above an approved purchase order needs founder sign-off.",
      requiredPermission: "finance.approve",
    },
  },
  actions: ["approve", "revise", "reject"],
  href: `${base}/lifecycle/projects`,
};

const NUMBER_WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
] as const;

/**
 * The answer, the exposure figure and the receipt all describe the same list,
 * so derive them from it. The dense state adds a decision and previously left
 * the headline claiming three.
 */
export function decisionHeadline(
  decisions: readonly MissionDecision[],
  because: string,
): MissionHeadline {
  const exposure = decisions.reduce((total, decision) => {
    const largest = decision.impacts.reduce(
      (max, impact) =>
        impact.amount && BigInt(impact.amount.minor) > max
          ? BigInt(impact.amount.minor)
          : max,
      0n,
    );
    return total + largest;
  }, 0n);

  const count = decisions.length;
  const word = NUMBER_WORDS[count] ?? String(count);

  return {
    answer: `${count} decision${count === 1 ? "" : "s"} need you`,
    because,
    impactLabel: `Combined exposure across the ${word} decisions`,
    impactAmount: usd(exposure.toString()),
    evidence: {
      ...approvalEvidence,
      source: `${count} decisions routed by workspace policy`,
    },
  };
}

export const missionMetrics: readonly MissionMetric[] = [
  {
    id: "met-weighted-pipeline",
    label: "Weighted pipeline",
    value: usd("40487500"),
    caption: "8 open opportunities · $689K unweighted",
    tone: "positive",
    deltaLabel: "+12.4% vs last month",
    deltaDirection: "gain",
    trend: [318, 332, 341, 336, 358, 364, 372, 369, 385, 391, 398, 405],
    evidence: pipelineEvidence,
    href: `${base}/opportunities`,
  },
  {
    id: "met-forecast",
    label: "Forecast revenue",
    value: usd("31240000"),
    caption: "Committed plus weighted close inside 90 days",
    tone: "positive",
    deltaLabel: "+4.1% vs last quarter",
    deltaDirection: "gain",
    trend: [268, 271, 279, 284, 288, 292, 296, 299, 303, 306, 309, 312],
    evidence: forecastEvidence,
    href: `${base}/lifecycle/reporting`,
  },
  {
    id: "met-delivery-value",
    label: "Active delivery",
    value: usd("34750000"),
    caption: "5 projects in flight",
    tone: "neutral",
    deltaLabel: "Unchanged this week",
    deltaDirection: "neutral",
    trend: [312, 312, 318, 326, 331, 331, 338, 342, 347, 347, 347, 347],
    evidence: deliveryEvidence,
    href: `${base}/lifecycle/projects`,
  },
  {
    id: "met-receivables",
    label: "Receivables",
    value: usd("11575000"),
    caption: "$27,750 overdue across 2 invoices",
    tone: "caution",
    deltaLabel: "$27,750 overdue",
    deltaDirection: "loss",
    trend: [92, 96, 101, 98, 104, 109, 112, 108, 114, 118, 116, 115],
    evidence: evidence.receivablesLedger,
    href: `${base}/lifecycle/reporting`,
  },
  {
    id: "met-at-risk",
    label: "At-risk work",
    value: usd("11600000"),
    caption: "2 projects carrying blocking or elevated risk",
    tone: "critical",
    deltaLabel: "+1 risk this week",
    deltaDirection: "loss",
    trend: [40, 40, 52, 52, 52, 64, 64, 64, 96, 96, 116, 116],
    evidence: riskEvidence,
    href: `${base}/lifecycle/projects`,
  },
  {
    id: "met-capacity",
    label: "Available capacity",
    value: { count: 63 },
    caption: "Hours unassigned this week · team at 80%",
    tone: "caution",
    deltaLabel: "2 people over-allocated",
    deltaDirection: "loss",
    trend: [118, 112, 104, 96, 91, 84, 79, 74, 71, 68, 65, 63],
    evidence: capacityEvidence,
    href: `${base}/team`,
  },
  {
    id: "met-client-actions",
    label: "Client actions",
    value: { count: 4 },
    caption: "Longest wait is 9 days",
    tone: "caution",
    deltaLabel: "+2 since Monday",
    deltaDirection: "loss",
    trend: [1, 1, 2, 2, 2, 3, 3, 2, 3, 4, 4, 4],
    evidence: clientActionEvidence,
    href: `${base}/clients`,
  },
  {
    id: "met-approvals",
    label: "Approval queue",
    value: { count: 3 },
    caption: "All three routed to you by policy",
    tone: "critical",
    deltaLabel: "1 critical",
    deltaDirection: "loss",
    trend: [0, 1, 1, 2, 1, 1, 2, 2, 2, 3, 3, 3],
    evidence: approvalEvidence,
    href: `${base}/opportunities`,
  },
];

export const missionPipelineStages: readonly PipelineStageSignal[] = [
  {
    id: "discovery",
    label: "Discovery",
    count: 2,
    value: usd("10000000"),
    href: `${base}/opportunities`,
  },
  {
    id: "brief",
    label: "Brief",
    count: 2,
    value: usd("13250000"),
    href: `${base}/opportunities`,
  },
  {
    id: "proposal",
    label: "Proposal",
    count: 2,
    value: usd("30400000"),
    href: `${base}/lifecycle/proposals`,
  },
  {
    id: "contract",
    label: "Contract",
    count: 2,
    value: usd("15250000"),
    href: `${base}/lifecycle/contracts`,
  },
];

export const missionOpportunities: readonly MissionOpportunity[] = [
  {
    id: "ns-opp-acme-brand",
    name: "Q4 Product Launch Campaign",
    clientName: "Acme Robotics",
    stageId: "contract",
    stageLabel: "Contract executed",
    value: usd("8500000"),
    weightedValue: usd("8075000"),
    probabilityBps: 9500,
    closeLabel: "Closed 28 Aug",
    owner: MAYA,
    tone: "positive",
    href: `${base}/opportunities/ns-opp-acme-brand`,
  },
  {
    id: "ns-opp-meridian",
    name: "Brand System Refresh",
    clientName: "Meridian Health",
    stageId: "proposal",
    stageLabel: "Awaiting your approval",
    value: usd("12400000"),
    weightedValue: usd("8060000"),
    probabilityBps: 6500,
    closeLabel: "Board review Thursday",
    owner: JORDAN,
    tone: "critical",
    href: `${base}/lifecycle/proposals`,
  },
  {
    id: "ns-opp-northwind",
    name: "Always-On Campaign Retainer",
    clientName: "Northwind Bank",
    stageId: "contract",
    stageLabel: "Client redlines returned",
    value: usd("18000000"),
    weightedValue: usd("8100000"),
    probabilityBps: 4500,
    closeLabel: "Redlines expire Friday",
    owner: MAYA,
    tone: "caution",
    href: `${base}/lifecycle/contracts`,
  },
  {
    id: "ns-opp-vantage",
    name: "Rebrand and Website",
    clientName: "Vantage Logistics",
    stageId: "brief",
    stageLabel: "Brief in founder review",
    value: usd("9650000"),
    weightedValue: usd("5307500"),
    probabilityBps: 5500,
    closeLabel: "Target close 18 Sep",
    owner: AVERY,
    tone: "neutral",
    href: `${base}/opportunities`,
  },
  {
    id: "ns-opp-halcyon",
    name: "Sustainability Report",
    clientName: "Halcyon Energy",
    stageId: "contract",
    stageLabel: "Contract sent",
    value: usd("6750000"),
    weightedValue: usd("6075000"),
    probabilityBps: 9000,
    closeLabel: "Signature expected 5 Sep",
    owner: JORDAN,
    tone: "positive",
    href: `${base}/lifecycle/contracts`,
  },
  {
    id: "ns-opp-lumen",
    name: "Launch Film",
    clientName: "Lumen Studios",
    stageId: "discovery",
    stageLabel: "Awaiting creative feedback",
    value: usd("5800000"),
    weightedValue: usd("1450000"),
    probabilityBps: 2500,
    closeLabel: "Target close 30 Sep",
    owner: SAM,
    tone: "caution",
    href: `${base}/opportunities`,
  },
  {
    id: "ns-opp-kestrel",
    name: "Packaging Identity",
    clientName: "Kestrel Foods",
    stageId: "discovery",
    stageLabel: "Questionnaire outstanding",
    value: usd("4200000"),
    weightedValue: usd("1260000"),
    probabilityBps: 3000,
    closeLabel: "Stalled 9 days",
    owner: AVERY,
    tone: "caution",
    href: `${base}/opportunities`,
  },
  {
    id: "ns-opp-orbit",
    name: "Positioning Sprint",
    clientName: "Orbit Labs",
    stageId: "brief",
    stageLabel: "Brief approved",
    value: usd("3600000"),
    weightedValue: usd("2160000"),
    probabilityBps: 6000,
    closeLabel: "Proposal due 8 Sep",
    owner: AVERY,
    tone: "positive",
    href: `${base}/opportunities`,
  },
];

export const missionProjects: readonly MissionProject[] = [
  {
    id: "ns-project-acme",
    name: "Q4 Product Launch",
    clientName: "Acme Robotics",
    statusLabel: "Active",
    healthTone: "positive",
    progressBps: 6200,
    contractValue: usd("8500000"),
    nextMilestone: "Creative concept review",
    dueLabel: "Due in 3 days",
    leadName: "Sam Rivera",
    href: `${base}/lifecycle/projects`,
  },
  {
    id: "ns-project-meridian",
    name: "Wayfinding System",
    clientName: "Meridian Health",
    statusLabel: "Active · blocked",
    healthTone: "critical",
    progressBps: 4100,
    contractValue: usd("6400000"),
    nextMilestone: "Accessibility legal review",
    dueLabel: "Overdue by 2 days",
    leadName: "Avery Brooks",
    href: `${base}/lifecycle/projects`,
  },
  {
    id: "ns-project-vantage",
    name: "Brand Ops Rollout",
    clientName: "Vantage Logistics",
    statusLabel: "Active · at risk",
    healthTone: "caution",
    progressBps: 3400,
    contractValue: usd("5200000"),
    nextMilestone: "Positioning review",
    dueLabel: "Due in 6 days",
    leadName: "Avery Brooks",
    href: `${base}/lifecycle/projects`,
  },
  {
    id: "ns-project-northwind",
    name: "Always-On Programme",
    clientName: "Northwind Bank",
    statusLabel: "Published",
    healthTone: "neutral",
    progressBps: 1200,
    contractValue: usd("11800000"),
    nextMilestone: "Kickoff workshop",
    dueLabel: "Starts 8 Sep",
    leadName: "Jordan Ellis",
    href: `${base}/lifecycle/projects`,
  },
  {
    id: "ns-project-kestrel",
    name: "Seasonal Campaign",
    clientName: "Kestrel Foods",
    statusLabel: "Active",
    healthTone: "positive",
    progressBps: 7800,
    contractValue: usd("2850000"),
    nextMilestone: "Final artwork handoff",
    dueLabel: "Due in 9 days",
    leadName: "Taylor Kim",
    href: `${base}/lifecycle/projects`,
  },
];

export const missionRisks: readonly DeliveryRisk[] = [
  {
    id: "risk-meridian-legal",
    projectName: "Meridian Health · Wayfinding System",
    statement:
      "Accessibility claims need legal sign-off before the system ships, and no review is scheduled.",
    severity: "blocking",
    impactLabel: "Blocks handoff · $64,000 exposed",
    ownerName: "Avery Brooks",
    evidence: {
      id: "ev-meridian-risk",
      kind: "system-record",
      label: "Blocking risk on project record",
      source: "Meridian Wayfinding · risk register",
      capturedAtLabel: "Raised 29 Aug",
      claim: "FACT",
      trust: "high",
      href: `${base}/lifecycle/projects`,
    },
    href: `${base}/lifecycle/projects`,
  },
  {
    id: "risk-vantage-capacity",
    projectName: "Vantage Logistics · Brand Ops Rollout",
    statement:
      "The only assigned strategist is over-allocated in the same week as the positioning review.",
    severity: "elevated",
    impactLabel: "4 day slip · $52,000 exposed",
    ownerName: "Jordan Ellis",
    evidence: evidence.averyCapacity,
    href: `${base}/team`,
  },
];

export const missionClientActions: readonly ClientAction[] = [
  {
    id: "act-kestrel-questionnaire",
    clientName: "Kestrel Foods",
    request: "Discovery questionnaire not submitted",
    waitingLabel: "Waiting 9 days",
    waitingOn: "client",
    value: usd("4200000"),
    tone: "critical",
    href: `${base}/opportunities`,
  },
  {
    id: "act-meridian-signature",
    clientName: "Meridian Health",
    request: "Proposal awaiting signature",
    waitingLabel: "Waiting 4 days",
    waitingOn: "client",
    value: usd("12400000"),
    tone: "caution",
    href: `${base}/lifecycle/proposals`,
  },
  {
    id: "act-lumen-feedback",
    clientName: "Lumen Studios",
    request: "Creative feedback on three concepts",
    waitingLabel: "Waiting 3 days",
    waitingOn: "client",
    value: usd("5800000"),
    tone: "caution",
    href: `${base}/opportunities`,
  },
  {
    id: "act-northwind-redlines",
    clientName: "Northwind Bank",
    request: "Contract redlines returned for your response",
    waitingLabel: "Waiting 2 days",
    waitingOn: "agency",
    value: usd("18000000"),
    tone: "neutral",
    href: `${base}/lifecycle/contracts`,
  },
];

export const missionInvoices: readonly InvoiceSignal[] = [
  {
    id: "inv-2041",
    clientName: "Vantage Logistics",
    reference: "INV-2041",
    amount: usd("1850000"),
    state: "overdue",
    dueLabel: "34 days overdue",
    ageDays: 34,
    href: `${base}/lifecycle/reporting`,
  },
  {
    id: "inv-2038",
    clientName: "Kestrel Foods",
    reference: "INV-2038",
    amount: usd("925000"),
    state: "overdue",
    dueLabel: "12 days overdue",
    ageDays: 12,
    href: `${base}/lifecycle/reporting`,
  },
  {
    id: "inv-2049",
    clientName: "Meridian Health",
    reference: "INV-2049",
    amount: usd("1600000"),
    state: "due",
    dueLabel: "Due in 3 days",
    ageDays: 0,
    href: `${base}/lifecycle/reporting`,
  },
  {
    id: "inv-2052",
    clientName: "Acme Robotics",
    reference: "INV-2052",
    amount: usd("4250000"),
    state: "due",
    dueLabel: "Due in 6 days",
    ageDays: 0,
    href: `${base}/lifecycle/reporting`,
  },
  {
    id: "inv-2055",
    clientName: "Northwind Bank",
    reference: "INV-2055",
    amount: usd("2950000"),
    state: "scheduled",
    dueLabel: "Scheduled 21 Sep",
    ageDays: 0,
    href: `${base}/lifecycle/reporting`,
  },
];

export const missionCapacity: readonly CapacityRow[] = [
  {
    id: "cap-avery",
    personName: "Avery Brooks",
    roleLabel: "Brand strategist",
    allocatedMinutes: 2640,
    availableMinutes: 2400,
    utilizationBps: 11000,
    tone: "critical",
    noteLabel: "4 hours over — two projects overlap",
  },
  {
    id: "cap-sam",
    personName: "Sam Rivera",
    roleLabel: "Designer",
    allocatedMinutes: 2520,
    availableMinutes: 2400,
    utilizationBps: 10500,
    tone: "critical",
    noteLabel: "2 hours over — Acme concept review",
  },
  {
    id: "cap-jordan",
    personName: "Jordan Ellis",
    roleLabel: "Operations lead",
    allocatedMinutes: 2280,
    availableMinutes: 2400,
    utilizationBps: 9500,
    tone: "caution",
    noteLabel: "No slack for the Northwind kickoff",
  },
  {
    id: "cap-riley",
    personName: "Riley Morgan",
    roleLabel: "Developer",
    allocatedMinutes: 2160,
    availableMinutes: 2400,
    utilizationBps: 9000,
    tone: "caution",
    noteLabel: "4 hours free this week",
  },
  {
    id: "cap-maya",
    personName: "Maya Chen",
    roleLabel: "Founder",
    allocatedMinutes: 1980,
    availableMinutes: 2400,
    utilizationBps: 8250,
    tone: "neutral",
    noteLabel: "7 hours reserved for approvals",
  },
  {
    id: "cap-taylor",
    personName: "Taylor Kim",
    roleLabel: "Copywriter",
    allocatedMinutes: 1680,
    availableMinutes: 2400,
    utilizationBps: 7000,
    tone: "positive",
    noteLabel: "12 hours free — can absorb strategy work",
  },
  {
    id: "cap-chris",
    personName: "Chris Park",
    roleLabel: "Paid media",
    allocatedMinutes: 1200,
    availableMinutes: 2400,
    utilizationBps: 5000,
    tone: "positive",
    noteLabel: "Ramps when Northwind starts",
  },
  {
    id: "cap-alex",
    personName: "Alex Vendor",
    roleLabel: "Contractor · developer",
    allocatedMinutes: 960,
    availableMinutes: 2400,
    utilizationBps: 4000,
    tone: "positive",
    noteLabel: "Available on demand",
  },
];

export const missionActivity: readonly ActivityEvent[] = [
  {
    id: "evt-meridian-proposal",
    timeLabel: "08:12",
    actorName: "Jordan Ellis",
    summary: "Rebuilt Meridian Health proposal v3 after two audits were added",
    category: "approval",
    tone: "critical",
    evidence: evidence.meridianPricing,
    href: `${base}/lifecycle/proposals`,
  },
  {
    id: "evt-capacity-run",
    timeLabel: "06:00",
    actorName: "Capacity engine",
    summary: "Flagged Avery Brooks and Sam Rivera above 100% capacity for next week",
    category: "capacity",
    tone: "caution",
    evidence: capacityEvidence,
    href: `${base}/team`,
  },
  {
    id: "evt-northwind-redlines",
    timeLabel: "Yesterday 17:40",
    actorName: "Northwind Bank",
    summary: "Returned contract redlines changing payment terms to Net 60",
    category: "client",
    tone: "caution",
    evidence: evidence.northwindRedlines,
    href: `${base}/lifecycle/contracts`,
  },
  {
    id: "evt-orbit-brief",
    timeLabel: "Yesterday 15:05",
    actorName: "Maya Chen",
    summary: "Approved the Orbit Labs positioning brief",
    category: "approval",
    tone: "positive",
    href: `${base}/opportunities`,
  },
  {
    id: "evt-halcyon-contract",
    timeLabel: "Yesterday 11:20",
    actorName: "Jordan Ellis",
    summary: "Sent the Halcyon Energy contract for signature",
    category: "delivery",
    tone: "positive",
    href: `${base}/lifecycle/contracts`,
  },
  {
    id: "evt-lumen-discovery",
    timeLabel: "29 Aug 16:30",
    actorName: "Discovery extraction",
    summary: "Extracted 9 facts from the Lumen Studios kickoff call",
    category: "discovery",
    tone: "neutral",
    evidence: {
      id: "ev-lumen-extraction",
      kind: "document",
      label: "Kickoff call transcript",
      source: "Lumen Studios · 29 Aug",
      capturedAtLabel: "29 Aug 16:30",
      claim: "FACT",
      trust: "medium",
      excerpt: "9 candidate facts · 7 verified by Avery Brooks",
      href: `${base}/opportunities`,
    },
    href: `${base}/opportunities`,
  },
  {
    id: "evt-vantage-invoice",
    timeLabel: "29 Aug 09:00",
    actorName: "Receivables",
    summary: "Vantage Logistics INV-2041 passed 30 days overdue",
    category: "finance",
    tone: "critical",
    evidence: evidence.receivablesLedger,
    href: `${base}/lifecycle/reporting`,
  },
  {
    id: "evt-meridian-risk",
    timeLabel: "29 Aug 08:15",
    actorName: "Avery Brooks",
    summary: "Raised a blocking legal review risk on Meridian Wayfinding",
    category: "delivery",
    tone: "critical",
    href: `${base}/lifecycle/projects`,
  },
  {
    id: "evt-acme-milestone",
    timeLabel: "28 Aug 14:45",
    actorName: "Sam Rivera",
    summary: "Completed the Acme Robotics identity milestone",
    category: "delivery",
    tone: "positive",
    href: `${base}/lifecycle/projects`,
  },
  {
    id: "evt-acme-executed",
    timeLabel: "28 Aug 10:00",
    actorName: "Maya Chen",
    summary: "Executed the Acme Robotics Q4 launch contract",
    category: "approval",
    tone: "positive",
    href: `${base}/lifecycle/contracts`,
  },
];

export const missionPulse: readonly PulsePoint[] = [
  {
    id: "pulse-1",
    label: "Mon",
    dateLabel: "25 Aug",
    pipelineValue: usd("36900000"),
    deliveryValue: usd("31200000"),
    eventCount: 6,
  },
  {
    id: "pulse-2",
    label: "Tue",
    dateLabel: "26 Aug",
    pipelineValue: usd("37400000"),
    deliveryValue: usd("31200000"),
    eventCount: 9,
  },
  {
    id: "pulse-3",
    label: "Wed",
    dateLabel: "27 Aug",
    pipelineValue: usd("38200000"),
    deliveryValue: usd("31800000"),
    eventCount: 7,
    note: "Halcyon contract drafted",
  },
  {
    id: "pulse-4",
    label: "Thu",
    dateLabel: "28 Aug",
    pipelineValue: usd("39100000"),
    deliveryValue: usd("34750000"),
    eventCount: 12,
    note: "Acme contract executed",
  },
  {
    id: "pulse-5",
    label: "Fri",
    dateLabel: "29 Aug",
    pipelineValue: usd("39600000"),
    deliveryValue: usd("34750000"),
    eventCount: 11,
    note: "Meridian legal risk raised",
  },
  {
    id: "pulse-6",
    label: "Mon",
    dateLabel: "1 Sep",
    pipelineValue: usd("40100000"),
    deliveryValue: usd("34750000"),
    eventCount: 8,
  },
  {
    id: "pulse-7",
    label: "Today",
    dateLabel: "2 Sep",
    pipelineValue: usd("40487500"),
    deliveryValue: usd("34750000"),
    eventCount: 5,
    note: "3 decisions opened",
  },
];

export const missionNotifications: readonly MissionNotification[] = [
  {
    id: "note-meridian",
    summary: "Meridian Health proposal stopped below your margin floor",
    timeLabel: "08:12",
    tone: "critical",
  },
  {
    id: "note-capacity",
    summary: "Two people are over-allocated next week",
    timeLabel: "06:00",
    tone: "caution",
  },
  {
    id: "note-northwind",
    summary: "Northwind Bank returned contract redlines",
    timeLabel: "Yesterday",
    tone: "caution",
  },
];

export const missionAskFlow: AskFlowContext = {
  workspaceLabel: "Northstar Creative",
  scopeLabel: "8 opportunities · 5 projects · 8 people",
  tools: [
    { id: "pipeline", label: "Pipeline" },
    { id: "delivery", label: "Delivery" },
    { id: "finance", label: "Receivables" },
    { id: "capacity", label: "Capacity" },
  ],
  authority: {
    outcome: "REQUIRES_APPROVAL",
    reason: "Ask Flow drafts and explains. Changes still route through you.",
    requiredPermission: "opportunity.manage",
  },
  suggestions: [
    {
      id: "ask-exposure",
      prompt: `Why is ${formatMoney(decisionHeadline(missionDecisions, "").impactAmount!)} exposed?`,
      category: "pipeline",
      answerPreview: `${missionDecisions.length} open decisions hold it: ${joinReadable(
        missionDecisions.map((row) => row.clientName),
      )}.`,
      evidence: approvalEvidence,
    },
    {
      id: "ask-approvals",
      prompt: "What needs my approval?",
      category: "pipeline",
      answerPreview:
        "The Meridian proposal at 38% margin, moving Avery's review to Taylor Kim, and the Net 45 counter to Northwind.",
      evidence: approvalEvidence,
    },
    {
      id: "ask-margin",
      prompt: "Why is the Meridian proposal below our margin floor?",
      category: "pipeline",
      answerPreview:
        "Two wayfinding audits added $12,400 of delivery cost after pricing was locked.",
      evidence: evidence.meridianPricing,
    },
    {
      id: "ask-capacity",
      prompt: "Who can take the Vantage positioning review?",
      category: "capacity",
      answerPreview:
        "Taylor Kim at 70% has matching skills and 12 free hours.",
      evidence: capacityEvidence,
    },
    {
      id: "ask-cash",
      prompt: "What happens to cash if Northwind moves to Net 60?",
      category: "finance",
      answerPreview:
        "The first two invoices, $29,500, land 30 days later against $27,750 already overdue.",
      evidence: evidence.receivablesLedger,
    },
    {
      id: "ask-risk",
      prompt: "Which delivery work is most exposed right now?",
      category: "delivery",
      answerPreview:
        "Meridian Wayfinding is blocked on legal review with $64,000 exposed.",
      evidence: riskEvidence,
    },
  ],
};

export const missionControlSeed: MissionControlData = {
  generatedAtLabel: "Today, 08:12",
  currency: MISSION_CURRENCY,
  viewer: missionViewer,
  headline: decisionHeadline(
    missionDecisions,
    "A proposal is held below your margin floor, a strategist is booked past capacity, and a client rewrote your payment terms. Nothing downstream moves until you clear them.",
  ),
  decisions: missionDecisions,
  metrics: missionMetrics,
  pipelineStages: missionPipelineStages,
  opportunities: missionOpportunities,
  projects: missionProjects,
  risks: missionRisks,
  clientActions: missionClientActions,
  invoices: missionInvoices,
  capacity: missionCapacity,
  activity: missionActivity,
  pulse: missionPulse,
  notifications: missionNotifications,
  askFlow: missionAskFlow,
};
