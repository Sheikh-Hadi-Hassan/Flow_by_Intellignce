import { describe, expect, it } from "vitest";

import {
  DEFAULT_ACCENT,
  parseAccent,
  parseTheme,
  readAccentFromSessionJson,
  resolveThemePreference,
} from "./preferences";

describe("prototype preferences", () => {
  it("parses valid theme values", () => {
    expect(parseTheme("light")).toBe("light");
    expect(parseTheme("dark")).toBe("dark");
  });

  it("falls back invalid theme values to light", () => {
    expect(parseTheme("sepia")).toBe("light");
    expect(parseTheme(null)).toBe("light");
    expect(parseTheme(undefined)).toBe("light");
  });

  it("resolves theme preference with system fallback", () => {
    expect(resolveThemePreference(null, false)).toBe("light");
    expect(resolveThemePreference(null, true)).toBe("dark");
    expect(resolveThemePreference("invalid", true)).toBe("dark");
    expect(resolveThemePreference("dark", false)).toBe("dark");
  });

  it("parses valid accent colors", () => {
    expect(parseAccent("#c2410c")).toBe("#c2410c");
    expect(parseAccent("#1A56DB")).toBe("#1A56DB");
  });

  it("falls back invalid accent colors to default", () => {
    expect(parseAccent("orange")).toBe(DEFAULT_ACCENT);
    expect(parseAccent("#fff")).toBe(DEFAULT_ACCENT);
    expect(parseAccent(null)).toBe(DEFAULT_ACCENT);
  });

  it("reads accent from stored session json safely", () => {
    expect(
      readAccentFromSessionJson(JSON.stringify({ accentColor: "#0d6e6e" })),
    ).toBe("#0d6e6e");
    expect(readAccentFromSessionJson("{bad json")).toBe(DEFAULT_ACCENT);
    expect(readAccentFromSessionJson(null)).toBe(DEFAULT_ACCENT);
    expect(
      readAccentFromSessionJson(JSON.stringify({ accentColor: "blue" })),
    ).toBe(DEFAULT_ACCENT);
  });
});
