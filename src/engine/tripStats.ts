import { MEMBER_IDS, type MemberId } from '$data';
import { discoveriesIn, type EventLog, type GameEvent } from './events';
import { key as cellKey } from './grid';
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
  };
}

/** Event types that count as a chain reaction when they come from one cast (plan S16). */
const REACTIONS: ReadonlySet<GameEvent['type']> = new Set([
  'ignite',
  'extinguish',
  'conduct',
  'arc',
  'detonate',
  'slide',
  'diffuse',
  'smear',
  'heated',
  'cooled',
  'stained',
  'scalded',
  'etched',
]);

/** Events that end a cast's stretch of the log (an echo has no trace to close it). */
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
  key: SpellKey | null;
  damage: number;
  kills: number;
  reactions: number;
  queuesEcho: boolean;
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
 * profile as it was before this encounter, so first discoveries can be told apart. A cast owns
 * the events from its `cast` event to its `trace` (or, for an echo, to the next boundary);
 * damage to enemies and their deaths in that stretch are credited to its spell. `compiled` is each
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
  let proofCasts = stats.proofCasts;
  const keyOf = new Map<string, SpellKey>(); // `${member}|${name}` → the key a trace last gave it
  const echoes = new Map<MemberId, SpellKey[]>(); // keys of casts whose echo is still to come, in order

  let seg: Segment | null = null;
  const close = (): void => {
    if (!seg) return;
    const key = seg.key ?? keyOf.get(`${seg.member}|${seg.name}`) ?? seg.name;
    let t = spells.find((s) => s.member === seg?.member && s.spell === key);
    if (!t) {
      t = {
        member: seg.member,
        spell: key,
        name: seg.name,
        casts: 0,
        damage: 0,
        kills: 0,
        cells: [],
        fired: [],
      };
      spells.push(t);
    }
    // The path as it was fought: the latest one wins (a doorway rewire changes it mid-trip).
    const fought = compiled[seg.member]?.find((s) => s.key === key);
    if (fought) t.cells = pathCells(fought);
    for (const c of seg.fired) if (!t.fired.includes(c)) t.fired.push(c);
    if (seg.queuesEcho) echoes.set(seg.member, [...(echoes.get(seg.member) ?? []), key]);
    t.casts += 1;
    t.damage += seg.damage;
    t.kills += seg.kills;
    if (seg.reactions > (biggest?.reactions ?? 0)) {
      biggest = { member: seg.member, spell: key, name: seg.name, reactions: seg.reactions };
    }
    seg = null;
  };

  for (const e of log) {
    if (e.type === 'trace') {
      if (e.meaningful) proofCasts += 1;
      if (seg && seg.member === e.caster.id) {
        seg.key = e.spell;
        seg.fired = e.cells.map((c) => cellKey(c.at));
        keyOf.set(`${seg.member}|${seg.name}`, e.spell);
        close();
      }
      continue;
    }
    if (BOUNDARY.has(e.type)) close();
    if (e.type === 'cast') {
      const member = e.caster.member ? memberOf(e.caster.id) : null;
      if (member) {
        // An echo has no trace: it belongs to the cast that queued it.
        const key = e.echo ? (echoes.get(member)?.shift() ?? null) : null;
        seg = {
          member,
          name: e.spell,
          key,
          damage: 0,
          kills: 0,
          reactions: 0,
          queuesEcho: false,
          fired: [],
        };
      }
    } else if (seg) {
      if (e.type === 'echoQueued') seg.queuesEcho = true;
      else if (e.type === 'damage' && !e.target.member) seg.damage += e.amount;
      else if (e.type === 'died' && !e.unit.member) seg.kills += 1;
      else if (REACTIONS.has(e.type)) seg.reactions += 1;
    }
  }
  close();

  const discoveries = [...stats.discoveries];
  for (const id of discoveriesIn(log)) {
    const code = `interaction:${id}`;
    if (!known.interactions.includes(id) && !discoveries.includes(code)) discoveries.push(code);
  }

  return {
    fights: stats.fights + 1,
    spells,
    biggestChain: biggest,
    discoveries,
    proofCasts,
    elegance: [...stats.elegance],
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
