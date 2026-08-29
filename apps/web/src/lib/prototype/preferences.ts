/** Phase 1A preference parsing — shared by runtime, blocking script, and tests. */

export type ThemeMode = "light" | "dark";

export const THEME_STORAGE_KEY = "flow-theme-v1";
export const SESSION_STORAGE_KEY = "flow-prototype-session-v1";
export const DEFAULT_ACCENT = "#1a56db";

const ACCENT_PATTERN = /^#[0-9a-fA-F]{6}$/;

export function parseTheme(value: string | null | undefined): ThemeMode {
  if (value === "dark" || value === "light") return value;
  return "light";
}

export function parseAccent(value: string | null | undefined): string {
  if (value && ACCENT_PATTERN.test(value)) return value;
  return DEFAULT_ACCENT;
}

export function resolveThemePreference(
  stored: string | null,
  prefersDark = false,
): ThemeMode {
  if (stored === "dark" || stored === "light") return stored;
  return prefersDark ? "dark" : "light";
}

export function readAccentFromSessionJson(raw: string | null): string {
  if (!raw) return DEFAULT_ACCENT;
  try {
    const parsed = JSON.parse(raw) as { accentColor?: unknown };
    return parseAccent(
      typeof parsed.accentColor === "string" ? parsed.accentColor : null,
    );
  } catch {
    return DEFAULT_ACCENT;
  }
}
