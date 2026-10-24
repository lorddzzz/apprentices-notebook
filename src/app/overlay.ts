import { type AttackId, ENEMIES, type EnemyId } from '$data';
import {
  type Action,
  aimPreview,
  type BattleState,
  type Coord,
  type Dir,
  driftPreview,
  findUnit,
  type GameEvent,
  type Intent,
  intentPreview,
  isAlive,
  isCloud,
  isPlate,
  legalAims,
  relocations,
  type SpellKey,
  sameCoord,
  step,
  type UnitId,
  unitAt,
} from '$engine';
import { type Footnotes, type InputMode, selectedOf } from './battleInput';
import { layerTone, type Tone } from './fx';

/** What the board draws on top of the tiles, derived from the input mode by `overlayFor`. */
export type Highlight =
  | { kind: 'reach'; at: Coord } // a tile the selected member can move to
  | { kind: 'aim'; at: Coord; chevron?: Dir } // a legal aim tile (chevron: next to the caster)
  | { kind: 'target'; at: Coord } // a tile the previewed action hits
  | { kind: 'path'; cells: Coord[] } // projectile / push path
  | { kind: 'shove'; at: Coord } // a tile the member's basic action can take (the unit to shove, pull or swap; the landing for a hop)
  | { kind: 'arc'; from: Coord; to: Coord; both?: boolean } // a hop's leap, or a swap's two-way trade
  | { kind: 'effect'; at: Coord; tone: Tone } // a tile the previewed action changes (ink, oil, fire…)
  | { kind: 'focus'; at: Coord } // the tile being inspected
  | { kind: 'blank'; at: Coord } // where an unwitnessed line lands: a dotted outline, no text (D2)
  | { kind: 'hurt'; at: Coord }; // a party member the preview hurts: a red ring (D3)

export interface IntentDraw {
  from: Coord;
  /** Tiles between the enemy and the hit tile (empty for adjacent attacks). */
  path: Coord[];
  hit: Coord | null;
  order: number;
  attack: AttackId;
  dir: Dir;
  emphasis: 'normal' | 'strong' | 'dim';
  /** Stopped by steam or a plate before reaching anyone (drawn without the danger hatch). */
  blocked?: boolean;
}

export interface Badge {
  at: Coord;
  kind: 'damage' | 'kill' | 'shield';
  text: string;
}

/** Dashed outline of where a unit would stand after the previewed action. */
export interface Ghost {
  unit: UnitId;
  at: Coord;
  kind: 'member' | 'enemy';
  def: string;
}

/** A boss's special intent (K-17): the lamp that glows, or every moth about to burst. */
export type IntentMark =
  | { kind: 'summon'; from: Coord; at: Coord; order: number; emphasis: IntentDraw['emphasis'] }
  | {
      kind: 'flare';
      from: Coord;
      targets: Coord[];
      order: number;
      emphasis: IntentDraw['emphasis'];
    };

/** Where the next drift will carry floats and units; the board shows it on request. */
export interface DriftGhosts {
  floats: { from: Coord; to: Coord | null }[];
  units: Ghost[];
}

export interface Overlay {
  highlights: Highlight[];
  intents: IntentDraw[];
  /** Optional so hand-built overlays (the gallery) need not list them. */
  marks?: IntentMark[];
  /** Null when the board has no water. */
  drift?: DriftGhosts | null;
  badges: Badge[];
  ghosts: Ghost[];
  selected: UnitId | null;
}

export const EMPTY_OVERLAY: Overlay = {
  highlights: [],
  intents: [],
  marks: [],
  drift: null,
  badges: [],
  ghosts: [],
  selected: null,
};

/** What the board highlights for the current input mode (and its preview, if any). */
export function overlayFor(s: BattleState, mode: InputMode, footnotes: Footnotes = {}): Overlay {
  const highlights: Highlight[] = [];
  const badges: Badge[] = [];
  const ghosts: Ghost[] = [];
  const preview = mode.kind === 'confirm' ? mode.preview : null;

  if (mode.kind === 'member' || mode.kind === 'inspect') {
    for (const at of mode.moves) highlights.push({ kind: 'reach', at });
  }
  if (mode.kind === 'inspect') highlights.push({ kind: 'focus', at: mode.at });
  if ((mode.kind === 'aim' || mode.kind === 'confirm') && mode.spell !== null) {
    highlights.push(...aimTints(s, mode.unit, mode.spell, footnotes));
  }
  if (mode.kind === 'basic') {
    const m = findUnit(s, mode.unit);
    const far = mode.action === 'pull' || mode.action === 'hop';
    if (m) {
      for (const d of mode.dirs) {
        const near = step(m.pos, d);
        highlights.push({ kind: 'shove', at: far ? step(near, d) : near });
      }
    }
  }
  if (preview) {
    if (preview.path.length > 1) highlights.push({ kind: 'path', cells: preview.path });
    const arc = arcOf(s, preview.action);
    if (arc) highlights.push(arc);
    for (const at of preview.targets) highlights.push({ kind: 'target', at });
    const after = preview.result.state;
    // A masked preview never draws from the resulting state: what changed there may be unwitnessed.
    const blankKeys = new Set(preview.blanks.map((b) => `${b.x},${b.y}`));
    highlights.push(
      ...tileEffects(s, after).filter((h) => !('at' in h) || !blankKeys.has(`${h.at.x},${h.at.y}`)),
    );
    for (const at of preview.blanks) highlights.push({ kind: 'blank', at });
    for (const id of preview.hurt) {
      const m = findUnit(s, id);
      if (m) highlights.push({ kind: 'hurt', at: { ...m.pos } });
    }
    if (preview.masked) ghosts.push(...shownGhosts(s, preview.shown));
    for (const u of after.units) {
      const before = findUnit(s, u.id);
      const at = preview.masked && before ? before.pos : u.pos;
      const hurt = preview.damage[u.id];
      if (preview.kills.includes(u.id)) badges.push({ at, kind: 'kill', text: '' });
      if (hurt !== undefined && hurt > 0) badges.push({ at, kind: 'damage', text: `−${hurt}` });
      const shield = preview.shields[u.id];
      if (shield) badges.push({ at, kind: 'shield', text: `+${shield}` });
      if (!preview.masked && before && isAlive(u) && !sameCoord(before.pos, u.pos)) {
        ghosts.push({ unit: u.id, at: { ...u.pos }, kind: u.kind, def: u.def });
      }
    }
  }

  const focus = mode.kind === 'inspect' ? unitAt(s, mode.at) : null;
  const intentState = preview && !preview.masked ? preview.result.state : s;
  const intents: IntentDraw[] = [];
  for (const u of intentState.units) {
    if (u.kind !== 'enemy' || !isAlive(u) || u.intent?.kind !== 'attack') continue;
    const p = intentPreview(intentState, u);
    if (!p) continue;
    const end = p.path.at(-1);
    const endTile = end ? intentState.tiles[end.y * intentState.width + end.x] : undefined;
    intents.push({
      blocked: p.hit === null && !!endTile && (isCloud(endTile) || isPlate(endTile)),
      from: { ...u.pos },
      path: p.path,
      hit: p.hit,
      order: u.intent.order,
      attack: u.intent.attack,
      dir: u.intent.dir,
      emphasis: focus?.kind === 'enemy' ? (focus.id === u.id ? 'strong' : 'dim') : 'normal',
    });
  }
  const marks = marksOf(
    intentState.units.map((u) => ({
      kind: u.kind,
      id: u.id,
      def: u.def,
      pos: u.pos,
      intent: u.kind === 'enemy' ? u.intent : null,
      alive: isAlive(u),
    })),
    focus,
  );
  const drift = driftGhosts(intentState);
  return { highlights, intents, marks, drift, badges, ghosts, selected: selectedOf(mode) };
}

/** The leap a Hop draws, or the two-way trade a Swap draws, from the caster's tile. */
function arcOf(s: BattleState, action: Action): Highlight | null {
  if (action.type !== 'hop' && action.type !== 'swap') return null;
  const m = findUnit(s, action.unit);
  if (!m) return null;
  const near = step(m.pos, action.dir);
  if (action.type === 'swap') return { kind: 'arc', from: { ...m.pos }, to: near, both: true };
  return { kind: 'arc', from: { ...m.pos }, to: step(near, action.dir) };
}

/** Ghosts of units a witnessed relocation moves, for a preview that also holds unwitnessed events. */
function shownGhosts(s: BattleState, shown: readonly GameEvent[]): Ghost[] {
  const out: Ghost[] = [];
  for (const e of shown) {
    for (const r of relocations(e)) {
      const u = findUnit(s, r.unit.id);
      const to = r.path[r.path.length - 1];
      if (u && to && isAlive(u) && !out.some((g) => g.unit === u.id)) {
        out.push({ unit: u.id, at: { ...to }, kind: u.kind, def: u.def });
      }
    }
  }
  return out;
}

interface MarkSource {
  kind: 'member' | 'enemy';
  id: UnitId;
  def: string;
  pos: Coord;
  intent?: Intent | null;
  alive: boolean;
}

/** Summon and flare marks of the living foes (K-17). Works on engine units and on playback views. */
export function marksOf(
  units: readonly MarkSource[],
  focus?: { kind: string; id: UnitId } | null,
): IntentMark[] {
  const out: IntentMark[] = [];
  for (const u of units) {
    if (u.kind !== 'enemy' || !u.alive || !u.intent) continue;
    const emphasis = focus?.kind === 'enemy' ? (focus.id === u.id ? 'strong' : 'dim') : 'normal';
    const i = u.intent;
    if (i.kind === 'summon')
      out.push({ kind: 'summon', from: { ...u.pos }, at: { ...i.at }, order: i.order, emphasis });
    else if (i.kind === 'flare') {
      const targets = units
        .filter((m) => m.kind === 'enemy' && m.alive && ENEMIES[m.def as EnemyId]?.bursts)
        .map((m) => ({ ...m.pos }));
      out.push({ kind: 'flare', from: { ...u.pos }, targets, order: i.order, emphasis });
    }
  }
  return out;
}

/** Ghosts of the next drift, or null if the board has no water. */
function driftGhosts(s: BattleState): DriftGhosts | null {
  if (!s.tiles.some((t) => t.terrain.water)) return null;
  const p = driftPreview(s);
  const units: Ghost[] = [];
  for (const m of p.units) {
    const u = findUnit(s, m.unit);
    if (u) units.push({ unit: u.id, at: { ...m.to }, kind: u.kind, def: u.def });
  }
  return { floats: p.floats, units };
}

/** Tiles whose state the action changes, toned by the new state (or by what was there, when it clears). */
function tileEffects(before: BattleState, after: BattleState): Highlight[] {
  const out: Highlight[] = [];
  after.tiles.forEach((t, i) => {
    const b = before.tiles[i];
    if (!b) return;
    const at = { x: i % after.width, y: Math.floor(i / after.width) };
    const now = t.state?.id ?? null;
    const was = b.state?.id ?? null;
    if (now === was) return;
    out.push({ kind: 'effect', at, tone: now ? layerTone(now) : 'steam' });
  });
  return out;
}

/** Faint tint on every tile a spell could be aimed at (Bolt: each line, chevron at its start). */
function aimTints(
  s: BattleState,
  unit: UnitId,
  spell: SpellKey,
  footnotes: Footnotes,
): Highlight[] {
  const out: Highlight[] = [];
  const seen = new Set<string>();
  const add = (h: Highlight & { at: Coord }): void => {
    const k = `${h.at.x},${h.at.y}`;
    if (seen.has(k)) return;
    seen.add(k);
    out.push(h);
  };
  for (const aim of legalAims(s, unit, spell)) {
    if (aim.kind === 'dir') {
      const { path } = aimPreview(s, unit, spell, aim, footnotes);
      path.forEach((at, i) => {
        add(i === 0 ? { kind: 'aim', at, chevron: aim.dir } : { kind: 'aim', at });
      });
    } else if (aim.kind === 'tile') {
      add({ kind: 'aim', at: aim.at });
    } else {
      const u = findUnit(s, unit);
      if (u) add({ kind: 'aim', at: u.pos });
    }
  }
  return out;
}
