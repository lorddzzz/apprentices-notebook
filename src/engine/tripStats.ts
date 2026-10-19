import { MEMBER_IDS, type MemberId } from '$data';
import { type EventLog, type GameEvent, namedIn } from './events';
import { key as cellKey } from './grid';
import { castOriginKey } from './profiler';
import { masksFrom } from './proof';
import type {
  CellKey,
  CompiledLattice,
  Profile,
  Spell,
  SpellKey,
  SpellTally,
  TripRecap,
  TripStats,
} from './types';

/** A trip's stats before its first fight. */
export function emptyStats(): TripStats {
  return {
    fights: 0,
    spells: [],
    biggestChain: null,
    discoveries: [],
    proofCasts: 0,
    elegance: [],
    heard: [],
  };
}

/** Event types that count as a chain reaction when they come from one cast (plan S16). */
const REACTIONS: ReadonlySet<GameEvent['type']> = new Set([
  'mixed',
  'burst',
  'crush',
  'dropped',
  'conducted',
  'markSpread',
  'released',
  'spreadState',
]);

/** Events that end a cast's stretch of the log. */
const BOUNDARY: ReadonlySet<GameEvent['type']> = new Set([
  'cast',
  'moved',
  'moveUndone',
  'shove',
  'phase',
  'round',
]);

interface Segment {
  member: MemberId;
  name: string;
  origin?: string;
  key: SpellKey | null;
  damage: number;
  kills: number;
  reactions: number;
  fired: CellKey[]; // the cells of this cast's `trace` (none for an echo)
}

const memberOf = (id: string): MemberId | null => MEMBER_IDS.find((m) => m === id) ?? null;

/** A spell's path cells as proof sees them, each once: a Glyph's inner cells are its socket (M15). */
function pathCells(spell: Spell): CellKey[] {
  const at = spell.cells
    ? spell.cells.map((c) => cellKey(c.at))
    : spell.path.map((p) => cellKey(p.at));
  return [...new Set(at)];
}

const sameCells = (a: readonly CellKey[], b: readonly CellKey[]): boolean =>
  a.length === b.length && a.every((c) => b.includes(c));

/**
 * Folds one finished encounter's event log into the trip's stats (plan S16). `known` is the
 * profile as it was before this encounter, so first discoveries can be told apart. Casts own
 * all events with their origin, including effects released later in the fight. `compiled` is each
 * member's spells as fought (for each tally's `cells`, M15; task E5).
 */
export function accumulateStats(
  stats: TripStats,
  log: EventLog,
  known: Profile,
  compiled: Partial<Record<MemberId, readonly Spell[]>> = {},
): TripStats {
  const spells: SpellTally[] = stats.spells.map((s) => ({
    ...s,
    cells: [...s.cells],
    fired: [...s.fired],
  }));
  let biggest = stats.biggestChain ? { ...stats.biggestChain } : null;
  const proofCasts =
    stats.proofCasts + MEMBER_IDS.reduce((n, m) => n + masksFrom(log, m).length, 0);
  const keyOf = new Map<string, SpellKey>(); // `${member}|${name}` → the key a trace last gave it

  const segments: Segment[] = [];
  const origins = new Map<string, Segment>();
  let seg: Segment | null = null;
  // First recover casts and their traces, then attribute effects across the whole fight.
  for (const e of log) {
    if (e.type === 'trace') {
      const owner = e.origin ? origins.get(castOriginKey(e.origin)) : seg;
      if (owner && owner.member === e.caster.id) {
        owner.key = e.spell;
        for (const c of e.cells)
          if (!owner.fired.includes(cellKey(c.at))) owner.fired.push(cellKey(c.at));
        keyOf.set(`${owner.member}|${owner.name}`, e.spell);
      }
      seg = null;
    } else if (e.type === 'cast') {
      const member = e.caster.member ? memberOf(e.caster.id) : null;
      seg = member
        ? {
            member,
            name: e.spell,
            key: e.origin?.spell ?? null,
            origin: e.origin ? castOriginKey(e.origin) : undefined,
            damage: 0,
            kills: 0,
            reactions: 0,
            fired: [],
          }
        : null;
      if (seg) {
        segments.push(seg);
        if (seg.origin) origins.set(seg.origin, seg);
      }
    } else if (BOUNDARY.has(e.type)) seg = null;
  }
  let legacy: Segment | null = null;
  let castIndex = 0;
  for (const e of log) {
    if (e.type === 'cast') {
      legacy = e.caster.member && memberOf(e.caster.id) ? (segments[castIndex++] ?? null) : null;
      continue;
    }
    if (e.type === 'trace' || BOUNDARY.has(e.type)) legacy = null;
    // An explicit origin always wins, including an enemy origin inside a player's cast.
    const owner = e.origin ? origins.get(castOriginKey(e.origin)) : legacy;
    if (!owner) continue;
    if (e.type === 'damage' && !e.target.member) owner.damage += e.amount;
    else if (e.type === 'died' && !e.unit.member) owner.kills += 1;
    else if (REACTIONS.has(e.type)) owner.reactions += 1;
  }
  for (const segment of segments) {
    const key = segment.key ?? keyOf.get(`${segment.member}|${segment.name}`) ?? segment.name;
    let t = spells.find((s) => s.member === segment.member && s.spell === key);
    if (!t) {
      t = {
        member: segment.member,
        spell: key,
        name: segment.name,
        casts: 0,
        damage: 0,
        kills: 0,
        cells: [],
        fired: [],
      };
      spells.push(t);
    }
    const fought = compiled[segment.member]?.find((s) => s.key === key);
    if (fought) t.cells = pathCells(fought);
    for (const c of segment.fired) if (!t.fired.includes(c)) t.fired.push(c);
    t.casts += 1;
    t.damage += segment.damage;
    t.kills += segment.kills;
    if (segment.reactions > (biggest?.reactions ?? 0)) {
      biggest = {
        member: segment.member,
        spell: key,
        name: segment.name,
        reactions: segment.reactions,
      };
    }
  }

  const discoveries = [...stats.discoveries];
  for (const code of namedIn(log)) {
    if (!known.named.includes(code) && !discoveries.includes(code)) discoveries.push(code);
  }

  return {
    fights: stats.fights + 1,
    spells,
    biggestChain: biggest,
    discoveries,
    proofCasts,
    elegance: [...stats.elegance],
    heard: [...stats.heard],
  };
}

/**
 * Cells of member `m`'s plain spells that never fired on the last trip, while each spell's path still
 * equals its tally's `cells` (M15): the Study's faint rings. `compiled` is `m`'s current lattice.
 * A Spell Glyph's source is not a plain spell and gets none; a stale spell gets none.
 */
export function lastTripDeadCells(
  recap: TripRecap | null,
  m: MemberId,
  compiled: CompiledLattice,
): CellKey[] {
  const dead: CellKey[] = [];
  for (const t of recap?.stats.spells ?? []) {
    if (t.member !== m) continue;
    const now = compiled.spells.find((s) => s.key === t.spell);
    if (!now || now.glyph || !sameCells(pathCells(now), t.cells)) continue;
    for (const c of t.cells) if (!t.fired.includes(c) && !dead.includes(c)) dead.push(c);
  }
  return dead;
}
