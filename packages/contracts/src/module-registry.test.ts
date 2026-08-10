import { describe, expect, it } from "vitest";
import {
  commercialCoreTestModule,
  coreOrganizationModule,
  ModuleRegistry,
  proposalsTestModule,
  type ModuleDefinition,
} from "./module-registry.js";

describe("ModuleRegistry", () => {
  it("registers a system module and enforces module key uniqueness", () => {
    const registry = new ModuleRegistry([coreOrganizationModule]);

    expect(registry.getModule("core.organization")).toMatchObject({
      key: "core.organization",
      status: "ACTIVE",
    });
    expect(() => registry.register(coreOrganizationModule)).toThrow(
      "already registered",
    );
  });

  it("enables a permitted module for one workspace without affecting another", () => {
    const registry = new ModuleRegistry([coreOrganizationModule]);

    const activation = registry.enableModule({
      workspaceId: "workspace-alpha",
      moduleKey: "core.organization",
      version: "1.0.0",
      enabledBy: "flow-user-alice",
      configuration: { profileEditing: true },
    });

    expect(activation).toMatchObject({
      workspaceId: "workspace-alpha",
      moduleKey: "core.organization",
      status: "ENABLED",
    });
    expect(registry.listEnabledModules("workspace-alpha")).toHaveLength(1);
    expect(registry.listEnabledModules("workspace-beta")).toEqual([]);
  });

  it("disabled module blocks operational capability lookup", () => {
    const registry = new ModuleRegistry([coreOrganizationModule]);
    registry.enableModule({
      workspaceId: "workspace-alpha",
      moduleKey: "core.organization",
      version: "1.0.0",
      enabledBy: "flow-user-alice",
      configuration: { profileEditing: true },
    });
    registry.disableModule({
      workspaceId: "workspace-alpha",
      moduleKey: "core.organization",
    });

    expect(registry.getCapabilities("workspace-alpha")).toEqual([]);
  });

  it("prevents missing dependency activation", () => {
    const registry = new ModuleRegistry([proposalsTestModule]);

    expect(() =>
      registry.enableModule({
        workspaceId: "workspace-alpha",
        moduleKey: "test.proposals",
        version: "1.0.0",
        enabledBy: "flow-user-alice",
      }),
    ).toThrow("Missing required module dependency");
  });

  it("enables dependencies with deterministic graph validation", () => {
    const registry = new ModuleRegistry([
      commercialCoreTestModule,
      proposalsTestModule,
    ]);

    registry.enableModule({
      workspaceId: "workspace-alpha",
      moduleKey: "test.commercial_core",
      version: "1.0.0",
      enabledBy: "flow-user-alice",
    });
    registry.enableModule({
      workspaceId: "workspace-alpha",
      moduleKey: "test.proposals",
      version: "1.0.0",
      enabledBy: "flow-user-alice",
    });

    expect(registry.getCapabilities("workspace-alpha")).toEqual([
      "commercial.shared",
      "proposals.drafting",
    ]);
  });

  it("rejects self dependencies and dependency cycles", () => {
    const selfDependent: ModuleDefinition = {
      ...coreOrganizationModule,
      key: "test.self",
      dependencies: ["test.self"],
    };
    const cycleA: ModuleDefinition = {
      ...coreOrganizationModule,
      key: "test.cycle_a",
      dependencies: ["test.cycle_b"],
    };
    const cycleB: ModuleDefinition = {
      ...coreOrganizationModule,
      key: "test.cycle_b",
      dependencies: ["test.cycle_a"],
    };

    expect(() => new ModuleRegistry([selfDependent])).toThrow(
      "depend on itself",
    );
    expect(() => new ModuleRegistry([cycleA, cycleB])).toThrow("cycle");
  });

  it("rejects invalid module configuration", () => {
    const registry = new ModuleRegistry([coreOrganizationModule]);

    expect(() =>
      registry.enableModule({
        workspaceId: "workspace-alpha",
        moduleKey: "core.organization",
        version: "1.0.0",
        enabledBy: "flow-user-alice",
        configuration: { profileEditing: "yes" },
      }),
    ).toThrow("must be a boolean");
  });

  it("does not allow client-invented executable module implementations", () => {
    const malicious: ModuleDefinition = {
      ...coreOrganizationModule,
      key: "custom.bad",
      description: "https://evil.example.test/plugin.js",
    };

    expect(() => new ModuleRegistry([malicious])).toThrow("executable code");
  });

  it("keeps global module definitions separate from workspace activation state", () => {
    const registry = new ModuleRegistry([coreOrganizationModule]);
    registry.enableModule({
      workspaceId: "workspace-alpha",
      moduleKey: "core.organization",
      version: "1.0.0",
      enabledBy: "flow-user-alice",
      configuration: { profileEditing: true },
    });

    expect(registry.getModule("core.organization")).toMatchObject({
      key: "core.organization",
      version: "1.0.0",
      status: "ACTIVE",
    });
  });
});
