import { describe, expect, it } from "vitest";

import { detectAskLanguage } from "./language";

describe("detectAskLanguage", () => {
  it("returns en for plain English questions", () => {
    const result = detectAskLanguage("Which invoices are overdue?");
    expect(result.language).toBe("en");
    expect(result.script).toBe("latin");
  });

  it("returns ur for Urdu script questions", () => {
    const result = detectAskLanguage("مجھے بتاؤ کون سے پراجیکٹس ایکٹو ہیں؟");
    expect(result.language).toBe("ur");
    expect(result.script).toBe("arabic");
    expect(result.signals).toContain("urdu-script");
  });

  it("keeps Urdu script as ur when business names are Latin", () => {
    const result = detectAskLanguage("مجھے Vantage project کی status بتاؤ");
    expect(result.language).toBe("ur");
    expect(result.script).toBe("arabic");
  });

  it("treats Roman Urdu as ur", () => {
    const result = detectAskLanguage("Mujhe sab clients dikhao");
    expect(result.language).toBe("ur");
    expect(result.script).toBe("latin");
    expect(result.signals.some((s) => s.startsWith("roman-urdu:"))).toBe(true);
  });

  it("keeps Roman Urdu with English loan nouns as ur", () => {
    const result = detectAskLanguage("Aaj ka sales update kya hai?");
    expect(result.language).toBe("ur");
    expect(result.script).toBe("latin");
  });

  it("detects mixed Urdu-English code switching", () => {
    const result = detectAskLanguage("Mera naam kya hai in the system?");
    expect(result.language).toBe("mixed_ur_en");
  });

  it("detects mixed when an English clause and Urdu clause both appear", () => {
    const result = detectAskLanguage("What is the status? Kya deadline slip hogi?");
    expect(result.language).toBe("mixed_ur_en");
  });

  it("returns ar for Arabic script questions", () => {
    const result = detectAskLanguage("ما هي الفواتير المتأخرة؟");
    expect(result.language).toBe("ar");
    expect(result.script).toBe("arabic");
  });

  it("never returns Hindi and mirrors Devanagari input with English", () => {
    const result = detectAskLanguage("मुझे सभी invoices दिखाओ");
    expect(result.language).toBe("en");
    expect(result.script).toBe("devanagari");
    expect(result.signals).toContain("devanagari");
  });

  it("does not trip on English words that look like Urdu markers", () => {
    expect(detectAskLanguage("Show me the mile long list").language).toBe("en");
    expect(detectAskLanguage("What is the status of the Vantage project?").language).toBe("en");
    expect(detectAskLanguage("Please list all overdue invoices").language).toBe("en");
  });

  it("uses the locale hint only for a single weak Roman Urdu marker", () => {
    expect(detectAskLanguage("Salam", "ur-PK").language).toBe("ur");
    expect(detectAskLanguage("Salam").language).toBe("ur");
    expect(detectAskLanguage("Karachi office", "en-US").language).toBe("en");
  });

  it("defaults to en for empty or numeric input", () => {
    expect(detectAskLanguage("").language).toBe("en");
    expect(detectAskLanguage("12345").language).toBe("en");
  });
});
