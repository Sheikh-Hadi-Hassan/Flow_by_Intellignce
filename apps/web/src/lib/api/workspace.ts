import { apiRequest } from "../api/client";
import type { WorkspaceApiBundle } from "../workspace/map-api-session";

export interface ProvisionWorkspaceResponse {
  readonly workspace: {
    readonly id: string;
    readonly slug: string;
    readonly name: string;
  };
  readonly created: boolean;
  readonly slug: string;
}

export async function provisionWorkspace(input: {
  readonly token: string;
  readonly firstName: string;
  readonly workspaceName: string;
  readonly email?: string;
}): Promise<ProvisionWorkspaceResponse> {
  return apiRequest<ProvisionWorkspaceResponse>(
    "/api/v1/workspaces/provision",
    {
      method: "POST",
      token: input.token,
      body: {
        firstName: input.firstName,
        workspaceName: input.workspaceName,
        ...(input.email ? { email: input.email } : {}),
      },
    },
  );
}

export async function fetchWorkspaceBundle(input: {
  readonly token: string;
  readonly slug: string;
  readonly workspaceId?: string;
  readonly includeTwin?: boolean;
}): Promise<WorkspaceApiBundle> {
  const bundle = await apiRequest<WorkspaceApiBundle>(
    `/api/v1/workspaces/by-slug/${encodeURIComponent(input.slug)}`,
    {
      token: input.token,
      ...(input.workspaceId ? { workspaceId: input.workspaceId } : {}),
    },
  );

  const workspaceId = input.workspaceId ?? bundle.workspace.id;
  if (!input.includeTwin || !bundle.onboarding?.completedAt) {
    return bundle;
  }

  try {
    const twin = await apiRequest<NonNullable<WorkspaceApiBundle["twin"]>>(
      `/api/v1/workspaces/${workspaceId}/twin`,
      {
        token: input.token,
        workspaceId,
      },
    );
    return { ...bundle, twin };
  } catch {
    return bundle;
  }
}

export async function updateWorkspaceOnboarding(input: {
  readonly token: string;
  readonly workspaceId: string;
  readonly patch: Record<string, unknown>;
}): Promise<unknown> {
  return apiRequest(`/api/v1/workspaces/${input.workspaceId}/onboarding`, {
    method: "PATCH",
    token: input.token,
    workspaceId: input.workspaceId,
    body: input.patch,
  });
}

export async function completeWorkspaceOnboarding(input: {
  readonly token: string;
  readonly workspaceId: string;
}): Promise<unknown> {
  return apiRequest(
    `/api/v1/workspaces/${input.workspaceId}/onboarding/complete`,
    {
      method: "POST",
      token: input.token,
      workspaceId: input.workspaceId,
    },
  );
}

export async function updateWorkspaceSettings(input: {
  readonly token: string;
  readonly workspaceId: string;
  readonly workspaceName?: string;
  readonly preferences?: Record<string, string | undefined>;
}): Promise<unknown> {
  return apiRequest(`/api/v1/workspaces/${input.workspaceId}/settings`, {
    method: "PATCH",
    token: input.token,
    workspaceId: input.workspaceId,
    body: {
      ...(input.workspaceName ? { workspaceName: input.workspaceName } : {}),
      ...input.preferences,
    },
  });
}
