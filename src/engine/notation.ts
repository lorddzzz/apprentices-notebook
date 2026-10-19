import {
  type CompoundId,
  ENEMIES,
  ENEMY_IDS,
  type EnemyId,
  isInvention,
  MEMBER_IDS,
  MEMBERS,
  type MemberId,
  RUNE_IDS,
  RUNES,
  type RuneId,
  type RuneRef,
  type StateId,
  TUNING,
} from '$data';
import { type Coord, type Dir, label, parseKey } from './grid';
import {
  type GlyphArg,
  isGlyph,
  type Lattice,
  type Layer,
  type Placed,
  type PlacedGlyph,
  type Tile,
} from './types';

/**
 * ASCII notation shared by tests, encounters and the Lab. Cells are whitespace-separated tokens,
 * one row per line, blank lines ignored. Errors always name the cell label (A1 = top-left).
 *
 * Board cell = `.` or [unit][mods][terrain and state]:
 *   unit     D Draughtsman, S Stoker, r rat, b brass sentry, f familiar, d dummy, e eel, n snuffer,
 *            m lamp-moth, M lamp-mother (first char only; elite or minion comes from the foe's data)
 *   mods     ! mark, !! deep mark, & brass collar, $ shackle, + 1 shield each (`++` = 2); after a unit
 *   state    one per tile: i blot, o slick, ~ cloud, = layout plate (permanent), # rune plate,
 *            * fire, or a compound in braces: {stain} {brand} {pool} {fog} {skid} {bank} {kettle} {wall}
 *   terrain  w + arrow water lane flowing that way (`w>`, `wv`), h grate (on water only),
 *            g wooden lock gate (alone), l lamp, @ vent, _ the drop (an open side, P3)
 *
 * Lattice cell = `.` empty socket, `x` hole, a rune token (`Bolt`, `Ink`, `Fork`…) with an arrow
 * suffix `> < ^ v` iff the rune is an arrow rune (sources, Bend), or an invention `inv:name`.
 * A Glyph is `G:id>` (the arrow is the way in), then one `[x,y:Rune]` per open-cell argument, `x,y`
 * being the Glyph's local cell (`G:g1>[1,0:Oil]`, an arrow rune `[2,0:Bend^]`; no spaces).
 */

export interface BoardUnit {
  kind: 'member' | 'enemy';
  def: MemberId | EnemyId;
  at: Coord;
  mark: 'plain' | 'deep' | null;
  collar: boolean; // a collar beyond a born-brass foe's own
  shackle: boolean;
  shield: number;
}
export interface BoardSpec {
  width: number;
  height: number;
  tiles: Tile[];
  units: BoardUnit[]; // reading order
}

function rows(ascii: string): string[][] {
  return ascii
    .split('\n')
    .filter((l) => l.trim() !== '')
    .map((l) => l.trim().split(/\s+/));
}

export function emptyTile(): Tile {
  return {
    terrain: { water: null, drop: false, vent: false, grate: false, gate: false, lamp: false },
    state: null,
    jar: null,
    hot: 0,
  };
}

/** Inverse of `label`: "C4" → {x:2, y:3}. */
export function parseLabel(text: string): Coord {
  const m = /^([A-Z])(\d+)$/.exec(text);
  if (!m?.[1] || !m[2] || Number(m[2]) < 1) throw new Error(`Bad cell label "${text}"`);
  return { x: m[1].charCodeAt(0) - 65, y: Number(m[2]) - 1 };
}

// ── Board ───────────────────────────────────────────────

const ARROW_CHARS: Record<string, Dir> = { '>': 'right', '<': 'left', '^': 'up', v: 'down' };
const ARROW_SUFFIX: Record<Dir, string> = { right: '>', left: '<', up: '^', down: 'v' };

/** Plain states by their character; `#` is a rune plate (it crumbles), `=` a layout one. */
const STATE_CHARS: Readonly<Record<string, StateId>> = {
  i: 'blot',
  o: 'slick',
  '~': 'cloud',
  '=': 'plate',
  '#': 'plate',
  '*': 'fire',
};
/** Compounds by their brace name (Deep mark and Shackle live on units: `!!`, `$`). */
const COMPOUND_NAMES: Readonly<Record<string, CompoundId>> = {
  stain: 'stain',
  brand: 'brandCloud',
  pool: 'pool',
  fog: 'greaseFog',
  skid: 'skidPlate',
  bank: 'bank',
  kettle: 'kettle',
  wall: 'wall',
};
const COMPOUND_TOKENS: Partial<Record<CompoundId, string>> = Object.fromEntries(
  Object.entries(COMPOUND_NAMES).map(([name, id]) => [id, `{${name}}`]),
);
const PLATE_LIKE: readonly Layer['id'][] = ['plate', 'skidPlate', 'kettle', 'wall'];

/** How long a state put down by a token lasts (P17); 0 = until changed. */
function roundsOf(id: Layer['id']): number {
  switch (id) {
    case 'blot':
    case 'slick':
      return 0;
    case 'cloud':
      return TUNING.cloudRounds;
    case 'plate':
      return TUNING.plateRounds;
    case 'fire':
      return TUNING.fireRounds;
    default:
      return TUNING.compoundRounds;
  }
}

/** A state as a board token puts it down; plates with their hits (P19). Layout plates never break. */
function layerFor(id: Layer['id'], layout: boolean): Layer {
  const layer: Layer = { id, rounds: layout ? 0 : roundsOf(id), origin: null };
  if (id === 'wall') layer.hits = 2;
  else if (PLATE_LIKE.includes(id) && !layout) layer.hits = 1;
  return layer;
}

function unitFor(ch: string): { kind: 'member' | 'enemy'; def: MemberId | EnemyId } | null {
  for (const id of MEMBER_IDS) if (MEMBERS[id].token === ch) return { kind: 'member', def: id };
  for (const id of ENEMY_IDS) if (ENEMIES[id].token === ch) return { kind: 'enemy', def: id };
  return null;
}

export function parseCell(token: string, at: Coord): { tile: Tile; unit: BoardUnit | null } {
  const where = label(at);
  const tile = emptyTile();
  const terrain = tile.terrain;
  if (token === '.') return { tile, unit: null };
  const bad = (why: string): Error => new Error(`${why} in cell ${where} ("${token}")`);

  const chars = [...token];
  let unit: BoardUnit | null = null;
  const first = chars[0];
  const found = first === undefined ? null : unitFor(first);
  if (found) {
    unit = { ...found, at, mark: null, collar: false, shackle: false, shield: 0 };
    chars.shift();
  }

  let parts = 0;
  const setState = (layer: Layer): void => {
    if (tile.state) throw bad('A tile holds one state');
    tile.state = layer;
  };
  for (let k = 0; k < chars.length; k++) {
    const ch = chars[k] as string;
    if ('!&$+'.includes(ch)) {
      if (!unit) throw bad(`Modifier "${ch}" needs a unit`);
      if (ch === '!') {
        if (unit.mark) throw bad('A unit carries one mark');
        unit.mark = chars[k + 1] === '!' ? 'deep' : 'plain';
        if (unit.mark === 'deep') k++;
      } else if (ch === '&') unit.collar = true;
      else if (ch === '$') unit.shackle = true;
      else unit.shield++;
      continue;
    }
    parts++;
    const state = STATE_CHARS[ch];
    if (state) {
      setState(layerFor(state, ch === '='));
      continue;
    }
    switch (ch) {
      case '{': {
        const close = chars.indexOf('}', k);
        const name = close < 0 ? '' : chars.slice(k + 1, close).join('');
        const id = COMPOUND_NAMES[name];
        if (!id) throw bad(`Unknown compound "{${name}}"`);
        setState(layerFor(id, false));
        k = close;
        break;
      }
      case 'w': {
        const dir = ARROW_CHARS[chars[k + 1] ?? ''];
        if (!dir) throw bad('Water needs an arrow');
        terrain.water = dir;
        k++;
        break;
      }
      case 'h':
        terrain.grate = true;
        break;
      case 'g':
        terrain.gate = true;
        break;
      case 'l':
        terrain.lamp = true;
        break;
      case '@':
        terrain.vent = true;
        break;
      case '_':
        terrain.drop = true;
        break;
      default:
        throw bad(`Unknown character "${ch}"`);
    }
  }

  const plate = tile.state !== null && PLATE_LIKE.includes(tile.state.id);
  if (terrain.grate && !terrain.water) throw bad('A grate needs water');
  if (terrain.grate && unit) throw bad('A unit cannot stand on a grate');
  if (terrain.gate) {
    if (unit) throw bad('A unit cannot stand on a lock gate');
    if (parts > 1) throw bad('A lock gate cannot share a tile');
  }
  if (plate && unit) throw bad('A unit cannot stand on a plate');
  return { tile, unit };
}

export function parseBoard(ascii: string): BoardSpec {
  const grid = rows(ascii);
  if (grid.length === 0) throw new Error('Empty board');
  const width = Math.max(...grid.map((r) => r.length));
  const tiles: Tile[] = [];
  const units: BoardUnit[] = [];
  const members = new Set<string>();
  grid.forEach((row, y) => {
    for (let x = 0; x < width; x++) {
      const at = { x, y };
      const { tile, unit } = parseCell(row[x] ?? '.', at);
      tiles.push(tile);
      if (unit) {
        if (unit.kind === 'member') {
          if (members.has(unit.def)) {
            throw new Error(
              `Duplicate member "${MEMBERS[unit.def as MemberId].token}" in cell ${label(at)}`,
            );
          }
          members.add(unit.def);
        }
        units.push(unit);
      }
    }
  });
  return { width, height: grid.length, tiles, units };
}

function unitToken(u: BoardUnit): string {
  const base =
    u.kind === 'member' ? MEMBERS[u.def as MemberId].token : ENEMIES[u.def as EnemyId].token;
  return (
    base +
    (u.mark === 'deep' ? '!!' : u.mark === 'plain' ? '!' : '') +
    (u.collar ? '&' : '') +
    (u.shackle ? '$' : '') +
    '+'.repeat(u.shield)
  );
}

function stateToken(l: Layer): string {
  if (l.id === 'plate') return l.rounds === 0 && l.hits === undefined ? '=' : '#';
  const plain = Object.entries(STATE_CHARS).find(([, id]) => id === l.id)?.[0];
  return plain ?? COMPOUND_TOKENS[l.id as CompoundId] ?? '';
}

function layerToken(t: Tile): string {
  const g = t.terrain;
  return (
    (g.water ? `w${ARROW_SUFFIX[g.water]}` : '') +
    (g.grate ? 'h' : '') +
    (g.drop ? '_' : '') +
    (t.state ? stateToken(t.state) : '') +
    (g.vent ? '@' : '') +
    (g.gate ? 'g' : '') +
    (g.lamp ? 'l' : '')
  );
}

function padRows(grid: string[][]): string {
  const widths = (grid[0] ?? []).map((_, x) => Math.max(...grid.map((r) => (r[x] ?? '').length)));
  return grid
    .map((r) =>
      r
        .map((c, x) => c.padEnd(widths[x] ?? 0))
        .join(' ')
        .trimEnd(),
    )
    .join('\n');
}

/** Canonical form: unit, mods (!/!! & $ +…), then w? h _ state @ g l; columns padded to equal width. */
export function serializeBoard(spec: BoardSpec): string {
  const grid: string[][] = [];
  for (let y = 0; y < spec.height; y++) {
    const row: string[] = [];
    for (let x = 0; x < spec.width; x++) {
      const tile = spec.tiles[y * spec.width + x];
      const unit = spec.units.find((u) => u.at.x === x && u.at.y === y);
      const text = (unit ? unitToken(unit) : '') + (tile ? layerToken(tile) : '');
      row.push(text === '' ? '.' : text);
    }
    grid.push(row);
  }
  return padRows(grid);
}

// ── Lattice ─────────────────────────────────────────────

const INVENTION_TOKEN = /^inv:[A-Za-z0-9_-]+$/;

function runeByToken(token: string): RuneRef | null {
  if (INVENTION_TOKEN.test(token)) return token as RuneRef;
  return RUNE_IDS.find((id) => RUNES[id].token === token) ?? null;
}

const isArrowRune = (r: RuneRef): r is RuneId => !isInvention(r) && RUNES[r].arrow;
/** The lattice token of a rune or an invention. */
export const tokenOf = (r: RuneRef): string => (isInvention(r) ? r : RUNES[r].token);

/** A rune token with its arrow suffix: `Oil`, `Bend^`. The arrow is optional here (see `GlyphArg`). */
function parseRuneArg(text: string, where: string, token: string): GlyphArg {
  const plain = runeByToken(text);
  if (plain) return { rune: plain };
  const dir = ARROW_CHARS[text.slice(-1)];
  const arrowed = dir ? runeByToken(text.slice(0, -1)) : null;
  if (!dir || !arrowed) throw new Error(`Unknown rune "${text}" in "${token}" in cell ${where}`);
  if (!isArrowRune(arrowed)) {
    throw new Error(`Rune "${tokenOf(arrowed)}" takes no arrow, got "${token}" in cell ${where}`);
  }
  return { rune: arrowed, dir };
}

/**
 * `G:id>` with the way-in arrow, then optional arguments, one `[x,y:Rune]` per open cell, the
 * cell being the Glyph's local `x,y` (`G:g1>[1,0:Oil][2,0:Bend^]`).
 */
function parseGlyphToken(token: string, at: Coord, where: string): PlacedGlyph {
  const m = /^G:(.*?)((?:\[[^\]]*\])*)$/.exec(token);
  const head = m?.[1] ?? '';
  const gdir = ARROW_CHARS[head.slice(-1)];
  const glyph = head.slice(0, -1);
  if (!gdir || glyph === '') {
    throw new Error(`Glyph "${token}" needs an id and an arrow (G:id>) in cell ${where}`);
  }
  const args: Record<string, GlyphArg> = {};
  for (const group of (m?.[2] ?? '').match(/\[[^\]]*\]/g) ?? []) {
    const arg = /^\[(-?\d+,-?\d+):(.+)\]$/.exec(group);
    if (!arg?.[1] || !arg[2]) {
      throw new Error(`Bad Glyph argument "${group}" (want [x,y:Rune]) in cell ${where}`);
    }
    if (args[arg[1]])
      throw new Error(`Cell ${arg[1]} is given twice in "${token}" in cell ${where}`);
    args[arg[1]] = parseRuneArg(arg[2], where, token);
  }
  return Object.keys(args).length > 0 ? { at, glyph, dir: gdir, args } : { at, glyph, dir: gdir };
}

function glyphToken(g: PlacedGlyph): string {
  const args = Object.entries(g.args ?? {})
    .map(([k, a]) => ({ at: parseKey(k), k, a }))
    .sort((p, q) => p.at.y - q.at.y || p.at.x - q.at.x)
    .map(({ k, a }) => `[${k}:${tokenOf(a.rune)}${a.dir ? ARROW_SUFFIX[a.dir] : ''}]`);
  return `G:${g.glyph}${ARROW_SUFFIX[g.dir]}${args.join('')}`;
}

export function parseLattice(ascii: string): Lattice {
  const grid = rows(ascii);
  if (grid.length === 0) throw new Error('Empty lattice');
  const width = grid[0]?.length ?? 0;
  const holes: Coord[] = [];
  const runes: Placed[] = [];
  grid.forEach((row, y) => {
    if (row.length !== width) {
      throw new Error(`Lattice row ${y + 1} has ${row.length} cells, expected ${width}`);
    }
    row.forEach((token, x) => {
      const at = { x, y };
      const where = label(at);
      if (token === '.') return;
      if (token === 'x') {
        holes.push(at);
        return;
      }
      if (token.startsWith('G:')) {
        runes.push(parseGlyphToken(token, at, where));
        return;
      }
      const plain = runeByToken(token);
      if (plain) {
        if (isArrowRune(plain)) {
          throw new Error(`Rune "${token}" needs an arrow (> < ^ v) in cell ${where}`);
        }
        runes.push({ at, rune: plain });
        return;
      }
      const dir = ARROW_CHARS[token.slice(-1)];
      const arrowed = dir ? runeByToken(token.slice(0, -1)) : null;
      if (!dir || !arrowed) throw new Error(`Unknown lattice token "${token}" in cell ${where}`);
      if (!isArrowRune(arrowed)) {
        throw new Error(
          `Rune "${tokenOf(arrowed)}" takes no arrow, got "${token}" in cell ${where}`,
        );
      }
      runes.push({ at, rune: arrowed, dir });
    });
  });
  return { shape: { width, height: grid.length, holes }, runes };
}

export function serializeLattice(l: Lattice): string {
  const grid: string[][] = [];
  for (let y = 0; y < l.shape.height; y++) {
    const row: string[] = [];
    for (let x = 0; x < l.shape.width; x++) {
      const placed = l.runes.find((r) => r.at.x === x && r.at.y === y);
      if (placed && isGlyph(placed)) {
        row.push(glyphToken(placed));
      } else if (placed) {
        row.push(tokenOf(placed.rune) + (placed.dir ? ARROW_SUFFIX[placed.dir] : ''));
      } else if (l.shape.holes.some((h) => h.x === x && h.y === y)) {
        row.push('x');
      } else {
        row.push('.');
      }
    }
    grid.push(row);
  }
  return padRows(grid);
}
