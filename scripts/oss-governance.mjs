import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const registryPath = join(root, "docs/oss/oss-foundations.json");
const requiredFoundations = new Map([
  [
    "twenty-crm",
    {
      remote: "https://github.com/twentyhq/twenty.git",
      contract: "FlowCrmProvider",
      authority: ["company", "contact", "opportunity"],
      status: "read_adapter_implemented_runtime_pending",
    },
  ],
  [
    "penpot",
    {
      remote: "https://github.com/penpot/penpot.git",
      contract: "FlowStudioProvider",
      authority: ["design_assets", "visual_layout"],
      status: "governed_not_integrated",
    },
  ],
  [
    "documenso-ce",
    {
      remote: "https://github.com/documenso/documenso.git",
      contract: "FlowSigningProvider",
      authority: ["signature_evidence", "signature_execution"],
      status: "governed_not_integrated",
    },
  ],
]);
const floatingRef = /(?:^|\/)(?:main|master|latest|nightly|dev)$/i;
const rangedVersion = /[~^*xX]|\s/;
const providerBoundarySymbols = [
  "FlowCrmProvider",
  "FlowStudioProvider",
  "FlowSigningProvider",
  "createFlowProviderReadContext",
  "createFlowProviderMutationContext",
];
const executionContextIssuer = "createUniversalToolExecutionContext";

export function validateOssRegistry(registry) {
  const errors = [];
  if (registry.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (registry.legalReviewRequiredBeforeCommercialRelease !== true) {
    errors.push("commercial release must require legal review");
  }
  if (registry.runtimePolicy?.maxConcurrentHeavyProfiles !== 1) {
    errors.push("only one heavy OSS profile may run at a time");
  }

  const foundations = Array.isArray(registry.foundations)
    ? registry.foundations
    : [];
  const ids = new Set();
  const externalAuthority = new Set();
  const flowAuthority = new Set(registry.flowAuthority ?? []);
  for (const foundation of foundations) {
    const required = requiredFoundations.get(foundation.id);
    if (!required) {
      errors.push(`unknown foundation: ${foundation.id ?? "missing"}`);
    }
    if (ids.has(foundation.id))
      errors.push(`duplicate foundation: ${foundation.id}`);
    ids.add(foundation.id);
    if (foundation.required !== true)
      errors.push(`${foundation.id} must be required`);
    if (foundation.status !== required?.status) {
      errors.push(`${foundation.id} has an unapproved integration status`);
    }
    if (foundation.upstreamRemote !== required?.remote) {
      errors.push(
        `${foundation.id} must preserve its official upstream Git remote`,
      );
    }
    if (
      !foundation.sourceRef?.startsWith("refs/tags/") ||
      floatingRef.test(foundation.sourceRef)
    ) {
      errors.push(`${foundation.id} must use an exact release tag ref`);
    }
    if (!/^[a-f0-9]{40}$/.test(foundation.commit ?? "")) {
      errors.push(`${foundation.id} must use a full commit SHA`);
    }
    if (!foundation.version || rangedVersion.test(foundation.version)) {
      errors.push(`${foundation.id} must use an exact version`);
    }
    if (
      !foundation.license?.spdx ||
      !foundation.license?.pinnedSource?.includes(`/${foundation.commit}/`)
    ) {
      errors.push(
        `${foundation.id} must link its license at the pinned commit`,
      );
    }
    if (!foundation.selfHost?.method || !foundation.selfHost?.profile) {
      errors.push(
        `${foundation.id} must define a self-host method and profile`,
      );
    }
    if (foundation.flowContract !== required?.contract) {
      errors.push(`${foundation.id} must use its approved Flow contract`);
    }
    const authority = [...(foundation.providerAuthority ?? [])].sort();
    if (
      JSON.stringify(authority) !== JSON.stringify(required?.authority ?? [])
    ) {
      errors.push(
        `${foundation.id} must retain its approved authority boundary`,
      );
    }
    for (const authority of foundation.providerAuthority ?? []) {
      if (externalAuthority.has(authority))
        errors.push(`duplicate provider authority: ${authority}`);
      if (flowAuthority.has(authority))
        errors.push(`competing authority owner: ${authority}`);
      externalAuthority.add(authority);
    }
    if (
      foundation.license?.mixed === true &&
      (foundation.forbiddenSourcePrefixes?.length ?? 0) === 0 &&
      (foundation.forbiddenMarkers?.length ?? 0) === 0
    ) {
      errors.push(
        `${foundation.id} must define its commercial-source exclusions`,
      );
    }
  }

  for (const id of requiredFoundations.keys()) {
    if (!ids.has(id)) errors.push(`missing mandatory foundation: ${id}`);
  }

  for (const item of registry.supportingOss ?? []) {
    if (!item.id || !item.version || rangedVersion.test(item.version)) {
      errors.push(
        `supporting OSS must use exact versions: ${item.id ?? "missing"}`,
      );
    }
    if (!item.license || !item.pinSource) {
      errors.push(
        `supporting OSS must record license and pin source: ${item.id ?? "missing"}`,
      );
    }
  }
  return errors;
}

export function findForbiddenOssUsage(files, registry) {
  const violations = [];
  for (const file of files) {
    for (const foundation of registry.foundations) {
      for (const prefix of foundation.forbiddenSourcePrefixes ?? []) {
        if (file.path.includes(prefix) || file.content.includes(prefix)) {
          violations.push(
            `${file.path}: prohibited ${foundation.id} source path ${prefix}`,
          );
        }
      }
      for (const marker of foundation.forbiddenMarkers ?? []) {
        if (file.content.includes(marker)) {
          violations.push(
            `${file.path}: prohibited ${foundation.id} license marker`,
          );
        }
      }
    }
  }
  return violations;
}

export function findProviderBoundaryViolations(files) {
  return files.flatMap((file) => {
    const isTest = /\.(?:test|spec)\.(?:ts|mjs)$/.test(file.path);
    const issuerAllowed =
      file.path === "packages/contracts/src/tool-registry.ts" ||
      file.path === "packages/contracts/src/execution-engine.ts" ||
      isTest ||
      file.path.startsWith("scripts/oss-governance");
    if (file.content.includes(executionContextIssuer) && !issuerAllowed) {
      return [
        `${file.path}: only the Universal Execution Spine may issue provider mutation authority`,
      ];
    }
    const usesBoundary = providerBoundarySymbols.some((symbol) =>
      file.content.includes(symbol),
    );
    const allowed =
      file.path === "packages/contracts/src/provider-contracts.ts" ||
      file.path === "packages/contracts/src/execution-engine.ts" ||
      file.path === "packages/contracts/src/tool-registry.ts" ||
      isTest ||
      file.path.startsWith("scripts/oss-governance") ||
      file.path.startsWith("packages/provider-") ||
      file.path.includes("/providers/") ||
      file.path.endsWith(".service.ts");
    return usesBoundary && !allowed
      ? [
          `${file.path}: provider contracts may only be used by server application services or provider adapters`,
        ]
      : [];
  });
}

function trackedIntegrationFiles(repositoryRoot) {
  const output = execFileSync(
    "git",
    [
      "ls-files",
      "-z",
      "--cached",
      "--others",
      "--exclude-standard",
      "--",
      "apps",
      "packages",
      "services",
      "scripts",
      "vendor",
      "external",
    ],
    { cwd: repositoryRoot },
  );
  return output
    .toString()
    .split("\0")
    .filter(Boolean)
    .map((path) => {
      const content = readFileSync(join(repositoryRoot, path));
      return {
        path,
        content: content.includes(0) ? "" : content.toString("utf8"),
      };
    });
}

export function verifyOssGovernance(repositoryRoot = root) {
  const path = join(repositoryRoot, relative(root, registryPath));
  const registry = JSON.parse(readFileSync(path, "utf8"));
  const integrationFiles = trackedIntegrationFiles(repositoryRoot);
  return [
    ...validateOssRegistry(registry),
    ...findForbiddenOssUsage(integrationFiles, registry),
    ...findProviderBoundaryViolations(integrationFiles),
  ];
}

export function verifyRemotePins(registry) {
  const errors = [];
  for (const foundation of registry.foundations) {
    let output;
    try {
      output = execFileSync(
        "git",
        [
          "ls-remote",
          "--refs",
          foundation.upstreamRemote,
          foundation.sourceRef,
        ],
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      ).trim();
    } catch {
      errors.push(`${foundation.id}: upstream ref could not be verified`);
      continue;
    }
    const resolved = output.split(/\s+/)[0];
    if (resolved !== foundation.commit) {
      errors.push(
        `${foundation.id}: upstream ref does not resolve to pinned commit`,
      );
    }
  }
  return errors;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const registry = JSON.parse(readFileSync(registryPath, "utf8"));
  const errors = [
    ...verifyOssGovernance(),
    ...(process.argv.includes("--verify-remotes")
      ? verifyRemotePins(registry)
      : []),
  ];
  if (errors.length > 0) {
    for (const error of errors) console.error(`OSS governance: ${error}`);
    process.exitCode = 1;
  } else {
    console.log(
      `OSS governance: PASS (${registry.foundations.length} foundations, ${registry.supportingOss.length} supporting pins)`,
    );
  }
}
