import { expect, type Page } from "@playwright/test";

export async function publishQuestionnaireFromBuilder(page: Page) {
  await page.getByRole("link", { name: /open questionnaire builder/i }).click();
  await page.waitForURL(/\/questionnaire/);
  await page.getByRole("button", { name: /^publish$/i }).click();
  await page.getByRole("button", { name: /confirm publish/i }).click();
  await expect(page.getByText(/Published successfully/i)).toBeVisible({
    timeout: 30_000,
  });
}

export async function fillDefaultQuestionnaireAnswers(page: Page) {
  await page.getByLabel("Brand maturity").selectOption("emerging");
  await page.getByLabel("Primary audience").fill("Operations leaders");
  await page.getByLabel("Success metric").fill("Qualified pipeline");
  await Promise.all([
    page.waitForResponse(
      (response) => response.url().includes("/answers") && response.ok(),
    ),
    page.getByLabel("Success metric").blur(),
  ]);
}
