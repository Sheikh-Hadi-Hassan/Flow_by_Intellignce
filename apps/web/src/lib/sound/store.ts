"use client";

import { useCallback, useSyncExternalStore } from "react";

import { useClientHydrated } from "../prototype/hydration";

export const SOUND_STORAGE_KEY = "flow-sound-v1";

export type SoundPreference = "on" | "off";

export function parseSoundPreference(
  value: string | null | undefined,
): SoundPreference {
  return value === "off" ? "off" : "on";
}

function safeStorage(): Storage | null {
  try {
    if (typeof globalThis.localStorage === "undefined") return null;
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

export function loadSoundPreference(): SoundPreference {
  const storage = safeStorage();
  if (!storage) return "on";
  try {
    return parseSoundPreference(storage.getItem(SOUND_STORAGE_KEY));
  } catch {
    return "on";
  }
}

export function saveSoundPreference(next: SoundPreference): void {
  const storage = safeStorage();
  if (!storage) return;
  try {
    storage.setItem(SOUND_STORAGE_KEY, next);
  } catch {
    // Storage unavailable (private mode/quota) — preference stays session-only.
  }
}

type Listener = () => void;
const listeners = new Set<Listener>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function subscribeSound(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setSoundPreference(next: SoundPreference): void {
  saveSoundPreference(next);
  emit();
}

export function useSoundPreference(): {
  sound: SoundPreference;
  setSound: (next: SoundPreference) => void;
} {
  const hydrated = useClientHydrated();
  const stored = useSyncExternalStore(
    subscribeSound,
    loadSoundPreference,
    (): SoundPreference => "on",
  );
  const sound = hydrated ? stored : "on";
  const setSound = useCallback((next: SoundPreference) => {
    setSoundPreference(next);
  }, []);
  return { sound, setSound };
}
