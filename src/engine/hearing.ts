import { DISTRICTS, type DistrictData, type DistrictId } from '$data';
import type { KitHearCondition } from '$data/districts/index';
import { type EventLog, type GameEvent, namedIn } from './events';
import { pagesHeld } from './rivals/pages';
import type { Profile } from './types';

/**
 * Hearing kinds (district-kit P12): each kind is a pure predicate over a profile and a finished
 * fight's log, held in one registry. A condition may carry a `district` filter (it counts only on
 * a trip to that district; the `heart` kind uses `district` for the heart it names instead).
 * The kinds that read a log credit only an apprentice's act: an event whose origin is an
 * apprentice's cast, or, with no origin, one that follows an apprentice's own action in the same
 * phase (a Shove has no origin). Foes and rivals hear nothing for the owner.
 */

export type HearKind = KitHearCondition['kind'];
type Cond<K extends HearKind> = Extract<KitHearCondition, { kind: K }>;

/** What a predicate may read: the profile, the district the fight was in, who set out, the log. */
export interface HearScene {
  profile: Profile;
  district: DistrictId;
  party: readonly string[];
  /** The finished fight's log; empty when hearing after a trip. */
  log: EventLog;
}

type Predicate<K extends HearKind> = (c: Cond<K>, s: HearScene) => boolean;

// ── Whose act it was ────────────────────────────────────
/** The apprentice behind each event (their unit id), or null for foes, rivals and the board. */
export function actorsOf(log: EventLog, party: readonly string[] = []): (string | null)[] {
  const members = new Set(party);
  for (const e of log) {
    if (e.type === 'cast' && e.caster.member) members.add(e.caster.id);
    else if ((e.type === 'shove' || e.type === 'pull' || e.type === 'swapWith') && e.by.member) {
      members.add(e.by.id);
    } else if (e.type === 'hop' && e.unit.member) members.add(e.unit.id);
  }
  let current: string | null = null;
  return log.map((e) => {
    if (e.type === 'phase') current = null;
    else if (e.type === 'cast') current = e.caster.member ? e.caster.id : null;
    else if (e.type === 'shove' || e.type === 'pull' || e.type === 'swapWith') {
      current = e.by.member ? e.by.id : null;
    } else if (e.type === 'hop') current = e.unit.member ? e.unit.id : null;
    if (e.origin) return members.has(e.origin.caster) ? e.origin.caster : null;
    return current;
  });
}

/** The events an apprentice made (`pick` keeps the ones of interest), with who made each. */
function byApprentices<T extends GameEvent>(
  s: HearScene,
  pick: (e: GameEvent) => e is T,
): { e: T; by: string; at: number }[] {
  const actors = actorsOf(s.log, s.party);
  return s.log.flatMap((e, at) => {
    const by = actors[at];
    return pick(e) && by ? [{ e, by, at }] : [];
  });
}

const distinct = (units: readonly { id: string }[]): number => new Set(units.map((u) => u.id)).size;

const isBurst = (e: GameEvent): e is Extract<GameEvent, { type: 'burst' }> => e.type === 'burst';

// ── Cross-apprentice debt ───────────────────────────────
/** The log cut at each `round` event: a turn, enemy phase to resolve. */
function turns(log: EventLog): EventLog[] {
  const out: GameEvent[][] = [[]];
  for (const e of log) {
    if (e.type === 'round') out.push([]);
    (out[out.length - 1] as GameEvent[]).push(e);
  }
  return out;
}

/** An Ink mark by one apprentice, then a hit on that foe by a different apprentice's cast, in one turn. */
function crossDebt(s: HearScene): boolean {
  return turns(s.log).some((turn) => {
    const actors = actorsOf(turn, s.party);
    const markedBy = new Map<string, Set<string>>();
    return turn.some((e, i) => {
      const by = actors[i];
      if (!by) return false;
      if (e.type === 'marked' && !e.unit.member) {
        const set = markedBy.get(e.unit.id) ?? new Set<string>();
        markedBy.set(e.unit.id, set.add(by));
        return false;
      }
      if (e.type !== 'damage' || e.target.member) return false;
      const markers = markedBy.get(e.target.id);
      return !!markers && [...markers].some((m) => m !== by);
    });
  });
}

// ── The registry ────────────────────────────────────────
const biggestBurst = (log: EventLog, burst: string): number =>
  log.reduce(
    (m, e) => (e.type === 'burst' && e.burst === burst ? Math.max(m, e.tiles.length) : m),
    0,
  );

/** A page id belongs to a rival by its prefix: `except: ['registrar']` skips `registrar:anything`. */
const excepted = (page: string, except: readonly string[] | undefined): boolean =>
  !!except?.some((x) => page === x || page.startsWith(`${x}:`));

export const HEARING_KINDS: { readonly [K in HearKind]: Predicate<K> } = {
  // As built: any burst (no apprentice check) of at least `atLeast` tiles.
  burst: (c, s) => biggestBurst(s.log, c.burst) >= c.atLeast,
  // Unscoped: learned any time. Scoped to a district: the owner hears it in this fight's log.
  named: (c, s) =>
    c.district !== undefined && c.voice === 'owner'
      ? namedIn(s.log).includes(c.id)
      : s.profile.named.includes(c.id),
  heart: (c, s) => s.profile.city.hearts.includes(c.district),
  trips: (c, s) => s.profile.city.trips >= c.atLeast,
  crossDebt: (_c, s) => crossDebt(s),
  // Units reached, not damaged (BH): a Storm that reaches three is a Storm that reaches three.
  burstUnits: (c, s) =>
    byApprentices(s, isBurst).some(
      ({ e }) => e.burst === c.burst && distinct(e.units) >= c.atLeast,
    ),
  // A Spark conducted through brass: the Conduct burst, or a conducted Spark from the Bench.
  conducted: (c, s) =>
    byApprentices(
      s,
      (e): e is Extract<GameEvent, { type: 'burst' | 'conducted' }> =>
        e.type === 'burst' || e.type === 'conducted',
    ).some(({ e }) =>
      e.type === 'burst'
        ? e.burst === 'conduct' && distinct(e.units) >= c.atLeast
        : e.action === 'spark' && distinct(e.units) >= c.atLeast,
    ),
  performed: (c, s) =>
    byApprentices(
      s,
      (e): e is Extract<GameEvent, { type: 'named' }> => e.type === 'named' && e.what === 'idiom',
    ).some(({ e }) => e.id === c.idiom),
  pages: (c, s) => pagesHeld(s.profile).filter((id) => !excepted(id, c.except)).length >= c.atLeast,
};

/** Whether one condition holds in a scene: its district filter first, then its kind's predicate. */
export function conditionHolds(c: KitHearCondition, s: HearScene): boolean {
  if (c.kind !== 'heart' && c.district !== undefined && c.district !== s.district) return false;
  const test = HEARING_KINDS[c.kind] as Predicate<typeof c.kind>;
  return test(c, s);
}

/** A district's hearing list: its `hear` entries in the given table (a test's, or the city's). */
export function hearOf(
  id: DistrictId,
  table: Readonly<Record<DistrictId, DistrictData>> = DISTRICTS,
): readonly KitHearCondition[] {
  return table[id].hear;
}
