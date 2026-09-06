import { describe, expect, it } from "vitest";

import { resolveAskAnswer } from "../ask-flow/resolve";
import { resolveAskSuggestions } from "../ask-flow/suggestions";
import type { AskApplicationContext } from "../ask-flow/types";
import {
  approvalAnswer,
  exposureAnswer,
  exposurePrompt,
  snapshotForState,
} from "./ask-snapshot";
import { formatMoney } from "./format";
import { MISSION_STATE_KINDS, missionViewForState } from "./states";
import type { MissionStateKind } from "./types";

const route = "/northstar-creative/admin";

function contextFor(kind: MissionStateKind): AskApplicationContext {
  return {
    workspaceId: "northstar-creative",
    userId: "ns-res-maya",
    role: "Founder",
    permissions: [
      "opportunity.read",
      "opportunity.manage",
      "project.manage",
      "finance.read",
    ],
    route,
    visibleRecordIds: [],
    locale: "en-US",
    currency: "USD",
    timezone: "America/Chicago",
    conversationId: "ask-snapshot-test",
    missionStateKind: kind,
  };
}

describe("Ask Flow snapshot matches the active Mission Control state", () => {
  it.each(MISSION_STATE_KINDS)(
    "%s: hero exposure equals Ask Flow exposure",
    (kind) => {
      const view = missionViewForState(kind);
      const snapshot = snapshotForState(kind);
      const prompt = exposurePrompt(snapshot);

      if (view.kind !== "ready") {
        expect(snapshot.ready).toBe(false);
        expect(snapshot.exposure).toBeNull();
        expect(snapshot.decisionCount).toBe(0);
        expect(prompt).toBeNull();
        return;
      }

      expect(snapshot.exposure).toEqual(view.data.headline.impactAmount ?? null);
      if (snapshot.exposure) {
        expect(prompt).toBe(`Why is ${formatMoney(snapshot.exposure)} exposed?`);
        expect(prompt).toBe(
          `Why is ${formatMoney(view.data.headline.impactAmount!)} exposed?`,
        );
      } else {
        expect(prompt).toBeNull();
      }
    },
  );

  it.each(MISSION_STATE_KINDS)(
    "%s: hero decision count equals Ask Flow decision count",
    (kind) => {
      const view = missionViewForState(kind);
      const snapshot = snapshotForState(kind);
      const expected =
        view.kind === "ready" ? view.data.decisions.length : 0;
      expect(snapshot.decisionCount).toBe(expected);
      expect(exposureAnswer(snapshot)).toMatch(
        expected === 0 ? /nothing is exposed/i : new RegExp(`${expected} open`),
      );
    },
  );

  it.each(MISSION_STATE_KINDS)(
    "%s: answers cite records from the active state",
    (kind) => {
      const snapshot = snapshotForState(kind);
      const context = contextFor(kind);
      const exposure = resolveAskAnswer(
        "explain the open exposure",
        context,
      );
      const approvals = resolveAskAnswer(
        "What needs my approval?",
        context,
      );
      const invoices = resolveAskAnswer(
        "Which invoices are overdue?",
        context,
      );

      expect(exposure.related.map((row) => row.id)).toEqual(
        snapshot.decisions.map((row) => row.id),
      );
      expect(approvals.related.map((row) => row.id)).toEqual(
        snapshot.decisions.map((row) => row.id),
      );
      expect(approvals.answer.toLowerCase()).toMatch(
        snapshot.decisionCount === 0 ? /empty|nothing/ : /approval|meridian|decision/,
      );

      if (snapshot.decisionCount === 0) {
        expect(exposure.answer).toMatch(/nothing is exposed/i);
        expect(approvals.answer).toMatch(/founder queue is empty/i);
      } else {
        for (const decision of snapshot.decisions) {
          expect(exposure.related.some((row) => row.id === decision.id)).toBe(
            true,
          );
        }
      }

      const overdue = snapshot.invoices.filter((row) => row.state === "overdue");
      if (overdue.length === 0) {
        expect(invoices.answer).toMatch(/no invoices are overdue/i);
        expect(invoices.related).toEqual([]);
      } else {
        for (const invoice of overdue) {
          expect(invoices.answer).toContain(invoice.reference);
          expect(invoices.related.some((row) => row.id === invoice.id)).toBe(
            true,
          );
        }
      }
    },
  );

  it("changing state invalidates stale suggestions and context", () => {
    const populated = resolveAskSuggestions("exposed", {
      route,
      visibleRecordIds: [],
      missionStateKind: "populated",
    });
    const dense = resolveAskSuggestions("exposed", {
      route,
      visibleRecordIds: [],
      missionStateKind: "dense",
    });
    const empty = resolveAskSuggestions("exposed", {
      route,
      visibleRecordIds: [],
      missionStateKind: "empty",
    });

    expect(populated.map((row) => row.prompt)).toContain(
      "Why is $356,000 exposed?",
    );
    expect(populated.map((row) => row.prompt).join(" ")).not.toContain(
      "360,200",
    );
    expect(dense.map((row) => row.prompt)).toContain(
      "Why is $360,200 exposed?",
    );
    expect(dense.map((row) => row.prompt).join(" ")).not.toContain("356,000");
    expect(empty).toEqual([]);

    const staleOnEmpty = resolveAskAnswer(
      "Why is $356,000 exposed?",
      contextFor("empty"),
    );
    expect(staleOnEmpty.answer).toMatch(/nothing is exposed/i);
    expect(staleOnEmpty.related).toEqual([]);

    const denseAnswer = resolveAskAnswer(
      "Why is $360,200 exposed?",
      contextFor("dense"),
    );
    expect(denseAnswer.answer).toContain("4 open");
    expect(denseAnswer.related).toHaveLength(4);
    expect(denseAnswer.answer).not.toContain("356");

    const populatedAnswer = resolveAskAnswer(
      "Why is $356,000 exposed?",
      contextFor("populated"),
    );
    expect(populatedAnswer.answer).toContain("3 open");
    expect(populatedAnswer.related).toHaveLength(3);
    expect(populatedAnswer.answer).not.toContain("360,200");
  });
});
