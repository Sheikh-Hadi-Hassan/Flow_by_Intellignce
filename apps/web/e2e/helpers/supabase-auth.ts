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
  await page.goto(`${input.appUrl}/sign-in`, { waitUntil: "domcontentloaded" });
  const emailField = page.getByLabel("Email");
  const passwordField = page.getByLabel("Password");
  await expect(emailField).toBeVisible();
  await expect(passwordField).toBeVisible();
  await emailField.fill(input.email);
  await passwordField.fill(input.password);
  await expect(emailField).toHaveValue(input.email);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(
    new RegExp(`/${input.workspaceSlug}/(admin|onboarding)`),
    { timeout: 30_000 },
  );
}
