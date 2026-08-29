import { suggestedServicesFixture } from "../../content/demo/suggested-services";
import { mergeServices } from "./defaults";
import type { PrototypeSession } from "./types";

export function initServices(session: PrototypeSession): PrototypeSession {
  if (session.services.length > 0) return session;
  return {
    ...session,
    services: mergeServices(suggestedServicesFixture(), []),
  };
}
