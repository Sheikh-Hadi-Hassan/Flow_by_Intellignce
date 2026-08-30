import { northstarDemoSession } from "../../content/demo/northstar";
import { NORTHSTAR_SLUG } from "./defaults";
import { initServices } from "./context-init";
import { compileTwin } from "./twin-compile";
import type { PrototypeSession } from "./types";

/** Rehydrate stored sessions so demo and compiled twins stay canonical. */
export function normalizeLoadedSession(
  stored: PrototypeSession,
): PrototypeSession {
  if (stored.mode === "demo" && stored.workspaceSlug === NORTHSTAR_SLUG) {
    const canonical = northstarDemoSession();
    return {
      ...canonical,
      deferredModuleIds:
        (stored.deferredModuleIds?.length ?? 0) > 0
          ? stored.deferredModuleIds
          : canonical.deferredModuleIds,
      accentColor: canonical.accentColor,
    };
  }

  const withServices = initServices(stored);

  if (!withServices.twinCompiled) {
    return withServices;
  }

  const twin = compileTwin(withServices);
  return { ...withServices, twin };
}
