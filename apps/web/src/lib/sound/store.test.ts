import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  SOUND_STORAGE_KEY,
  loadSoundPreference,
  parseSoundPreference,
  setSoundPreference,
  subscribeSound,
} from "./store";

function stubStorage() {
  const store: Record<string, string> = {};
  const mockStorage = {
    getItem(key: string) {
      return store[key] ?? null;
    },
    setItem(key: string, value: string) {
      store[key] = value;
    },
    removeItem(key: string) {
      delete store[key];
    },
  };
  vi.stubGlobal("localStorage", mockStorage);
  return store;
}

describe("sound preference store", () => {
  beforeEach(() => {
    stubStorage();
  });

  it("defaults to on for missing or invalid values", () => {
    expect(parseSoundPreference(null)).toBe("on");
    expect(parseSoundPreference(undefined)).toBe("on");
    expect(parseSoundPreference("on")).toBe("on");
    expect(parseSoundPreference("off")).toBe("off");
    expect(parseSoundPreference("garbage")).toBe("on");
    expect(loadSoundPreference()).toBe("on");
  });

  it("round-trips the preference through storage", () => {
    setSoundPreference("off");
    expect(localStorage.getItem(SOUND_STORAGE_KEY)).toBe("off");
    expect(loadSoundPreference()).toBe("off");
    setSoundPreference("on");
    expect(loadSoundPreference()).toBe("on");
  });

  it("notifies subscribers when the preference changes", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeSound(listener);
    setSoundPreference("off");
    expect(listener).toHaveBeenCalledTimes(1);
    setSoundPreference("on");
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    setSoundPreference("off");
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("defaults to on when storage is unavailable", () => {
    vi.stubGlobal(
      "localStorage",
      Object.defineProperty({}, "getItem", {
        get() {
          throw new Error("blocked");
        },
      }),
    );
    expect(loadSoundPreference()).toBe("on");
  });
});
