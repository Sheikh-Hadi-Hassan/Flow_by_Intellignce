/**
 * Display helpers for Mission Control.
 *
 * Money arrives as minor units in a string (the Flow convention) and is only
 * converted for display. The locale is pinned so screenshots are reproducible
 * regardless of the machine running them.
 */

import type { Money } from "./types";

const LOCALE = "en-US";

/** Minor units to a whole-unit number. Safe for display sizes; not for maths. */
function toMajor(money: Money): number {
  return Number(BigInt(money.minor)) / 100;
}

export function formatMoney(money: Money): string {
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: money.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(toMajor(money));
}

/** Headline form: $404.9K, $1.2M — keeps large numbers scannable in the field. */
export function formatMoneyCompact(money: Money): string {
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: money.currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(toMajor(money));
}

export function formatBps(bps: number): string {
  return `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)}%`;
}

export function formatCount(count: number): string {
  return new Intl.NumberFormat(LOCALE).format(count);
}

export function formatHours(minutes: number): string {
  const hours = minutes / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)}h`;
}

export function pluralize(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

/**
 * Permission scopes are machine identifiers. A founder should never be shown
 * `workspace.mission_control`, so name what the scope actually lets someone do.
 */
const PERMISSION_LABELS: Readonly<Record<string, string>> = {
  "opportunity.read": "reading opportunities",
  "opportunity.manage": "managing opportunities",
  "proposal.approve": "approving proposals",
  "contract.approve": "approving contracts",
  "finance.read": "reading finance",
  "finance.approve": "approving spend",
  "project.manage": "managing projects",
  "workspace.mission_control": "the full workspace operating picture",
};

export function permissionLabel(scope: string): string {
  return PERMISSION_LABELS[scope] ?? scope.replace(/[._]/g, " ");
}

/** "a, b and c" — reads as a sentence rather than a serialised array. */
export function joinReadable(parts: readonly string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]!}`;
}
