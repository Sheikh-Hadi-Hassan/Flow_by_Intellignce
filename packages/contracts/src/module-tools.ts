import type {
  ModuleEnableInput,
  WorkspaceModuleActivation,
} from "./module-registry.js";
import type { ToolDefinition } from "./tool-registry.js";

function parseModuleEnableInput(input: unknown): ModuleEnableInput {
  if (typeof input !== "object" || input === null) {
    throw new Error("module.enable input must be an object.");
  }
  const candidate = input as Record<string, unknown>;
  if (
    typeof candidate.workspaceId !== "string" ||
    typeof candidate.moduleKey !== "string" ||
    typeof candidate.version !== "string" ||
    typeof candidate.enabledBy !== "string"
  ) {
    throw new Error(
      "module.enable requires workspaceId, moduleKey, version, and enabledBy.",
    );
  }
  const configuration = candidate.configuration;
  if (
    configuration !== undefined &&
    (typeof configuration !== "object" ||
      configuration === null ||
      Array.isArray(configuration))
  ) {
    throw new Error("module.enable configuration must be an object.");
  }
  return {
    workspaceId: candidate.workspaceId,
    moduleKey: candidate.moduleKey,
    version: candidate.version,
    enabledBy: candidate.enabledBy,
    ...(configuration
      ? { configuration: configuration as Readonly<Record<string, unknown>> }
      : {}),
  };
}

function parseModuleActivationOutput(
  output: unknown,
): WorkspaceModuleActivation {
  if (typeof output !== "object" || output === null) {
    throw new Error("module.enable output must be an object.");
  }
  const candidate = output as Record<string, unknown>;
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.workspaceId !== "string" ||
    typeof candidate.moduleKey !== "string" ||
    typeof candidate.version !== "string" ||
    candidate.status !== "ENABLED" ||
    typeof candidate.enabledAt !== "string" ||
    typeof candidate.enabledBy !== "string" ||
    typeof candidate.updatedAt !== "string" ||
    typeof candidate.configuration !== "object" ||
    candidate.configuration === null ||
    Array.isArray(candidate.configuration)
  ) {
    throw new Error("module.enable output is invalid.");
  }
  return candidate as unknown as WorkspaceModuleActivation;
}

export function createModuleEnableTool(
  enableModule: (
    input: ModuleEnableInput,
  ) => Promise<WorkspaceModuleActivation>,
): ToolDefinition<ModuleEnableInput, WorkspaceModuleActivation> {
  return {
    id: "module.enable",
    description:
      "Enable a trusted code-defined Flow module for a workspace after authorization.",
    inputSchema: {
      description:
        "Object with workspaceId, moduleKey, version, enabledBy, and typed configuration.",
      parse: parseModuleEnableInput,
    },
    outputSchema: {
      description: "Workspace module activation result.",
      parse: parseModuleActivationOutput,
    },
    riskLevel: "MEDIUM",
    requiredAction: "module.enable",
    evidencePolicy: "NONE",
    approvalPolicy: {
      mode: "not-required",
      reason:
        "v1 module activation is controlled by permission and deterministic validation.",
    },
    execute(input) {
      return enableModule(parseModuleEnableInput(input));
    },
  };
}
