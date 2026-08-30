import { createClient, type Session } from "@supabase/supabase-js";
import { expect } from "@playwright/test";
import { randomUUID } from "node:crypto";

export interface ProvisionedCommercialWorkspace {
  readonly runId: string;
  readonly email: string;
  readonly password: string;
  readonly userId: string;
  readonly workspaceId: string;
  readonly slug: string;
  readonly token: string;
  readonly session: Session;
  readonly apiAuth: Record<string, string>;
}

export async function provisionCommercialWorkspace(input: {
  readonly supabaseUrl: string;
  readonly serviceKey: string;
  readonly publishableKey: string;
  readonly apiBase: string;
  readonly password: string;
}): Promise<ProvisionedCommercialWorkspace> {
  const runId = randomUUID().slice(0, 8);
  const email = `e2e-commercial-${runId}@flow-phase2.test`;
  const workspaceName = `E2E Commercial ${runId}`;

  const admin = createClient(input.supabaseUrl, input.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const anon = createClient(input.supabaseUrl, input.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const created = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { first_name: "E2E", workspace_name: workspaceName },
  });
  expect(created.error).toBeNull();
  const userId = created.data.user!.id;

  const signedIn = await anon.auth.signInWithPassword({
    email,
    password: input.password,
  });
  expect(signedIn.error).toBeNull();
  const session = signedIn.data.session!;
  const token = session.access_token;

  const provision = (await (
    await fetch(`${input.apiBase}/api/v1/workspaces/provision`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        firstName: "E2E",
        workspaceName,
        email,
      }),
    })
  ).json()) as { workspace: { id: string; slug: string } };
  const workspaceId = provision.workspace.id;
  const slug = provision.workspace.slug;
  const apiAuth = {
    Authorization: `Bearer ${token}`,
    "x-flow-workspace-id": workspaceId,
    "Content-Type": "application/json",
  };

  const onboardingRes = await fetch(
    `${input.apiBase}/api/v1/workspaces/${workspaceId}/onboarding`,
    {
      method: "PATCH",
      headers: apiAuth,
      body: JSON.stringify({
        business: {
          businessName: "E2E Agency",
          businessType: "creative_marketing_agency",
          country: "US",
          currency: "USD",
        },
      }),
    },
  );
  expect(onboardingRes.ok).toBeTruthy();

  const completeRes = await fetch(
    `${input.apiBase}/api/v1/workspaces/${workspaceId}/onboarding/complete`,
    { method: "POST", headers: apiAuth },
  );
  expect(completeRes.ok).toBeTruthy();

  return {
    runId,
    email,
    password: input.password,
    userId,
    workspaceId,
    slug,
    token,
    session,
    apiAuth,
  };
}

export async function deleteProvisionedUser(input: {
  readonly supabaseUrl: string;
  readonly serviceKey: string;
  readonly userId: string;
}) {
  const admin = createClient(input.supabaseUrl, input.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  await admin.auth.admin.deleteUser(input.userId);
}
