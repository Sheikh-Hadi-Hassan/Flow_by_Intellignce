# CB-01 — Command Bar / AI Composer Experience

Verification deliverable for the Ask Flow global command dock redesign: the composer as the product's signature AI command surface (send/mic slot swap, processing-state chip, voice mode, synthesized micro-sound, motion layer).

## Command bar architecture

| Layer | Module | Responsibility |
| --- | --- | --- |
| Pure state | `src/lib/ask-flow/ui-state.ts` | `ASK_BUSY_PHASES`, `ASK_ERROR_PHASES`, `isAskBusy`, `shouldAcceptSubmit`, `askPhaseLabel` (allowlist-locked human labels) |
| Pure state | `src/lib/ask-flow/placeholder.ts` | Route-aware intelligent placeholder strings |
| Provider (existing) | `src/components/ask/AskFlowProvider.tsx` | Added: rapid-submit guard (`runningRef` in `runAssistant`/`submit`/`editLastQuestion`), busy-phase preservation (`setDraft` both branches + suggestions timeout), `activeTool` exposure for tool-status progress |
| Voice session | `src/components/ask/use-ask-voice.ts` | Local dock state machine (`off/ready/listening/processing/error`), transcript into draft, finish→submit, notices |
| Speech engine | `src/lib/ask-flow/speech-recognition.ts` | Web Speech API factory (dynamically imported), continuous+interim, restart budget (max 3 per 10s), error mapping |
| Voice surface | `src/components/ask/VoiceSurface.tsx` | Canvas 2D placeholder visualizer, one internal rAF loop, zero React re-renders per frame |
| Sound | `src/lib/sound/{store,interaction-sound,lazy}.ts` | Preference store (`flow-sound-v1`, `useSyncExternalStore`), Web Audio synthesis (≤120ms, gain ≤0.06), lazy loader keeping Web Audio out of the initial bundle |
| Composer UI | `src/components/ask/GlobalAskFlowDock.tsx` | Slot swap, status chip, voice row transformation, sound triggers, focus/Escape handling |
| Settings | `src/app/[workspace]/admin/settings/page.tsx` | "Interface sounds" select (On/Off), persisted, mirrors Theme pattern |

## Interaction-state diagram

```
                ┌────────────────────────── idle (empty draft) ─────────────────────────┐
                │  [Actions] [ textarea: placeholder ] [ Mic ]                          │
                └────────┬───────────────────────────────────────┬─────────────────────┘
                 type text│                                click │ (supported browser)
                         ▼                                      ▼
                ┌── typing (draft non-empty) ──┐         ┌── voice: listening ─────────────┐
                │  [Actions] [ textarea ] [Send]│        │ [Cancel] [surface+transcript]   │
                └──────┬────────────────────────┘        │ [Finish ✓ (disabled if empty)]  │
              Enter/Send│                                 └────┬──────────────┬───────────┘
                       ▼                                      │finish        │cancel/Escape
        ┌── busy (draft cleared) ────────────┐                ▼              ▼
        │  phase: submitted "Understanding"  │        submit(transcript)   abort, draft kept,
        │  retrieving   "Checking Flow"      │              │              composer refocused
        │  tool running "Retrieving records" │              └──────────────┬─────────┘
        │  generating   "Analyzing"          │                             ▼
        │  streaming    "Preparing answer"   │                     busy pipeline
        └──────┬──────────────────────────────┘
               ▼
   ┌─ terminal: answered / asking_clarification / error ── chip hidden ─┐
   └────────────────────────────────────────────────────────────────────┘
```

- End-zone slot swap (D1): Mic renders at rest; when `draft.trim()` is non-empty the Send button takes the mic slot. Dock geometry (72/64px, 112px columns) is untouched — a third tool was never added.
- Status chip (D2) lives inside the composer row (`role="status"`, `data-testid="ask-status"`), visible only while busy with an empty draft; typing reclaims the input and hides the chip.
- Voice mode (D3/D4): voice state never enters the provider; the same dock transforms into a `[cancel][voice surface][finish]` row while the transcript accumulates in the draft.

## Micro-interactions

| Gesture | Feedback |
| --- | --- |
| Focus composer | Inset white ring + brand halo (box-shadow only, `:focus-within`) |
| Hover tool | `translateY(-1px)`, background lift (transform/opacity/background only) |
| Press tool | `scale(0.94)`; tile press `scale(0.97)` |
| Type 3+ chars | Suggestions rise-in with 40/80ms stagger; never cover the input |
| Submit | Send blip (587→880Hz sine, 70ms); chip rises in, dot breathes |
| Busy → answered | Success chime; busy → clarification: warning; busy → error: error tone |
| Mic press | Listen-start tone; dock transforms to voice row |
| Voice finish | Commit + submit — same Enter path; chip takes over ("Understanding" → …) |
| Voice cancel | Listen-stop tone, transcript preserved, composer refocused |
| Multiline growth | Instant (no transition): `field-sizing: content` (Chromium) / synchronous `scrollHeight` clamp at 96px elsewhere |

## Motion tokens

Added to `src/styles/tokens.css`:

```css
--duration-loop: 1800ms;  /* processing breathing loop */
--duration-enter: 200ms;
--duration-exit: 140ms;
```

All decorative motion (rises, hovers, presses, tooltip fades, dot breathing) is wrapped in `@media (prefers-reduced-motion: no-preference)` (established mission-canvas.css pattern). Transitions are transform/opacity/box-shadow/background only — never layout or size. Keyframes: `flow-ask-rise` (entrances: suggestions, chip, voice row), `flow-ask-breathe` (status dot).

## Sound-event architecture

```
gesture → playInteractionSoundLazy(event)        (src/lib/sound/lazy.ts, dynamic import)
              └→ playInteractionSound(event)     (src/lib/sound/interaction-sound.ts)
                    ├─ loadSoundPreference() === "on"?  else silent return
                    ├─ lazy AudioContext singleton, resume() if suspended
                    └─ recipe: oscillator sweep + gain envelope, ≤120ms, peak ≤0.06
```

Events: `send | listen_start | listen_stop | success | warning | error`. Preference store mirrors the theme store (`useSyncExternalStore`, server snapshot "on", hydration-gated). The dock warms the module on first `pointerdown` (capture, once) so the first send blip is not import-delayed. No layout.tsx change (D7); no audio files — pure synthesis. Settings toggle plays `success` when switched back on.

## Accessibility behavior

- Textarea accessible name frozen: "Ask anything about your business" (D6) — 9+ e2e specs rely on `getByLabel`.
- Mic accessible name frozen: "Voice input" label + tooltip in every state (D5); state exposed via `data-state`, unsupported → `aria-disabled="true"` while remaining clickable to announce the notice.
- Status chip: `role="status"` (polite live region) — phase changes are announced without stealing focus; `aria-busy` on the textarea while busy.
- Voice row: Cancel/Finish carry explicit `aria-label`s; the transcript line and notices are `role="status"`; the canvas visualizer is `aria-hidden` (decorative).
- Escape cancels voice first; focus moves to Finish on voice-enter, back to the composer on exit.
- Tab order unchanged (Actions → textarea → end-zone tool) — guarded by dock-refine assertions.
- Existing frozen names regression-guarded by the full ask e2e set; any copy change breaks CI intentionally.

## Reduced-motion behavior

`prefers-reduced-motion: reduce` disables every decorative animation (entrances, hovers, dot breathing, voice surface loop → single static frame). The status chip itself remains visible — it is essential feedback, not decoration (verified in e2e with `page.emulateMedia` and screenshot 12).

## Performance impact

- Web Audio + speech engine are behind dynamic imports; the initial dock bundle is unchanged. First-gesture warmup on `pointerdown`; worst case the first send blip is ~20–50ms late, once.
- VoiceSurface draws in one rAF loop with per-frame lerp decay — zero React state writes per frame; reduced-motion renders one static frame.
- Rapid-submit guard (`runningRef`) prevents duplicate `/api/ask` POSTs and duplicate turns.
- Multiline growth is synchronous (no transition, pre-paint height set) — typing is never slowed.
- No new network calls; no provider re-render changes beyond the `activeTool` state already gated by stream parts.

## Voice-mode readiness

- Voice is real transcription (Web Speech API): interim + final results stream into the draft via the same `setDraft` path as typing; Finish commits and submits; Cancel preserves the transcript.
- Restart budget (max 3 restarts per 10s) stops runaway `onend` loops; graceful "unavailable" state where the API is missing; permission/network errors map to human notices that auto-clear after 4s.
- Headless e2e covers listening, finish-submit, cancel, and unavailable via injected fakes (Web Speech is unreliable in headless Chromium); the real-browser mic permission flow is a manual check (see Stopped).

## Pixel-animation integration point

`VoiceSurface.tsx` accepts `{ state, getActivity }` and draws entirely inside one `drawFrame(ctx, w, h, activity, t)` function. The current renderer is intentionally placeholder-grade (28×5 grid of 3px cells, alpha from smoothed activity + positional noise). Final art is a renderer swap inside that function — the component contract, activity ref plumbing (0..1 from speech events, swappable for an `AnalyserNode` RMS writer), and e2e testids all stay stable.

## Verdicts

| Dimension | Verdict | Evidence |
| --- | --- | --- |
| Functionality | PASS | CB-01 spec 8/8 (slot swap, chip sequence, rapid-submit single POST, voice finish/cancel/unavailable, sound persistence); screenshots spec 7/7; unit 328/328 |
| Visual design | PASS | 15 screenshots visually verified across light/dark/mobile/reduced-motion |
| Accessibility | PASS | a11y suite 7/7 incl. Ask Flow drawer axe scan; CB-01 spec includes axe scan of the dock in voice mode; frozen names intact |
| Security | PASS | No new network surface; voice/sound are client-only; no secrets; Action Wall untouched |
| Data integrity | PASS | Voice transcript follows the identical setDraft→submit path as typed input; rapid-submit guard prevents duplicate turns |
| Browser verification | PASS | Chromium e2e full matrix; manual focus-ring/dark/reduced-motion checks done in real Chrome; real-mic flow is manual (see Stopped) |
| Performance | PASS | Dynamic imports keep initial bundle flat; rAF visualizer without React re-renders; typing never blocked |
| **Overall** | **PASS** | CB-01 complete per plan; baseline rule honored (only the 2 pre-approved classifier failures in the regression set) |

## Screenshots

| File | State |
| --- | --- |
| `screenshots/cb-01/01-idle-light.png` | Idle dock, light theme, mic at rest |
| `screenshots/cb-01/02-focused-ring.png` | Composer focus ring (brand halo) |
| `screenshots/cb-01/03-typing-suggestions.png` | Typing "invoice" — suggestions visible, Send swapped in |
| `screenshots/cb-01/04-multiline.png` | Multiline draft growth with Send |
| `screenshots/cb-01/05-busy-understanding.png` | Chip "Understanding" (submitted) |
| `screenshots/cb-01/06-busy-retrieving-records.png` | Chip "Retrieving records" (tool running) |
| `screenshots/cb-01/07-streaming.png` | Chip "Preparing answer" (streaming deltas) |
| `screenshots/cb-01/08-answered.png` | Answered — chip gone |
| `screenshots/cb-01/09-error-retry.png` | Error state with retry affordance |
| `screenshots/cb-01/10-voice-listening.png` | Voice row: cancel / surface + transcript / finish |
| `screenshots/cb-01/11-voice-unavailable.png` | Unsupported browser — mic unavailable + notice |
| `screenshots/cb-01/12-reduced-motion-busy.png` | Reduced motion — static chip, no animation |
| `screenshots/cb-01/13-dark-busy.png` | Busy chip in dark theme |
| `screenshots/cb-01/14-mobile-voice.png` | Voice row at 375px |
| `screenshots/cb-01/15-settings-sound.png` | Settings "Interface sounds" toggle |

## Commands

```bash
pnpm --filter @flow/web test                    # 2026-09-04: 328 passed (38 files)
pnpm --filter @flow/web typecheck               # 2026-09-04: tsc 0 errors
pnpm --filter @flow/web lint                    # 2026-09-04: CB-01 files clean
                                                #   (14 pre-existing errors live in prior-phase
                                                #    untracked files: assistant/compose.ts,
                                                #    business-registry, crm-core, clients page —
                                                #    none touched by CB-01; verified by linting
                                                #    all CB-01 files directly: 0 problems)
pnpm --filter @flow/web test:e2e e2e/ask-flow-composer-cb01.spec.ts e2e/ask-flow-cb01-screenshots.spec.ts
                                                # 2026-09-04: 15 passed
pnpm --filter @flow/web test:e2e e2e/ask-flow-dock-refine.spec.ts e2e/ask-flow-global.spec.ts e2e/ask-flow-assistant.spec.ts
                                                # 2026-09-04: 2 passed, 2 failed — both the
                                                #   pre-approved baseline (global :116 "Protect
                                                #   the deadline", assistant :160 "hi"→hello;
                                                #   classifier-caused, not CB-01)
pnpm --filter @flow/web test:a11y               # 2026-09-04: 7 passed
```

## Stopped

- Real-Chrome microphone permission flow (grant → speak → transcript → Finish submits / Cancel preserves) is not automatable in headless Chromium; headless coverage uses injected fake recognition classes. The manual check remains for the user to perform in their own browser profile.
- The voice surface renderer is placeholder-grade by design; final pixel art is a later `drawFrame` swap behind the stable component contract.
- The two baseline e2e failures (classifier language coverage) are tracked for the language-understanding phase, not CB-01.
