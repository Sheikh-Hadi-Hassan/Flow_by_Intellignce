import type * as InteractionSoundModule from "./interaction-sound";
import type { InteractionSoundEvent } from "./interaction-sound";

let loader: Promise<typeof InteractionSoundModule> | null = null;

function load(): Promise<typeof InteractionSoundModule> {
  if (!loader) {
    loader = import("./interaction-sound");
  }
  return loader;
}

export function warmInteractionSound(): void {
  void load().catch(() => {});
}

export function playInteractionSoundLazy(event: InteractionSoundEvent): void {
  void load()
    .then((module) => {
      module.playInteractionSound(event);
    })
    .catch(() => {});
}

export type { InteractionSoundEvent } from "./interaction-sound";
