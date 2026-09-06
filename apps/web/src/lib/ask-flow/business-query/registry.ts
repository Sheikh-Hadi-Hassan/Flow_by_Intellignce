import type { CrmClientSeed } from "@flow/contracts";

import type { ResourceProfileRecord } from "../../commercial/api";
import type { MissionProject } from "../../mission-control/types";
import {
  CLIENT_FILTER_FIELDS,
  CLIENT_READABLE_FIELDS,
  createClientBusinessQueryAdapter,
} from "./client-adapter";
import {
  EMPLOYEE_FILTER_FIELDS,
  EMPLOYEE_READABLE_FIELDS,
  PROJECT_FILTER_FIELDS,
  PROJECT_READABLE_FIELDS,
  createEmployeeBusinessQueryAdapter,
  createProjectBusinessQueryAdapter,
} from "./operational-adapters";
import type { BusinessEntityDefinition } from "./types";

interface BusinessEntitySources {
  readonly clients?: readonly CrmClientSeed[];
  readonly projects?: readonly MissionProject[];
  readonly employees?: readonly ResourceProfileRecord[];
}

export function createBusinessEntityRegistry(
  sources: BusinessEntitySources = {},
): ReadonlyMap<string, BusinessEntityDefinition> {
  const client = Object.freeze<BusinessEntityDefinition>({
    id: "client",
    availability: "enabled",
    authorization: {
      mode: "building-block",
      permission: "client.read",
      buildingBlock: "crm.core",
      proof: "CRM Core manifest and list_clients server tool contract",
    },
    operations: ["list", "count"],
    readableFields: CLIENT_READABLE_FIELDS,
    filterFields: CLIENT_FILTER_FIELDS,
    sortFields: CLIENT_FILTER_FIELDS,
    fieldTypes: Object.fromEntries(
      CLIENT_READABLE_FIELDS.map((field) => [field, "string"]),
    ),
    operators: ["eq", "neq", "contains"],
    evidencePolicy: "record-per-row",
    evidenceLabel: "CRM client record",
    evidenceSource: "Northstar CRM Core demo fixture",
    adapter: createClientBusinessQueryAdapter(sources.clients),
  });
  const project = Object.freeze<BusinessEntityDefinition>({
    id: "project",
    availability: "enabled",
    authorization: {
      mode: "permission-only",
      permission: "project.manage",
      proof: "ASK_TOOL_DEFINITIONS.list_projects and missionViewer.permissions",
    },
    operations: ["list", "count"],
    readableFields: PROJECT_READABLE_FIELDS,
    filterFields: PROJECT_FILTER_FIELDS,
    sortFields: PROJECT_FILTER_FIELDS,
    fieldTypes: {
      id: "string",
      name: "string",
      clientName: "string",
      statusLabel: "string",
      healthTone: "string",
      progressBps: "number",
      nextMilestone: "string",
      dueLabel: "string",
      leadName: "string",
      href: "string",
    },
    operators: ["eq", "neq", "contains"],
    evidencePolicy: "record-per-row",
    evidenceLabel: "Project record",
    evidenceSource: "Northstar Mission Control project fixture",
    adapter: createProjectBusinessQueryAdapter(sources.projects),
  });
  const employee = Object.freeze<BusinessEntityDefinition>({
    id: "employee",
    availability: "enabled",
    authorization: {
      mode: "permission-only",
      permission: "project.manage",
      proof:
        "ASK_TOOL_DEFINITIONS.get_team_capacity and missionViewer.permissions",
    },
    operations: ["list", "count"],
    readableFields: EMPLOYEE_READABLE_FIELDS,
    filterFields: EMPLOYEE_FILTER_FIELDS,
    sortFields: EMPLOYEE_FILTER_FIELDS,
    fieldTypes: {
      id: "string",
      displayName: "string",
      resourceType: "string",
      timezone: "string",
      status: "string",
    },
    operators: ["eq", "neq", "contains"],
    evidencePolicy: "record-per-row",
    evidenceLabel: "Employee resource profile",
    evidenceSource: "Northstar resource profile demo fixture",
    adapter: createEmployeeBusinessQueryAdapter(sources.employees),
  });
  const task = Object.freeze<BusinessEntityDefinition>({
    id: "task",
    availability: "unavailable",
    reasonCode: "AUTHORITATIVE_SOURCE_MISSING",
    reason: "Task records are not available from an authoritative source yet.",
  });
  return new Map([
    [client.id, client],
    [project.id, project],
    [employee.id, employee],
    [task.id, task],
  ]);
}

export const BUSINESS_ENTITY_REGISTRY = createBusinessEntityRegistry();
