import { describe, expect, it } from "vitest";

import {
  calculateResourceCapacity,
  forecastLabourCostMinor,
  hasSkillCoverage,
  skillGap,
} from "./capacity-engine.js";

describe("capacity-engine", () => {
  const mondaySlot = {
    dayOfWeek: 1,
    startMinute: 9 * 60,
    endMinute: 17 * 60,
  };

  it("calculates scheduled minutes for a workday", () => {
    const start = Date.parse("2026-09-07T00:00:00.000Z"); // Monday UTC
    const result = calculateResourceCapacity({
      resourceId: "r1",
      timezone: "UTC",
      schedules: [mondaySlot],
      exceptions: [],
      assignments: [],
      rangeStartMs: start,
      rangeEndMs: start + 86_400_000,
    });
    expect(result.totalScheduledMinutes).toBe(480);
    expect(result.totalAvailableMinutes).toBe(480);
  });

  it("subtracts leave minutes", () => {
    const start = Date.parse("2026-09-07T00:00:00.000Z");
    const result = calculateResourceCapacity({
      resourceId: "r1",
      timezone: "UTC",
      schedules: [mondaySlot],
      exceptions: [
        {
          startsAtMs: Date.parse("2026-09-07T10:00:00.000Z"),
          endsAtMs: Date.parse("2026-09-07T14:00:00.000Z"),
        },
      ],
      assignments: [],
      rangeStartMs: start,
      rangeEndMs: start + 86_400_000,
    });
    expect(result.days[0]?.unavailableMinutes).toBe(240);
    expect(result.totalAvailableMinutes).toBe(240);
  });

  it("detects over-allocation", () => {
    const start = Date.parse("2026-09-07T00:00:00.000Z");
    const result = calculateResourceCapacity({
      resourceId: "r1",
      timezone: "UTC",
      schedules: [mondaySlot],
      exceptions: [],
      assignments: [
        {
          resourceId: "r1",
          projectId: "p1",
          taskId: "t1",
          startsAtMs: start,
          endsAtMs: start + 86_400_000,
          minutes: 600,
        },
      ],
      rangeStartMs: start,
      rangeEndMs: start + 86_400_000,
    });
    expect(result.overAllocationMinutes).toBeGreaterThan(0);
    expect(result.utilizationBps).toBe(10_000);
  });

  it("computes skill gaps", () => {
    expect(
      skillGap(
        { skillKey: "figma", minProficiencyBps: 7000 },
        [{ skillKey: "figma", proficiencyBps: 5000 }],
      ),
    ).toBe(2000);
    expect(
      hasSkillCoverage(
        [{ skillKey: "figma", minProficiencyBps: 5000 }],
        [{ skillKey: "figma", proficiencyBps: 6000 }],
      ),
    ).toBe(true);
  });

  it("forecasts labour cost with integer math", () => {
    expect(forecastLabourCostMinor(120, 15000n)).toBe(30000n);
  });
});
