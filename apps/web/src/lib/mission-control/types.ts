/**
 * Mission Control data contract.
 *
 * This is the shape Mission Control renders. MC-01/MC-02 satisfy it with an
 * isolated demo seed; MC-08 replaces the seed adapter with real read APIs
 * without changing this contract or the UI built against it.
 *
 * Conventions follow the rest of Flow: money is minor units as a string plus an
 * ISO 4217 currency, percentages are integer basis points, durations are whole
 * minutes.
 */

export type MissionStateKind =
  | "populated"
  | "empty"
  | "loading"
  | "error"
  | "restricted"
  | "dense";

export interface Money {
  readonly minor: string;
  readonly currency: string;
}

/** Provenance for anything Mission Control asserts. No claim renders without one. */
export interface EvidenceRef {
  readonly id: string;
  readonly kind:
    | "document"
    | "user-input"
    | "system-record"
    | "external-record"
    | "calculation";
  readonly label: string;
  readonly source: string;
  readonly capturedAtLabel: string;
  readonly claim: "FACT" | "INFERENCE" | "RECOMMENDATION" | "ASSUMPTION";
  readonly trust: "low" | "medium" | "high";
  readonly excerpt?: string;
  readonly href?: string;
}

export type ImpactDirection = "gain" | "loss" | "neutral";

export interface DecisionImpact {
  readonly id: string;
  readonly kind: "revenue" | "margin" | "delivery" | "capacity" | "cash";
  readonly label: string;
  readonly detail: string;
  readonly direction: ImpactDirection;
  readonly amount?: Money;
  readonly deltaDays?: number;
  /** For impacts measured in neither money nor days, e.g. "240 min over". */
  readonly valueLabel?: string;
}

export interface Person {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly initials: string;
}

/**
 * Whether the founder may act directly. Mirrors the Action Wall outcomes so the
 * UI never implies authority the backend would refuse.
 */
export interface AuthorityState {
  readonly outcome: "ALLOW" | "DENY" | "REQUIRES_APPROVAL";
  readonly reason: string;
  readonly requiredPermission: string;
}

export interface DecisionRecommendation {
  readonly summary: string;
  readonly rationale: string;
  readonly confidenceBps: number;
  readonly authority: AuthorityState;
}

export type DecisionAction = "approve" | "revise" | "reject";

export type DecisionResolution = "approved" | "revised" | "rejected";

export interface MissionDecision {
  readonly id: string;
  readonly title: string;
  readonly clientName: string;
  readonly urgency: "critical" | "high" | "normal";
  readonly dueLabel: string;
  readonly whatHappened: string;
  readonly whyItMatters: string;
  readonly impacts: readonly DecisionImpact[];
  readonly evidence: readonly EvidenceRef[];
  readonly owner: Person;
  readonly recommendation: DecisionRecommendation;
  readonly actions: readonly DecisionAction[];
  readonly href: string;
}

export type SignalTone = "positive" | "neutral" | "caution" | "critical";

/** One number in the operational field, with its own provenance and trend. */
export interface MissionMetric {
  readonly id: string;
  readonly label: string;
  readonly value: Money | { readonly count: number } | { readonly bps: number };
  readonly caption: string;
  readonly tone: SignalTone;
  readonly deltaLabel?: string;
  readonly deltaDirection?: ImpactDirection;
  readonly trend: readonly number[];
  readonly evidence: EvidenceRef;
  readonly href: string;
}

export interface PipelineStageSignal {
  readonly id: string;
  readonly label: string;
  readonly count: number;
  readonly value: Money;
  readonly href: string;
}

export interface MissionOpportunity {
  readonly id: string;
  readonly name: string;
  readonly clientName: string;
  readonly stageId: string;
  readonly stageLabel: string;
  readonly value: Money;
  readonly weightedValue: Money;
  readonly probabilityBps: number;
  readonly closeLabel: string;
  readonly owner: Person;
  readonly tone: SignalTone;
  readonly href: string;
}

export interface MissionProject {
  readonly id: string;
  readonly name: string;
  readonly clientName: string;
  readonly statusLabel: string;
  readonly healthTone: SignalTone;
  readonly progressBps: number;
  readonly contractValue: Money;
  readonly nextMilestone: string;
  readonly dueLabel: string;
  readonly leadName: string;
  readonly href: string;
}

export interface DeliveryRisk {
  readonly id: string;
  readonly projectName: string;
  readonly statement: string;
  readonly severity: "blocking" | "elevated";
  readonly impactLabel: string;
  readonly ownerName: string;
  readonly evidence: EvidenceRef;
  readonly href: string;
}

export interface ClientAction {
  readonly id: string;
  readonly clientName: string;
  readonly request: string;
  readonly waitingLabel: string;
  /** Who the queue is blocked on. */
  readonly waitingOn: "client" | "agency";
  readonly value: Money;
  readonly tone: SignalTone;
  readonly href: string;
}

export interface InvoiceSignal {
  readonly id: string;
  readonly clientName: string;
  readonly reference: string;
  readonly amount: Money;
  readonly state: "overdue" | "due" | "scheduled";
  readonly dueLabel: string;
  readonly ageDays: number;
  readonly href: string;
}

export interface CapacityRow {
  readonly id: string;
  readonly personName: string;
  readonly roleLabel: string;
  readonly allocatedMinutes: number;
  readonly availableMinutes: number;
  readonly utilizationBps: number;
  readonly tone: SignalTone;
  readonly noteLabel: string;
}

export interface ActivityEvent {
  readonly id: string;
  readonly timeLabel: string;
  readonly actorName: string;
  readonly summary: string;
  readonly category:
    | "discovery"
    | "approval"
    | "delivery"
    | "finance"
    | "client"
    | "capacity";
  readonly tone: SignalTone;
  readonly evidence?: EvidenceRef;
  readonly href: string;
}

export interface PulsePoint {
  readonly id: string;
  readonly label: string;
  readonly dateLabel: string;
  readonly pipelineValue: Money;
  readonly deliveryValue: Money;
  readonly eventCount: number;
  readonly note?: string;
}

export interface AskFlowSuggestion {
  readonly id: string;
  readonly prompt: string;
  readonly category: "pipeline" | "delivery" | "finance" | "capacity";
  readonly answerPreview: string;
  readonly evidence: EvidenceRef;
}

export interface AskFlowContext {
  readonly workspaceLabel: string;
  readonly scopeLabel: string;
  readonly tools: readonly { readonly id: string; readonly label: string }[];
  readonly authority: AuthorityState;
  readonly suggestions: readonly AskFlowSuggestion[];
}

export interface MissionHeadline {
  readonly answer: string;
  readonly because: string;
  readonly impactLabel: string;
  readonly impactAmount?: Money;
  readonly evidence: EvidenceRef;
  /** Present when the answer is something the founder can act on directly,
   * such as an empty workspace that needs its first client. */
  readonly action?: { readonly label: string; readonly href: string };
}

export interface MissionNotification {
  readonly id: string;
  readonly summary: string;
  readonly timeLabel: string;
  readonly tone: SignalTone;
}

export interface MissionViewer {
  readonly person: Person;
  readonly workspaceName: string;
  readonly workspaceSlug: string;
  readonly permissions: readonly string[];
}

/** Everything one Mission Control render needs. */
export interface MissionControlData {
  readonly generatedAtLabel: string;
  readonly currency: string;
  readonly viewer: MissionViewer;
  readonly headline: MissionHeadline;
  readonly decisions: readonly MissionDecision[];
  readonly metrics: readonly MissionMetric[];
  readonly pipelineStages: readonly PipelineStageSignal[];
  readonly opportunities: readonly MissionOpportunity[];
  readonly projects: readonly MissionProject[];
  readonly risks: readonly DeliveryRisk[];
  readonly clientActions: readonly ClientAction[];
  readonly invoices: readonly InvoiceSignal[];
  readonly capacity: readonly CapacityRow[];
  readonly activity: readonly ActivityEvent[];
  readonly pulse: readonly PulsePoint[];
  readonly notifications: readonly MissionNotification[];
  readonly askFlow: AskFlowContext;
}

export interface MissionRestriction {
  readonly title: string;
  readonly reason: string;
  readonly missingPermission: string;
  readonly contactLabel: string;
}

export interface MissionError {
  readonly title: string;
  readonly detail: string;
  readonly correlationId: string;
}

/** Discriminated view state so loading/error/restricted are first-class, not afterthoughts. */
export type MissionControlView =
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly error: MissionError }
  | {
      readonly kind: "restricted";
      readonly restriction: MissionRestriction;
      readonly viewer: MissionViewer;
    }
  | { readonly kind: "ready"; readonly data: MissionControlData };
