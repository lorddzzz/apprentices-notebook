import { describe, expect, it } from 'vitest';
import type { Tone } from '$data/districts/foundry';
import { FOUNDRY_FOE_IDS, FOUNDRY_TUNING } from '$data/districts/foundry';
import { RIVAL_TOKENS, RIVALS } from '$data/rivals';
import type { Ctx } from '$engine/ctx';
import * as foundry from '$engine/districts/foundry';
import { type AnswerReason, initTune, type TuneState } from '$engine/districts/foundry/types';
import { board, draft } from '../../scenarios/harness';
import { dataOf, ev, hums, ringTones } from './helpers';

/**
 * BF-9 acceptance (foundry-plan §2 P9, P10; BF-T2): the tune and the Carillonneur, built as a real
 * rival through RV's API from the start (no stand-in). The pure tune functions are named in the
 * plan's contract and exported from `src/engine/districts/foundry.ts`; they are read through a
 * namespace so this file compiles before they exist. The scenarios that need the rival on a board
 * stay `it.todo` until his data exists (`RivalId` lacks him on main); BF-9 turns them into tests
 * here and says so in its report.
 */

type Api = {
  newTune?(seed: number): Tone[];
  calledNote?(t: TuneState): Tone;
  answerNote?(t: TuneState, reason: AnswerReason): TuneState;
  greatPeal?(ctx: Ctx): void;
};
const api = foundry as unknown as Api;
function need<K extends keyof Api>(name: K): NonNullable<Api[K]> {
  expect(api[name], `${name} is exported`).toBeTypeOf('function');
  return api[name] as NonNullable<Api[K]>;
}
const rivals = RIVALS as unknown as Record<string, unknown>;

describe('BF-9 the tune (P9)', () => {
  it.fails('BF-9: newTune is four tones, none more than twice, seeded', () => {
    const newTune = need('newTune');
    const seen = new Set<string>();
    for (let seed = 0; seed < 40; seed++) {
      const t = newTune(seed);
      expect(t, `seed ${seed}`).toHaveLength(FOUNDRY_TUNING.tuneLength);
      for (const tone of new Set(t)) {
        expect(t.filter((x) => x === tone).length, `seed ${seed}`).toBeLessThanOrEqual(
          FOUNDRY_TUNING.maxPerToneInTune,
        );
      }
      expect(newTune(seed), `seed ${seed}`).toEqual(t);
      seen.add(t.join());
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it.fails('BF-9: calledNote reads the tone at the current index', () => {
    const t: TuneState = { ...initTune(), tune: ['low', 'high', 'high', 'mid'], at: 2 };
    expect(need('calledNote')(t)).toBe('high');
    expect(need('calledNote')({ ...t, at: 0 })).toBe('low');
  });

  it.fails('BF-9: answerNote restarts the tune at note 1 and counts it', () => {
    const answerNote = need('answerNote');
    const t: TuneState = { tune: ['mid', 'low', 'high', 'low'], at: 2, peals: 1, answered: 0 };
    for (const reason of ['humming', 'nothingToRing', 'cannotRing'] as const) {
      expect(answerNote(t, reason), reason).toEqual({ ...t, at: 0, answered: 1 });
    }
  });

  it.fails('BF-9: the Great Peal rings every tone not already humming', () => {
    const greatPeal = need('greatPeal');
    const s = structuredClone(board('{bell:low} . {bell:mid} . {bell:high}'));
    s.rules = { ...s.rules, 'foundry:bells': { humming: ['mid'], struck: {} } };
    const r = draft(s, (ctx) => greatPeal(ctx));
    expect(ringTones(r.events)).toEqual(['low', 'high']);
    expect(dataOf(ev(r.events, 'foundry:ring')[0])).toMatchObject({ cause: 'peal' });
    expect(dataOf(ev(r.events, 'foundry:greatPeal')[0])).toEqual({ tones: ['low', 'high'] });
    expect(hums(r.state)).toEqual(['low', 'mid', 'high']);
  });
});

describe('BF-9 the Carillonneur as a rival (P10, audit 2.1)', () => {
  it.fails('BF-9: the Carillonneur is a registered foundry rival with the tune trick', () => {
    expect(rivals.carillonneur).toMatchObject({
      id: 'carillonneur',
      district: 'foundry',
      trick: 'foundry:playsATune',
      page: 'carillonneur:tune',
    });
    expect(rivals.carillonneur).toHaveProperty('spells.length', 2);
  });

  it.fails('BF-9: no stand-in remains', () => {
    expect(FOUNDRY_FOE_IDS as readonly string[]).not.toContain('carillonneurStandIn');
    expect(Object.keys(FOUNDRY_TUNING.foes)).not.toContain('carillonneurStandIn');
    expect(RIVAL_TOKENS).toContainEqual(
      expect.objectContaining({ token: 'V', id: 'carillonneur', district: 'foundry' }),
    );
  });

  it.todo('BF-9: he rings the next note each round');
  it.todo('BF-9: after the fourth note the Great Peal rings and a new tune begins');
  it.todo('BF-9: a note is answered when its tone already hums');
  it.todo('BF-9: a note is answered when no bell of its tone can ring');
  it.todo('BF-9: a note is answered when he cannot ring it');
  it.todo('BF-9: ringing a tone first is the counter-toll');
  it.todo('BF-9: hung great bells answer from afar');
  it.todo('BF-9: he plays the same tune by round for the same seed');
  it.todo('BF-9: his planner never rings into his own friends');
  it.todo('BF-9: clearing the heart awards the page');
  it.todo('BF-9: his draw descriptor names the called tone');
});
