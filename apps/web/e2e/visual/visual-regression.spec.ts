import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const northstarSlug = "northstar-creative";
const approvalMarker = join(
  process.cwd(),
  "../../.cursor/quality/visual-baseline-approved.json",
);

function isBaselineApproved() {
  if (!existsSync(approvalMarker)) return false;
  try {
    const data = JSON.parse(readFileSync(approvalMarker, "utf8"));
    return data.approved === true;
  } catch {
    return false;
  }
}

test.describe("visual regression", () => {
  test.use({
    viewport: { width: 1440, height: 900 },
    colorScheme: "light",
  });

  test("requires product-owner baseline approval marker", () => {
    if (!isBaselineApproved()) {
      test.skip(true, "Visual baseline not approved by product owner");
    }
  });

  test("mission control matches approved snapshot", async ({ page }) => {
    test.skip(!isBaselineApproved(), "Baseline not approved");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`${appUrl}/${northstarSlug}/admin`, { waitUntil: "networkidle" });
    await expect(page).toHaveScreenshot("mission-control-1440-light.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });
});
