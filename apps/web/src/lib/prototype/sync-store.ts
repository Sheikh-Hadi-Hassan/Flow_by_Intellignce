"use client";

import { normalizeLoadedSession } from "./session-normalize";
import { parseAccent } from "./preferences";
import { applyAccent, loadSession, saveSession } from "./storage";
import type { PrototypeSession } from "./types";

const STORAGE_EVENT = "flow-prototype-storage";

type Listener = () => void;
const listeners = new Set<Listener>();

let snapshot: PrototypeSession | null = null;
let initialized = false;

function emit(): void {
  listeners.forEach((listener) => listener());
}

function refreshSnapshot(): void {
  const stored = loadSession();
  snapshot = stored ? normalizeLoadedSession(stored) : null;
  if (snapshot) {
    saveSession(snapshot);
    applyAccent(parseAccent(snapshot.accentColor));
  }
}

export function ensurePrototypeStore(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  refreshSnapshot();
}

export function getPrototypeSnapshot(): PrototypeSession | null {
  ensurePrototypeStore();
  return snapshot;
}

export function subscribePrototype(listener: Listener): () => void {
  ensurePrototypeStore();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setPrototypeSnapshot(next: PrototypeSession | null): void {
  ensurePrototypeStore();
  snapshot = next;
  if (next) {
    saveSession(next);
    applyAccent(parseAccent(next.accentColor));
  }
  emit();
}

export function patchPrototypeSnapshot(
  patch:
    | Partial<PrototypeSession>
    | ((session: PrototypeSession) => PrototypeSession),
): PrototypeSession | null {
  if (!snapshot) return null;
  const next =
    typeof patch === "function" ? patch(snapshot) : { ...snapshot, ...patch };
  setPrototypeSnapshot(next);
  return next;
}

export function clearPrototypeSnapshot(): void {
  ensurePrototypeStore();
  snapshot = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem("flow-prototype-session-v1");
  }
  emit();
}

export { STORAGE_EVENT };
