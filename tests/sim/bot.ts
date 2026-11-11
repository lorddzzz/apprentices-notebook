import type { RuneId } from '$data';
import type { LootItem, Profile, Trip } from '$engine';
import { preconditionsOf, waitingFor } from '$engine/recruits';
import type { Rng } from '$engine/rng';

// The bot itself lives in the engine (EN-0); this file keeps the old import path.
export { type BotOptions, botFight, botTrial, LITE_MOVES, TRIAL_BUDGET } from '$engine/sim';

// ── Recruit policies (RC-9) ─────────────────────────────

/** The recruit sims' base seed (`tests/sim/recruits.test.ts`); env vars scale the runs, not the seed. */
export const RECRUIT_SIM_SEED = 9301;

/**
 * The runes some waiting recruit still lacks, counting the trip's loot as owned: what an eager
 * player picks to bring someone in.
 */
export function wantedRunes(p: Profile, t: Trip): Set<RuneId> {
  const owned = new Set<RuneId>([
    ...p.known,
    ...t.loot.flatMap((i) => (i.kind === 'rune' ? [i.rune] : [])),
  ]);
  const want = new Set<RuneId>();
  for (const id of waitingFor(p, t)) {
    const { all, any } = preconditionsOf(id).runes;
    for (const r of all) if (!owned.has(r)) want.add(r);
    if (any && !any.some((r) => owned.has(r))) for (const r of any) want.add(r);
  }
  return want;
}

/** The eager pick: a recruit card, then a page a waiting recruit needs, a key, a new page, else the first. */
export function eagerPick(p: Profile, t: Trip): number {
  const want = wantedRunes(p, t);
  const rank = (i: LootItem): number => {
    if (i.kind === 'recruit') return 0;
    if (i.kind === 'rune' && want.has(i.rune)) return 1;
    if (i.kind === 'key') return 2;
    if (i.kind === 'rune' || i.kind === 'method') return 3;
    return 4;
  };
  let best = 0;
  t.offers.forEach((o, i) => {
    const b = t.offers[best];
    if (b && rank(o) < rank(b)) best = i;
  });
  return best;
}

/** The eager policy at a Crossroads: home as soon as the loot holds a recruit or a page someone waits for. */
export function eagerGoesHome(p: Profile, t: Trip): boolean {
  const want = wantedRunes(p, { ...t, loot: [] });
  return t.loot.some((i) => i.kind === 'recruit' || (i.kind === 'rune' && want.has(i.rune)));
}

/** The random policy: any offer; home or on at a coin toss (the driver adds the wipes). */
export const randomPick = (t: Trip, rng: Rng): number => rng.int(0, t.offers.length - 1);
export const randomGoesHome = (rng: Rng): boolean => rng.int(0, 1) === 0;
