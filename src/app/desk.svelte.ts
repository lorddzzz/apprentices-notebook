import type { FootnoteSubject } from '$data';
import { writeAt } from './desk';
import type { GameStore } from './game.svelte';
import { toast } from './toasts.svelte';

/** The footnote desk's state: which subject's margin is open. Writes go through the game's profile. */
export class DeskStore {
  constructor(private readonly game: GameStore) {}

  open = $state<FootnoteSubject | null>(null);

  get profile() {
    return this.game.studyProfile;
  }

  /** Writing is for home: no trip open (P10; the router keeps the road out of the desk too). */
  get atHome(): boolean {
    return this.game.save.trip === null;
  }

  toggle(subject: FootnoteSubject): void {
    this.open = this.open === subject ? null : subject;
  }

  write(subject: FootnoteSubject, variantId: string): void {
    const r = writeAt(this.profile, subject, variantId, { atHome: this.atHome });
    if ('error' in r) {
      toast(r.error, 'warn');
      return;
    }
    this.game.updateProfile(() => r.profile);
  }
}
