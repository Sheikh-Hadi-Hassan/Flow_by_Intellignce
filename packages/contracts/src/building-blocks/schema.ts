import type {
  BuildingBlockManifest,
  BuildingBlockRecommendation,
  WorkspaceBuildingBlockInstallation,
} from "./types.js";
import { BUILDING_BLOCK_LIFECYCLE, BUILDING_BLOCK_UI_STATES } from "./types.js";

const EXECUTABLE = /javascript:|https?:\/\/|<script|\bselect\b|\binsert\b|\bdelete\b|\bdrop\b|\bshell\b/i;

function assertSafe(value: string, label: string): void {
  if (EXECUTABLE.test(value)) {
    throw new Error(`${label} cannot contain executable code, SQL, or remote URLs.`);
  }
}

function assertUnique(values: readonly string[], label: string): void {
  if (new Set(values).size !== values.length) {
    throw new Error(`${label} must be unique.`);
  }
}

export function validateBuildingBlockManifest(
  manifest: BuildingBlockManifest,
): void {
  assertSafe(manifest.id, "Building block id");
  assertSafe(manifest.description, "Building block description");
  if (!/^[a-z0-9]+(\.[a-z0-9_]+)+$/.test(manifest.id)) {
    throw new Error("Building block id must be a dotted slug.");
  }
  if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) {
    throw new Error("Building block version must be semver.");
  }
  if (manifest.dependencies.includes(manifest.id)) {
    throw new Error("Building block cannot depend on itself.");
  }
  if (manifest.incompatibleBlocks.includes(manifest.id)) {
    throw new Error("Building block cannot be incompatible with itself.");
  }
  assertUnique(manifest.permissions, "permissions");
  assertUnique(
    manifest.aiTools.map((tool) => tool.name),
    "AI tools",
  );
  assertUnique(
    manifest.events.map((event) => `${event.direction}:${event.name}`),
    "events",
  );
  for (const state of manifest.supportedUiStates) {
    if (!BUILDING_BLOCK_UI_STATES.includes(state)) {
      throw new Error(`Unsupported UI state: ${state}`);
    }
  }
}

export function parseInstallation(
  input: unknown,
): WorkspaceBuildingBlockInstallation {
  if (typeof input !== "object" || input === null) {
    throw new Error("Installation must be an object.");
  }
  const row = input as Record<string, unknown>;
  if (
    typeof row.workspaceId !== "string" ||
    typeof row.blockId !== "string" ||
    typeof row.blockVersion !== "string" ||
    typeof row.status !== "string" ||
    typeof row.configuration !== "object" ||
    row.configuration === null ||
    Array.isArray(row.configuration)
  ) {
    throw new Error("Installation is missing required fields.");
  }
  if (
    !BUILDING_BLOCK_LIFECYCLE.includes(
      row.status as (typeof BUILDING_BLOCK_LIFECYCLE)[number],
    )
  ) {
    throw new Error("Installation status is not a valid lifecycle value.");
  }
  return row as unknown as WorkspaceBuildingBlockInstallation;
}

export function parseRecommendation(
  input: unknown,
  knownBlockIds: ReadonlySet<string>,
): BuildingBlockRecommendation {
  if (typeof input !== "object" || input === null) {
    throw new Error("Recommendation must be an object.");
  }
  const row = input as Record<string, unknown>;
  if (typeof row.blockId !== "string" || !knownBlockIds.has(row.blockId)) {
    throw new Error("Unknown building block in recommendation.");
  }
  if (typeof row.reason !== "string" || row.reason.length === 0) {
    throw new Error("Recommendation requires a reason.");
  }
  if (!Array.isArray(row.requirementEvidence)) {
    throw new Error("Recommendation requires requirement evidence.");
  }
  if (
    typeof row.recommendedConfiguration !== "object" ||
    row.recommendedConfiguration === null ||
    Array.isArray(row.recommendedConfiguration)
  ) {
    throw new Error("Recommended configuration must be an object.");
  }
  if (!Array.isArray(row.dependencies)) {
    throw new Error("Recommendation dependencies must be an array.");
  }
  if (row.confidence !== "low" && row.confidence !== "medium" && row.confidence !== "high") {
    throw new Error("Recommendation confidence is invalid.");
  }
  if (row.requiresHumanApproval !== true) {
    throw new Error("Building-block activation always requires human approval.");
  }
  return {
    blockId: row.blockId,
    reason: row.reason,
    requirementEvidence: row.requirementEvidence.map(String),
    recommendedConfiguration: row.recommendedConfiguration as Readonly<
      Record<string, unknown>
    >,
    dependencies: row.dependencies.map(String),
    confidence: row.confidence,
    risks: Array.isArray(row.risks) ? row.risks.map(String) : [],
    alternatives: Array.isArray(row.alternatives)
      ? row.alternatives.map(String)
      : [],
    requiresHumanApproval: true,
  };
}

export function rejectUnknownModelOutput(
  output: unknown,
  known: {
    readonly blockIds: ReadonlySet<string>;
    readonly permissions: ReadonlySet<string>;
    readonly stages: ReadonlySet<string>;
    readonly fields: ReadonlySet<string>;
    readonly integrations: ReadonlySet<string>;
  },
): BuildingBlockRecommendation[] {
  if (!Array.isArray(output)) {
    throw new Error("Model output must be a recommendation array.");
  }
  return output.map((row) => {
    const parsed = parseRecommendation(row, known.blockIds);
    const config = parsed.recommendedConfiguration;
    const stages = config.lifecycleStages;
    if (Array.isArray(stages)) {
      for (const stage of stages) {
        if (typeof stage !== "string" || !known.stages.has(stage)) {
          throw new Error(`Unknown lifecycle stage: ${String(stage)}`);
        }
      }
    }
    const fields = config.requiredFields;
    if (Array.isArray(fields)) {
      for (const field of fields) {
        if (typeof field !== "string" || !known.fields.has(field)) {
          throw new Error(`Unknown configuration field: ${String(field)}`);
        }
      }
    }
    const visibility = config.roleVisibility;
    if (visibility && typeof visibility === "object") {
      for (const permission of Object.values(
        visibility as Record<string, unknown>,
      ).flatMap((value) => (Array.isArray(value) ? value : []))) {
        if (typeof permission !== "string" || !known.permissions.has(permission)) {
          throw new Error(`Unknown permission: ${String(permission)}`);
        }
      }
    }
    const integrations = config.integrations;
    if (Array.isArray(integrations)) {
      for (const item of integrations) {
        if (typeof item !== "string" || !known.integrations.has(item)) {
          throw new Error(`Unknown integration: ${String(item)}`);
        }
      }
    }
    return parsed;
  });
}
