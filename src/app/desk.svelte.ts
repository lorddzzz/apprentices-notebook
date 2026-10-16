import type { DraftDef, DraftId } from '$data';
import {
  type DraftRun,
  draftById,
  draftTest,
  editDraft,
  type GlyphInside,
  repairDraft,
  resetDraft,
} from '$engine';
import { draftStage } from './desk';
import type { GameStore } from './game.svelte';
import { game } from './instance';
import { Playback } from './playback.svelte';
import { toast } from './toasts.svelte';
import { type BoardView, viewOf } from './view';

/** A finished test run, remembered with the page it ran on so an edit makes it stale. */
export interface DeskRun {
  draft: DraftId;
  page: string;
  run: DraftRun;
}

const pageKey = (inside: GlyphInside): string => JSON.stringify(inside);

/** The desk screen's state: which draft is open, its test playback and result, and the profile writes. */
export class DeskStore {
  constructor(private readonly game: GameStore) {}

  /** The draft open on the desk, or null for the list. */
  open = $state<DraftId | null>(null);
  /** The last finished test run (shown once its playback ends). */
  result = $state.raw<DeskRun | null>(null);
  /** The events being played, for the lit and faded cells while the board animates. */
  readonly playback = new Playback();
  private start = $state.raw<BoardView | null>(null);

  get playing(): boolean {
    return this.playback.playing;
  }

  /** The stage the board shows: the playback step, else the last result, else the bare board. */
  view(def: DraftDef): BoardView {
    const step = this.playback.current;
    if (step) return step.view;
    if (this.result && this.result.draft === def.id) return viewOf(this.result.run.state);
    return this.start ?? viewOf(draftStage(def).state);
  }

  /** The result for this page, or null when none ran or the page changed since. */
  fresh(id: DraftId, inside: GlyphInside): DeskRun | null {
    const r = this.result;
    return r && r.draft === id && r.page === pageKey(inside) ? r : null;
  }

  show(id: DraftId | null): void {
    this.playback.skip();
    this.open = id;
    this.result = null;
    this.start = null;
  }

  /** Runs the test and plays the cast on the stage; the result appears when the playback ends. */
  async runTest(id: DraftId, inside: GlyphInside): Promise<void> {
    const def = draftById(id);
    if (!def || this.playing) return;
    const stage = draftStage(def);
    const run = draftTest(def, inside);
    this.result = null;
    this.start = viewOf(stage.state);
    await this.playback.play(this.start, run.events.slice(stage.events.length));
    this.result = { draft: id, page: pageKey(inside), run };
  }

  /** Saves the editor's working copy; returns why not, or null. */
  save(id: DraftId, inside: GlyphInside): string | null {
    const err = this.game.updateProfile((p) => editDraft(p, id, inside));
    if (err === null) this.result = null;
    return err;
  }

  startOver(id: DraftId): void {
    const err = this.game.updateProfile((p) => resetDraft(p, id));
    if (err) toast(err, 'warn');
    else this.result = null;
  }

  /** "Copy into my notebook": the passing page becomes a Glyph. */
  copyIn(id: DraftId): void {
    const def = draftById(id);
    const err = this.game.updateProfile((p) => repairDraft(p, id));
    if (err) toast(err, 'warn');
    else if (def) toast(`${def.name} is in your notebook`);
  }
}

export const desk = new DeskStore(game);
