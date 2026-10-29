import type { BindEvent, LineId, MethodId, RuneRef, SolventId } from '$data';
import type { RivalPageDef } from '$data/rivals';
import { type Coord, type Profile, writeInvention } from '$engine';
import { BattleSession } from './battle.svelte';
import {
  aimFrom,
  type Draft,
  EMPTY_DRAFT,
  emptyScene,
  inventionToWrite,
  newLines,
  pageTrialActions,
  pageTrialBattle,
  paintScene,
  pickMethod,
  type Scene,
  sceneBattle,
  setEvent,
  setPart,
  setSolvent,
  statusOf,
  trialActions,
  trialFootnotes,
  trialPage,
} from './bench';
import type { GameStore } from './game.svelte';
import type { PaletteItem } from './lab';
import { toast } from './toasts.svelte';

/**
 * The Bench (design §6.1): a draft invention, the test scene and the lines its trials witnessed.
 * Trials are free; what they witness is banked when the invention is written or the Bench is left
 * (D4: every line that fired, whoever it fired on, counts).
 */
export class BenchStore {
  constructor(private readonly game: GameStore) {}

  draft = $state.raw<Draft>(EMPTY_DRAFT);
  scene = $state.raw<Scene>(emptyScene());
  item = $state<PaletteItem>('d');
  aiming = $state(false);
  name = $state('');
  /** Lines witnessed on the test scene, not yet banked, first-seen order. */
  witnessed = $state.raw<LineId[]>([]);
  trials = $state(0);
  session = $state.raw<BattleSession | null>(null);
  /** A held rival page being tried (P13); null on the ordinary Bench. */
  page = $state.raw<RivalPageDef | null>(null);

  get profile(): Profile {
    return this.game.studyProfile;
  }

  get status() {
    return statusOf(this.profile, this.draft);
  }

  /** (Re)builds the scene's battle from the placed cells, dropping any trial result. */
  private load(): void {
    this.session?.dispose();
    const state = this.page
      ? pageTrialBattle(this.page, this.profile)
      : sceneBattle(this.scene, this.profile, this.draft);
    this.session = new BattleSession({ state, events: [] }, 'lab', {
      footnotes: trialFootnotes(this.profile),
    });
  }

  /** Opens the Bench; with a held page's id it opens that page's trial instead of the draft. */
  open(pageId?: string | null): void {
    this.page = pageId ? trialPage(this.profile, pageId) : null;
    this.load();
  }

  pickMethod(m: MethodId): void {
    this.draft = pickMethod(this.draft, m);
    this.afterDraft();
  }

  setPart(slot: number, ref: RuneRef): void {
    this.draft = setPart(this.draft, slot, ref);
    this.afterDraft();
  }

  setEvent(e: BindEvent): void {
    this.draft = setEvent(this.draft, e);
    this.afterDraft();
  }

  setSolvent(s: SolventId | null): void {
    this.draft = setSolvent(this.draft, s);
    this.afterDraft();
  }

  private afterDraft(): void {
    this.aiming = false;
    this.load();
  }

  /** Board tap: paints, or (while aiming) casts the draft in that direction. */
  tap(at: Coord): void {
    const session = this.session;
    if (!session) return;
    if (session.busy) {
      session.skip();
      return;
    }
    if (this.aiming) {
      void this.trial(at);
      return;
    }
    if (this.page) return;
    const r = paintScene(this.scene, at, this.item);
    if ('why' in r) {
      toast(r.why);
      return;
    }
    this.scene = r.scene;
    this.load();
  }

  startAiming(): void {
    if (this.page || this.status.valid) this.aiming = !this.aiming;
  }

  resetScene(): void {
    this.aiming = false;
    this.load();
  }

  clearScene(): void {
    this.scene = emptyScene();
    this.aiming = false;
    this.load();
  }

  private async trial(at: Coord): Promise<void> {
    this.load();
    const session = this.session;
    if (!session) return;
    const caster = session.state.units.find((u) => u.kind === 'member');
    if (!caster || !aimFrom(caster.pos, at)) {
      toast('Aim away from the caster');
      return;
    }
    const actions = this.page
      ? pageTrialActions(session.state, at)
      : trialActions(session.state, this.draft, at);
    if (!actions) return;
    this.aiming = false;
    this.trials += 1;
    const before = session.log.length;
    for (const a of actions) {
      if (this.session !== session) return;
      // The log is updated at once; the list shows what fired while the board plays it back.
      const played = session.dispatch(a);
      this.witnessed = [...this.witnessed, ...newLines(session.log.slice(before), this.witnessed)];
      await played;
    }
  }

  /** Banks the lines the trials witnessed into the notebook (on writing or leaving). */
  flush(): void {
    if (this.witnessed.length === 0) return;
    const lines = this.witnessed;
    this.witnessed = [];
    this.game.updateProfile((p) => ({
      ...p,
      witnessed: [...new Set([...p.witnessed, ...lines])],
    }));
  }

  leave(): void {
    this.flush();
    this.session?.dispose();
    this.session = null;
  }

  /** Writes the draft. Returns the new invention's name, or null (with a toast saying why). */
  write(): string | null {
    const def = inventionToWrite(this.profile, this.draft, this.name);
    if (!def || !this.status.valid) {
      toast(this.status.issue ?? 'Finish the invention first', 'warn');
      return null;
    }
    const lines = this.witnessed;
    const error = this.game.updateProfile((p) => writeInvention(p, def, lines));
    if (error) {
      toast(error, 'warn');
      return null;
    }
    this.witnessed = [];
    this.draft = EMPTY_DRAFT;
    this.name = '';
    this.afterDraft();
    return def.name;
  }
}
