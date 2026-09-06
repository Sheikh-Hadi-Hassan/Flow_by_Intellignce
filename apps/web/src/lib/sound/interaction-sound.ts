import { loadSoundPreference } from "./store";

export type InteractionSoundEvent =
  | "send"
  | "listen_start"
  | "listen_stop"
  | "success"
  | "warning"
  | "error";

interface SoundVoice {
  readonly type: OscillatorType;
  readonly fromHz: number;
  readonly toHz?: number;
  readonly delayMs?: number;
  readonly durationMs: number;
  readonly peakGain: number;
}

const RECIPES: Record<InteractionSoundEvent, readonly SoundVoice[]> = {
  send: [{ type: "sine", fromHz: 587, toHz: 880, durationMs: 70, peakGain: 0.05 }],
  listen_start: [
    { type: "sine", fromHz: 392, toHz: 440, durationMs: 90, peakGain: 0.045 },
  ],
  listen_stop: [
    { type: "sine", fromHz: 440, toHz: 392, durationMs: 90, peakGain: 0.045 },
  ],
  success: [
    { type: "sine", fromHz: 523, durationMs: 90, peakGain: 0.04 },
    { type: "sine", fromHz: 659, delayMs: 30, durationMs: 90, peakGain: 0.04 },
  ],
  warning: [
    { type: "triangle", fromHz: 330, durationMs: 100, peakGain: 0.05 },
  ],
  error: [
    { type: "sine", fromHz: 330, toHz: 196, durationMs: 120, peakGain: 0.055 },
  ],
};

let audioContext: AudioContext | null = null;

function ensureAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  if (!audioContext) {
    try {
      audioContext = new Ctor();
    } catch {
      return null;
    }
  }
  if (audioContext.state === "suspended") {
    void audioContext.resume().catch(() => {});
  }
  return audioContext;
}

export function playInteractionSound(event: InteractionSoundEvent): void {
  if (loadSoundPreference() !== "on") return;
  const ctx = ensureAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  for (const voice of RECIPES[event]) {
    const start = now + (voice.delayMs ?? 0) / 1000;
    const duration = voice.durationMs / 1000;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = voice.type;
    oscillator.frequency.setValueAtTime(voice.fromHz, start);
    if (voice.toHz !== undefined) {
      oscillator.frequency.exponentialRampToValueAtTime(voice.toHz, start + duration);
    }
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(voice.peakGain, start + duration * 0.3);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + duration);
  }
}

export function __resetInteractionSoundForTests(): void {
  audioContext = null;
}
