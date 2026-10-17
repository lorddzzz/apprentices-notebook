import type { DraftDef, DraftId } from '$data';
import {
  draftById,
  editDraft,
  type FolioRun,
  folioRun,
  type GlyphInside,
  repairDraft,
  resetDraft,
  turnPage,
} from '$engine';
import { brokeFlags, draftStage, playedTest } from './desk';
import type { GameStore } from './game.svelte';
import { game } from './instance';
import { Playback } from './playback.svelte';
import { toast } from './toasts.svelte';
import { type BoardView, viewOf } from './view';

/** A finished run of every unlocked test, remembered with the page it ran on so an edit makes it stale. */
export interface DeskRun {
  draft: DraftId;
  page: string;
  run: FolioRun;
  /** Tests that passed on the previous run this session and fail now (F6). Never saved. */
  broke: boolean[];
}

const pageKey = (inside: GlyphInside): string => JSON.stringify(inside);

/** The desk screen's state: which folio is open, its runs and playback, and the profile writes. */
export class DeskStore {
  constructor(private readonly game: GameStore) {}

  /** The folio open on the desk, or null for the list. */
  open = $state<DraftId | null>(null);
  /** The last finished run (shown once its playback ends). */
  result = $state.raw<DeskRun | null>(null);
  /** The test chip the player tapped (0-based), or null to follow the played test. */
  chosen = $state<number | null>(null);
  /** The events being played, for the lit and faded cells while the board animates. */
  readonly playback = new Playback();
  private start = $state.raw<BoardView | null>(null);
  /** The previous run's pass flags in this desk session (F6). */
  private prev: boolean[] | null = null;
  /** Bumped by each run and each `show`, so a playback that ends late can't write a stale result. */
  private runs = 0;

  get playing(): boolean {
    return this.playback.playing;
  }

  /** The run for this page contents, or null when none ran or the page changed since. */
  fresh(id: DraftId, inside: GlyphInside): DeskRun | null {
    const r = this.result;
    return r && r.draft === id && r.page === pageKey(inside) ? r : null;
  }

  /** The test shown on the board: the tapped chip, else the played test, else the newest. */
  selected(page: number, run: FolioRun | null): number {
    const c = this.chosen;
    if (c !== null && c <= page) return c;
    // A run that doesn't reach the newest test (just turned) leaves the new test showing.
    return run && run.tests.length === page + 1 ? playedTest(run) : page;
  }

  /** The stage the board shows: the playback step, else the selected test's final state, else its bare board. */
  view(def: DraftDef, test: number, run: FolioRun | null): BoardView {
    const step = this.playback.current;
    if (step) return step.view;
    const done = run?.tests[test];
    if (done) return viewOf(done.state);
    if (this.playing && this.start) return this.start;
    const t = (def.pages[test] ?? def.pages[0])?.test;
    if (!t) throw new Error(`${def.name} has no pages`);
    return viewOf(draftStage(def, t).state);
  }

  show(id: DraftId | null): void {
    this.playback.skip();
    this.runs += 1;
    this.open = id;
    this.result = null;
    this.start = null;
    this.chosen = null;
    this.prev = null;
  }

  select(test: number): void {
    if (!this.playing) this.chosen = test;
  }

  /** Runs every unlocked test, plays one board, and shows the result when the playback ends. */
  async runTests(id: DraftId, page: number, inside: GlyphInside): Promise<void> {
    const def = draftById(id);
    if (!def || this.playing) return;
    const run = folioRun(def, page, inside);
    const broke = brokeFlags(this.prev, run);
    const shown = playedTest(run);
    const test = def.pages[shown]?.test;
    const played = run.tests[shown];
    if (!test || !played) return;
    const stage = draftStage(def, test);
    this.result = null;
    this.chosen = null;
    this.start = viewOf(stage.state);
    const token = ++this.runs;
    await this.playback.play(this.start, played.events.slice(stage.events.length));
    // Left the folio (or started another run) while it played: drop the result.
    if (token !== this.runs || this.open !== id) return;
    this.prev = run.tests.map((t) => t.passed);
    this.result = { draft: id, page: pageKey(inside), run, broke };
  }

  /** Saves the editor's working copy; returns why not, or null. */
  save(id: DraftId, inside: GlyphInside): string | null {
    const err = this.game.updateProfile((p) => editDraft(p, id, inside));
    if (err === null) {
      this.result = null;
      this.chosen = null;
    }
    return err;
  }

  startOver(id: DraftId): void {
    const err = this.game.updateProfile((p) => resetDraft(p, id));
    if (err) toast(err, 'warn');
    else {
      this.result = null;
      this.chosen = null;
    }
  }

  /** "Turn the page": the next note, scraps and test unlock; the earlier results stay. */
  turn(id: DraftId): void {
    const err = this.game.updateProfile((p) => turnPage(p, id));
    if (err) toast(err, 'warn');
    else {
      // The new test hasn't run; the earlier results stay in `prev` for "broke".
      this.result = null;
      this.chosen = null;
    }
  }

  /** "Copy into my notebook": the passing last page becomes a Glyph. */
  copyIn(id: DraftId): void {
    const def = draftById(id);
    const err = this.game.updateProfile((p) => repairDraft(p, id));
    if (err) toast(err, 'warn');
    else if (def) toast(`${def.name} is in your notebook`);
  }
}

export const desk = new DeskStore(game);
