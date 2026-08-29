import type { PrototypeSession } from "./types";
import {
  DEFAULT_ACCENT,
  parseAccent,
  parseTheme,
  resolveThemePreference,
  SESSION_STORAGE_KEY,
  THEME_STORAGE_KEY,
  type ThemeMode,
} from "./preferences";

export {
  DEFAULT_ACCENT,
  parseAccent,
  parseTheme,
  resolveThemePreference,
  SESSION_STORAGE_KEY,
  THEME_STORAGE_KEY,
  type ThemeMode,
};

function safeStorage(): Storage | null {
  try {
    if (typeof globalThis.localStorage === "undefined") return null;
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

export function loadSession(): PrototypeSession | null {
  const storage = safeStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PrototypeSession;
  } catch {
    return null;
  }
}

export function saveSession(session: PrototypeSession): void {
  const storage = safeStorage();
  if (!storage) return;
  const sanitized = sanitizeSessionForPersistence(session);
  storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sanitized));
}

const FORBIDDEN_PERSISTENCE_KEYS = new Set([
  "password",
  "passwordHash",
  "password_hash",
]);

export function sanitizeSessionForPersistence(
  session: PrototypeSession,
): PrototypeSession {
  const clone = JSON.parse(JSON.stringify(session)) as Record<string, unknown>;
  for (const key of FORBIDDEN_PERSISTENCE_KEYS) {
    delete clone[key];
  }
  return clone as unknown as PrototypeSession;
}

export function clearSession(): void {
  const storage = safeStorage();
  if (!storage) return;
  storage.removeItem(SESSION_STORAGE_KEY);
}

export function loadTheme(): ThemeMode {
  const storage = safeStorage();
  if (!storage) return "light";
  const stored = storage.getItem(THEME_STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;
  if (typeof globalThis.matchMedia === "function") {
    return resolveThemePreference(
      null,
      globalThis.matchMedia("(prefers-color-scheme: dark)").matches,
    );
  }
  return "light";
}

export function saveTheme(theme: ThemeMode): void {
  const storage = safeStorage();
  if (!storage) return;
  storage.setItem(THEME_STORAGE_KEY, theme);
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", theme);
  }
}

export function applyAccent(accent: string): void {
  if (typeof document === "undefined") return;
  const safe = parseAccent(accent);
  const root = document.documentElement;
  root.style.setProperty("--color-brand", safe);
  root.style.setProperty("--color-brand-hover", safe);
  root.style.setProperty("--color-brand-strong", safe);
  root.style.setProperty("--color-focus", safe);
  root.style.setProperty(
    "--color-brand-subtle",
    `color-mix(in srgb, ${safe} 14%, transparent)`,
  );
  root.style.setProperty(
    "--color-brand-surface",
    `color-mix(in srgb, ${safe} 10%, var(--color-bg-surface))`,
  );
  root.style.setProperty(
    "--color-brand-surface-hover",
    `color-mix(in srgb, ${safe} 16%, var(--color-bg-surface))`,
  );
  root.style.setProperty(
    "--color-brand-border",
    `color-mix(in srgb, ${safe} 38%, var(--color-border))`,
  );
}
