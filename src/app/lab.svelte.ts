import {
  APPRENTICE_IDS,
  APPRENTICES,
  type ApprenticeId,
  type BasicActionId,
  type HabitId,
  type InventionDef,
  type MemberId,
  type ScenarioDef,
} from '$data';
import {
  type Action,
  type ActionResult,
  type BattleState,
  type Coord,
  createBattle,
  type GameEvent,
  inventionLibrary,
  type Lattice,
  labSetLattice,
  parseLattice,
  toGrowingLattice,
} from '$engine';
import { BattleSession, type SessionOptions } from './battle.svelte';
import type { GameStore } from './game.svelte';
import {
  addLabInvention,
  applyEdits,
  baseOf,
  boardWithStarts,
  changedKits,
  defaultLineup,
  exportedMembers,
  fallbackLattices,
  fieldLineup,
  formatLattices,
  formatScenario,
  kitOf,
  type LabBase,
  type LabKit,
  type LabKits,
  labFootnotes,
  labSpec,
  membersOn,
  type PaletteItem,
  paintApprentice,
  paletteEdits,
  profileLattices,
  pruneStarts,
  resolveScenario,
  setKit,
  switchVariant,
  toggleLineup,
  toggleStart,
  toScenarioDef,
  whyNoEdit,
  withKit,
} from './lab';
import { forgetView } from './latticeViewport';
import { editSocket, NO_TOOL, pageSessionKey, type ShelfTool } from './study';
import { toast } from './toasts.svelte';

export type LabMode = 'play' | 'board' | 'lattices';
export type CopyKind = 'board' | 'lattices' | 'scenario';

/** Everything an undo has to bring back. */
interface Snapshot {
  state: BattleState;
  log: GameEvent[];
  lattices: Record<MemberId, Lattice>;
  base: LabBase;
  actions: Action[];
  baseLen: number;
  starts: Coord[];
  spotSeed: number;
  kits: LabKits;
}

const HISTORY_LIMIT = 60;
let nextLatticeSession = 0;

/**
 * The Lab: free play on any scenario (charges never spent), painting the board, editing lattices
 * with unlimited ink, undo, and "copy as scenario". Nothing here touches the player's save.
 */
export class LabStore {
  constructor(private readonly game: GameStore) {}

  session = $state.raw<BattleSession | null>(null);
  scenario = $state.raw<ScenarioDef | null>(null);
  mode = $state<LabMode>('play');
  /** Lattices mode: which member's page, and the shelf tool in hand. */
  member = $state<MemberId>(APPRENTICE_IDS[0] ?? 'draughtsman');
  tool = $state.raw<ShelfTool>(NO_TOOL);
  /** Board mode: what a tap paints. */
  palette = $state<PaletteItem>('r');
  lattices = $state.raw<Record<MemberId, Lattice>>(fallbackLattices());
  /** Who a board with start points fields (1–3, any apprentices); set from the slots on first load. */
  lineup = $state.raw<readonly ApprenticeId[]>([]);
  /** Basic-action and habit overrides by apprentice (AH-7): only what differs from the registry. Not saved. */
  kits = $state.raw<LabKits>({});
  /** Whose kit the picker shows. */
  kitMember = $state<ApprenticeId>(APPRENTICE_IDS[0] ?? 'draughtsman');
  /** The board's start points (`P`): painted here or read from a scenario board. */
  starts = $state.raw<readonly Coord[]>([]);
  /** The seed the lineup's spots are drawn from; "Redraw" steps it. */
  spotSeed = $state(1);
  /** Footnote variants switched on for Lab battles (FN-7): ids, one per slot. Not saved. */
  variantsOn = $state.raw<readonly string[]>([]);
  /** Text the clipboard refused, shown for copying by hand. */
  copyOut = $state.raw<{ title: string; text: string } | null>(null);
  undoDepth = $state(0);
  private latticeSession = $state(++nextLatticeSession);

  /** Stable through edits/undo/member switches; a load/reset starts a new viewport session. */
  latticeSessionKey(member: MemberId = this.member): string {
    return pageSessionKey('lab', member, this.latticeSession);
  }

  private base: LabBase | null = null;
  /** Actions played since `base`, and where the log stood then (the scenario's `demo` and `expected`). */
  private actions: Action[] = [];
  private baseLen = 0;
  private history: Snapshot[] = [];

  /** Loads a scenario by id. Returns the id it could not find (the sandbox loads instead), or null. */
  load(id: string, opts: { demo?: boolean } = {}): string | null {
    const { def, unknown } = resolveScenario(id);
    this.session?.dispose();
    const mine = profileLattices(this.game.profile);
    if (this.lineup.length === 0) this.lineup = defaultLineup(this.game.profile);
    const lattices = Object.fromEntries(
      APPRENTICE_IDS.map((m) => {
        const own = def.lattices?.[m];
        return [m, own !== undefined ? toGrowingLattice(parseLattice(own)) : mine[m]];
      }),
    ) as Record<MemberId, Lattice>;
    const inventions = { ...inventionLibrary(this.game.profile), ...def.inventions };
    // A demo replays as authored, with each apprentice's own kit.
    if (opts.demo) this.kits = {};
    const fielded = labSpec(def, { lattices, inventions, lineup: this.lineup, kits: this.kits });
    const init = createBattle(fielded.spec);
    this.starts = fielded.starts;
    this.spotSeed = fielded.spotSeed;
    // The Lab is the workshop: every interaction is named in previews.
    for (const member of APPRENTICE_IDS) forgetView(this.latticeSessionKey(member));
    this.latticeSession = ++nextLatticeSession;
    // The intro (enemies declaring their intents) plays only for a demo (S18).
    this.session = this.open(init, opts.demo === true);
    this.scenario = def;
    this.lattices = lattices;
    this.base = baseOf(init.state, lattices, this.starts);
    this.baseLen = init.events.length;
    this.actions = [];
    this.history = [];
    this.undoDepth = 0;
    this.mode = 'play';
    this.tool = NO_TOOL;
    if (opts.demo) void this.runDemo();
    return unknown;
  }

  /** A Lab battle from `init`: the switched-on variants are written in, as the battle reads them. */
  private open(init: ActionResult, intro: boolean): BattleSession {
    const options: SessionOptions = {
      intro,
      footnotes: labFootnotes(this.variantsOn),
      // The Lab previews like a trip: only what the household has witnessed is described.
      witnessed: this.game.profile.witnessed,
      onAction: (before, action) => this.record(before, action),
    };
    return new BattleSession(init, 'lab', options);
  }

  /**
   * Switches an authored variant on or off for Lab battles (FN-7). The battle in progress keeps its
   * board and log and reads the new set from its next action on; Reset starts it again.
   */
  toggleVariant(id: string, value = !this.variantsOn.includes(id)): void {
    this.variantsOn = switchVariant(this.variantsOn, id, value);
    const old = this.session;
    if (!old) return;
    old.skip();
    this.session = this.open({ state: old.state, events: old.log }, false);
    old.dispose();
  }

  reset(): void {
    if (this.scenario) this.load(this.scenario.id);
  }

  /** Reloads the scenario and plays its demo actions through the animation. */
  playDemo(): void {
    if (this.scenario) this.load(this.scenario.id, { demo: true });
  }

  private async runDemo(): Promise<void> {
    const session = this.session;
    const def = this.scenario;
    if (!session || !def) return;
    for (const action of def.demo) {
      if (this.session !== session) return;
      await session.dispatch(action);
    }
  }

  setMode(mode: LabMode): void {
    this.session?.skip();
    this.mode = mode;
  }

  get canUndo(): boolean {
    return this.undoDepth > 0;
  }

  // ── Undo ──

  private checkpoint(): void {
    const session = this.session;
    if (!session || !this.base) return;
    this.pushSnapshot({
      state: session.state,
      log: session.log,
      lattices: this.lattices,
      base: this.base,
      actions: [...this.actions],
      baseLen: this.baseLen,
      starts: [...this.starts],
      spotSeed: this.spotSeed,
      kits: this.kits,
    });
  }

  private record(before: { state: BattleState; log: GameEvent[] }, action: Action): void {
    if (!this.base) return;
    this.pushSnapshot({
      ...before,
      lattices: this.lattices,
      base: this.base,
      actions: [...this.actions],
      baseLen: this.baseLen,
      starts: [...this.starts],
      spotSeed: this.spotSeed,
      kits: this.kits,
    });
    this.actions.push(action);
  }

  private pushSnapshot(snap: Snapshot): void {
    this.history.push(snap);
    if (this.history.length > HISTORY_LIMIT) this.history.shift();
    this.undoDepth = this.history.length;
  }

  /** Takes back the last action or edit (a cast, a move, a painted tile, a changed rune). */
  undo(): void {
    const snap = this.history.pop();
    this.undoDepth = this.history.length;
    if (!snap || !this.session) return;
    this.lattices = snap.lattices;
    this.base = snap.base;
    this.actions = [...snap.actions];
    this.baseLen = snap.baseLen;
    this.starts = snap.starts;
    this.spotSeed = snap.spotSeed;
    this.kits = snap.kits;
    this.session.replace(snap.state, snap.log);
  }

  // ── Editing ──

  /** An edit starts a new base: what "Copy as scenario" replays from. */
  private rebase(state: BattleState, lattices: Record<MemberId, Lattice>): void {
    const session = this.session;
    if (!session) return;
    this.lattices = lattices;
    this.base = baseOf(state, lattices, this.starts);
    this.baseLen = session.log.length;
    this.actions = [];
    session.replace(state, session.log);
  }

  /** Board mode: one tap with the palette. */
  paint(at: { x: number; y: number }): void {
    const session = this.session;
    if (!session) return;
    if (this.palette === 'P') {
      this.paintStart(at);
      return;
    }
    const before = session.state;
    let next: BattleState | null;
    try {
      const who = APPRENTICE_IDS.find((id) => APPRENTICES[id].token === this.palette);
      if (who) {
        // Anyone in the registry, with their page from the Lab's lattices.
        next = paintApprentice(before, at, who, this.lattices, this.kits);
      } else {
        const edits = paletteEdits(before, at, this.palette);
        next = edits.length > 0 ? applyEdits(before, edits) : null;
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'warn');
      return;
    }
    if (!next) {
      toast(whyNoEdit(this.palette));
      return;
    }
    if (next.phase !== 'player') next = { ...next, phase: 'player' };
    this.checkpoint();
    // A tile that became a plate, gate or grate is no start point any more.
    this.starts = pruneStarts(next, this.starts);
    this.rebase(next, this.lattices);
  }

  /** Board mode with the start-point swatch: a tap marks or clears a start point (P). */
  private paintStart(at: Coord): void {
    const session = this.session;
    if (!session) return;
    const r = toggleStart(session.state, this.starts, at);
    if (r.why) {
      toast(r.why);
      return;
    }
    this.checkpoint();
    this.starts = r.starts;
    this.rebase(session.state, this.lattices);
  }

  // ── Lineup (P16) ──

  /** Adds or drops one apprentice from the lineup; with enough start points they are refielded. */
  toggleLineupMember(id: ApprenticeId): void {
    const r = toggleLineup(this.lineup, id);
    if (r.why) {
      toast(r.why);
      return;
    }
    this.lineup = r.lineup;
    if (this.starts.length >= this.lineup.length) this.field();
  }

  /** Whether the lineup can stand on the board's start points. */
  get canField(): boolean {
    return this.starts.length >= this.lineup.length && this.lineup.length > 0;
  }

  /** Stands the lineup on a seeded draw of the start points; everyone else on the board is cleared. */
  field(spotSeed = this.spotSeed): void {
    const session = this.session;
    if (!session) return;
    if (!this.canField) {
      toast(`Paint at least ${this.lineup.length} start points (P) first`);
      return;
    }
    let next: BattleState;
    try {
      next = fieldLineup(
        session.state,
        this.starts,
        this.lineup,
        spotSeed,
        this.lattices,
        this.kits,
      );
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'warn');
      return;
    }
    if (next.phase !== 'player') next = { ...next, phase: 'player' };
    this.checkpoint();
    this.spotSeed = spotSeed;
    this.rebase(next, this.lattices);
  }

  // ── Kits (AH-7) ──

  /** An apprentice's kit in the Lab: the registry's with any override. */
  kitFor(id: ApprenticeId): LabKit {
    return kitOf(id, this.kits);
  }

  /** How many apprentices carry something other than their own kit. */
  get kitsChanged(): number {
    return changedKits(this.kits).length;
  }

  /** Gives one apprentice another action or habit; they carry it from now on, on the board or off. */
  setKit(id: ApprenticeId, patch: { action?: BasicActionId; habit?: HabitId | null }): void {
    const session = this.session;
    if (!session) return;
    const kits = setKit(this.kits, id, patch);
    this.checkpoint();
    this.kits = kits;
    this.rebase(withKit(session.state, id, kits), this.lattices);
  }

  /** Back to the registry's own kit for one apprentice. */
  resetKit(id: ApprenticeId): void {
    const native = kitOf(id, {});
    this.setKit(id, { action: native.action, habit: native.habit });
  }

  /** The same lineup on a fresh draw of the start points. */
  redraw(): void {
    if (!this.canField) {
      this.field();
      return;
    }
    this.field(this.spotSeed + 1);
  }

  setTool(tool: ShelfTool): void {
    this.tool = tool;
  }

  addInvention(def: InventionDef): boolean {
    const session = this.session;
    if (!session) return false;
    const result = addLabInvention(session.state.inventions, def);
    if (result.issue) {
      toast(result.issue, 'warn');
      return false;
    }
    this.checkpoint();
    this.rebase({ ...session.state, inventions: result.inventions }, this.lattices);
    toast(`${def.name} added to the Lab shelf`);
    return true;
  }

  /** Lattices mode: a tap or long-press on a socket of the current member's page. No limits on ink or runes. */
  editLattice(at: { x: number; y: number }, longPress = false): void {
    const session = this.session;
    if (!session) return;
    const lattice = this.lattices[this.member];
    const r = editSocket(
      { lattice, capacity: null, inventions: session.state.inventions },
      at,
      this.tool,
      longPress,
    );
    this.tool = r.tool;
    if (!['place', 'replace', 'rotate', 'remove'].includes(r.decision.kind)) return;
    let state = session.state;
    try {
      state = labSetLattice(state, this.member, r.lattice);
    } catch {
      // The member is not on the board right now; the lattice still changes.
    }
    this.checkpoint();
    this.rebase(state, { ...this.lattices, [this.member]: r.lattice });
  }

  // ── Copy ──

  private textFor(kind: CopyKind): { title: string; text: string } | null {
    const session = this.session;
    const scenario = this.scenario;
    if (!session || !scenario || !this.base) return null;
    switch (kind) {
      case 'board':
        return { title: 'Board', text: boardWithStarts(session.state, this.starts) };
      case 'lattices':
        return {
          title: 'Lattices',
          text: formatLattices(this.lattices, exportedMembers(membersOn(session.state))),
        };
      case 'scenario': {
        const base = scenario.id.startsWith('lab-') ? scenario.id : `lab-${scenario.id}`;
        const def = toScenarioDef(base, this.base, this.actions, session.log.slice(this.baseLen));
        return { title: 'Scenario', text: formatScenario(def) };
      }
    }
  }

  async copy(kind: CopyKind): Promise<void> {
    const out = this.textFor(kind);
    if (!out) return;
    try {
      await navigator.clipboard.writeText(out.text);
      if (kind === 'scenario' && (this.variantsOn.length > 0 || this.kitsChanged > 0)) {
        // A scenario has no place for footnote variants or kits yet, so the copy leaves them out.
        toast('Scenario copied without the switched-on variants or kits', 'warn');
      } else toast(`${out.title} copied`);
    } catch {
      // No clipboard access (some iOS contexts): show the text to select by hand.
      this.copyOut = out;
    }
  }

  closeCopy(): void {
    this.copyOut = null;
  }
}
