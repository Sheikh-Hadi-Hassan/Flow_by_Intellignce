/**
 * Six-month daily operating history for the Mission Control canvas.
 *
 * Every daily value is produced by replaying dated events against the entities
 * already in the MC-01 seed: opportunity probability steps, project progress
 * checkpoints, invoice issue and payment dates, fortnightly forecast and
 * capacity engine runs, and decision open/close events. Nothing is interpolated
 * and nothing is random — a stable fortnight simply holds its value.
 *
 * Where the seed lacked dated history (it described only the current state),
 * the history below enriches it: each current entity gets the timeline that
 * leads to its present value, and a handful of completed entities (won and lost
 * opportunities, finished projects, paid invoices, closed decisions) provide
 * the past. All current headline totals are preserved by construction, because
 * the final step of every timeline IS the seed value — `history.test.ts`
 * asserts that reconciliation against the seed itself.
 *
 * Units follow the Flow convention: money in integer minor units, time in
 * minutes internally and hours for display.
 */

import {
  missionCapacity,
  missionControlSeed,
  missionInvoices,
  missionMetrics,
  missionOpportunities,
  missionProjects,
} from "./seed";
import type { MissionMetric } from "./types";

export const HISTORY_AS_OF = "2026-09-02";
export const HISTORY_DAYS = 168;

/* ── Date helpers (UTC throughout so replay is machine-independent) ── */

const DAY_MS = 86_400_000;

function toUtc(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  return Date.UTC(y!, m! - 1, d!);
}

function fromUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(isoDate: string, days: number): string {
  return fromUtc(toUtc(isoDate) + days * DAY_MS);
}

function isWeekend(isoDate: string): boolean {
  const day = new Date(toUtc(isoDate)).getUTCDay();
  return day === 0 || day === 6;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

export function dayLabel(isoDate: string): string {
  const date = new Date(toUtc(isoDate));
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
}

export const HISTORY_START = addDays(HISTORY_AS_OF, -(HISTORY_DAYS - 1));

/** Weekdays in the half-open interval (after, upto]. */
function weekdaysBetween(after: string, upto: string): readonly string[] {
  const days: string[] = [];
  for (let ms = toUtc(after) + DAY_MS; ms <= toUtc(upto); ms += DAY_MS) {
    const date = fromUtc(ms);
    if (!isWeekend(date)) days.push(date);
  }
  return days;
}

/* ── Authored event history ─────────────────────────────────────────
 *
 * Timelines for entities that exist in the seed reference the seed IDs, and
 * their final step must equal the seed's current value — that invariant is
 * what makes the replay reconcile, and it is what the tests pin.
 */

interface OpportunityTimeline {
  /** Seed opportunity id, or an `hist-` id for a closed enrichment record. */
  readonly id: string;
  readonly name: string;
  readonly valueMinor: number;
  readonly steps: readonly {
    readonly date: string;
    readonly probBps: number;
    readonly note: string;
  }[];
}

const seedValue = (id: string): number => {
  const opp = missionOpportunities.find((o) => o.id === id)!;
  return Number(BigInt(opp.value.minor));
};

/**
 * Probability journeys for the eight open opportunities, ending at the exact
 * probability the seed holds today, plus three that closed during the window.
 * A step of 0 bps means the opportunity left the pipeline (won and converted,
 * or lost).
 */
const OPPORTUNITY_TIMELINES: readonly OpportunityTimeline[] = [
  {
    id: "ns-opp-acme-brand",
    name: "Acme Robotics · Q4 Product Launch Campaign",
    valueMinor: seedValue("ns-opp-acme-brand"),
    steps: [
      { date: "2026-05-12", probBps: 3000, note: "Opportunity opened after the Acme referral call" },
      { date: "2026-06-02", probBps: 4500, note: "Brief approved by Acme marketing" },
      { date: "2026-06-30", probBps: 6500, note: "Proposal sent" },
      { date: "2026-08-04", probBps: 8500, note: "Verbal commitment on scope and price" },
      { date: "2026-08-28", probBps: 9500, note: "Contract executed" },
    ],
  },
  {
    id: "ns-opp-meridian",
    name: "Meridian Health · Brand System Refresh",
    valueMinor: seedValue("ns-opp-meridian"),
    steps: [
      { date: "2026-06-16", probBps: 2500, note: "Discovery opened" },
      { date: "2026-07-07", probBps: 4000, note: "Brief agreed" },
      { date: "2026-08-11", probBps: 6000, note: "Proposal v1 delivered" },
      { date: "2026-08-29", probBps: 6500, note: "Proposal v3 rebuilt with two audits" },
    ],
  },
  {
    id: "ns-opp-northwind",
    name: "Northwind Bank · Always-On Campaign Retainer",
    valueMinor: seedValue("ns-opp-northwind"),
    steps: [
      { date: "2026-04-21", probBps: 2000, note: "Retainer conversation opened after the pilot" },
      { date: "2026-05-19", probBps: 3000, note: "Pilot results reviewed with Northwind" },
      { date: "2026-07-14", probBps: 4500, note: "Retainer proposal delivered" },
    ],
  },
  {
    id: "ns-opp-vantage",
    name: "Vantage Logistics · Rebrand and Website",
    valueMinor: seedValue("ns-opp-vantage"),
    steps: [
      { date: "2026-07-21", probBps: 3000, note: "Rebrand scope opened" },
      { date: "2026-08-18", probBps: 5000, note: "Stakeholder workshop completed" },
      { date: "2026-08-31", probBps: 5500, note: "Brief moved to founder review" },
    ],
  },
  {
    id: "ns-opp-halcyon",
    name: "Halcyon Energy · Sustainability Report",
    valueMinor: seedValue("ns-opp-halcyon"),
    steps: [
      { date: "2026-05-26", probBps: 3000, note: "Report scope opened" },
      { date: "2026-06-23", probBps: 5000, note: "Content plan agreed" },
      { date: "2026-07-21", probBps: 8000, note: "Proposal accepted, contract drafting" },
      { date: "2026-09-01", probBps: 9000, note: "Contract sent for signature" },
    ],
  },
  {
    id: "ns-opp-lumen",
    name: "Lumen Studios · Launch Film",
    valueMinor: seedValue("ns-opp-lumen"),
    steps: [
      { date: "2026-08-20", probBps: 2000, note: "Kickoff call scheduled" },
      { date: "2026-08-29", probBps: 2500, note: "Nine facts extracted from the kickoff call" },
    ],
  },
  {
    id: "ns-opp-kestrel",
    name: "Kestrel Foods · Packaging Identity",
    valueMinor: seedValue("ns-opp-kestrel"),
    steps: [
      { date: "2026-08-12", probBps: 3000, note: "Discovery questionnaire issued" },
    ],
  },
  {
    id: "ns-opp-orbit",
    name: "Orbit Labs · Positioning Sprint",
    valueMinor: seedValue("ns-opp-orbit"),
    steps: [
      { date: "2026-08-04", probBps: 4000, note: "Sprint scoped with Orbit founders" },
      { date: "2026-09-01", probBps: 6000, note: "Positioning brief approved" },
    ],
  },
  // Closed during the window — the past the current pipeline grew out of.
  {
    id: "hist-opp-solstice",
    name: "Solstice Media · Content System",
    valueMinor: 5400000,
    steps: [
      { date: "2026-03-24", probBps: 3000, note: "Content system scope opened" },
      { date: "2026-04-14", probBps: 5500, note: "Brief approved" },
      { date: "2026-05-05", probBps: 8000, note: "Proposal accepted" },
      { date: "2026-05-26", probBps: 0, note: "Won — converted to the Solstice project" },
    ],
  },
  {
    id: "hist-opp-atlas",
    name: "Atlas Ventures · Fund Identity",
    valueMinor: 3800000,
    steps: [
      { date: "2026-04-07", probBps: 3000, note: "Identity scope opened" },
      { date: "2026-05-12", probBps: 4500, note: "Proposal delivered" },
      { date: "2026-06-09", probBps: 0, note: "Lost to an in-house team" },
    ],
  },
  {
    id: "hist-opp-corvid",
    name: "Corvid Coffee · Retail Packaging",
    valueMinor: 2700000,
    steps: [
      { date: "2026-03-31", probBps: 2500, note: "Packaging scope opened" },
      { date: "2026-04-28", probBps: 0, note: "Won — converted to the Corvid project" },
    ],
  },
];

interface ProjectTimeline {
  readonly id: string;
  readonly name: string;
  readonly valueMinor: number;
  readonly started: string;
  readonly startNote: string;
  /** Progress checkpoints; for live projects the last one is dated as-of and
   * must equal the seed's progressBps. */
  readonly checkpoints: readonly { readonly date: string; readonly progressBps: number }[];
  readonly completed?: string;
}

const seedProjectValue = (id: string): number => {
  const project = missionProjects.find((p) => p.id === id)!;
  return Number(BigInt(project.contractValue.minor));
};

const seedProgress = (id: string): number =>
  missionProjects.find((p) => p.id === id)!.progressBps;

const PROJECT_TIMELINES: readonly ProjectTimeline[] = [
  {
    id: "ns-project-acme",
    name: "Acme Robotics · Q4 Product Launch",
    valueMinor: seedProjectValue("ns-project-acme"),
    started: "2026-06-15",
    startNote: "Q4 launch work started under letter of intent",
    checkpoints: [
      { date: "2026-07-13", progressBps: 2200 },
      { date: "2026-08-10", progressBps: 4400 },
      { date: "2026-08-28", progressBps: 6000 },
      { date: HISTORY_AS_OF, progressBps: seedProgress("ns-project-acme") },
    ],
  },
  {
    id: "ns-project-meridian",
    name: "Meridian Health · Wayfinding System",
    valueMinor: seedProjectValue("ns-project-meridian"),
    started: "2026-06-01",
    startNote: "Wayfinding system delivery started",
    checkpoints: [
      { date: "2026-07-01", progressBps: 1600 },
      { date: "2026-08-03", progressBps: 3200 },
      { date: HISTORY_AS_OF, progressBps: seedProgress("ns-project-meridian") },
    ],
  },
  {
    id: "ns-project-vantage",
    name: "Vantage Logistics · Brand Ops Rollout",
    valueMinor: seedProjectValue("ns-project-vantage"),
    started: "2026-07-13",
    startNote: "Brand ops rollout started",
    checkpoints: [
      { date: "2026-08-10", progressBps: 2100 },
      { date: HISTORY_AS_OF, progressBps: seedProgress("ns-project-vantage") },
    ],
  },
  {
    id: "ns-project-northwind",
    name: "Northwind Bank · Always-On Programme",
    valueMinor: seedProjectValue("ns-project-northwind"),
    started: "2026-08-28",
    startNote: "Always-on programme published, kickoff 8 Sep",
    checkpoints: [
      { date: HISTORY_AS_OF, progressBps: seedProgress("ns-project-northwind") },
    ],
  },
  {
    id: "ns-project-kestrel",
    name: "Kestrel Foods · Seasonal Campaign",
    valueMinor: seedProjectValue("ns-project-kestrel"),
    started: "2026-07-06",
    startNote: "Seasonal campaign delivery started",
    checkpoints: [
      { date: "2026-08-03", progressBps: 4600 },
      { date: HISTORY_AS_OF, progressBps: seedProgress("ns-project-kestrel") },
    ],
  },
  // Completed during the window.
  {
    id: "hist-project-harbor",
    name: "Harbor & Co · Brand Guidelines",
    valueMinor: 3100000,
    started: "2026-03-02",
    startNote: "Brand guidelines delivery started",
    checkpoints: [
      { date: "2026-04-06", progressBps: 5200 },
      { date: "2026-05-08", progressBps: 10000 },
    ],
    completed: "2026-05-08",
  },
  {
    id: "hist-project-corvid",
    name: "Corvid Coffee · Retail Packaging",
    valueMinor: 2700000,
    started: "2026-04-28",
    startNote: "Packaging production started",
    checkpoints: [
      { date: "2026-05-25", progressBps: 5600 },
      { date: "2026-06-26", progressBps: 10000 },
    ],
    completed: "2026-06-26",
  },
  {
    id: "hist-project-solstice",
    name: "Solstice Media · Content System",
    valueMinor: 5400000,
    started: "2026-05-26",
    startNote: "Content system delivery started",
    checkpoints: [
      { date: "2026-06-22", progressBps: 3600 },
      { date: "2026-07-20", progressBps: 7200 },
      { date: "2026-08-14", progressBps: 10000 },
    ],
    completed: "2026-08-14",
  },
];

interface InvoiceRecord {
  readonly id: string;
  readonly reference: string;
  readonly clientName: string;
  readonly amountMinor: number;
  readonly issued: string;
  readonly due: string;
  readonly paid?: string;
}

const seedInvoiceAmount = (id: string): number =>
  Number(BigInt(missionInvoices.find((i) => i.id === id)!.amount.minor));

/**
 * The five open seed invoices with issue dates consistent with their stated
 * age (Net 30), plus the paid invoices whose cycle produced the receivables
 * curve. Open invoices have no `paid` date, so the replay's final receivable
 * is exactly the seed's open ledger.
 */
const INVOICE_RECORDS: readonly InvoiceRecord[] = [
  // Open today — these are the seed invoices.
  { id: "inv-2041", reference: "INV-2041", clientName: "Vantage Logistics", amountMinor: seedInvoiceAmount("inv-2041"), issued: "2026-06-30", due: "2026-07-30" },
  { id: "inv-2038", reference: "INV-2038", clientName: "Kestrel Foods", amountMinor: seedInvoiceAmount("inv-2038"), issued: "2026-07-22", due: "2026-08-21" },
  { id: "inv-2049", reference: "INV-2049", clientName: "Meridian Health", amountMinor: seedInvoiceAmount("inv-2049"), issued: "2026-08-06", due: "2026-09-05" },
  { id: "inv-2052", reference: "INV-2052", clientName: "Acme Robotics", amountMinor: seedInvoiceAmount("inv-2052"), issued: "2026-08-09", due: "2026-09-08" },
  { id: "inv-2055", reference: "INV-2055", clientName: "Northwind Bank", amountMinor: seedInvoiceAmount("inv-2055"), issued: "2026-08-22", due: "2026-09-21" },
  // Issued and collected during the window.
  { id: "hist-inv-2018", reference: "INV-2018", clientName: "Harbor & Co", amountMinor: 1200000, issued: "2026-03-09", due: "2026-04-08", paid: "2026-04-06" },
  { id: "hist-inv-2020", reference: "INV-2020", clientName: "Harbor & Co", amountMinor: 1550000, issued: "2026-03-23", due: "2026-04-22", paid: "2026-04-20" },
  { id: "hist-inv-2023", reference: "INV-2023", clientName: "Corvid Coffee", amountMinor: 1350000, issued: "2026-04-30", due: "2026-05-30", paid: "2026-05-27" },
  { id: "hist-inv-2027", reference: "INV-2027", clientName: "Solstice Media", amountMinor: 1800000, issued: "2026-05-29", due: "2026-06-28", paid: "2026-06-24" },
  { id: "hist-inv-2030", reference: "INV-2030", clientName: "Meridian Health", amountMinor: 2100000, issued: "2026-06-08", due: "2026-07-08", paid: "2026-07-06" },
  { id: "hist-inv-2033", reference: "INV-2033", clientName: "Solstice Media", amountMinor: 1900000, issued: "2026-06-29", due: "2026-07-29", paid: "2026-07-31" },
  { id: "hist-inv-2036", reference: "INV-2036", clientName: "Kestrel Foods", amountMinor: 925000, issued: "2026-07-10", due: "2026-08-09", paid: "2026-08-07" },
  { id: "hist-inv-2044", reference: "INV-2044", clientName: "Acme Robotics", amountMinor: 2550000, issued: "2026-07-27", due: "2026-08-26", paid: "2026-08-24" },
  { id: "hist-inv-2047", reference: "INV-2047", clientName: "Vantage Logistics", amountMinor: 850000, issued: "2026-08-03", due: "2026-09-02", paid: "2026-08-28" },
];

/**
 * Fortnightly model runs. The eleven historical outputs are the values the
 * seed already publishes as this metric's trend (in whole $K); the final run
 * is today's exact figure.
 */
function fortnightlyRuns(metric: MissionMetric, finalValue: number, unit: number) {
  const trend = metric.trend;
  const runs = trend.map((value, index) => ({
    date: addDays(HISTORY_AS_OF, -14 * (trend.length - 1 - index)),
    value: value * unit,
  }));
  runs[runs.length - 1] = { date: HISTORY_AS_OF, value: finalValue };
  return runs;
}

const forecastMetric = missionMetrics.find((m) => m.id === "met-forecast")!;
const capacityMetric = missionMetrics.find((m) => m.id === "met-capacity")!;

const FORECAST_RUNS = fortnightlyRuns(
  forecastMetric,
  Number(BigInt((forecastMetric.value as { minor: string }).minor)),
  100000, // trend is in whole $K → minor units
);

const CAPACITY_PLANS = fortnightlyRuns(
  capacityMetric,
  (capacityMetric.value as { count: number }).count * 60,
  60, // trend is in hours → minutes
);

interface DecisionWindow {
  readonly id: string;
  readonly title: string;
  readonly opened: string;
  readonly closed?: string;
  readonly exposureMinor: number;
}

/**
 * The three open decisions carry the exposure the headline reports (each
 * decision's largest money impact, from the seed); two closed ones are the
 * history. Open dates follow the seed's evidence timestamps.
 */
const DECISION_WINDOWS: readonly DecisionWindow[] = [
  {
    id: "dec-hist-solstice-scope",
    title: "Solstice scope change absorbed into fixed fee",
    opened: "2026-04-21",
    closed: "2026-04-24",
    exposureMinor: 900000,
  },
  {
    id: "dec-hist-contractor-rate",
    title: "Contractor rate increase on the Corvid production run",
    opened: "2026-06-03",
    closed: "2026-06-05",
    exposureMinor: 600000,
  },
  {
    id: "dec-northwind-terms",
    title: "Northwind returned redlines moving payment to Net 60",
    opened: "2026-09-01",
    exposureMinor: 18000000,
  },
  {
    id: "dec-avery-overallocation",
    title: "Avery Brooks committed beyond capacity next week",
    opened: HISTORY_AS_OF,
    exposureMinor: 5200000,
  },
  {
    id: "dec-meridian-margin",
    title: "Meridian proposal priced under the margin floor",
    opened: HISTORY_AS_OF,
    exposureMinor: 12400000,
  },
];

/* ── Replay ─────────────────────────────────────────────────────── */

export interface HistoryEvent {
  readonly id: string;
  readonly date: string;
  readonly entityId: string;
  readonly summary: string;
}

export interface OperatingDay {
  readonly date: string;
  readonly label: string;
  /** Value of client work delivered that day (percentage-of-completion). */
  readonly deliveredMinor: number;
  readonly weightedPipelineMinor: number;
  readonly forecastMinor: number;
  readonly receivablesMinor: number;
  readonly activeDeliveryMinor: number;
  readonly capacityMinutes: number;
  readonly exposureMinor: number;
  /** Every event that changed state on this day. */
  readonly eventIds: readonly string[];
  /** A day the founder would remember: decision, contract, or overdue turn. */
  readonly emphasis: boolean;
}

export interface OperatingHistory {
  readonly start: string;
  readonly asOf: string;
  readonly days: readonly OperatingDay[];
  readonly events: readonly HistoryEvent[];
}

function stepValue(
  steps: readonly { date: string; value: number }[],
  date: string,
): number {
  let current = 0;
  for (const step of steps) {
    if (step.date <= date) current = step.value;
    else break;
  }
  return current;
}

function buildHistory(): OperatingHistory {
  const events: HistoryEvent[] = [];
  const eventsByDay = new Map<string, string[]>();
  const emphasisDays = new Set<string>();

  const record = (event: HistoryEvent, emphasis = false) => {
    events.push(event);
    const list = eventsByDay.get(event.date) ?? [];
    list.push(event.id);
    eventsByDay.set(event.date, list);
    if (emphasis) emphasisDays.add(event.date);
  };

  // Opportunities → weighted pipeline steps.
  for (const opp of OPPORTUNITY_TIMELINES) {
    opp.steps.forEach((step, index) => {
      record({
        id: `evh-${opp.id}-${index}`,
        date: step.date,
        entityId: opp.id,
        summary: `${opp.name}: ${step.note}`,
      });
    });
  }

  // Projects → active delivery value and daily recognized delivery.
  const deliveredByDay = new Map<string, number>();
  for (const project of PROJECT_TIMELINES) {
    record(
      {
        id: `evh-${project.id}-start`,
        date: project.started,
        entityId: project.id,
        summary: `${project.name}: ${project.startNote}`,
      },
      true,
    );
    let previous = { date: project.started, progressBps: 0 };
    project.checkpoints.forEach((checkpoint, index) => {
      record({
        id: `evh-${project.id}-progress-${index}`,
        date: checkpoint.date,
        entityId: project.id,
        summary: `${project.name}: progress recorded at ${checkpoint.progressBps / 100}%`,
      });
      const weekdays = weekdaysBetween(previous.date, checkpoint.date);
      const recognized =
        (project.valueMinor * (checkpoint.progressBps - previous.progressBps)) /
        10000;
      const spread = weekdays.length > 0 ? weekdays : [checkpoint.date];
      for (const day of spread) {
        deliveredByDay.set(
          day,
          (deliveredByDay.get(day) ?? 0) + recognized / spread.length,
        );
      }
      previous = checkpoint;
    });
    if (project.completed) {
      record(
        {
          id: `evh-${project.id}-complete`,
          date: project.completed,
          entityId: project.id,
          summary: `${project.name}: delivery completed`,
        },
        true,
      );
    }
  }

  // Invoices → receivables, with overdue transitions as remembered days.
  for (const invoice of INVOICE_RECORDS) {
    record({
      id: `evh-${invoice.id}-issued`,
      date: invoice.issued,
      entityId: invoice.id,
      summary: `${invoice.reference} issued to ${invoice.clientName}`,
    });
    if (invoice.paid) {
      record({
        id: `evh-${invoice.id}-paid`,
        date: invoice.paid,
        entityId: invoice.id,
        summary: `${invoice.reference} paid by ${invoice.clientName}`,
      });
    } else if (invoice.due < HISTORY_AS_OF) {
      record(
        {
          id: `evh-${invoice.id}-overdue`,
          date: addDays(invoice.due, 1),
          entityId: invoice.id,
          summary: `${invoice.reference} passed its due date unpaid`,
        },
        true,
      );
    }
  }

  // Model runs.
  for (const run of FORECAST_RUNS) {
    record({
      id: `evh-forecast-${run.date}`,
      date: run.date,
      entityId: "ev-forecast",
      summary: "Quarter forecast model run",
    });
  }
  for (const plan of CAPACITY_PLANS) {
    record({
      id: `evh-capacity-${plan.date}`,
      date: plan.date,
      entityId: "ev-capacity",
      summary: "Capacity engine weekly plan",
    });
  }

  // Decisions → exposure.
  for (const decision of DECISION_WINDOWS) {
    record(
      {
        id: `evh-${decision.id}-opened`,
        date: decision.opened,
        entityId: decision.id,
        summary: `Decision opened: ${decision.title}`,
      },
      true,
    );
    if (decision.closed) {
      record(
        {
          id: `evh-${decision.id}-closed`,
          date: decision.closed,
          entityId: decision.id,
          summary: `Decision resolved: ${decision.title}`,
        },
        true,
      );
    }
  }

  events.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  // Precompute step series once, then walk the window.
  const pipelineSteps = OPPORTUNITY_TIMELINES.map((opp) => ({
    valueMinor: opp.valueMinor,
    steps: opp.steps.map((s) => ({ date: s.date, value: s.probBps })),
  }));
  const forecastSteps = FORECAST_RUNS.map((r) => ({ date: r.date, value: r.value }));
  const capacitySteps = CAPACITY_PLANS.map((p) => ({ date: p.date, value: p.value }));

  const days: OperatingDay[] = [];
  for (let index = 0; index < HISTORY_DAYS; index += 1) {
    const date = addDays(HISTORY_START, index);

    const weightedPipelineMinor = pipelineSteps.reduce(
      (sum, opp) => sum + (opp.valueMinor * stepValue(opp.steps, date)) / 10000,
      0,
    );

    const activeDeliveryMinor = PROJECT_TIMELINES.reduce(
      (sum, project) =>
        project.started <= date && !(project.completed && project.completed <= date)
          ? sum + project.valueMinor
          : sum,
      0,
    );

    const receivablesMinor = INVOICE_RECORDS.reduce(
      (sum, invoice) =>
        invoice.issued <= date && !(invoice.paid && invoice.paid <= date)
          ? sum + invoice.amountMinor
          : sum,
      0,
    );

    const exposureMinor = DECISION_WINDOWS.reduce(
      (sum, decision) =>
        decision.opened <= date && !(decision.closed && decision.closed <= date)
          ? sum + decision.exposureMinor
          : sum,
      0,
    );

    days.push({
      date,
      label: dayLabel(date),
      deliveredMinor: Math.round(deliveredByDay.get(date) ?? 0),
      weightedPipelineMinor: Math.round(weightedPipelineMinor),
      forecastMinor: stepValue(forecastSteps, date),
      receivablesMinor,
      activeDeliveryMinor,
      capacityMinutes: stepValue(capacitySteps, date),
      exposureMinor,
      eventIds: eventsByDay.get(date) ?? [],
      emphasis: emphasisDays.has(date),
    });
  }

  return { start: HISTORY_START, asOf: HISTORY_AS_OF, days, events };
}

export const operatingHistory: OperatingHistory = buildHistory();

/* ── Chart modes ────────────────────────────────────────────────── */

export const HISTORY_MODES = [
  "impact",
  "revenue",
  "cash",
  "delivery",
  "capacity",
] as const;

export type HistoryMode = (typeof HISTORY_MODES)[number];

export const HISTORY_MODE_LABELS: Readonly<Record<HistoryMode, string>> = {
  impact: "Impact",
  revenue: "Revenue",
  cash: "Cash",
  delivery: "Delivery",
  capacity: "Capacity",
};

export interface HistorySeries {
  readonly mode: HistoryMode;
  readonly lineLabel: string;
  readonly unit: "money" | "hours";
  /** Line value per day, aligned with `operatingHistory.days`. */
  readonly line: readonly number[];
}

const LINE_OF: Readonly<
  Record<HistoryMode, { label: string; unit: "money" | "hours"; pick: (d: OperatingDay) => number }>
> = {
  impact: {
    label: "Value in play — weighted pipeline plus active delivery",
    unit: "money",
    pick: (d) => d.weightedPipelineMinor + d.activeDeliveryMinor,
  },
  revenue: {
    label: "Forecast revenue — quarterly model runs",
    unit: "money",
    pick: (d) => d.forecastMinor,
  },
  cash: {
    label: "Open receivables",
    unit: "money",
    pick: (d) => d.receivablesMinor,
  },
  delivery: {
    label: "Active delivery under contract",
    unit: "money",
    pick: (d) => d.activeDeliveryMinor,
  },
  capacity: {
    label: "Available team hours per week",
    unit: "hours",
    pick: (d) => d.capacityMinutes,
  },
};

export function historySeries(mode: HistoryMode): HistorySeries {
  const config = LINE_OF[mode];
  return {
    mode,
    lineLabel: config.label,
    unit: config.unit,
    line: operatingHistory.days.map(config.pick),
  };
}

export function isHistoryMode(value: unknown): value is HistoryMode {
  return (
    typeof value === "string" &&
    (HISTORY_MODES as readonly string[]).includes(value)
  );
}

/** The exposure figure the headline reports, from the replay's final day. */
export function latestExposureMinor(): number {
  return operatingHistory.days[operatingHistory.days.length - 1]!.exposureMinor;
}

/* Re-export the seed the canvas reconciles against, for the tests. */
export { missionControlSeed, missionCapacity };
