import { describe, expect, test } from 'vitest';
import { type ApprenticeId, RUNE_IDS } from '$data';
import { INK_INTRUSION } from '$data/districts/inkQuarter/floor';
import {
  type BattleState,
  compiledFor,
  createBattle,
  deriveSeed,
  inventionLibrary,
  joinHousehold,
  newProfile,
  type Profile,
  type SlotIndex,
  setSlot,
} from '$engine';
import { floorLayout } from '$engine/districts/intrusion';
import { botFight } from './bot';

/** The bot play-through of tests/districts/ink-floor.test.ts (IQ-12), kept out of check:fast. */
const INDEXES = [0, 1, 2] as const;
const TRIO: ApprenticeId[] = ['draughtsman', 'stoker', 'runaway'];

function trioProfile(): Profile {
  const base = newProfile();
  let p: Profile = { ...base, known: [...RUNE_IDS] };
  for (const id of TRIO) p = joinHousehold(p, id);
  for (const slot of [0, 1, 2] as SlotIndex[]) p = setSlot(p, slot, null);
  TRIO.forEach((id, i) => {
    p = setSlot(p, i as SlotIndex, id);
  });
  return p;
}

function botFloor(i: 0 | 1 | 2, seed: number): BattleState {
  const p = trioProfile();
  const party = Object.fromEntries(
    TRIO.map((id) => [id, { spells: compiledFor(p, id).spells }] as const),
  );
  const start = createBattle({
    title: 'floor',
    seed: deriveSeed(seed, i),
    board: floorLayout(INK_INTRUSION, i),
    lineup: TRIO,
    party,
    inventions: inventionLibrary(p),
  }).state;
  return botFight(start, 40, TRIO).state;
}

describe('IQ-12 ink floor play', () => {
  test('the bot clears every layout with three apprentices', () => {
    const SEEDS = [1, 2, 3, 4, 5];
    const rows: string[] = [];
    for (const i of INDEXES) {
      let won = 0;
      for (const seed of SEEDS) if (botFloor(i, seed).phase === 'won') won++;
      rows.push(`layout ${i + 1}: ${won}/${SEEDS.length}`);
      expect(won, rows.join('; ')).toBeGreaterThanOrEqual(3);
    }
    if (process.env.INK_FLOOR_TABLE) process.stdout.write(`${rows.join('\n')}\n`);
  });
});
