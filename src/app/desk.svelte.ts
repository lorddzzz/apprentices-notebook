import type { LineId, RuneId } from '$data';
import { writeAt } from './desk';
import type { GameStore } from './game.svelte';
import { toast } from './toasts.svelte';

/** The footnote desk's state: which rune is open. Writes go through the game's profile. */
export class DeskStore {
  constructor(private readonly game: GameStore) {}

  open = $state<RuneId | null>(null);

  get profile() {
    return this.game.studyProfile;
  }

  toggle(rune: RuneId): void {
    this.open = this.open === rune ? null : rune;
  }

  write(rune: RuneId, line: LineId, variantId: string): void {
    const r = writeAt(this.profile, rune, line, variantId);
    if ('error' in r) {
      toast(r.error, 'warn');
      return;
    }
    this.game.updateProfile(() => r.profile);
  }
}
