"use client";

import Link from "next/link";

import {
  formatBps,
  formatCount,
  formatMoneyCompact,
} from "../../lib/mission-control/format";
import type { MissionMetric } from "../../lib/mission-control/types";

function metricValueText(metric: MissionMetric): string {
  if ("minor" in metric.value) return formatMoneyCompact(metric.value);
  if ("count" in metric.value) return formatCount(metric.value.count);
  return formatBps(metric.value.bps);
}

/** Bars are scaled from the metric's own seeded history, never invented. */
function Sparkline({ values, label }: { values: readonly number[]; label: string }) {
  if (values.length === 0) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;

  return (
    <span className="flow-mc-spark" role="img" aria-label={label}>
      {values.map((value, index) => (
        <span
          key={index}
          className={
            index === values.length - 1
              ? "flow-mc-spark__bar flow-mc-spark__bar--last"
              : "flow-mc-spark__bar"
          }
          style={{ height: `${20 + ((value - min) / span) * 80}%` }}
        />
      ))}
    </span>
  );
}

/**
 * Pipeline, delivery, finance and capacity in one continuous strip. Labels are
 * embedded in each cell and cells are divided by hairlines rather than being
 * eight identical cards.
 */
export function SignalStrip({ metrics }: { metrics: readonly MissionMetric[] }) {
  if (metrics.length === 0) return null;

  return (
    <section className="flow-mc-signals" aria-label="Operating signals">
      {metrics.map((metric) => (
        <Link key={metric.id} href={metric.href} className="flow-mc-signal">
          <span className="flow-mc-signal__label">{metric.label}</span>
          <span
            className={`flow-mc-signal__value flow-mc-signal__value--${metric.tone} tabular-nums`}
          >
            {metricValueText(metric)}
          </span>
          <p className="flow-mc-signal__caption">{metric.caption}</p>
          <Sparkline
            values={metric.trend}
            label={`${metric.label} trend over the last 12 periods`}
          />
          {metric.deltaLabel ? (
            <span
              className={`flow-mc-signal__delta flow-mc-signal__delta--${
                metric.deltaDirection ?? "neutral"
              }`}
            >
              {metric.deltaLabel}
            </span>
          ) : null}
        </Link>
      ))}
    </section>
  );
}
