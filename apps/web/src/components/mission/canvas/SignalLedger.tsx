"use client";

import Link from "next/link";

import {
  formatMoney,
  formatMoneyCompact,
} from "../../../lib/mission-control/format";
import { operatingHistory } from "../../../lib/mission-control/history";
import type {
  CapacityRow,
  InvoiceSignal,
  MissionMetric,
} from "../../../lib/mission-control/types";

/**
 * Four analytical panels under the main chart, in the reference's manner:
 * hairline-separated, each with a micro-label, a value and a compact visual.
 * Each visual is a different form because each metric has a different shape —
 * a history, a stepped model, an ageing split, and a consumed capacity —
 * and every one is derived from the replayed history or the seed ledger.
 */

const money = (metric: MissionMetric) =>
  formatMoneyCompact(metric.value as { minor: string; currency: string });

/** Weekly samples of a daily series: one value every seventh day, ending today. */
function weeklySamples(pick: (index: number) => number): number[] {
  const days = operatingHistory.days.length;
  const samples: number[] = [];
  for (let index = days - 1; index >= 0; index -= 7) samples.unshift(pick(index));
  return samples;
}

function PipelineHistory() {
  const samples = weeklySamples(
    (i) => operatingHistory.days[i]!.weightedPipelineMinor,
  );
  const max = Math.max(...samples, 1);
  return (
    <svg className="flow-canvas-panel__chart" viewBox="0 0 200 44" preserveAspectRatio="none" aria-hidden>
      {samples.map((value, index) => {
        const h = (value / max) * 40;
        return (
          <rect
            key={index}
            className={
              index === samples.length - 1
                ? "flow-canvas-panel__bar flow-canvas-panel__bar--now"
                : "flow-canvas-panel__bar"
            }
            x={(200 / samples.length) * index + 1.4}
            width={200 / samples.length - 2.8}
            y={44 - h}
            height={Math.max(h, 1)}
          />
        );
      })}
    </svg>
  );
}

function ForecastSteps() {
  const samples = weeklySamples((i) => operatingHistory.days[i]!.forecastMinor);
  const max = Math.max(...samples, 1);
  const min = 0;
  const points = samples
    .map((value, index) => {
      const x = (200 / (samples.length - 1)) * index;
      const y = 42 - ((value - min) / (max - min)) * 38;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg className="flow-canvas-panel__chart" viewBox="0 0 200 44" preserveAspectRatio="none" aria-hidden>
      <line className="flow-canvas-panel__floor" x1={0} x2={200} y1={43} y2={43} />
      <path className="flow-canvas-panel__step" d={points} />
      <circle
        className="flow-canvas-panel__now"
        cx={200}
        cy={42 - ((samples[samples.length - 1]! - min) / (max - min)) * 38}
        r={2.6}
      />
    </svg>
  );
}

function ReceivablesAgeing({ invoices }: { invoices: readonly InvoiceSignal[] }) {
  const bucket = (state: InvoiceSignal["state"]) =>
    invoices
      .filter((invoice) => invoice.state === state)
      .reduce((sum, invoice) => sum + Number(BigInt(invoice.amount.minor)), 0);

  const rows = [
    { label: "Overdue", minor: bucket("overdue"), tone: "over" },
    { label: "Due soon", minor: bucket("due"), tone: "due" },
    { label: "Scheduled", minor: bucket("scheduled"), tone: "later" },
  ];
  const max = Math.max(...rows.map((row) => row.minor), 1);

  return (
    <div className="flow-canvas-panel__ageing">
      {rows.map((row) => (
        <div key={row.label} className="flow-canvas-panel__age-row">
          <span className="flow-canvas-panel__age-label">{row.label}</span>
          <span className="flow-canvas-panel__age-track">
            <span
              className={`flow-canvas-panel__age-fill flow-canvas-panel__age-fill--${row.tone}`}
              style={{ width: `${Math.max((row.minor / max) * 100, 2)}%` }}
            />
          </span>
          <span className="flow-canvas-panel__age-value">
            {formatMoney({ minor: String(row.minor), currency: "USD" })}
          </span>
        </div>
      ))}
    </div>
  );
}

function CapacityGauge({ capacity }: { capacity: readonly CapacityRow[] }) {
  const allocated = capacity.reduce((sum, row) => sum + row.allocatedMinutes, 0);
  const available = capacity.reduce((sum, row) => sum + row.availableMinutes, 0);
  const used = Math.min(allocated / available, 1);

  // Semicircle from 180° to 0°, radius 34, centred at (40, 40).
  const angle = Math.PI * (1 - used);
  const endX = 40 + 34 * Math.cos(angle);
  const endY = 40 - 34 * Math.sin(angle);

  return (
    <div className="flow-canvas-panel__gauge-wrap">
      <svg className="flow-canvas-panel__gauge" viewBox="0 0 80 44" aria-hidden>
        <path
          className="flow-canvas-panel__gauge-track"
          d="M 6 40 A 34 34 0 0 1 74 40"
        />
        <path
          className="flow-canvas-panel__gauge-fill"
          d={`M 6 40 A 34 34 0 0 1 ${endX.toFixed(1)} ${endY.toFixed(1)}`}
        />
      </svg>
      <span className="flow-canvas-panel__gauge-value">
        {Math.round(used * 100)}%
      </span>
    </div>
  );
}

export function SignalLedger({
  metrics,
  invoices,
  capacity,
}: {
  metrics: readonly MissionMetric[];
  invoices: readonly InvoiceSignal[];
  capacity: readonly CapacityRow[];
}) {
  const byId = new Map(metrics.map((metric) => [metric.id, metric]));
  const pipeline = byId.get("met-weighted-pipeline");
  const forecast = byId.get("met-forecast");
  const receivables = byId.get("met-receivables");
  const capacityMetric = byId.get("met-capacity");
  if (!pipeline || !forecast || !receivables || !capacityMetric) return null;

  return (
    <section className="flow-canvas-panels" aria-label="Operating signals">
      <Link href={pipeline.href} className="flow-canvas-panel" data-metric-id={pipeline.id}>
        <span className="flow-canvas-microlabel">Weighted pipeline</span>
        <span className="flow-canvas-panel__value tabular-nums">
          {money(pipeline)}
          <span className="flow-canvas-panel__delta">{pipeline.deltaLabel}</span>
        </span>
        <PipelineHistory />
        <span className="flow-canvas-panel__note">{pipeline.caption}</span>
      </Link>

      <Link href={forecast.href} className="flow-canvas-panel" data-metric-id={forecast.id}>
        <span className="flow-canvas-microlabel">Forecast revenue</span>
        <span className="flow-canvas-panel__value tabular-nums">
          {money(forecast)}
          <span className="flow-canvas-panel__delta">{forecast.deltaLabel}</span>
        </span>
        <ForecastSteps />
        <span className="flow-canvas-panel__note">{forecast.caption}</span>
      </Link>

      <Link href="#cash" className="flow-canvas-panel" data-metric-id={receivables.id}>
        <span className="flow-canvas-microlabel">Receivables</span>
        <span className="flow-canvas-panel__value tabular-nums">
          {money(receivables)}
        </span>
        <ReceivablesAgeing invoices={invoices} />
        <span className="flow-canvas-panel__note">{receivables.caption}</span>
      </Link>

      <Link href="#people" className="flow-canvas-panel" data-metric-id={capacityMetric.id}>
        <span className="flow-canvas-microlabel">Available capacity</span>
        <span className="flow-canvas-panel__value tabular-nums">
          {(capacityMetric.value as { count: number }).count} hours
        </span>
        <CapacityGauge capacity={capacity} />
        <span className="flow-canvas-panel__note">{capacityMetric.caption}</span>
      </Link>
    </section>
  );
}
