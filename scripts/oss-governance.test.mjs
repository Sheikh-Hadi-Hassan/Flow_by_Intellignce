import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { URL } from "node:url";

import {
  findForbiddenOssUsage,
  findProviderBoundaryViolations,
  validateOssRegistry,
  verifyOssGovernance,
} from "./oss-governance.mjs";

const registry = JSON.parse(
  readFileSync(
    new URL("../docs/oss/oss-foundations.json", import.meta.url),
    "utf8",
  ),
);

test("the checked-in OSS registry and integration source pass governance", () => {
  assert.deepEqual(verifyOssGovernance(), []);
});

test("floating refs and version ranges fail closed", () => {
  const invalid = JSON.parse(JSON.stringify(registry));
  invalid.foundations[0].sourceRef = "refs/heads/main";
  invalid.foundations[0].version = "^2.38.1";
  invalid.foundations[0].commit = "2f318d5";
  assert.deepEqual(validateOssRegistry(invalid), [
    "twenty-crm must use an exact release tag ref",
    "twenty-crm must use a full commit SHA",
    "twenty-crm must use an exact version",
    "twenty-crm must link its license at the pinned commit",
  ]);
});

test("Twenty enterprise-marked source fails closed", () => {
  const marker = ["@license", "Enterprise"].join(" ");
  const violations = findForbiddenOssUsage(
    [{ path: "packages/flow-crm/provider.ts", content: `/* ${marker} */` }],
    registry,
  );
  assert.match(violations.join("\n"), /prohibited twenty-crm license marker/);
});

test("Documenso enterprise source references fail closed", () => {
  const prefix = ["packages", "ee", "server-only"].join("/");
  const violations = findForbiddenOssUsage(
    [{ path: "packages/flow-sign/provider.ts", content: `import ${prefix}` }],
    registry,
  );
  assert.match(violations.join("\n"), /prohibited documenso-ce source path/);
});

test("official remotes and provider authority cannot be expanded", () => {
  const invalid = JSON.parse(JSON.stringify(registry));
  invalid.foundations[1].upstreamRemote =
    "https://github.com/example/penpot.git";
  invalid.foundations[1].providerAuthority.push("proposal_truth");
  assert.deepEqual(validateOssRegistry(invalid), [
    "penpot must preserve its official upstream Git remote",
    "penpot must retain its approved authority boundary",
    "competing authority owner: proposal_truth",
  ]);
});

test("UI and route code cannot bypass Flow application services", () => {
  expectBoundaryViolation("apps/web/src/lib/direct-crm.ts");
  expectBoundaryViolation("apps/api/src/crm.controller.ts");
  assert.deepEqual(
    findProviderBoundaryViolations([
      {
        path: "apps/api/src/crm/crm.service.ts",
        content: "createFlowProviderReadContext()",
      },
      {
        path: "apps/api/src/providers/twenty/adapter.ts",
        content: "implements FlowCrmProvider",
      },
    ]),
    [],
  );
  assert.match(
    findProviderBoundaryViolations([
      {
        path: "apps/api/src/crm/crm.service.ts",
        content: "createUniversalToolExecutionContext()",
      },
    ]).join("\n"),
    /only the Universal Execution Spine may issue provider mutation authority/,
  );
});

function expectBoundaryViolation(path) {
  assert.match(
    findProviderBoundaryViolations([
      { path, content: "createFlowProviderReadContext()" },
    ]).join("\n"),
    /provider contracts may only be used by server application services/,
  );
}
