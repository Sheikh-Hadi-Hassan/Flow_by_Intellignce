import path from "node:path";
import { writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const BASE = process.env.FLOW_WEB_URL ?? "http://localhost:3001";

const cases = [
  { name: "light-default", theme: "light", accent: "#1a56db" },
  { name: "dark-default", theme: "dark", accent: "#1a56db" },
  { name: "light-custom", theme: "light", accent: "#0d6e6e" },
  { name: "dark-custom", theme: "dark", accent: "#c2410c" },
  { name: "no-theme-invalid", theme: "sepia", accent: "orange" },
  { name: "corrupted-session", corrupt: true },
];

const routes = [
  "/",
  "/sign-up",
  "/northstar-creative/onboarding/business",
  "/northstar-creative/admin",
  "/northstar-creative/admin/twin",
  "/northstar-creative/admin/settings",
  "/northstar-creative/admin/services",
  "/northstar-creative/admin/clients",
  "/northstar-creative/admin/opportunities",
  "/northstar-creative/admin/opportunities/ns-opp-acme-brand",
  "/northstar-creative/admin/opportunities/ns-opp-acme-brand/discovery",
  "/northstar-creative/admin/opportunities/ns-opp-acme-brand/missing",
  "/northstar-creative/admin/opportunities/ns-opp-acme-brand/brief",
  "/northstar-creative/admin/opportunities/ns-opp-acme-brand/approvals",
];

async function runHomeDemoClick(browser, testCase) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];

  page.on("console", (msg) => {
    const text = msg.text();
    if (
      text.includes("Hydration") ||
      text.includes("hydration") ||
      msg.type() === "error"
    ) {
      errors.push(`[${msg.type()}] ${text}`);
    }
  });

  await page.addInitScript(
    ({ testCase: tc, slug }) => {
      if (tc.corrupt) {
        localStorage.setItem("flow-prototype-session-v1", "{not-json");
        localStorage.removeItem("flow-theme-v1");
        return;
      }
      if (tc.theme) localStorage.setItem("flow-theme-v1", tc.theme);
      if (tc.accent) {
        localStorage.setItem(
          "flow-prototype-session-v1",
          JSON.stringify({
            mode: "demo",
            workspaceSlug: slug,
            accentColor: tc.accent,
          }),
        );
      }
    },
    { testCase, slug: northstarSlug },
  );

  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("link", { name: "Explore the Northstar demo" }).click();
  await page.waitForURL(/\/northstar-creative\/admin\/?$/, {
    timeout: 15000,
  });
  await page.waitForLoadState("domcontentloaded");

  await context.close();
  return { errors };
}

const northstarSlug = "northstar-creative";

async function runCase(browser, testCase, route) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];

  page.on("console", (msg) => {
    const text = msg.text();
    if (
      text.includes("Hydration") ||
      text.includes("hydration") ||
      msg.type() === "error"
    ) {
      errors.push(`[${msg.type()}] ${text}`);
    }
  });

  await page.addInitScript(
    ({ testCase: tc, slug }) => {
      if (tc.corrupt) {
        localStorage.setItem("flow-prototype-session-v1", "{not-json");
        localStorage.removeItem("flow-theme-v1");
        return;
      }
      const session = {
        mode: "demo",
        workspaceSlug: slug,
        workspaceName: "Northstar Creative",
        accentColor: tc.accent,
        onboardingComplete: true,
        twinCompiled: true,
        business: { businessName: "Northstar Creative" },
        operations: { workModels: ["retainer"] },
        services: [{ id: "s1", name: "Brand", selected: true }],
        policies: { proposalApproval: "founder" },
        twin: {
          identity: "Northstar Creative",
          operatingModel: "Retainers",
          services: ["Brand"],
          policies: [],
          expertisePack: "Digital Agency Expertise",
          logicCoverage: [],
          completeness: 100,
          missingInformation: [],
          lastUpdated: "2026-08-29T18:00:00.000Z",
          confidence: "high",
          sourceClassification: "demo-fixture",
        },
      };
      localStorage.setItem(
        "flow-prototype-session-v1",
        JSON.stringify(session),
      );
      if (tc.theme) localStorage.setItem("flow-theme-v1", tc.theme);
    },
    { testCase, slug: northstarSlug },
  );

  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
  await page.reload({ waitUntil: "networkidle" });

  const theme = await page.evaluate(() =>
    document.documentElement.getAttribute("data-theme"),
  );
  const accent = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue(
      "--color-brand",
    ),
  );

  await context.close();
  return { errors, theme: theme?.trim(), accent: accent.trim() };
}

async function main() {
  const browser = await chromium.launch();
  const results = [];

  for (const route of routes) {
    for (const testCase of cases) {
      const result = await runCase(browser, testCase, route);
      results.push({ route, case: testCase.name, ...result });
    }
  }

  for (const testCase of cases) {
    const result = await runHomeDemoClick(browser, testCase);
    results.push({
      route: "/ (northstar demo click)",
      case: testCase.name,
      ...result,
      theme: undefined,
      accent: undefined,
    });
  }

  await browser.close();

  const failures = results.filter((r) => r.errors.length > 0);
  await writeFile(
    path.resolve(
      import.meta.dirname,
      "../.screenshots-phase1a/hydration-check.json",
    ),
    JSON.stringify({ results, failures }, null, 2),
  );

  if (failures.length > 0) {
    console.error("Hydration/console failures:", failures.length);
    for (const failure of failures.slice(0, 10)) {
      console.error(failure.route, failure.case, failure.errors);
    }
    process.exit(1);
  }

  console.log(`Hydration checks passed for ${results.length} combinations.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
