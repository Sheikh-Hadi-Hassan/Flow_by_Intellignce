import {
  calculateResourceCapacity,
  hasSkillCoverage,
  type CommittedAssignment,
  type ResourceCapacityResult,
  type ResourceSkill,
  type SkillRequirement,
  type WorkingScheduleSlot,
  type AvailabilityException,
} from "./capacity-engine.js";

export interface RecommendableResource {
  readonly id: string;
  readonly displayName: string;
  readonly roleKeys: readonly string[];
  readonly skills: readonly ResourceSkill[];
  readonly timezone: string;
  readonly schedules: readonly WorkingScheduleSlot[];
  readonly exceptions: readonly AvailabilityException[];
  readonly internalRateMinor?: bigint;
  readonly resourceType: "employee" | "contractor";
}

export interface RecommendationTask {
  readonly taskId: string;
  readonly taskKey: string;
  readonly roleKey: string;
  readonly estimatedMinutes: number;
  readonly skillRequirements: readonly SkillRequirement[];
  readonly rangeStartMs: number;
  readonly rangeEndMs: number;
}

export interface RecommendationFactor {
  readonly key: string;
  readonly label: string;
  readonly score: number;
  readonly included: boolean;
  readonly detail: string;
}

export interface AssignmentRecommendation {
  readonly taskId: string;
  readonly roleKey: string;
  readonly resourceId: string;
  readonly resourceName: string;
  readonly rank: number;
  readonly confidenceBps: number;
  readonly factors: readonly RecommendationFactor[];
  readonly excludedReason?: string;
}

export interface RecommendationResult {
  readonly recommendations: readonly AssignmentRecommendation[];
  readonly skillGaps: readonly { readonly taskId: string; readonly skillKey: string; readonly gapBps: number }[];
  readonly noSafeRecommendation: boolean;
}

function roleMatches(resource: RecommendableResource, roleKey: string): boolean {
  return resource.roleKeys.includes(roleKey);
}

function scoreResource(
  resource: RecommendableResource,
  task: RecommendationTask,
  capacity: ResourceCapacityResult,
  existingAssignments: readonly CommittedAssignment[],
): { score: number; factors: RecommendationFactor[]; excluded?: string } {
  const factors: RecommendationFactor[] = [];

  if (!roleMatches(resource, task.roleKey)) {
    factors.push({
      key: "role",
      label: "Required role",
      score: 0,
      included: false,
      detail: `Does not hold role ${task.roleKey}`,
    });
    return { score: -1, factors, excluded: "role_mismatch" };
  }
  factors.push({
    key: "role",
    label: "Required role",
    score: 100,
    included: true,
    detail: `Holds role ${task.roleKey}`,
  });

  const skillOk = hasSkillCoverage(task.skillRequirements, resource.skills);
  factors.push({
    key: "skills",
    label: "Skill proficiency",
    score: skillOk ? 100 : 0,
    included: skillOk,
    detail: skillOk
      ? "Meets all skill requirements"
      : "Skill gap detected",
  });
  if (!skillOk) {
    return { score: -1, factors, excluded: "skill_gap" };
  }

  const available = capacity.totalAvailableMinutes;
  const fits = available >= task.estimatedMinutes;
  factors.push({
    key: "capacity",
    label: "Available capacity",
    score: fits ? Math.min(100, Math.floor((available * 100) / Math.max(task.estimatedMinutes, 1))) : 0,
    included: fits,
    detail: fits
      ? `${available} minutes available for ${task.estimatedMinutes} required`
      : `Only ${available} minutes available; need ${task.estimatedMinutes}`,
  });

  const continuity = existingAssignments.some(
    (a) => a.resourceId === resource.id && a.projectId !== undefined,
  );
  factors.push({
    key: "continuity",
    label: "Project continuity",
    score: continuity ? 20 : 0,
    included: true,
    detail: continuity
      ? "Already assigned on related work"
      : "No prior assignment on this project",
  });

  const overAlloc = capacity.overAllocationMinutes > 0;
  if (overAlloc) {
    factors.push({
      key: "over_allocation",
      label: "Over-allocation warning",
      score: -50,
      included: true,
      detail: `${capacity.overAllocationMinutes} minutes over capacity`,
    });
  }

  const score =
    factors.filter((f) => f.included).reduce((s, f) => s + f.score, 0) -
    (overAlloc ? 50 : 0);

  if (!fits) {
    return { score, factors, excluded: "insufficient_capacity" };
  }
  return { score, factors };
}

export function generateAssignmentRecommendations(input: {
  readonly resources: readonly RecommendableResource[];
  readonly tasks: readonly RecommendationTask[];
  readonly existingAssignments: readonly CommittedAssignment[];
}): RecommendationResult {
  const recommendations: AssignmentRecommendation[] = [];
  const skillGaps: { taskId: string; skillKey: string; gapBps: number }[] = [];

  for (const task of input.tasks) {
    const ranked: { resource: RecommendableResource; score: number; factors: RecommendationFactor[] }[] = [];

    for (const resource of input.resources) {
      const capacity = calculateResourceCapacity({
        resourceId: resource.id,
        timezone: resource.timezone,
        schedules: resource.schedules,
        exceptions: resource.exceptions,
        assignments: input.existingAssignments,
        rangeStartMs: task.rangeStartMs,
        rangeEndMs: task.rangeEndMs,
      });

      const { score, factors, excluded } = scoreResource(
        resource,
        task,
        capacity,
        input.existingAssignments,
      );

      if (excluded && excluded !== "insufficient_capacity") {
        recommendations.push({
          taskId: task.taskId,
          roleKey: task.roleKey,
          resourceId: resource.id,
          resourceName: resource.displayName,
          rank: 0,
          confidenceBps: 0,
          factors,
          excludedReason: excluded,
        });
        continue;
      }

      if (score >= 0) {
        ranked.push({ resource, score, factors });
      }
    }

    ranked.sort((a, b) => b.score - a.score);

    ranked.forEach((entry, index) => {
      const confidenceBps = Math.min(
        10_000,
        Math.max(0, Math.floor((entry.score * 10_000) / 220)),
      );
      recommendations.push({
        taskId: task.taskId,
        roleKey: task.roleKey,
        resourceId: entry.resource.id,
        resourceName: entry.resource.displayName,
        rank: index + 1,
        confidenceBps,
        factors: entry.factors,
      });
    });

    if (ranked.length === 0) {
      for (const req of task.skillRequirements) {
        skillGaps.push({
          taskId: task.taskId,
          skillKey: req.skillKey,
          gapBps: req.minProficiencyBps,
        });
      }
    }
  }

  const hasAnyRank1 = recommendations.some((r) => r.rank === 1 && !r.excludedReason);
  return {
    recommendations,
    skillGaps,
    noSafeRecommendation: !hasAnyRank1,
  };
}
