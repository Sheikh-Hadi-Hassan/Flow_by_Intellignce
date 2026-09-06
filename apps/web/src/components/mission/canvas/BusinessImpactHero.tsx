"use client";

import { formatMoney } from "../../../lib/mission-control/format";
import {
  HISTORY_MODES,
  HISTORY_MODE_LABELS,
  type HistoryMode,
} from "../../../lib/mission-control/history";
import { executiveInsight } from "../../../lib/mission-control/selectors";
import type { MissionControlData } from "../../../lib/mission-control/types";

/**
 * The dominant answer, centred like the reference's income figure, with the
 * mode selector as quiet words — the active one carries a single accent
 * underline, nothing is filled.
 */
export function BusinessImpactHero({
  data,
  mode,
  onModeChange,
}: {
  data: MissionControlData;
  mode: HistoryMode;
  onModeChange: (mode: HistoryMode) => void;
}) {
  const { headline } = data;
  const decisionCount = data.decisions.length;
  const hasImpact = Boolean(headline.impactAmount);
  const insight = executiveInsight(data);

  return (
    <section className="flow-canvas-hero" aria-labelledby="canvas-hero-value">
      <p
        id="canvas-hero-value"
        className={
          hasImpact
            ? "flow-canvas-hero__value"
            : "flow-canvas-hero__value flow-canvas-hero__value--copy"
        }
      >
        {hasImpact ? formatMoney(headline.impactAmount!) : headline.answer}
      </p>
      <p className="flow-canvas-hero__label">
        {decisionCount > 0
          ? `Business impact across ${decisionCount} decision${decisionCount === 1 ? "" : "s"} requiring you today`
          : headline.because}
      </p>

      {insight ? (
        <p className="flow-canvas-hero__insight" aria-live="polite">
          {insight}
        </p>
      ) : null}

      {decisionCount > 0 ? (
      <div className="flow-canvas-hero__band">
        <p className="flow-canvas-hero__statement">
          <span className="flow-canvas-microlabel">
            Six-month operating history
          </span>
          <span className="flow-canvas-hero__legend" aria-hidden>
            <span className="flow-canvas-hero__legend-item">
              <span className="flow-canvas-hero__legend-bar" /> Delivered daily
            </span>
            <span className="flow-canvas-hero__legend-item">
              <span className="flow-canvas-hero__legend-line" /> Trend
            </span>
          </span>
        </p>

        <div
          className="flow-canvas-hero__modes"
          role="group"
          aria-label="Chart view"
        >
          {HISTORY_MODES.map((option) => (
            <button
              key={option}
              type="button"
              className={
                option === mode
                  ? "flow-canvas-mode flow-canvas-mode--on"
                  : "flow-canvas-mode"
              }
              aria-pressed={option === mode}
              onClick={() => onModeChange(option)}
            >
              {HISTORY_MODE_LABELS[option]}
            </button>
          ))}
        </div>
      </div>
      ) : null}
    </section>
  );
}
