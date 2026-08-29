import { readFileSync } from "node:fs";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.FLOW_WEB_URL ?? "http://localhost:3001";
const OUT = path.resolve(import.meta.dirname, "../.screenshots-phase1a");

async function clearPrototypeState(page) {
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    localStorage.removeItem("flow-prototype-session-v1");
    localStorage.removeItem("flow-theme-v1");
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.style.removeProperty("--color-brand");
    document.documentElement.style.removeProperty("--color-brand-hover");
    document.documentElement.style.removeProperty("--color-brand-strong");
    document.documentElement.style.removeProperty("--color-brand-subtle");
    document.documentElement.style.removeProperty("--color-brand-surface");
    document.documentElement.style.removeProperty(
      "--color-brand-surface-hover",
    );
    document.documentElement.style.removeProperty("--color-brand-border");
    document.documentElement.style.removeProperty("--color-focus");
  });
}

async function capture(page, name, url, options = {}) {
  if (options.theme) {
    await page.evaluate((theme) => {
      localStorage.setItem("flow-theme-v1", theme);
      document.documentElement.setAttribute("data-theme", theme);
    }, options.theme);
  }
  await page.goto(url, { waitUntil: "networkidle" });
  if (options.waitMs) await page.waitForTimeout(options.waitMs);
  await page.screenshot({
    path: path.join(OUT, name),
    fullPage: options.fullPage ?? false,
  });
}

async function seedNorthstarDemo(page) {
  await clearPrototypeState(page);
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const demoButton = page.getByRole("button", {
    name: "Explore the Northstar demo",
  });
  await demoButton.waitFor({ state: "visible" });
  await demoButton.click();
  await page.waitForURL("**/northstar-creative/admin", { timeout: 60_000 });
  await page.waitForLoadState("networkidle");
}

async function buildContactSheet(page, outputName, tiles) {
  const tileData = [];
  for (const tile of tiles) {
    const buffer = await readFileSync(path.join(OUT, tile.file));
    tileData.push({
      label: tile.label,
      dataUrl: `data:image/png;base64,${buffer.toString("base64")}`,
    });
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 24px; font-family: system-ui, sans-serif; background: #f4f5f7; }
    h1 { font-size: 18px; margin: 0 0 16px; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; max-width: 1440px; }
    figure { margin: 0; background: #fff; border: 1px solid #d9dee7; border-radius: 8px; overflow: hidden; }
    figcaption { padding: 8px 12px; font-size: 12px; font-weight: 600; border-bottom: 1px solid #e8ebf0; }
    img { display: block; width: 100%; height: auto; }
  </style>
</head>
<body>
  <h1>${outputName}</h1>
  <div class="grid">
    ${tileData
      .map(
        (tile) => `<figure>
      <figcaption>${tile.label}</figcaption>
      <img src="${tile.dataUrl}" alt="${tile.label}" />
    </figure>`,
      )
      .join("")}
  </div>
</body>
</html>`;

  const sheetPath = path.join(OUT, `_${outputName}.html`);
  await writeFile(sheetPath, html);
  await page.setViewportSize({ width: 1500, height: 1200 });
  await page.goto(`file://${sheetPath}`, { waitUntil: "load" });
  await page.screenshot({
    path: path.join(OUT, outputName),
    fullPage: true,
  });
  await unlink(sheetPath);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();

  const desktop = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const desktopPage = await desktop.newPage();

  await clearPrototypeState(desktopPage);
  await capture(desktopPage, "01-public-entry-desktop.png", `${BASE}/`);
  // Sign-up screenshot omitted: never capture password fields in screenshots.

  await seedNorthstarDemo(desktopPage);

  await capture(
    desktopPage,
    "04-onboarding-services-desktop.png",
    `${BASE}/northstar-creative/onboarding/services`,
  );
  await capture(
    desktopPage,
    "05-onboarding-review-desktop.png",
    `${BASE}/northstar-creative/onboarding/review`,
  );
  await capture(
    desktopPage,
    "06-founder-home-light.png",
    `${BASE}/northstar-creative/admin`,
    { theme: "light" },
  );
  await capture(
    desktopPage,
    "07-founder-home-dark.png",
    `${BASE}/northstar-creative/admin`,
    { theme: "dark" },
  );
  await capture(
    desktopPage,
    "08-twin-page.png",
    `${BASE}/northstar-creative/admin/twin`,
    { theme: "dark" },
  );
  await capture(
    desktopPage,
    "09-setup-recommendations.png",
    `${BASE}/northstar-creative/admin/setup`,
    { theme: "dark" },
  );
  await capture(
    desktopPage,
    "10-settings-theme-accent.png",
    `${BASE}/northstar-creative/admin/settings`,
    { theme: "dark" },
  );

  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  const mobilePage = await mobile.newPage();
  await seedNorthstarDemo(mobilePage);
  await capture(
    mobilePage,
    "03-onboarding-business-mobile.png",
    `${BASE}/northstar-creative/onboarding/business`,
    { fullPage: true, theme: "light" },
  );
  await capture(
    mobilePage,
    "11-mobile-founder-navigation.png",
    `${BASE}/northstar-creative/admin`,
    { fullPage: true, theme: "light" },
  );

  const mobilePublic = await mobile.newPage();
  await clearPrototypeState(mobilePublic);
  await capture(mobilePublic, "12-public-entry-mobile.png", `${BASE}/`, {
    fullPage: true,
  });

  const sheetPage = await desktop.newPage();
  await buildContactSheet(sheetPage, "00-contact-sheet-public-onboarding.png", [
    { label: "01 Public entry (desktop)", file: "01-public-entry-desktop.png" },
    {
      label: "03 Onboarding business (mobile)",
      file: "03-onboarding-business-mobile.png",
    },
    {
      label: "04 Onboarding services (desktop)",
      file: "04-onboarding-services-desktop.png",
    },
    {
      label: "05 Onboarding review (desktop)",
      file: "05-onboarding-review-desktop.png",
    },
    { label: "12 Public entry (mobile)", file: "12-public-entry-mobile.png" },
  ]);
  await buildContactSheet(sheetPage, "00-contact-sheet-founder-product.png", [
    { label: "06 Founder home (light)", file: "06-founder-home-light.png" },
    { label: "07 Founder home (dark)", file: "07-founder-home-dark.png" },
    { label: "08 Business Twin", file: "08-twin-page.png" },
    { label: "09 Setup recommendations", file: "09-setup-recommendations.png" },
    {
      label: "10 Settings theme and accent",
      file: "10-settings-theme-accent.png",
    },
    {
      label: "11 Mobile founder navigation",
      file: "11-mobile-founder-navigation.png",
    },
  ]);

  await browser.close();
  console.log(`Captured screenshots in ${OUT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
