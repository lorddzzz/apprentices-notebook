import { type InventionDef, MEMBER_IDS, type MemberId, type ScenarioDef } from '$data';
import {
  type Action,
  type BattleState,
  boardOf,
  createBattle,
  type GameEvent,
  inventionLibrary,
  type Lattice,
  labSetLattice,
  livingUnits,
  parseLattice,
  scenarioSpec,
  toGrowingLattice,
} from '$engine';
import { BattleSession } from './battle.svelte';
import type { GameStore } from './game.svelte';
import {
  addLabInvention,
  applyEdits,
  baseOf,
  fallbackLattices,
  formatLattices,
  formatScenario,
  type LabBase,
  type PaletteItem,
  paletteEdits,
  profileLattices,
  resolveScenario,
  toScenarioDef,
  whyNoEdit,
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
  member = $state<MemberId>(MEMBER_IDS[0] ?? 'draughtsman');
  tool = $state.raw<ShelfTool>(NO_TOOL);
  /** Board mode: what a tap paints. */
  palette = $state<PaletteItem>('r');
  lattices = $state.raw<Record<MemberId, Lattice>>(fallbackLattices());
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
    const lattices = Object.fromEntries(
      MEMBER_IDS.map((m) => {
        const own = def.lattices?.[m];
        return [m, own !== undefined ? toGrowingLattice(parseLattice(own)) : mine[m]];
      }),
    ) as Record<MemberId, Lattice>;
    const inventions = { ...inventionLibrary(this.game.profile), ...def.inventions };
    const init = createBattle(scenarioSpec(def, { lab: true, lattices, inventions }));
    // The Lab is the workshop: every interaction is named in previews.
    for (const member of MEMBER_IDS) forgetView(this.latticeSessionKey(member));
    this.latticeSession = ++nextLatticeSession;
    this.session = new BattleSession(init, 'lab', {
      // The intro (enemies declaring their intents) plays only for a demo (S18).
      intro: opts.demo === true,
      // The Lab previews like a trip: only what the household has witnessed is described.
      witnessed: this.game.profile.witnessed,
      onAction: (before, action) => this.record(before, action),
    });
    this.scenario = def;
    this.lattices = lattices;
    this.base = baseOf(init.state, lattices);
    this.baseLen = init.events.length;
    this.actions = [];
    this.history = [];
    this.undoDepth = 0;
    this.mode = 'play';
    this.tool = NO_TOOL;
    if (opts.demo) void this.runDemo();
    return unknown;
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
    this.session.replace(snap.state, snap.log);
  }

  // ── Editing ──

  /** An edit starts a new base: what "Copy as scenario" replays from. */
  private rebase(state: BattleState, lattices: Record<MemberId, Lattice>): void {
    const session = this.session;
    if (!session) return;
    this.lattices = lattices;
    this.base = baseOf(state, lattices);
    this.baseLen = session.log.length;
    this.actions = [];
    session.replace(state, session.log);
  }

  /** Board mode: one tap with the palette. */
  paint(at: { x: number; y: number }): void {
    const session = this.session;
    if (!session) return;
    const before = session.state;
    const edits = paletteEdits(before, at, this.palette);
    if (edits.length === 0) {
      toast(whyNoEdit(this.palette));
      return;
    }
    let next: BattleState;
    try {
      next = applyEdits(before, edits);
      // A member painted back onto the board brings their lattice with them.
      const there = new Set(livingUnits(before).map((u) => u.def));
      for (const u of livingUnits(next)) {
        if (u.kind === 'member' && !there.has(u.def)) {
          next = labSetLattice(next, u.def as MemberId, this.lattices[u.def as MemberId]);
        }
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'warn');
      return;
    }
    if (next.phase !== 'player') next = { ...next, phase: 'player' };
    this.checkpoint();
    this.rebase(next, this.lattices);
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
        return { title: 'Board', text: boardOf(session.state) };
      case 'lattices':
        return { title: 'Lattices', text: formatLattices(this.lattices) };
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
      toast(`${out.title} copied`);
    } catch {
      // No clipboard access (some iOS contexts): show the text to select by hand.
      this.copyOut = out;
    }
  }

  closeCopy(): void {
    this.copyOut = null;
  }
}
