import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { CODEX, type CodexEntryDef, TUNING } from '$data';
import {
  type BattleState,
  type FiredCell,
  newProfile,
  newSave,
  type Profile,
  parseLattice,
  recordProof,
  type SaveData,
  setMemberLattice,
  startTrip,
  type TripRecap,
} from '$engine';
import { endBattle, goHome, startBattle } from '../../src/app/flow';
import { parseSaveText, saveText } from '../../src/app/save';
import { answeredHighlights } from '../../src/app/tripviews';

/** SM-12: "the margin answered" on the trip page. A fixture answer is put on the shipped bolt page. */

const bolt = CODEX.find((e) => e.id === 'rune:bolt') as CodexEntryDef;
beforeEach(() => {
  Object.assign(bolt, { answer: { when: 'proof', text: 'It was never the bolt.' } });
});
afterEach(() => {
  delete (bolt as { answer?: unknown }).answer;
});

const CHAIN = 'Bolt> Ink Oil Spark .';
const mask: FiredCell[] = [
  { at: { x: 0, y: 0 }, rune: 'bolt', dir: 'right' },
  { at: { x: 1, y: 0 }, rune: 'ink' },
  { at: { x: 2, y: 0 }, rune: 'oil' },
  { at: { x: 3, y: 0 }, rune: 'spark' },
];
function proven(): Profile {
  let p: Profile = newProfile();
  p = setMemberLattice(p, 'draughtsman', parseLattice(CHAIN));
  p = setMemberLattice(p, 'stoker', { shape: parseLattice('. .').shape, runes: [] });
  for (let i = 0; i < TUNING.provenCasts; i++) p = recordProof(p, 'draughtsman', [mask]);
  return p;
}
const home = (profile: Profile): SaveData => ({
  ...newSave(7),
  profile,
  trip: { ...startTrip(profile, 1), status: 'cleared' },
});

describe('the recap carries what answered', () => {
  test('clearing the Marginalia opens the margins and the held proof answers on the trip home', () => {
    const recap = goHome(home(proven())).lastTrip;
    expect(recap?.stats.answered).toEqual(['rune:bolt']);
  });

  test('a household with nothing proven has nothing to say', () => {
    const recap = goHome(home(newProfile())).lastTrip;
    expect(recap?.stats.answered).toBeUndefined();
  });

  test('a margin that was already answering is not news', () => {
    const open = proven();
    const already = { ...open, city: { ...open.city, hearts: ['seam' as const] } };
    const recap = goHome(home(already)).lastTrip;
    expect(recap?.stats.answered).toBeUndefined();
  });

  test('answers noted mid-trip survive the next fight and reach the recap', () => {
    const s0 = home(newProfile());
    const mid: SaveData = {
      ...s0,
      trip: s0.trip && {
        ...s0.trip,
        status: 'fight',
        stats: { ...s0.trip.stats, answered: ['rune:bolt'] },
      },
    };
    const won = (b: BattleState): BattleState => ({
      ...b,
      phase: 'won',
      units: b.units.map((u) => (u.kind === 'enemy' ? { ...u, hp: 0 } : u)),
    });
    const after = endBattle(mid, won(startBattle(mid).state)).save;
    expect(after.trip?.stats.answered).toEqual(['rune:bolt']);
  });
});

describe('the save', () => {
  test('keeps the answered pages in a recap and in a trip in progress', () => {
    const recap = goHome(home(proven()));
    expect(parseSaveText(saveText(recap)).lastTrip?.stats.answered).toEqual(['rune:bolt']);
    const trip = startTrip(newProfile(), 1);
    const mid: SaveData = {
      ...newSave(7),
      trip: { ...trip, stats: { ...trip.stats, answered: ['rune:ink'] } },
    };
    expect(parseSaveText(saveText(mid)).trip?.stats.answered).toEqual(['rune:ink']);
  });
});

describe('the trip page highlight', () => {
  const recapWith = (answered?: string[]): TripRecap => {
    const base = goHome(home(newProfile())).lastTrip as TripRecap;
    return { ...base, stats: { ...base.stats, ...(answered ? { answered } : {}) } };
  };

  test('names the page whose margin answered', () => {
    expect(answeredHighlights(recapWith(['rune:bolt']))).toEqual([
      {
        kind: 'answered',
        title: 'The margin answered',
        text: 'The owner wrote back beside Bolt in the codex.',
      },
    ]);
  });

  test('says nothing when nothing answered, and folds a long list', () => {
    expect(answeredHighlights(recapWith())).toEqual([]);
    const ids = ['rune:bolt', 'rune:ink', 'rune:oil', 'rune:spark', 'rune:shove'];
    expect(answeredHighlights(recapWith(ids))[0]?.text).toBe(
      'The owner wrote back beside Bolt, Ink, Oil and 2 more in the codex.',
    );
  });
});
