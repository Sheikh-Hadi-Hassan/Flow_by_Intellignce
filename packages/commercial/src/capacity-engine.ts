/** Deterministic capacity calculations — integer minutes and basis points only. */

export interface WorkingScheduleSlot {
  readonly dayOfWeek: number; // 0=Sunday … 6=Saturday
  readonly startMinute: number; // 0–1439
  readonly endMinute: number; // 1–1440, exclusive end
}

export interface AvailabilityException {
  readonly startsAtMs: number;
  readonly endsAtMs: number;
}

export interface CommittedAssignment {
  readonly resourceId: string;
  readonly projectId: string;
  readonly taskId: string;
  readonly startsAtMs: number;
  readonly endsAtMs: number;
  readonly minutes: number;
}

export interface CapacityInput {
  readonly resourceId: string;
  readonly timezone: string;
  readonly schedules: readonly WorkingScheduleSlot[];
  readonly exceptions: readonly AvailabilityException[];
  readonly assignments: readonly CommittedAssignment[];
  readonly rangeStartMs: number;
  readonly rangeEndMs: number;
}

export interface DayCapacity {
  readonly dateKey: string; // YYYY-MM-DD in resource timezone
  readonly scheduledMinutes: number;
  readonly unavailableMinutes: number;
  readonly committedMinutes: number;
  readonly availableMinutes: number;
  readonly utilizationBps: number;
  readonly overAllocationMinutes: number;
}

export interface ResourceCapacityResult {
  readonly resourceId: string;
  readonly days: readonly DayCapacity[];
  readonly totalScheduledMinutes: number;
  readonly totalAvailableMinutes: number;
  readonly totalCommittedMinutes: number;
  readonly utilizationBps: number;
  readonly overAllocationMinutes: number;
}

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;

function dateKeyInTimezone(ms: number, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(ms));
  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${d}`;
}

function dayOfWeekInTimezone(ms: number, timeZone: string): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(new Date(ms));
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[weekday] ?? 0;
}

function scheduledMinutesForDay(
  schedules: readonly WorkingScheduleSlot[],
  dayOfWeek: number,
): number {
  return schedules
    .filter((slot) => slot.dayOfWeek === dayOfWeek)
    .reduce((sum, slot) => sum + Math.max(0, slot.endMinute - slot.startMinute), 0);
}

function overlapMinutes(
  rangeStart: number,
  rangeEnd: number,
  blockStart: number,
  blockEnd: number,
): number {
  const start = Math.max(rangeStart, blockStart);
  const end = Math.min(rangeEnd, blockEnd);
  if (end <= start) return 0;
  return Math.floor((end - start) / MS_PER_MINUTE);
}

function utilizationBps(committed: number, capacity: number): number {
  if (capacity <= 0) {
    return committed > 0 ? 10_000 : 0;
  }
  return Math.min(10_000, Math.floor((committed * 10_000) / capacity));
}

export function calculateResourceCapacity(
  input: CapacityInput,
): ResourceCapacityResult {
  const days: DayCapacity[] = [];
  let cursor = input.rangeStartMs;
  let totalScheduled = 0;
  let totalAvailable = 0;
  let totalCommitted = 0;

  while (cursor < input.rangeEndMs) {
    const key = dateKeyInTimezone(cursor, input.timezone);
    const dow = dayOfWeekInTimezone(cursor, input.timezone);
    const dayStart = cursor;
    const dayEnd = Math.min(cursor + MS_PER_DAY, input.rangeEndMs);

    const scheduled = scheduledMinutesForDay(input.schedules, dow);
    let unavailable = 0;
    for (const ex of input.exceptions) {
      unavailable += overlapMinutes(dayStart, dayEnd, ex.startsAtMs, ex.endsAtMs);
    }
    unavailable = Math.min(unavailable, scheduled);

    let committed = 0;
    for (const assignment of input.assignments) {
      if (assignment.resourceId !== input.resourceId) continue;
      committed += overlapMinutes(
        dayStart,
        dayEnd,
        assignment.startsAtMs,
        assignment.endsAtMs,
      );
    }

    const available = Math.max(0, scheduled - unavailable - committed);
    const overAlloc = Math.max(0, committed + unavailable - scheduled);

    days.push({
      dateKey: key,
      scheduledMinutes: scheduled,
      unavailableMinutes: unavailable,
      committedMinutes: committed,
      availableMinutes: available,
      utilizationBps: utilizationBps(
        Math.min(committed, Math.max(0, scheduled - unavailable)),
        scheduled - unavailable,
      ),
      overAllocationMinutes: overAlloc,
    });

    totalScheduled += scheduled;
    totalAvailable += available;
    totalCommitted += committed;
    cursor = dayEnd;
  }

  const effectiveCapacity = Math.max(0, totalScheduled - days.reduce((s, d) => s + d.unavailableMinutes, 0));
  return {
    resourceId: input.resourceId,
    days,
    totalScheduledMinutes: totalScheduled,
    totalAvailableMinutes: totalAvailable,
    totalCommittedMinutes: totalCommitted,
    utilizationBps: utilizationBps(totalCommitted, effectiveCapacity),
    overAllocationMinutes: days.reduce((s, d) => s + d.overAllocationMinutes, 0),
  };
}

export interface SkillRequirement {
  readonly skillKey: string;
  readonly minProficiencyBps: number;
}

export interface ResourceSkill {
  readonly skillKey: string;
  readonly proficiencyBps: number;
}

export function skillGap(
  required: SkillRequirement,
  skills: readonly ResourceSkill[],
): number {
  const match = skills.find((s) => s.skillKey === required.skillKey);
  if (!match) return required.minProficiencyBps;
  return Math.max(0, required.minProficiencyBps - match.proficiencyBps);
}

export function hasSkillCoverage(
  requirements: readonly SkillRequirement[],
  skills: readonly ResourceSkill[],
): boolean {
  return requirements.every((req) => skillGap(req, skills) === 0);
}

export function forecastLabourCostMinor(
  minutes: number,
  rateMinorPerHour: bigint,
): bigint {
  if (minutes <= 0 || rateMinorPerHour <= 0n) return 0n;
  return (BigInt(minutes) * rateMinorPerHour) / 60n;
}
