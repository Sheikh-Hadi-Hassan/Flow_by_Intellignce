/** Approved Northstar demo clock. Seeds must not call Date.now(). */
export const NORTHSTAR_DEMO_CLOCK_ISO = "2026-09-03T08:12:00-05:00";
export const NORTHSTAR_DEMO_TIMEZONE = "America/Chicago";

export function northstarDemoClock(): Date {
  return new Date(NORTHSTAR_DEMO_CLOCK_ISO);
}

export function northstarDemoClockIso(): string {
  return NORTHSTAR_DEMO_CLOCK_ISO;
}

/** Calendar date (YYYY-MM-DD) in America/Chicago for an offset from the demo clock. */
export function demoClockDateOffset(days: number): string {
  const clock = northstarDemoClock();
  const shifted = new Date(clock.getTime() + days * 86_400_000);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: NORTHSTAR_DEMO_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(shifted);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) {
    throw new Error("Demo clock date formatting failed.");
  }
  return `${year}-${month}-${day}`;
}

export type RenewalUrgency = "valid" | "due_30" | "due_90" | "recently_renewed";

export function renewalUrgencyFromDates(input: {
  readonly effectiveDate: string;
  readonly expiryOrReviewDate?: string;
  readonly recentlyRenewedWithinDays?: number;
}): RenewalUrgency {
  const clock = northstarDemoClock();
  const clockDay = Date.parse(`${demoClockDateOffset(0)}T12:00:00-05:00`);
  if (input.expiryOrReviewDate) {
    const expiry = Date.parse(`${input.expiryOrReviewDate}T12:00:00-05:00`);
    const days = Math.round((expiry - clockDay) / 86_400_000);
    if (days >= 0 && days <= 30) return "due_30";
    if (days > 30 && days <= 90) return "due_90";
  }
  const effective = Date.parse(`${input.effectiveDate}T12:00:00-05:00`);
  const sinceEffective = Math.round((clock.getTime() - effective) / 86_400_000);
  const window = input.recentlyRenewedWithinDays ?? 30;
  if (sinceEffective >= 0 && sinceEffective <= window) return "recently_renewed";
  return "valid";
}
