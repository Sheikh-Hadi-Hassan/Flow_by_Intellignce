import type { ToolDefinition } from "./tool-registry.js";

export interface OrganizationUpdateProfileInput {
  readonly workspaceId: string;
  readonly organizationId: string;
  readonly displayName?: string;
  readonly website?: string;
  readonly description?: string;
}

export interface OrganizationUpdateProfileOutput {
  readonly organizationId: string;
  readonly workspaceId: string;
  readonly displayName?: string;
  readonly website?: string;
  readonly description?: string;
}

function parseOrganizationUpdateProfileInput(
  input: unknown,
): OrganizationUpdateProfileInput {
  if (typeof input !== "object" || input === null) {
    throw new Error("organization.update_profile input must be an object.");
  }

  const candidate = input as Record<string, unknown>;
  if (
    typeof candidate.workspaceId !== "string" ||
    typeof candidate.organizationId !== "string"
  ) {
    throw new Error(
      "organization.update_profile requires workspaceId and organizationId.",
    );
  }

  return {
    workspaceId: candidate.workspaceId,
    organizationId: candidate.organizationId,
    ...(typeof candidate.displayName === "string"
      ? { displayName: candidate.displayName }
      : {}),
    ...(typeof candidate.website === "string"
      ? { website: candidate.website }
      : {}),
    ...(typeof candidate.description === "string"
      ? { description: candidate.description }
      : {}),
  };
}

function parseOrganizationUpdateProfileOutput(
  output: unknown,
): OrganizationUpdateProfileOutput {
  const parsed = parseOrganizationUpdateProfileInput(output);
  return {
    organizationId: parsed.organizationId,
    workspaceId: parsed.workspaceId,
    ...(parsed.displayName ? { displayName: parsed.displayName } : {}),
    ...(parsed.website ? { website: parsed.website } : {}),
    ...(parsed.description ? { description: parsed.description } : {}),
  };
}

export function createOrganizationUpdateProfileTool(
  updateProfile: (
    input: OrganizationUpdateProfileInput,
  ) => Promise<OrganizationUpdateProfileOutput>,
): ToolDefinition<
  OrganizationUpdateProfileInput,
  OrganizationUpdateProfileOutput
> {
  return {
    id: "organization.update_profile",
    description: "Update safe, general organization profile fields.",
    inputSchema: {
      description:
        "Object with workspaceId, organizationId, and safe profile fields.",
      parse: parseOrganizationUpdateProfileInput,
    },
    outputSchema: {
      description: "Updated organization profile result.",
      parse: parseOrganizationUpdateProfileOutput,
    },
    riskLevel: "LOW",
    requiredAction: "organization.update_profile",
    evidencePolicy: "NONE",
    approvalPolicy: {
      mode: "not-required",
      reason:
        "Safe profile updates are authorized and audited but do not require v1 approval.",
    },
    execute(input) {
      return updateProfile(parseOrganizationUpdateProfileInput(input));
    },
  };
}
