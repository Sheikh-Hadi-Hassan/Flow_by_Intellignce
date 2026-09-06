import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createSpeechSession,
  isSpeechRecognitionSupported,
  mapSpeechErrorCode,
  type SpeechErrorCode,
  type SpeechSessionCallbacks,
} from "./speech-recognition";

interface FakeResult {
  readonly isFinal: boolean;
  readonly length: number;
  readonly 0: { readonly transcript: string };
}

type FakeResultEvent = {
  readonly resultIndex: number;
  readonly results: readonly FakeResult[];
};

class FakeRecognition {
  static instances: FakeRecognition[] = [];
  static failStart = false;

  lang = "";
  continuous = false;
  interimResults = false;
  maxAlternatives = 0;
  onresult: ((event: FakeResultEvent) => void) | null = null;
  onerror: ((event: { readonly error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  readonly start = vi.fn(() => {
    if (FakeRecognition.failStart) {
      FakeRecognition.failStart = false;
      throw new Error("already started");
    }
  });
  readonly stop = vi.fn();
  readonly abort = vi.fn();

  constructor() {
    FakeRecognition.instances.push(this);
  }

  emitInterim(transcript: string, resultIndex = 0) {
    this.onresult?.({
      resultIndex,
      results: [interimResult(transcript)],
    });
  }

  emitFinal(transcript: string, resultIndex = 0) {
    this.onresult?.({
      resultIndex,
      results: [finalResult(transcript)],
    });
  }

  emitError(error: string) {
    this.onerror?.({ error });
  }

  emitEnd() {
    this.onend?.();
  }
}

function interimResult(transcript: string): FakeResult {
  return { isFinal: false, length: 1, 0: { transcript } };
}

function finalResult(transcript: string): FakeResult {
  return { isFinal: true, length: 1, 0: { transcript } };
}

function makeCallbacks() {
  return {
    onInterim: vi.fn(),
    onFinal: vi.fn(),
    onError: vi.fn(),
    onEnd: vi.fn(),
  } satisfies SpeechSessionCallbacks;
}

describe("speech recognition session", () => {
  beforeEach(() => {
    FakeRecognition.instances = [];
    FakeRecognition.failStart = false;
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    vi.stubGlobal("window", { SpeechRecognition: FakeRecognition });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("reports unsupported and returns null without a constructor", () => {
    vi.stubGlobal("window", {});
    expect(isSpeechRecognitionSupported()).toBe(false);
    expect(createSpeechSession("en-US", makeCallbacks())).toBeNull();
  });

  it("supports the webkit-prefixed constructor", () => {
    vi.stubGlobal("window", { webkitSpeechRecognition: FakeRecognition });
    expect(isSpeechRecognitionSupported()).toBe(true);
  });

  it("configures continuous interim recognition", () => {
    const session = createSpeechSession("en-US", makeCallbacks())!;
    session.start();
    const instance = FakeRecognition.instances[0]!;
    expect(instance.lang).toBe("en-US");
    expect(instance.continuous).toBe(true);
    expect(instance.interimResults).toBe(true);
    expect(instance.maxAlternatives).toBe(1);
    expect(instance.start).toHaveBeenCalledTimes(1);
  });

  it("ignores repeated starts while a recognition is active", () => {
    const session = createSpeechSession("en-US", makeCallbacks())!;
    session.start();
    session.start();
    expect(FakeRecognition.instances).toHaveLength(1);
  });

  it("streams the running transcript of finals plus interim", () => {
    const callbacks = makeCallbacks();
    const session = createSpeechSession("en-US", callbacks)!;
    session.start();
    const instance = FakeRecognition.instances[0]!;

    instance.emitInterim("what is");
    expect(callbacks.onInterim).toHaveBeenLastCalledWith("what is");
    expect(callbacks.onFinal).toHaveBeenLastCalledWith("");

    instance.emitFinal("what is");
    expect(callbacks.onFinal).toHaveBeenLastCalledWith("what is");

    instance.emitInterim("our exposure");
    expect(callbacks.onInterim).toHaveBeenLastCalledWith(
      "what is our exposure",
    );
    expect(callbacks.onFinal).toHaveBeenLastCalledWith("what is");
  });

  it("accumulates committed finals", () => {
    const callbacks = makeCallbacks();
    const session = createSpeechSession("en-US", callbacks)!;
    session.start();
    const instance = FakeRecognition.instances[0]!;

    instance.emitFinal("what is");
    instance.emitFinal("our exposure");
    expect(callbacks.onFinal).toHaveBeenLastCalledWith("what is our exposure");
  });

  it("maps raw error codes", () => {
    const cases: readonly [string, SpeechErrorCode][] = [
      ["not-allowed", "not-allowed"],
      ["service-not-allowed", "not-allowed"],
      ["no-speech", "no-speech"],
      ["network", "network"],
      ["audio-capture", "audio-capture"],
      ["aborted", "aborted"],
      ["something-else", "unknown"],
    ];
    for (const [raw, expected] of cases) {
      expect(mapSpeechErrorCode(raw)).toBe(expected);
    }
  });

  it("suppresses restarts after a fatal error", () => {
    const callbacks = makeCallbacks();
    const session = createSpeechSession("en-US", callbacks)!;
    session.start();
    const instance = FakeRecognition.instances[0]!;

    instance.emitError("not-allowed");
    expect(callbacks.onError).toHaveBeenCalledWith("not-allowed", "not-allowed");
    instance.emitEnd();
    expect(callbacks.onEnd).toHaveBeenCalledTimes(1);
    expect(FakeRecognition.instances).toHaveLength(1);
  });

  it("ignores transient no-speech errors and keeps restarting", () => {
    const callbacks = makeCallbacks();
    const session = createSpeechSession("en-US", callbacks)!;
    session.start();
    const instance = FakeRecognition.instances[0]!;

    instance.emitError("no-speech");
    expect(callbacks.onError).not.toHaveBeenCalled();
    instance.emitEnd();
    expect(callbacks.onEnd).not.toHaveBeenCalled();
    expect(FakeRecognition.instances).toHaveLength(2);
  });

  it("stop ends the session gracefully after the engine fires onend", () => {
    const callbacks = makeCallbacks();
    const session = createSpeechSession("en-US", callbacks)!;
    session.start();
    const instance = FakeRecognition.instances[0]!;
    instance.emitFinal("hello");

    session.stop();
    expect(instance.stop).toHaveBeenCalledTimes(1);
    expect(callbacks.onEnd).not.toHaveBeenCalled();

    instance.emitEnd();
    expect(callbacks.onEnd).toHaveBeenCalledTimes(1);
    expect(FakeRecognition.instances).toHaveLength(1);
  });

  it("abort ends the session immediately", () => {
    const callbacks = makeCallbacks();
    const session = createSpeechSession("en-US", callbacks)!;
    session.start();
    const instance = FakeRecognition.instances[0]!;

    session.abort();
    expect(instance.abort).toHaveBeenCalledTimes(1);
    instance.emitEnd();
    expect(callbacks.onEnd).toHaveBeenCalledTimes(1);
    expect(FakeRecognition.instances).toHaveLength(1);
  });

  it("restarts on unexpected ends within the budget, then stops", () => {
    const callbacks = makeCallbacks();
    const session = createSpeechSession("en-US", callbacks)!;
    session.start();

    FakeRecognition.instances[0]!.emitEnd();
    FakeRecognition.instances[1]!.emitEnd();
    FakeRecognition.instances[2]!.emitEnd();
    expect(callbacks.onEnd).not.toHaveBeenCalled();
    expect(FakeRecognition.instances).toHaveLength(4);

    FakeRecognition.instances[3]!.emitEnd();
    expect(callbacks.onEnd).toHaveBeenCalledTimes(1);
    expect(FakeRecognition.instances).toHaveLength(4);
  });

  it("expires old restarts from the budget window", () => {
    const callbacks = makeCallbacks();
    const session = createSpeechSession("en-US", callbacks)!;
    session.start();

    FakeRecognition.instances[0]!.emitEnd();
    expect(FakeRecognition.instances).toHaveLength(2);

    vi.setSystemTime(new Date("2026-01-01T00:00:11Z"));
    FakeRecognition.instances[1]!.emitEnd();
    expect(callbacks.onEnd).not.toHaveBeenCalled();
    expect(FakeRecognition.instances).toHaveLength(3);
  });

  it("ends the session when the first start throws", () => {
    const callbacks = makeCallbacks();
    FakeRecognition.failStart = true;

    const session = createSpeechSession("en-US", callbacks)!;
    session.start();
    expect(callbacks.onEnd).toHaveBeenCalledTimes(1);
  });

  it("dispose detaches handlers and prevents further activity", () => {
    const callbacks = makeCallbacks();
    const session = createSpeechSession("en-US", callbacks)!;
    session.start();
    const instance = FakeRecognition.instances[0]!;

    session.dispose();
    expect(instance.abort).toHaveBeenCalledTimes(1);
    expect(instance.onresult).toBeNull();
    expect(instance.onerror).toBeNull();
    expect(instance.onend).toBeNull();

    session.start();
    expect(FakeRecognition.instances).toHaveLength(1);
    expect(instance.stop).not.toHaveBeenCalled();
  });
});
