import {
  ENEMIES,
  type EnemyId,
  MEMBER_IDS,
  MEMBERS,
  type MemberId,
  SCENARIOS,
  type ScenarioDef,
} from '$data';
import {
  type Action,
  type BattleState,
  boardOf,
  type Coord,
  describeLog,
  enemies,
  type GameEvent,
  type Lattice,
  label,
  labSetCell,
  latticeOf,
  livingUnits,
  type Profile,
  parseCell,
  parseLattice,
  serializeLattice,
} from '$engine';

/** Lab helpers (pure): painting the board, and exporting a session as a scenario. */

export const DEFAULT_SCENARIO = 'sandbox';

/** `#/lab?scenario=<id>[&demo=1]` → what to load. */
export function labLocation(params: URLSearchParams): { scenario: string; demo: boolean } {
  return {
    scenario: params.get('scenario') || DEFAULT_SCENARIO,
    demo: params.get('demo') === '1',
  };
}

/** The scenario for an id; unknown ids fall back to the sandbox and say so. */
export function resolveScenario(id: string): { def: ScenarioDef; unknown: string | null } {
  const def = SCENARIOS.find((s) => s.id === id);
  if (def) return { def, unknown: null };
  const fallback = SCENARIOS.find((s) => s.id === DEFAULT_SCENARIO) ?? SCENARIOS[0];
  if (!fallback) throw new Error('No Lab scenarios');
  return { def: fallback, unknown: id };
}

/** Lattices from the start notebook (tests and Gallery fixtures; the app uses the profile's). */
export function fallbackLattices(): Record<MemberId, Lattice> {
  return Object.fromEntries(
    MEMBER_IDS.map((m) => [m, parseLattice(MEMBERS[m].startLattice)]),
  ) as Record<MemberId, Lattice>;
}

/** Lattices for members a scenario leaves out: the ones in the player's notebook. */
export function profileLattices(p: Profile): Record<MemberId, Lattice> {
  return Object.fromEntries(MEMBER_IDS.map((m) => [m, latticeOf(p, m)])) as Record<
    MemberId,
    Lattice
  >;
}

// ── Board painting ──────────────────────────────────────

export type PaletteItem =
  | 'D'
  | 'S'
  | 'r'
  | 'b'
  | 'f'
  | 'd'
  | '!'
  | '&'
  | 'o'
  | 'i'
  | '~'
  | '*'
  | '='
  | '@'
  | '.';

/** Palette order: units, unit modifiers, tile layers, then the eraser. */
export const PALETTE: readonly { item: PaletteItem; name: string }[] = [
  { item: 'D', name: 'Draughtsman' },
  { item: 'S', name: 'Stoker' },
  { item: 'r', name: 'Rat' },
  { item: 'b', name: 'Brass sentry' },
  { item: 'f', name: 'Familiar' },
  { item: 'd', name: 'Dummy' },
  { item: '!', name: 'Inked (a unit)' },
  { item: '&', name: 'Brass-coated (a unit)' },
  { item: 'o', name: 'Oil' },
  { item: 'i', name: 'Ink puddle' },
  { item: '~', name: 'Steam' },
  { item: '*', name: 'Fire (on oil)' },
  { item: '=', name: 'Brass plate' },
  { item: '@', name: 'Steam vent' },
  { item: '.', name: 'Clear the tile' },
];

const UNIT_CHARS = new Set(['D', 'S', 'r', 'b', 'f', 'd']);
const LAYER_ORDER = ['o', 'i', '~', '*', '=', '@'] as const;

interface Cell {
  unit: string;
  mods: Set<string>;
  layers: Set<string>;
}

function readToken(token: string): Cell {
  const chars = [...token];
  const first = chars[0];
  const unit = first !== undefined && UNIT_CHARS.has(first) ? first : '';
  if (unit) chars.shift();
  const cell: Cell = { unit, mods: new Set(), layers: new Set() };
  for (const ch of chars) (ch === '!' || ch === '&' ? cell.mods : cell.layers).add(ch);
  return cell;
}

function writeToken(c: Cell): string {
  const text =
    c.unit +
    (c.unit && c.mods.has('!') ? '!' : '') +
    (c.unit && c.mods.has('&') ? '&' : '') +
    LAYER_ORDER.filter((l) => c.layers.has(l)).join('');
  return text === '' ? '.' : text;
}

/**
 * One palette tap on a cell token. A unit replaces the unit; the same unit again removes it. `!`
 * and `&` toggle on a unit and do nothing without one. Layers toggle; fire implies oil (so `*`
 * replaces `o`, and removing fire leaves the oil); a plate stands alone and is replaced by
 * anything else. `.` clears the cell.
 */
export function toggleToken(token: string, item: PaletteItem): string {
  if (item === '.') return '.';
  const c = readToken(token);
  if (UNIT_CHARS.has(item)) {
    c.layers.delete('=');
    c.mods.clear();
    c.unit = c.unit === item ? '' : item;
    return writeToken(c);
  }
  if (item === '!' || item === '&') {
    if (!c.unit) return token;
    if (!c.mods.delete(item)) c.mods.add(item);
    return writeToken(c);
  }
  if (item === '=') return c.unit ? token : c.layers.has('=') ? '.' : '=';
  c.layers.delete('=');
  if (item === '*') {
    const burning = c.layers.delete('*');
    c.layers.delete('o');
    c.layers.add(burning ? 'o' : '*');
  } else if (item === 'o') {
    if (c.layers.has('*')) return token;
    if (!c.layers.delete('o')) c.layers.add('o');
  } else if (!c.layers.delete(item)) {
    c.layers.add(item);
  }
  return writeToken(c);
}

/** Why a palette tap changed nothing (for a toast). */
export function whyNoEdit(item: PaletteItem): string {
  switch (item) {
    case '!':
    case '&':
      return 'Put a unit on the tile first';
    case '=':
      return 'A plate cannot sit under a unit';
    case 'o':
      return 'Fire already burns on oil';
    default:
      return 'Nothing to change there';
  }
}

/** The board as [y][x] cell tokens, in canonical form. */
export function cellTokens(s: BattleState): string[][] {
  return boardOf(s)
    .split('\n')
    .map((l) => l.trim().split(/\s+/));
}

export interface CellEdit {
  at: Coord;
  token: string;
}

/**
 * What painting `item` on `at` changes. A unit placed on a plate drops the plate; placing a member
 * who stands elsewhere moves them (the engine clears the old cell's unit).
 */
export function paletteEdits(s: BattleState, at: Coord, item: PaletteItem): CellEdit[] {
  const current = cellTokens(s)[at.y]?.[at.x] ?? '.';
  const token = toggleToken(current, item);
  return token === current ? [] : [{ at, token }];
}

/** Applies painted cells. A change to the tile alone keeps the unit standing there (hp, intent). */
export function applyEdits(s: BattleState, edits: readonly CellEdit[]): BattleState {
  let next = s;
  for (const { at, token } of edits) {
    const here = cellTokens(next)[at.y]?.[at.x] ?? '.';
    if (unitPart(here) === unitPart(token)) {
      const clone = structuredClone(next);
      clone.tiles[at.y * clone.width + at.x] = parseCell(token, at).tile;
      next = clone;
    } else {
      next = labSetCell(next, at, token);
    }
  }
  return next;
}

const unitPart = (token: string): string => {
  const c = readToken(token);
  return c.unit + [...c.mods].sort().join('');
};

// ── Export as a scenario ────────────────────────────────

/** What a Lab session started from: the board as it stood, lattices, hurt units, telegraphs. */
export interface LabBase {
  board: string;
  lattices: Record<MemberId, Lattice>;
  /** By cell label: units whose hp is not the default for their kind. */
  hp: Record<string, number>;
  /** By cell label: enemies that telegraph an attack, and where. */
  intents: Record<string, Dir>;
}

type Dir = 'up' | 'right' | 'down' | 'left';

const defaultHp = (u: { kind: 'member' | 'enemy'; def: string }): number =>
  u.kind === 'member' ? MEMBERS[u.def as MemberId].hp : ENEMIES[u.def as EnemyId].hp;

export function baseOf(s: BattleState, lattices: Record<MemberId, Lattice>): LabBase {
  const hp: Record<string, number> = {};
  for (const u of livingUnits(s)) if (u.hp !== defaultHp(u)) hp[label(u.pos)] = u.hp;
  const intents: Record<string, Dir> = {};
  for (const e of enemies(s)) if (e.hp > 0 && e.intent) intents[label(e.pos)] = e.intent.dir;
  return { board: boardOf(s), lattices, hp, intents };
}

/** A scenario that replays `actions` from `base`; `expected` is the log of `events`. */
export function toScenarioDef(
  id: string,
  base: LabBase,
  actions: readonly Action[],
  events: readonly GameEvent[],
): ScenarioDef {
  const lattices = Object.fromEntries(
    MEMBER_IDS.map((m) => [m, serializeLattice(base.lattices[m])]),
  );
  return {
    id,
    title: id.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase()),
    note: 'Exported from the Lab.',
    board: base.board,
    lattices,
    ...(Object.keys(base.hp).length ? { hp: base.hp } : {}),
    intents: base.intents,
    demo: actions,
    expected: describeLog(events),
  };
}

const quote = (text: string): string => `'${text.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

function block(text: string, indent: string): string {
  const lines = text.split('\n').map((l) => `${indent}  ${l}`);
  return `\`\n${lines.join('\n')}\n${indent}\``;
}

/** A value as a single-line TypeScript literal (strings in single quotes). */
function literal(v: unknown): string {
  if (typeof v === 'string') return quote(v);
  if (Array.isArray(v)) return `[${v.map(literal).join(', ')}]`;
  if (v !== null && typeof v === 'object') {
    const body = Object.entries(v).map(([k, x]) => `${k}: ${literal(x)}`);
    return body.length ? `{ ${body.join(', ')} }` : '{}';
  }
  return String(v);
}

/** A TypeScript object literal, ready to paste into the `SCENARIOS` list in `src/data/scenarios.ts`. */
export function formatScenario(def: ScenarioDef): string {
  const i = '    ';
  const out = [
    '  {',
    `${i}id: ${quote(def.id)},`,
    `${i}title: ${quote(def.title)},`,
    `${i}note: ${quote(def.note)},`,
    `${i}board: ${block(def.board, i)},`,
  ];
  if (def.lattices) {
    out.push(`${i}lattices: {`);
    for (const [m, text] of Object.entries(def.lattices)) {
      out.push(`${i}  ${m}: ${block(text ?? '', `${i}  `)},`);
    }
    out.push(`${i}},`);
  }
  if (def.hp) out.push(`${i}hp: ${literal(def.hp)},`);
  if (def.intents) out.push(`${i}intents: ${literal(def.intents)},`);
  const list = (name: string, items: readonly string[]): void => {
    if (items.length === 0) out.push(`${i}${name}: [],`);
    else out.push(`${i}${name}: [`, ...items.map((t) => `${i}  ${t},`), `${i}],`);
  };
  list('demo', def.demo.map(literal));
  list('expected', def.expected.map(quote));
  out.push('  },');

  return out.join('\n');
}

/** "Draughtsman" then its lattice, for each member (the Lab's Copy lattices). */
export function formatLattices(lattices: Record<MemberId, Lattice>): string {
  return MEMBER_IDS.map((m) => `${MEMBERS[m].name}\n${serializeLattice(lattices[m])}`).join('\n\n');
}
