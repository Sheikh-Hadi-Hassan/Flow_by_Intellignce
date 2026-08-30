import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";

import { prepareAuthenticatedPage } from "./helpers/supabase-auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SECRET_KEY;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const e2ePassword = process.env.E2E_TEST_PASSWORD;

const canRun =
  Boolean(supabaseUrl && serviceKey && publishableKey && e2ePassword) &&
  process.env.FLOW_E2E_COMMERCIAL === "1";

test.describe("authenticated commercial golden path", () => {
  test.skip(!canRun, "Set FLOW_E2E_COMMERCIAL=1 and E2E credentials to run.");

  test.describe.configure({ mode: "serial" });

  test("completes discovery to immutable approved brief", async ({
    page,
  }) => {
    const runId = randomUUID().slice(0, 8);
    const email = `e2e-commercial-${runId}@flow-phase2.test`;
    const workspaceName = `E2E Commercial ${runId}`;
    const consoleErrors: string[] = [];
    const failedRequests: string[] = [];

    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });
    page.on("requestfailed", (request) => {
      failedRequests.push(`${request.method()} ${request.url()}`);
    });

    const admin = createClient(supabaseUrl!, serviceKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const anon = createClient(supabaseUrl!, publishableKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const created = await admin.auth.admin.createUser({
      email,
      password: e2ePassword!,
      email_confirm: true,
      user_metadata: { first_name: "E2E", workspace_name: workspaceName },
    });
    expect(created.error).toBeNull();
    const userId = created.data.user!.id;

    try {
      const signedIn = await anon.auth.signInWithPassword({
        email,
        password: e2ePassword!,
      });
      expect(signedIn.error).toBeNull();
      const token = signedIn.data.session!.access_token;
      const provision = await (
        await fetch(`${apiBase}/api/v1/workspaces/provision`, {
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
      ).json();
      const workspaceId = provision.workspace.id;
      const slug = provision.workspace.slug;
      const apiAuth = {
        Authorization: `Bearer ${token}`,
        "x-flow-workspace-id": workspaceId,
        "Content-Type": "application/json",
      };
      await fetch(`${apiBase}/api/v1/workspaces/${workspaceId}/onboarding`, {
        method: "PATCH",
        headers: apiAuth,
        body: JSON.stringify({
          countryCode: "US",
          currencyCode: "USD",
          businessName: "E2E Agency",
          businessType: "creative_marketing_agency",
        }),
      });
      await fetch(`${apiBase}/api/v1/workspaces/${workspaceId}/onboarding/complete`, {
        method: "POST",
        headers: apiAuth,
      });

      await prepareAuthenticatedPage(page, signedIn.data.session!, {
        supabaseUrl: supabaseUrl!,
        appUrl,
        apiBase,
        apiAuth,
      });
      await page.goto(`/${slug}/admin/services`, { waitUntil: "domcontentloaded" });
      await expect(page.getByLabel("Service name")).toBeVisible({
        timeout: 30_000,
      });

      const workspace = slug;
      await page.getByLabel("Service name").fill(`E2E Service ${runId}`);
      await page.getByRole("button", { name: "Create service" }).click();
      await page.waitForURL(/\/admin\/services\//);
      await page.getByRole("button", { name: "Save service" }).click();
      await expect(page.getByRole("status")).toContainText(/saved/i);
      await page.getByRole("button", { name: "Publish questionnaire" }).click();
      await expect(page.getByText("Questionnaire published")).toBeVisible();

      await page.goto(`/${workspace}/admin/clients`);
      await page.getByLabel(/client name/i).fill(`E2E Client ${runId}`);
      await page.getByLabel(/primary contact first name/i).fill("E2E");
      await page.getByLabel(/primary contact last name/i).fill("Tester");
      await page.getByRole("button", { name: /create client/i }).click();

      await page.goto(`/${workspace}/admin/opportunities`);
      await page
        .getByLabel(/opportunity name|name/i)
        .first()
        .fill(`E2E Opportunity ${runId}`);
      await page.getByRole("button", { name: /create opportunity/i }).click();
      await page.waitForURL(/\/admin\/opportunities\//);

      const opportunityUrl = page.url();

      await page.getByLabel("Brand maturity").selectOption("emerging");
      await page.getByLabel("Primary audience").fill("Operations leaders");
      await page.getByLabel("Success metric").fill("Qualified pipeline");
      await page.waitForTimeout(800);

      await page.goto(`${opportunityUrl}/discovery`);
      await page
        .getByLabel("Meeting notes")
        .fill(
          "Audience: plant managers. Budget: $85000. Timeline is 90 days. Legal review blocking must complete before approval.",
        );
      await page.getByRole("button", { name: /save notes/i }).click();
      await page.getByRole("button", { name: "Verify" }).first().click();
      await page.getByRole("button", { name: "Reject" }).nth(1).click();

      await page.goto(`${opportunityUrl}/missing`);
      const followUp = page.getByRole("textbox").first();
      await followUp.fill("Founder");
      await page.getByRole("button", { name: "Save answer" }).click();

      await page.goto(opportunityUrl);
      await page.getByRole("button", { name: "Mark handled" }).click();
      await page
        .getByRole("button", { name: /run deterministic calculation/i })
        .click();
      await expect(page.getByText(/recommended price/i)).toBeVisible();

      await page.goto(`${opportunityUrl}/brief`);
      await page.getByRole("button", { name: /generate brief/i }).click();
      await page.getByRole("button", { name: /founder review/i }).click();

      await page.goto(`${opportunityUrl}/approvals`);
      await page.getByRole("button", { name: /request changes/i }).click();
      await page.goto(`${opportunityUrl}/brief`);
      await page.getByRole("button", { name: /revised version/i }).click();
      await page.getByRole("button", { name: /founder review/i }).click();
      await page.goto(`${opportunityUrl}/approvals`);
      await page
        .getByRole("button", { name: /approve immutable brief/i })
        .click();
      await expect(page.getByText("approved")).toBeVisible();

      await page.reload();
      await expect(page.getByText("approved")).toBeVisible();

      const session = await admin.auth.admin.getUserById(userId);
      expect(session.data.user?.email).toBe(email);

      expect(
        consoleErrors,
        `console errors: ${consoleErrors.join("; ")}`,
      ).toEqual([]);
      expect(
        failedRequests.filter((row) => !row.includes("favicon")),
        `failed requests: ${failedRequests.join("; ")}`,
      ).toEqual([]);
    } finally {
      await admin.auth.admin.deleteUser(userId);
    }
  });
});
