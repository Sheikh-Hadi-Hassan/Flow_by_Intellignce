import { expect, type Page } from "@playwright/test";

export async function prepareCommercialApiProxy(
  page: Page,
  input: {
    apiBase: string;
    apiAuth: Record<string, string>;
  },
) {
  await page.route(`${input.apiBase}/api/v1/**`, async (route) => {
    await route.continue({
      headers: {
        ...route.request().headers(),
        ...input.apiAuth,
      },
    });
  });
  await page.addInitScript(() => {
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { ready: Promise.resolve(), status: "loaded" },
    });
  });
}

export async function signInThroughUi(
  page: Page,
  input: {
    appUrl: string;
    email: string;
    password: string;
    workspaceSlug: string;
  },
) {
  const destination = new RegExp(`/${input.workspaceSlug}/(admin|onboarding)`);
  await page.goto(`${input.appUrl}/sign-in`, { waitUntil: "domcontentloaded" });
  if (destination.test(page.url())) {
    return;
  }

  const emailField = page.getByLabel("Email");
  const passwordField = page.getByLabel("Password");
  await expect(emailField).toBeVisible({ timeout: 30_000 });
  await expect(passwordField).toBeVisible();
  await emailField.click();
  await emailField.fill(input.email);
  await passwordField.click();
  await passwordField.fill(input.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(destination, { timeout: 60_000 });
}
