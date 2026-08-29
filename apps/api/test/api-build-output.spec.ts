import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

describe("API build output", () => {
  it("emits main.js at the Nest entry path", () => {
    const apiRoot = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "..",
    );
    const mainPath = path.join(apiRoot, "dist", "main.js");
    expect(existsSync(mainPath)).toBe(true);
  });
});
