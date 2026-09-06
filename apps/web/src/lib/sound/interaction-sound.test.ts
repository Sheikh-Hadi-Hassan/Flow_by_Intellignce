import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  __resetInteractionSoundForTests,
  playInteractionSound,
  type InteractionSoundEvent,
} from "./interaction-sound";
import { setSoundPreference } from "./store";

interface FakeOscillator {
  readonly type: string;
  readonly frequency: {
    setValueAtTime: (value: number, time: number) => void;
    exponentialRampToValueAtTime: (value: number, time: number) => void;
  };
  readonly start: (time: number) => void;
  readonly stop: (time: number) => void;
  readonly connect: (node: unknown) => void;
  readonly rampTargets: number[];
  readonly startTimes: number[];
  readonly stopTimes: number[];
}

interface FakeGainNode {
  readonly gain: {
    setValueAtTime: (value: number, time: number) => void;
    exponentialRampToValueAtTime: (value: number, time: number) => void;
  };
  readonly connect: (node: unknown) => void;
  readonly rampValues: number[];
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  readonly oscillators: FakeOscillator[] = [];
  readonly gainNodes: FakeGainNode[] = [];
  currentTime = 0;
  state: "running" | "suspended" = "running";
  readonly resume = vi.fn(() => Promise.resolve());
  readonly destination = { destination: true };

  constructor() {
    FakeAudioContext.instances.push(this);
  }

  createOscillator(): FakeOscillator {
    const rampTargets: number[] = [];
    const startTimes: number[] = [];
    const stopTimes: number[] = [];
    const oscillator: FakeOscillator = {
      type: "",
      frequency: {
        setValueAtTime: () => {},
        exponentialRampToValueAtTime: (value: number) => {
          rampTargets.push(value);
        },
      },
      start: (time: number) => {
        startTimes.push(time);
      },
      stop: (time: number) => {
        stopTimes.push(time);
      },
      connect: () => {},
      get rampTargets() {
        return rampTargets;
      },
      get startTimes() {
        return startTimes;
      },
      get stopTimes() {
        return stopTimes;
      },
    };
    this.oscillators.push(oscillator);
    return oscillator;
  }

  createGain(): FakeGainNode {
    const rampValues: number[] = [];
    const gainNode: FakeGainNode = {
      gain: {
        setValueAtTime: () => {},
        exponentialRampToValueAtTime: (value: number) => {
          rampValues.push(value);
        },
      },
      connect: () => {},
      get rampValues() {
        return rampValues;
      },
    };
    this.gainNodes.push(gainNode);
    return gainNode;
  }
}

function stubWindow(withContext: boolean) {
  const windowObject: Record<string, unknown> = {};
  if (withContext) {
    windowObject.AudioContext = FakeAudioContext;
  }
  vi.stubGlobal("window", windowObject);
}

const ALL_EVENTS: InteractionSoundEvent[] = [
  "send",
  "listen_start",
  "listen_stop",
  "success",
  "warning",
  "error",
];

describe("interaction sound", () => {
  beforeEach(() => {
    __resetInteractionSoundForTests();
    FakeAudioContext.instances = [];
    const store: Record<string, string> = {};
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
    });
    stubWindow(true);
  });

  it("does not construct an AudioContext before the first play", () => {
    stubWindow(true);
    expect(FakeAudioContext.instances).toHaveLength(0);
  });

  it("silences playback when the preference is off", () => {
    setSoundPreference("off");
    playInteractionSound("send");
    expect(FakeAudioContext.instances).toHaveLength(0);
  });

  it("constructs the context once across plays", () => {
    for (const event of ALL_EVENTS) {
      playInteractionSound(event);
    }
    expect(FakeAudioContext.instances).toHaveLength(1);
    const ctx = FakeAudioContext.instances[0]!;
    expect(ctx.oscillators.length).toBeGreaterThanOrEqual(ALL_EVENTS.length);
  });

  it("keeps every voice envelope short and quiet", () => {
    for (const event of ALL_EVENTS) {
      playInteractionSound(event);
    }
    expect(FakeAudioContext.instances).toHaveLength(1);
    const ctx = FakeAudioContext.instances[0]!;
    expect(ctx.gainNodes).toHaveLength(ctx.oscillators.length);
    ctx.oscillators.forEach((oscillator, index) => {
      expect(oscillator.startTimes).toHaveLength(1);
      expect(oscillator.stopTimes).toHaveLength(1);
      const start = oscillator.startTimes[0]!;
      const stop = oscillator.stopTimes[0]!;
      expect(stop - start).toBeLessThanOrEqual(0.12);
      const gain = ctx.gainNodes[index]!;
      const peak = Math.max(...gain.rampValues);
      expect(peak).toBeLessThanOrEqual(0.12);
      expect(peak).toBeGreaterThan(0);
    });
  });

  it("resumes suspended contexts", () => {
    playInteractionSound("send");
    const ctx = FakeAudioContext.instances[0]!;
    ctx.state = "suspended";
    playInteractionSound("send");
    expect(ctx.resume).toHaveBeenCalled();
  });

  it("no-ops without an AudioContext constructor", () => {
    stubWindow(false);
    expect(() => playInteractionSound("send")).not.toThrow();
    expect(FakeAudioContext.instances).toHaveLength(0);
  });
});
