import { describe, expect, test, vi } from 'vitest';
import { type ApprenticeId, encountersOf, RUNE_IDS } from '$data';
import {
  applyAction,
  compiledFor,
  createEncounterBattle,
  deriveSeed,
  inventionLibrary,
  joinHousehold,
  newProfile,
  type Profile,
  type SlotIndex,
  setSlot,
  type Trip,
} from '$engine';
import { CAST_EVENT_CAP } from '$engine/ctx';
import { startSeedFor } from '$engine/rooms';
import { botFight } from './bot';

/**
 * FU-17: a canal fuzz. The greedy bot plays every canal room and layout at party 1, 2 and 3 (the
 * crate and the rival included, as the rooms place them) on a small seed set; every action it
 * takes is replayed to check it never throws and that no cast or basic action logs more than the
 * event cap allows (plus the `fizzles`/`died` tail a cut owes). `CANAL_FUZZ_SEEDS=n` widens it.
 */
const SEEDS = Number(process.env.CANAL_FUZZ_SEEDS) || 2;
vi.setConfig({ testTimeout: 300_000 });

const PARTIES: Record<number, ApprenticeId[]> = {
  1: ['draughtsman'],
  2: ['draughtsman', 'stoker'],
  3: ['draughtsman', 'stoker', 'runaway'],
};
/** What a cut may add past the cap: the owed events and the `fizzles`. */
const SLACK = 20;

function withParty(who: readonly ApprenticeId[]): Profile {
  const base = newProfile();
  let p: Profile = {
    ...base,
    known: [...RUNE_IDS],
    city: { ...base.city, heard: ['seam', 'canals'], open: ['seam', 'canals'] },
  };
  for (const id of who) p = joinHousehold(p, id);
  for (const slot of [0, 1, 2] as SlotIndex[]) p = setSlot(p, slot, null);
  who.forEach((id, i) => {
    p = setSlot(p, i as SlotIndex, id);
  });
  return p;
}

const ENCOUNTERS = encountersOf('canals');

describe('canal fuzz (FU-17)', () => {
  test.each([1, 2, 3])('FU-17: canal trips at party %i never throw or overrun the cap', (size) => {
    const who = PARTIES[size] ?? [];
    const p = withParty(who);
    let actions = 0;
    for (const [index, enc] of ENCOUNTERS.entries()) {
      for (let variant = 0; variant < enc.variants.length; variant++) {
        for (let seed = 1; seed <= SEEDS; seed++) {
          const party = Object.fromEntries(
            who.map((id) => [id, { spells: compiledFor(p, id).spells }] as const),
          );
          const open = () =>
            createEncounterBattle(
              enc,
              party,
              deriveSeed(seed, index),
              variant,
              'canals',
              inventionLibrary(p),
              { lineup: who, startSeed: startSeedFor({ seed } as Trip, index) },
            ).state;
          const fight = botFight(open(), 40, who);
          let state = open();
          for (const a of fight.actions) {
            const r = applyAction(state, a);
            if (a.type !== 'endTurn') {
              expect(
                r.events.length,
                `party ${size} room ${index} v${variant} seed ${seed} ${a.type}`,
              ).toBeLessThanOrEqual(CAST_EVENT_CAP + SLACK);
            }
            state = r.state;
            actions++;
          }
        }
      }
    }
    expect(actions).toBeGreaterThan(0);
  });
});
