import type { AttackId } from '$data';
import {
  aimPreview,
  type BattleState,
  type Coord,
  type Dir,
  findUnit,
  intentPreview,
  legalAims,
  type SpellKey,
  sameCoord,
  step,
  type UnitId,
  unitAt,
} from '$engine';
import { type InputMode, selectedOf } from './battleInput';
import type { Tone } from './fx';

/** What the board draws on top of the tiles, derived from the input mode by `overlayFor`. */
export type Highlight =
  | { kind: 'reach'; at: Coord } // a tile the selected member can move to
  | { kind: 'aim'; at: Coord; chevron?: Dir } // a legal aim tile (chevron: next to the caster)
  | { kind: 'target'; at: Coord } // a tile the previewed action hits
  | { kind: 'path'; cells: Coord[] } // projectile / push path
  | { kind: 'shove'; at: Coord } // an adjacent unit that can be shoved
  | { kind: 'effect'; at: Coord; tone: Tone } // a tile the previewed action changes (ink, oil, fire…)
  | { kind: 'focus'; at: Coord }; // the tile being inspected

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

export interface Overlay {
  highlights: Highlight[];
  intents: IntentDraw[];
  badges: Badge[];
  ghosts: Ghost[];
  selected: UnitId | null;
}

export const EMPTY_OVERLAY: Overlay = {
  highlights: [],
  intents: [],
  badges: [],
  ghosts: [],
  selected: null,
};

/** What the board highlights for the current input mode (and its preview, if any). */
export function overlayFor(s: BattleState, mode: InputMode): Overlay {
  const highlights: Highlight[] = [];
  const badges: Badge[] = [];
  const ghosts: Ghost[] = [];
  const preview = mode.kind === 'confirm' ? mode.preview : null;

  if (mode.kind === 'member' || mode.kind === 'inspect') {
    for (const at of mode.moves) highlights.push({ kind: 'reach', at });
  }
  if (mode.kind === 'inspect') highlights.push({ kind: 'focus', at: mode.at });
  if ((mode.kind === 'aim' || mode.kind === 'confirm') && mode.spell !== null) {
    highlights.push(...aimTints(s, mode.unit, mode.spell));
  }
  if (mode.kind === 'shove') {
    const m = findUnit(s, mode.unit);
    if (m) for (const d of mode.dirs) highlights.push({ kind: 'shove', at: step(m.pos, d) });
  }
  if (preview) {
    if (preview.path.length > 1) highlights.push({ kind: 'path', cells: preview.path });
    for (const at of preview.targets) highlights.push({ kind: 'target', at });
    const after = preview.result.state;
    highlights.push(...tileEffects(s, after));
    for (const u of after.units) {
      const before = findUnit(s, u.id);
      const at = u.pos;
      const hurt = preview.damage[u.id];
      if (preview.kills.includes(u.id)) badges.push({ at, kind: 'kill', text: '' });
      if (hurt !== undefined && hurt > 0) badges.push({ at, kind: 'damage', text: `−${hurt}` });
      const shield = preview.shields[u.id];
      if (shield) badges.push({ at, kind: 'shield', text: `+${shield}` });
      if (before && u.hp > 0 && !sameCoord(before.pos, u.pos)) {
        ghosts.push({ unit: u.id, at: { ...u.pos }, kind: u.kind, def: u.def });
      }
    }
  }

  const focus = mode.kind === 'inspect' ? unitAt(s, mode.at) : null;
  const intentState = preview?.result.state ?? s;
  const intents: IntentDraw[] = [];
  for (const u of intentState.units) {
    if (u.kind !== 'enemy' || u.hp <= 0 || !u.intent) continue;
    const p = intentPreview(intentState, u);
    if (!p) continue;
    const end = p.path.at(-1);
    const endTile = end ? intentState.tiles[end.y * intentState.width + end.x] : undefined;
    intents.push({
      blocked: p.hit === null && !!endTile && (endTile.steam > 0 || endTile.plate),
      from: { ...u.pos },
      path: p.path,
      hit: p.hit,
      order: u.intent.order,
      attack: u.intent.attack,
      dir: u.intent.dir,
      emphasis: focus?.kind === 'enemy' ? (focus.id === u.id ? 'strong' : 'dim') : 'normal',
    });
  }
  return { highlights, intents, badges, ghosts, selected: selectedOf(mode) };
}

/** Tiles whose material layers the action changes, toned by the most notable new layer. */
function tileEffects(before: BattleState, after: BattleState): Highlight[] {
  const out: Highlight[] = [];
  after.tiles.forEach((t, i) => {
    const b = before.tiles[i];
    if (!b) return;
    const at = { x: i % after.width, y: Math.floor(i / after.width) };
    const tone: Tone | null =
      t.fire > b.fire
        ? 'fire'
        : t.plate && !b.plate
          ? 'brass'
          : t.steam > b.steam
            ? 'steam'
            : t.ink !== b.ink
              ? 'ink'
              : t.oil !== b.oil
                ? 'oil'
                : b.fire > 0 && t.fire === 0
                  ? 'steam'
                  : null;
    if (tone) out.push({ kind: 'effect', at, tone });
  });
  return out;
}

/** Faint tint on every tile a spell could be aimed at (Bolt: each line, chevron at its start). */
function aimTints(s: BattleState, unit: UnitId, spell: SpellKey): Highlight[] {
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
      const { path } = aimPreview(s, unit, spell, aim);
      path.forEach((at, i) => {
        add(i === 0 ? { kind: 'aim', at, chevron: aim.dir } : { kind: 'aim', at });
      });
    } else if (aim.kind === 'tile') {
      add({ kind: 'aim', at: aim.at });
    } else {
      const u = findUnit(s, aim.unit);
      if (u) add({ kind: 'aim', at: u.pos });
    }
  }
  return out;
}
