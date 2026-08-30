import { describe, expect, it } from "vitest";

import { createAutosave } from "./autosave";

describe("commercial autosave", () => {
  it("keeps the latest queued value when saves overlap", async () => {
    const writes: string[] = [];
    let releaseFirst: (() => void) | undefined;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    let calls = 0;
    const autosave = createAutosave(async (value: string) => {
      calls += 1;
      if (calls === 1) await firstGate;
      writes.push(value);
    }, 1);
    autosave.queue("a");
    await new Promise((resolve) => setTimeout(resolve, 5));
    autosave.queue("b");
    releaseFirst?.();
    await autosave.flush();
    expect(writes.at(-1)).toBe("b");
    expect(writes).toContain("a");
  });
});
