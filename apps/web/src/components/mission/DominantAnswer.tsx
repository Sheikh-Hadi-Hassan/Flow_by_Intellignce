"use client";

import Link from "next/link";

import { formatMoney } from "../../lib/mission-control/format";
import type { MissionHeadline } from "../../lib/mission-control/types";
import { EvidenceChip } from "./ContextReceipt";

/**
 * The one answer the screen exists to give. Everything below it is supporting
 * detail, so this is the only place using display-scale type.
 */
export function DominantAnswer({
  headline,
  generatedAtLabel,
}: {
  headline: MissionHeadline;
  generatedAtLabel: string;
}) {
  return (
    <section className="flow-mc-answer" aria-labelledby="mc-answer">
      <div>
        <p className="flow-mc-answer__eyebrow">
          <span>Bird Eye View</span>
          <span aria-hidden>·</span>
          <span>{generatedAtLabel}</span>
        </p>
        <h1 id="mc-answer" className="flow-mc-answer__headline">
          {headline.answer}
        </h1>
        <p className="flow-mc-answer__because">{headline.because}</p>
        {headline.action ? (
          <p className="flow-mc-answer__action">
            <Link
              href={headline.action.href}
              className="flow-btn flow-btn--primary"
            >
              {headline.action.label}
            </Link>
          </p>
        ) : null}
        <div className="flow-mc-answer__proof">
          <EvidenceChip evidence={headline.evidence} />
        </div>
      </div>

      <div className="flow-mc-answer__impact">
        <span className="flow-mc-answer__impact-label">
          {headline.impactAmount ? "Business impact" : "Next step"}
        </span>
        {headline.impactAmount ? (
          <span className="flow-mc-answer__impact-value tabular-nums">
            {formatMoney(headline.impactAmount)}
          </span>
        ) : null}
        <p className="flow-mc-answer__impact-note">{headline.impactLabel}</p>
      </div>
    </section>
  );
}
