"use client";

import Link from "next/link";

import { formatMoney } from "../../../lib/mission-control/format";
import {
  actionLabel,
  impactDisplay,
  largestMoneyImpact,
  resolutionOf,
  sortedDecisions,
} from "../../../lib/mission-control/selectors";
import type {
  DecisionAction,
  DecisionResolution,
  MissionDecision,
} from "../../../lib/mission-control/types";

function DecisionRow({
  decision,
  onResolve,
}: {
  decision: MissionDecision;
  onResolve: (id: string, resolution: DecisionResolution) => void;
}) {
  const headline = largestMoneyImpact(decision);

  return (
    <details
      className="flow-canvas-queue__item"
      data-decision-id={decision.id}
      onToggle={(event) => {
        const node = event.currentTarget;
        if (node.open) {
          window.requestAnimationFrame(() => {
            node.scrollIntoView({ block: "center", behavior: "smooth" });
          });
        }
      }}
    >
      <summary className="flow-canvas-queue__row">
        <span className="flow-canvas-queue__client">
          {decision.clientName}
          <span aria-hidden> · </span>
          {decision.dueLabel}
        </span>
        <span className="flow-canvas-queue__statement">{decision.title}</span>
        {headline?.amount ? (
          <span className="flow-canvas-queue__value tabular-nums">
            {formatMoney(headline.amount)}
          </span>
        ) : null}
      </summary>

      <div className="flow-canvas-queue__detail">
        <p className="flow-canvas-queue__copy">
          <span className="flow-canvas-microlabel">What happened</span>
          {decision.whatHappened}
        </p>
        <p className="flow-canvas-queue__copy">
          <span className="flow-canvas-microlabel">Why it matters</span>
          {decision.whyItMatters}
        </p>

        <ul className="flow-canvas-queue__impacts">
          {decision.impacts.map((impact) => (
            <li key={impact.id}>
              <span className="tabular-nums">{impactDisplay(impact)}</span>
              <span>
                {impact.label} · {impact.detail}
              </span>
            </li>
          ))}
        </ul>

        <p className="flow-canvas-queue__copy">
          <span className="flow-canvas-microlabel">Recommended</span>
          {decision.recommendation.summary} {decision.recommendation.rationale}
        </p>
        <p className="flow-canvas-queue__meta">
          {decision.owner.name} · {decision.owner.role} ·{" "}
          {decision.recommendation.authority.reason}
        </p>

        {decision.evidence.length > 0 ? (
          <ul className="flow-canvas-queue__evidence">
            {decision.evidence.map((item) => (
              <li key={item.id}>
                {item.href ? (
                  <Link href={item.href}>{item.label}</Link>
                ) : (
                  item.label
                )}
                <span>
                  {" "}
                  · {item.source} · {item.capturedAtLabel}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flow-canvas-queue__actions">
          {decision.actions.map((action: DecisionAction) => (
            <button
              key={action}
              type="button"
              className="flow-canvas-queue__action"
              onClick={() => onResolve(decision.id, resolutionOf(action))}
            >
              {actionLabel(action)}
            </button>
          ))}
          <Link href={decision.href} className="flow-canvas-queue__action">
            Open record
          </Link>
        </div>
      </div>
    </details>
  );
}

export function DecisionQueuePreview({
  decisions,
  onResolve,
}: {
  decisions: readonly MissionDecision[];
  onResolve: (id: string, resolution: DecisionResolution) => void;
}) {
  const ordered = sortedDecisions(decisions);
  if (ordered.length === 0) return null;

  return (
    <section
      className="flow-canvas-queue"
      id="decisions"
      aria-labelledby="canvas-queue"
    >
      <div className="flow-canvas-queue__head">
        <h2 id="canvas-queue" className="flow-canvas-queue__title">
          Decisions waiting on you
        </h2>
        <span className="flow-canvas-queue__count">{ordered.length} open</span>
      </div>
      {ordered.map((decision) => (
        <DecisionRow
          key={decision.id}
          decision={decision}
          onResolve={onResolve}
        />
      ))}
    </section>
  );
}
