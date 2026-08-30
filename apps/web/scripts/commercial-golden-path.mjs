import path from "node:path";
import { writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const BASE = process.env.FLOW_WEB_URL ?? "http://localhost:3000";
const SLUG = "northstar-creative";
const OPP = "ns-opp-acme-brand";

const demoSession = {
  mode: "demo",
  workspaceSlug: SLUG,
  workspaceName: "Northstar Creative",
  accentColor: "#1a56db",
  onboardingComplete: true,
  twinCompiled: true,
  business: { businessName: "Northstar Creative" },
  operations: { workModels: ["retainer"] },
  services: [{ id: "s1", name: "Brand Strategy & Identity", selected: true }],
  policies: { proposalApproval: "founder" },
  twin: {
    identity: "Northstar Creative",
    operatingModel: "Retainers",
    services: ["Brand Strategy & Identity"],
    policies: [],
    expertisePack: "Digital Agency Expertise",
    logicCoverage: [],
    completeness: 100,
    missingInformation: [],
    lastUpdated: "2026-08-30T18:00:00.000Z",
    confidence: "high",
    sourceClassification: "demo-fixture",
  },
};

async function runTheme(theme) {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" || /hydrat/i.test(msg.text())) {
      errors.push(`[${msg.type()}] ${msg.text()}`);
    }
  });
  await page.addInitScript(
    ({ session, themeName }) => {
      localStorage.setItem("flow-prototype-session-v1", JSON.stringify(session));
      localStorage.setItem("flow-theme-v1", themeName);
      sessionStorage.removeItem("flow-northstar-commercial-v1");
    },
    { session: demoSession, themeName: theme },
  );

  await page.goto(`${BASE}/${SLUG}/admin/services`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Services" }).waitFor();
  await page.goto(`${BASE}/${SLUG}/admin/clients`, { waitUntil: "networkidle" });
  await page.getByText("Acme Robotics").waitFor();
  await page.goto(`${BASE}/${SLUG}/admin/opportunities/${OPP}`, {
    waitUntil: "networkidle",
  });
  await page.getByLabel("Brand maturity").selectOption("emerging");
  await page.getByLabel("Primary audience").fill(
    "Plant managers and operations directors",
  );
  await page.getByLabel("Success metric").fill("Shortlist conversion");
  await page.getByRole("button", { name: "Run deterministic calculation" }).click();

  await page.goto(`${BASE}/${SLUG}/admin/opportunities/${OPP}/discovery`, {
    waitUntil: "networkidle",
  });
  await page.getByRole("button", { name: "Save notes and extract drafts" }).click();
  await page.getByRole("button", { name: "Verify" }).first().waitFor();
  while ((await page.getByRole("button", { name: "Verify" }).count()) > 0) {
    await page.getByRole("button", { name: "Verify" }).first().click();
    await page.waitForTimeout(100);
  }

  await page.goto(`${BASE}/${SLUG}/admin/opportunities/${OPP}/missing`, {
    waitUntil: "networkidle",
  });
  await page.getByLabel("Who internally approves the brief?").fill("Maya Chen, founder");
  await page.getByRole("button", { name: "Save answer" }).click();

  await page.goto(`${BASE}/${SLUG}/admin/opportunities/${OPP}`, {
    waitUntil: "networkidle",
  });
  await page.getByRole("button", { name: "Run deterministic calculation" }).click();
  await page.getByText("Recommended price:").waitFor();

  await page.goto(`${BASE}/${SLUG}/admin/opportunities/${OPP}/brief`, {
    waitUntil: "networkidle",
  });
  await page.getByRole("button", { name: "Generate brief version" }).click();
  await page.getByRole("button", { name: "Request founder review" }).click();

  await page.goto(`${BASE}/${SLUG}/admin/opportunities/${OPP}/approvals`, {
    waitUntil: "networkidle",
  });
  await page.getByRole("button", { name: "Approve immutable brief" }).click();
  await page.getByText("Approved").first().waitFor();

  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("Approved").first().waitFor();

  for (const width of [320, 375, 430, 768, 1440]) {
    await page.setViewportSize({ width, height: 800 });
    await page.getByRole("heading", { name: "Founder review" }).waitFor();
  }

  const overlay = await page.evaluate(
    () =>
      document.querySelector("[data-nextjs-dialog]") ? "ERROR_OVERLAY" : "OK",
  );
  await browser.close();
  return { theme, errors, overlay };
}

async function main() {
  const results = [];
  for (const theme of ["light", "dark"]) {
    results.push(await runTheme(theme));
  }
  const out = path.resolve(
    import.meta.dirname,
    "../.screenshots-phase1a/phase2-golden-path.json",
  );
  await writeFile(out, JSON.stringify({ results }, null, 2));
  const failed = results.filter(
    (row) => row.errors.length > 0 || row.overlay !== "OK",
  );
  if (failed.length > 0) {
    console.error(failed);
    process.exit(1);
  }
  console.log("Phase 2 Northstar golden path passed for light and dark.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
