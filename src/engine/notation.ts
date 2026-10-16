import {
  ENEMIES,
  ENEMY_IDS,
  type EnemyId,
  MEMBER_IDS,
  MEMBERS,
  type MemberId,
  RUNE_IDS,
  RUNES,
  type RuneId,
  TUNING,
} from '$data';
import { type Coord, type Dir, label, parseKey } from './grid';
import {
  type GlyphArg,
  isGlyph,
  type Lattice,
  type Placed,
  type PlacedGlyph,
  type Tile,
} from './types';

/**
 * ASCII notation shared by tests, encounters and the Lab. Cells are whitespace-separated tokens,
 * one row per line, blank lines ignored. Errors always name the cell label (A1 = top-left).
 *
 * Board cell = `.` or [unit][mods][layers]:
 *   unit    D Draughtsman, S Stoker, r rat, b brass sentry, f familiar, d dummy (first char only)
 *   mods    ! inked, & brass-coated, % branded (only after a unit)
 *           ^ hot, # etched (after a brass unit, or on a brass plate `=^#`)
 *   layers  o oil, i ink puddle, ~ steam, * fire (implies oil), = brass plate (alone, permanent: rune-raised plates crumble), @ steam vent
 *           $ stained oil (implies oil), s scalding steam (implies steam)
 *
 * Lattice cell = `.` empty socket, `x` hole, or a rune token (`Bolt`, `Ink`, `OnInked`, `Amp`…)
 * with an arrow suffix `> < ^ v` iff the rune is an arrow rune (sources, Bend).
 * A Glyph is `G:id>` (the arrow is the way in), then one `[x,y:Rune]` per open-cell argument, `x,y`
 * being the Glyph's local cell (`G:g1>[1,0:Smear]`, an arrow rune `[2,0:Bend^]`; no spaces).
 */

export interface BoardUnit {
  kind: 'member' | 'enemy';
  def: MemberId | EnemyId;
  at: Coord;
  inked: boolean;
  brass: boolean;
  branded: boolean;
  heat: number;
  etched: boolean;
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
    oil: false,
    ink: false,
    steam: 0,
    fire: 0,
    plate: false,
    plateRounds: 0,
    vent: false,
    stain: false,
    heat: 0,
    etched: false,
    scald: false,
  };
}

/** Inverse of `label`: "C4" → {x:2, y:3}. */
export function parseLabel(text: string): Coord {
  const m = /^([A-Z])(\d+)$/.exec(text);
  if (!m?.[1] || !m[2] || Number(m[2]) < 1) throw new Error(`Bad cell label "${text}"`);
  return { x: m[1].charCodeAt(0) - 65, y: Number(m[2]) - 1 };
}

// ── Board ───────────────────────────────────────────────

function unitFor(ch: string): { kind: 'member' | 'enemy'; def: MemberId | EnemyId } | null {
  for (const id of MEMBER_IDS) if (MEMBERS[id].token === ch) return { kind: 'member', def: id };
  for (const id of ENEMY_IDS) if (ENEMIES[id].token === ch) return { kind: 'enemy', def: id };
  return null;
}

export function parseCell(token: string, at: Coord): { tile: Tile; unit: BoardUnit | null } {
  const where = label(at);
  const tile = emptyTile();
  if (token === '.') return { tile, unit: null };

  const chars = [...token];
  let unit: BoardUnit | null = null;
  const first = chars[0];
  const found = first === undefined ? null : unitFor(first);
  if (found) {
    unit = { ...found, at, inked: false, brass: false, branded: false, heat: 0, etched: false };
    chars.shift();
  }

  let layers = 0;
  let hot = false;
  let etched = false;
  for (const ch of chars) {
    switch (ch) {
      case '!':
      case '&':
      case '%':
        if (!unit) throw new Error(`Modifier "${ch}" needs a unit in cell ${where} ("${token}")`);
        if (ch === '!') unit.inked = true;
        else if (ch === '&') unit.brass = true;
        else unit.branded = true;
        continue;
      case '^':
        hot = true;
        continue;
      case '#':
        etched = true;
        continue;
      case '$':
        tile.oil = true;
        tile.stain = true;
        break;
      case 's':
        tile.steam = TUNING.steamRounds;
        tile.scald = true;
        break;
      case 'o':
        tile.oil = true;
        break;
      case 'i':
        tile.ink = true;
        break;
      case '~':
        tile.steam = TUNING.steamRounds;
        break;
      case '*':
        tile.oil = true;
        tile.fire = TUNING.fireRounds;
        break;
      case '=':
        tile.plate = true;
        break;
      case '@':
        tile.vent = true;
        break;
      default:
        throw new Error(`Unknown character "${ch}" in cell ${where} ("${token}")`);
    }
    layers++;
  }

  if (hot || etched) {
    const brassUnit = unit
      ? unit.brass || (unit.kind === 'enemy' && ENEMIES[unit.def as EnemyId].brass)
      : false;
    if (unit && !brassUnit)
      throw new Error(`Only brass can be hot or etched in cell ${where} ("${token}")`);
    if (!unit && !tile.plate)
      throw new Error(`Only brass can be hot or etched in cell ${where} ("${token}")`);
    if (unit) {
      unit.heat = hot ? TUNING.heatRounds : 0;
      unit.etched = etched;
    } else {
      tile.heat = hot ? TUNING.heatRounds : 0;
      tile.etched = etched;
    }
  }
  if (tile.plate) {
    if (unit) throw new Error(`A unit cannot stand on a brass plate in cell ${where} ("${token}")`);
    if (layers > 1)
      throw new Error(`A brass plate cannot share a tile in cell ${where} ("${token}")`);
  }
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
    (u.inked ? '!' : '') +
    (u.brass ? '&' : '') +
    (u.branded ? '%' : '') +
    (u.heat > 0 ? '^' : '') +
    (u.etched ? '#' : '')
  );
}

function layerToken(t: Tile): string {
  return (
    (t.oil && t.fire === 0 ? (t.stain ? '$' : 'o') : '') +
    (t.ink ? 'i' : '') +
    (t.steam > 0 ? (t.scald ? 's' : '~') : '') +
    (t.fire > 0 ? '*' : '') +
    (t.plate ? '=' : '') +
    (t.plate && t.heat > 0 ? '^' : '') +
    (t.plate && t.etched ? '#' : '') +
    (t.vent ? '@' : '')
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

/** Canonical form: unit, mods (! & % ^ #), layers in order o/$ i ~/s * = ^ # @; columns padded to equal width. */
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

const ARROW_CHARS: Record<string, Dir> = { '>': 'right', '<': 'left', '^': 'up', v: 'down' };
const ARROW_SUFFIX: Record<Dir, string> = { right: '>', left: '<', up: '^', down: 'v' };

function runeByToken(token: string): RuneId | null {
  return RUNE_IDS.find((id) => RUNES[id].token === token) ?? null;
}

/** A rune token with its arrow suffix: `Smear`, `Bend^`. The arrow is optional here (see `GlyphArg`). */
function parseRuneArg(text: string, where: string, token: string): GlyphArg {
  const plain = runeByToken(text);
  if (plain) return { rune: plain };
  const dir = ARROW_CHARS[text.slice(-1)];
  const arrowed = dir ? runeByToken(text.slice(0, -1)) : null;
  if (!dir || !arrowed) throw new Error(`Unknown rune "${text}" in "${token}" in cell ${where}`);
  if (!RUNES[arrowed].arrow) {
    throw new Error(
      `Rune "${RUNES[arrowed].token}" takes no arrow, got "${token}" in cell ${where}`,
    );
  }
  return { rune: arrowed, dir };
}

/**
 * `G:id>` with the way-in arrow, then optional arguments, one `[x,y:Rune]` per open cell, the
 * cell being the Glyph's local `x,y` (`G:g1>[1,0:Smear][2,0:Bend^]`).
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
    .map(({ k, a }) => `[${k}:${RUNES[a.rune].token}${a.dir ? ARROW_SUFFIX[a.dir] : ''}]`);
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
        if (RUNES[plain].arrow) {
          throw new Error(`Rune "${token}" needs an arrow (> < ^ v) in cell ${where}`);
        }
        runes.push({ at, rune: plain });
        return;
      }
      const dir = ARROW_CHARS[token.slice(-1)];
      const arrowed = dir ? runeByToken(token.slice(0, -1)) : null;
      if (!dir || !arrowed) throw new Error(`Unknown lattice token "${token}" in cell ${where}`);
      if (!RUNES[arrowed].arrow) {
        throw new Error(
          `Rune "${RUNES[arrowed].token}" takes no arrow, got "${token}" in cell ${where}`,
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
        row.push(RUNES[placed.rune].token + (placed.dir ? ARROW_SUFFIX[placed.dir] : ''));
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
