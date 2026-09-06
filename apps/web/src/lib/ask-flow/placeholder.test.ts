import { describe, expect, it } from "vitest";

import { DEFAULT_ASK_PLACEHOLDER, askPlaceholder } from "./placeholder";
import type { AskApplicationContext } from "./types";

function context(route: string, extra: Partial<AskApplicationContext> = {}) {
  return {
    workspaceId: "northstar-creative",
    userId: "user-1",
    role: "Founder",
    permissions: [],
    route,
    visibleRecordIds: [],
    locale: "en-US",
    currency: "USD",
    timezone: "America/Chicago",
    conversationId: "conv-1",
    ...extra,
  } satisfies AskApplicationContext;
}

describe("ask placeholder", () => {
  it("uses the default copy on the admin home", () => {
    expect(askPlaceholder(context("/northstar-creative/admin"))).toBe(
      DEFAULT_ASK_PLACEHOLDER,
    );
    expect(DEFAULT_ASK_PLACEHOLDER).toBe("Ask anything about your business");
  });

  it("adapts to the team route", () => {
    expect(askPlaceholder(context("/northstar-creative/admin/team"))).toBe(
      "Ask about team capacity or workload",
    );
  });

  it("adapts to the opportunities route", () => {
    expect(
      askPlaceholder(context("/northstar-creative/admin/opportunities")),
    ).toBe("Ask about pipeline health");
  });

  it("adapts to the delivery projects route", () => {
    expect(
      askPlaceholder(context("/northstar-creative/admin/lifecycle/projects")),
    ).toBe("Ask what's at risk this week");
  });

  it("adapts to a client detail route", () => {
    expect(
      askPlaceholder(
        context("/northstar-creative/admin/clients/cl-1024", {
          selectedClientId: "cl-1024",
        }),
      ),
    ).toBe("Ask anything about this client");
  });

  it("keeps the default on the clients index", () => {
    expect(askPlaceholder(context("/northstar-creative/admin/clients"))).toBe(
      DEFAULT_ASK_PLACEHOLDER,
    );
  });

  it("surfaces exposure when present regardless of route", () => {
    expect(
      askPlaceholder(
        context("/northstar-creative/admin", { exposureMinor: "1250000" }),
      ),
    ).toBe("Ask why exposure is climbing");
  });

  it("falls back to the default outside the admin area", () => {
    expect(askPlaceholder(context("/northstar-creative/work"))).toBe(
      DEFAULT_ASK_PLACEHOLDER,
    );
    expect(askPlaceholder(context("/"))).toBe(DEFAULT_ASK_PLACEHOLDER);
  });
});
