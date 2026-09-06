import type { ResourceProfileRecord } from "../../commercial/api";
import { northstarTeamSeed } from "../../commercial/northstar-store";
import { missionProjects } from "../../mission-control/seed";
import type { MissionProject } from "../../mission-control/types";
import type { BusinessQueryAdapter } from "./types";

export const PROJECT_READABLE_FIELDS = [
  "id",
  "name",
  "clientName",
  "statusLabel",
  "healthTone",
  "progressBps",
  "nextMilestone",
  "dueLabel",
  "leadName",
  "href",
] as const;

export const PROJECT_FILTER_FIELDS = [
  "id",
  "name",
  "clientName",
  "statusLabel",
  "healthTone",
  "progressBps",
  "leadName",
] as const;

export const EMPLOYEE_READABLE_FIELDS = [
  "id",
  "displayName",
  "resourceType",
  "roleKeys",
  "timezone",
  "status",
] as const;

export const EMPLOYEE_FILTER_FIELDS = [
  "id",
  "displayName",
  "resourceType",
  "timezone",
  "status",
] as const;

export function createProjectBusinessQueryAdapter(
  projects: readonly MissionProject[] = missionProjects,
): BusinessQueryAdapter {
  return {
    load: () =>
      projects.map((row) => ({
        id: row.id,
        name: row.name,
        clientName: row.clientName,
        statusLabel: row.statusLabel,
        healthTone: row.healthTone,
        progressBps: row.progressBps,
        nextMilestone: row.nextMilestone,
        dueLabel: row.dueLabel,
        leadName: row.leadName,
        href: row.href,
      })),
  };
}

export function createEmployeeBusinessQueryAdapter(
  resources: readonly ResourceProfileRecord[] = northstarTeamSeed(),
): BusinessQueryAdapter {
  return {
    load: () =>
      resources
        .filter((row) => row.resourceType === "employee")
        .map((row) => ({
          id: row.id,
          displayName: row.displayName,
          resourceType: row.resourceType,
          roleKeys: row.roleKeys,
          timezone: row.timezone,
          status: row.status,
        })),
  };
}
