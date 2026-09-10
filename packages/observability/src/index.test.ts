import { describe, expect, it } from "vitest";
import { createServerTraceContext } from "./index.js";

describe("W3C trace context", () => {
  it("keeps a valid parent trace ID and creates a new server span", () => {
    const parent = "00-11111111111111111111111111111111-2222222222222222-01";
    const trace = createServerTraceContext({
      traceparent: parent,
      tracestate: "flow=test",
    });

    expect(trace.traceId).toBe("11111111111111111111111111111111");
    expect(trace.spanId).not.toBe("2222222222222222");
    expect(trace.traceparent).toMatch(
      /^00-11111111111111111111111111111111-[0-9a-f]{16}-01$/,
    );
    expect(trace.tracestate).toBe("flow=test");
  });

  it("replaces invalid context and drops unsafe tracestate", () => {
    const trace = createServerTraceContext({
      traceparent: "00-00000000000000000000000000000000-0000000000000000-01",
      tracestate: "bad\nheader",
    });

    expect(trace.traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-00$/);
    expect(trace.traceId).not.toBe("00000000000000000000000000000000");
    expect(trace.tracestate).toBeUndefined();
  });
});
