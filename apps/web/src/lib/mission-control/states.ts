/**
 * The six Mission Control states MC-01 requires. Loading, error and restricted
 * are modelled as view states rather than data, so the screen cannot render a
 * half-truth while it waits or when the viewer lacks permission.
 */

import { NORTHSTAR_SLUG } from "../prototype/defaults";
import { formatMoney, joinReadable } from "./format";
import {
  MISSION_CURRENCY,
  decisionHeadline,
  missionActivity,
  missionAskFlow,
  missionCapacity,
  missionControlSeed,
  missionDecisions,
  missionOpportunities,
  missionVendorDecision,
  missionViewer,
} from "./seed";
import type {
  ActivityEvent,
  MissionControlData,
  MissionControlView,
  MissionDecision,
  MissionOpportunity,
  MissionStateKind,
} from "./types";

const base = `/${NORTHSTAR_SLUG}/admin`;

export const MISSION_STATE_KINDS: readonly MissionStateKind[] = [
  "populated",
  "empty",
  "loading",
  "error",
  "restricted",
  "dense",
];

export function isMissionStateKind(value: unknown): value is MissionStateKind {
  return (
    typeof value === "string" &&
    (MISSION_STATE_KINDS as readonly string[]).includes(value)
  );
}

const emptyData: MissionControlData = {
  generatedAtLabel: "Today, 08:12",
  currency: MISSION_CURRENCY,
  viewer: missionViewer,
  headline: {
    answer: "Nothing needs you yet",
    because:
      "This workspace has no opportunities, projects or invoices. Bird Eye View fills in as soon as your first client engagement starts.",
    impactLabel: "Start by adding a client, then open a discovery opportunity",
    action: { label: "Add your first client", href: `${base}/clients` },
    evidence: {
      id: "ev-empty",
      kind: "system-record",
      label: "Workspace record count",
      source: "0 opportunities · 0 projects · 0 invoices",
      capturedAtLabel: "Today, 08:12",
      claim: "FACT",
      trust: "high",
      href: `${base}/clients`,
    },
  },
  decisions: [],
  metrics: [],
  pipelineStages: [],
  opportunities: [],
  projects: [],
  risks: [],
  clientActions: [],
  invoices: [],
  capacity: [],
  activity: [],
  pulse: [],
  notifications: [],
  askFlow: {
    workspaceLabel: "Northstar Creative",
    scopeLabel: "No records yet",
    tools: [{ id: "pipeline", label: "Pipeline" }],
    authority: {
      outcome: "ALLOW",
      reason: "Ask Flow answers from workspace records once they exist.",
      requiredPermission: "opportunity.read",
    },
    suggestions: [],
  },
};

/**
 * Dense variant stresses the layout: long client names, more rows than fit
 * comfortably, and a fourth decision. Derived from the seed so the two stay
 * consistent, and deterministic because every suffix is index-based.
 */
function densify(): MissionControlData {
  const longName =
    "Meridian Health Systems and Community Care Network — Northern Region";

  const decisions: readonly MissionDecision[] = [
    ...missionDecisions,
    missionVendorDecision,
  ];

  const extraOpportunities: readonly MissionOpportunity[] =
    missionOpportunities.map((row, index) => ({
      ...row,
      id: `${row.id}-dense-${index}`,
      name: `${row.name} — phase ${index + 2} extension`,
      clientName: index === 0 ? longName : row.clientName,
    }));

  const extraActivity: readonly ActivityEvent[] = missionActivity.map(
    (row, index) => ({
      ...row,
      id: `${row.id}-dense-${index}`,
      timeLabel: `27 Aug ${String(9 + (index % 8)).padStart(2, "0")}:15`,
    }),
  );

  const headline = decisionHeadline(
    decisions,
    "A proposal is held below your margin floor, a strategist is booked past capacity, a client rewrote your payment terms, and a contractor invoice is over its purchase order. Nothing downstream moves until you clear them.",
  );
  const exposure = headline.impactAmount
    ? formatMoney(headline.impactAmount)
    : "";

  return {
    ...missionControlSeed,
    headline,
    decisions,
    opportunities: [...missionOpportunities, ...extraOpportunities],
    activity: [...missionActivity, ...extraActivity],
    capacity: missionCapacity,
    askFlow: {
      ...missionAskFlow,
      suggestions: missionAskFlow.suggestions.map((row) =>
        row.id === "ask-exposure"
          ? {
              ...row,
              prompt: `Why is ${exposure} exposed?`,
              answerPreview: `${decisions.length} open decisions hold it: ${joinReadable(
                decisions.map((item) => item.clientName),
              )}.`,
            }
          : row,
      ),
    },
  };
}

export const missionControlDense: MissionControlData = densify();

export function missionViewForState(kind: MissionStateKind): MissionControlView {
  switch (kind) {
    case "empty":
      return { kind: "ready", data: emptyData };
    case "loading":
      return { kind: "loading" };
    case "error":
      return {
        kind: "error",
        error: {
          title: "Bird Eye View could not load",
          detail:
            "The workspace read timed out after 10 seconds. Your data is unchanged — retry, or open the pipeline directly.",
          correlationId: "mc-req-8f21c4",
        },
      };
    case "restricted":
      return {
        kind: "restricted",
        viewer: {
          ...missionViewer,
          person: {
            id: "ns-res-copy",
            name: "Taylor Kim",
            role: "Copywriter",
            initials: "TK",
          },
          permissions: ["opportunity.read"],
        },
        restriction: {
          title: "Bird Eye View is limited to founders and operations leads",
          reason:
            "Your role can read opportunities but not workspace finance, capacity or the approval queue, so the operating picture would be incomplete.",
          missingPermission: "workspace.mission_control",
          contactLabel: "Ask Maya Chen for access",
        },
      };
    case "dense":
      return { kind: "ready", data: missionControlDense };
    case "populated":
    default:
      return { kind: "ready", data: missionControlSeed };
  }
}
