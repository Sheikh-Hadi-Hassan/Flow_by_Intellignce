"use client";

import { parseTheme, type ThemeMode } from "../prototype/preferences";
import { saveTheme } from "../prototype/storage";

type Listener = () => void;
const listeners = new Set<Listener>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function getThemeSnapshot(): ThemeMode {
  if (typeof document === "undefined") return "light";
  return parseTheme(document.documentElement.getAttribute("data-theme"));
}

export function subscribeTheme(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setThemePreference(next: ThemeMode): void {
  saveTheme(next);
  emit();
}
