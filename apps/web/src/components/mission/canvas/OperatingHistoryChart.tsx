"use client";

import { useMemo, useRef, useState } from "react";

import {
  operatingHistory,
  historySeries,
  type HistoryMode,
} from "../../../lib/mission-control/history";

/**
 * The analytical field at the centre of the canvas: one hairline bar per day
 * of operating history and one authoritative trend line, on the reference's
 * pattern. Bars and line each scale from zero against their own maximum —
 * delivered-per-day and value-in-play are three orders of magnitude apart, so
 * sharing an axis would flatten the bars into invisibility. The right-hand
 * axis labels belong to the line; the tooltip carries exact values for both.
 */

const VIEW_W = 1360;
const VIEW_H = 292;
const PAD_TOP = 16;
const PAD_BOTTOM = 8;
const PLOT_H = VIEW_H - PAD_TOP - PAD_BOTTOM;

function moneyCompact(minor: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(minor / 100);
}

function lineValueLabel(value: number, unit: "money" | "hours"): string {
  return unit === "hours" ? `${Math.round(value / 60)}h` : moneyCompact(value);
}

/** Round up to a clean axis ceiling: 1 / 2 / 2.5 / 5 × 10^n. */
function niceCeiling(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 2, 2.5, 5, 10]) {
    if (magnitude * step >= value) return magnitude * step;
  }
  return magnitude * 10;
}

export function OperatingHistoryChart({ mode }: { mode: HistoryMode }) {
  const [active, setActive] = useState<number | null>(null);
  const plotRef = useRef<HTMLDivElement>(null);

  const { days } = operatingHistory;
  const series = historySeries(mode);
  const count = days.length;
  const slot = VIEW_W / count;

  const barMax = Math.max(...days.map((d) => d.deliveredMinor), 1);
  const lineMax = niceCeiling(Math.max(...series.line, 1) * 1.12);

  const x = (index: number) => slot * index + slot / 2;
  const yLine = (value: number) =>
    PAD_TOP + PLOT_H - (value / lineMax) * PLOT_H;
  // Bars occupy the lower half so the line keeps the upper register readable.
  const barHeight = (value: number) => (value / barMax) * PLOT_H * 0.52;

  const linePath = useMemo(
    () =>
      series.line
        .map(
          (value, index) =>
            `${index === 0 ? "M" : "L"}${x(index).toFixed(1)} ${yLine(value).toFixed(1)}`,
        )
        .join(" "),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode],
  );

  const monthTicks = useMemo(
    () =>
      days
        .map((day, index) => ({ day, index }))
        .filter(({ day }) => day.date.endsWith("-01"))
        .map(({ day, index }) => ({
          label: new Date(day.date).toLocaleDateString("en-US", {
            month: "short",
            timeZone: "UTC",
          }),
          leftPct: (x(index) / VIEW_W) * 100,
        })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // The one accent annotation: the day the open decisions put value at risk.
  const annotatedIndex = count - 1;
  const annotated = days[annotatedIndex]!;

  const shown = active ?? null;
  const shownDay = shown === null ? undefined : days[shown];
  const eventsById = useMemo(
    () => new Map(operatingHistory.events.map((event) => [event.id, event])),
    [],
  );

  const moveTo = (index: number) =>
    setActive(Math.max(0, Math.min(count - 1, index)));

  const onPointerMove = (event: React.PointerEvent) => {
    const rect = plotRef.current?.getBoundingClientRect();
    if (!rect) return;
    moveTo(Math.floor(((event.clientX - rect.left) / rect.width) * count));
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    const current = shown ?? count - 1;
    if (event.key === "ArrowLeft") moveTo(current - 1);
    else if (event.key === "ArrowRight") moveTo(current + 1);
    else if (event.key === "Home") moveTo(0);
    else if (event.key === "End") moveTo(count - 1);
    else if (event.key === "Escape") setActive(null);
    else return;
    event.preventDefault();
  };

  const shortLine = series.lineLabel.split(" — ")[0]!;

  return (
    <div className="flow-canvas-field">
      <div
        ref={plotRef}
        className="flow-canvas-field__plot"
        role="slider"
        tabIndex={0}
        aria-label={`Six-month operating history. ${series.lineLabel}, with the value delivered each day as bars. Use arrow keys to read individual days.`}
        aria-valuemin={0}
        aria-valuemax={count - 1}
        aria-valuenow={shown ?? count - 1}
        aria-valuetext={
          shownDay
            ? `${shownDay.label}: delivered ${moneyCompact(shownDay.deliveredMinor)}, ${shortLine} ${lineValueLabel(series.line[shown!]!, series.unit)}`
            : `${annotated.label}: ${shortLine} ${lineValueLabel(series.line[annotatedIndex]!, series.unit)}`
        }
        onPointerMove={onPointerMove}
        onPointerLeave={() => setActive(null)}
        onKeyDown={onKeyDown}
        onBlur={() => setActive(null)}
      >
        <svg
          className="flow-canvas-field__svg"
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="none"
          aria-hidden
        >
          {[1, 0.5].map((fraction) => (
            <line
              key={fraction}
              className="flow-canvas-field__guide"
              x1={0}
              x2={VIEW_W}
              y1={yLine(lineMax * fraction)}
              y2={yLine(lineMax * fraction)}
            />
          ))}
          <line
            className="flow-canvas-field__guide flow-canvas-field__guide--base"
            x1={0}
            x2={VIEW_W}
            y1={PAD_TOP + PLOT_H}
            y2={PAD_TOP + PLOT_H}
          />

          {days.map((day, index) => {
            const active = day.deliveredMinor > 0;
            const height = active
              ? Math.max(barHeight(day.deliveredMinor), 3)
              : 2;
            return (
              <rect
                key={day.date}
                className={
                  day.emphasis
                    ? "flow-canvas-field__bar flow-canvas-field__bar--marked"
                    : active
                      ? "flow-canvas-field__bar"
                      : "flow-canvas-field__bar flow-canvas-field__bar--quiet"
                }
                x={x(index) - (active ? 0.65 : 0.4)}
                width={active ? 1.3 : 0.8}
                y={PAD_TOP + PLOT_H - height}
                height={height}
              />
            );
          })}

          {shown !== null ? (
            <line
              className="flow-canvas-field__cursor"
              x1={x(shown)}
              x2={x(shown)}
              y1={PAD_TOP - 6}
              y2={PAD_TOP + PLOT_H}
            />
          ) : null}

          <path className="flow-canvas-field__line" d={linePath} />

          <circle
            className="flow-canvas-field__mark"
            cx={x(annotatedIndex)}
            cy={yLine(series.line[annotatedIndex]!)}
            r={4}
          />
        </svg>

        {/* Right-hand axis for the line, in the reference's manner. */}
        <div className="flow-canvas-field__axis" aria-hidden>
          <span style={{ top: `${((yLine(lineMax) - 8) / VIEW_H) * 100}%` }}>
            {lineValueLabel(lineMax, series.unit)}
          </span>
          <span style={{ top: `${((yLine(lineMax / 2) - 8) / VIEW_H) * 100}%` }}>
            {lineValueLabel(lineMax / 2, series.unit)}
          </span>
          <span style={{ top: `${((PAD_TOP + PLOT_H - 8) / VIEW_H) * 100}%` }}>
            0
          </span>
        </div>

        {/* The single accent annotation. */}
        <div
          className="flow-canvas-field__note"
          style={{
            right: `${100 - ((x(annotatedIndex) - 14) / VIEW_W) * 100}%`,
            top: `${((yLine(series.line[annotatedIndex]!) - 10) / VIEW_H) * 100}%`,
          }}
        >
          <span className="flow-canvas-field__note-value">
            3 decisions opened
          </span>
          <span className="flow-canvas-field__note-text">
            Waiting on you today
          </span>
        </div>

        {shownDay ? (
          <div
            className={
              shown! / count > 0.62
                ? "flow-canvas-field__readout flow-canvas-field__readout--flip"
                : "flow-canvas-field__readout"
            }
            style={
              shown! / count > 0.62
                ? { right: `${100 - (x(shown!) / VIEW_W) * 100}%` }
                : { left: `${(x(shown!) / VIEW_W) * 100}%` }
            }
            role="status"
          >
            <span className="flow-canvas-field__readout-date">
              {shownDay.label}
            </span>
            <span className="flow-canvas-field__readout-row">
              Delivered · {moneyCompact(shownDay.deliveredMinor)}
            </span>
            <span className="flow-canvas-field__readout-row">
              {shortLine} · {lineValueLabel(series.line[shown!]!, series.unit)}
            </span>
            {shownDay.eventIds.slice(0, 2).map((id) => (
              <span key={id} className="flow-canvas-field__readout-event">
                {eventsById.get(id)?.summary}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flow-canvas-field__months" aria-hidden>
        {monthTicks.map((tick) => (
          <span key={tick.label} style={{ left: `${tick.leftPct}%` }}>
            {tick.label}
          </span>
        ))}
      </div>
    </div>
  );
}
