import { describe, expect, it } from 'vitest';
import type { Tone } from '$data/districts/foundry';
import { FOUNDRY_FOE_IDS, FOUNDRY_TUNING } from '$data/districts/foundry';
import { RIVAL_TOKENS, RIVALS } from '$data/rivals';
import '$engine'; // loads the district kit first: the foundry module reaches the engine (import cycle)
import { type BattleState, type GameEvent, newProfile } from '$engine';
import { type Ctx, runDraft } from '$engine/ctx';
import * as foundry from '$engine/districts/foundry';
import { PLAYS_A_TUNE_TRICK, pulseTiles } from '$engine/districts/foundry';
import {
  type AnswerReason,
  initTune,
  TUNE_RULE_ID,
  type TuneState,
} from '$engine/districts/foundry/types';
import { bankPages } from '$engine/rivals/pages';
import { planTrickMark, trickMarkOf } from '$engine/rivals/tricks';
import { awardsPage } from '$engine/standIn';
import { rivalOf } from '../../rivals/fixtures/harness';
import { act, board, cast, draft, withLattices } from '../../scenarios/harness';
import { damageTo, dataOf, ev, hums, ringTones } from './helpers';

/**
 * BF-9 acceptance (foundry-plan §2 P9, P10; BF-T2): the tune and the Carillonneur, built as a real
 * rival through RV's API from the start (no stand-in). The pure tune functions are named in the
 * plan's contract and exported from `src/engine/districts/foundry.ts`; they are read through a
 * namespace so this file compiled before they existed. BF-9 removed the `it.fails` markers and
 * turned the todos into the scenarios below, which play him on his own `V` shell.
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
  it('BF-9: newTune is four tones, none more than twice, seeded', () => {
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

  it('BF-9: calledNote reads the tone at the current index', () => {
    const t: TuneState = { ...initTune(), tune: ['low', 'high', 'high', 'mid'], at: 2 };
    expect(need('calledNote')(t)).toBe('high');
    expect(need('calledNote')({ ...t, at: 0 })).toBe('low');
  });

  it('BF-9: answerNote restarts the tune at note 1 and counts it', () => {
    const answerNote = need('answerNote');
    const t: TuneState = { tune: ['mid', 'low', 'high', 'low'], at: 2, peals: 1, answered: 0 };
    for (const reason of ['humming', 'nothingToRing', 'cannotRing'] as const) {
      expect(answerNote(t, reason), reason).toEqual({ ...t, at: 0, answered: 1 });
    }
  });

  it('BF-9: the Great Peal rings every tone not already humming', () => {
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
  it('BF-9: the Carillonneur is a registered foundry rival with the tune trick', () => {
    expect(rivals.carillonneur).toMatchObject({
      id: 'carillonneur',
      district: 'foundry',
      trick: 'foundry:playsATune',
      page: 'carillonneur:tune',
    });
    expect(rivals.carillonneur).toHaveProperty('spells.length', 2);
  });

  it('BF-9: no stand-in remains', () => {
    expect(FOUNDRY_FOE_IDS as readonly string[]).not.toContain('carillonneurStandIn');
    expect(Object.keys(FOUNDRY_TUNING.foes)).not.toContain('carillonneurStandIn');
    expect(RIVAL_TOKENS).toContainEqual(
      expect.objectContaining({ token: 'V', id: 'carillonneur', district: 'foundry' }),
    );
  });

  it('BF-9: the tune rule starts from the trip seed, and a missing tune starts the default', () => {
    const s = board('.');
    expect(foundry.TUNE_RULE.init(s, { seed: 3 })).toEqual({
      ...initTune(),
      tune: need('newTune')(3),
    });
    expect(foundry.TUNE_RULE.init(s, undefined)).toEqual(initTune());
    const ctx = { s } as unknown as Ctx;
    const started = foundry.TUNE_RULE.step(ctx, initTune());
    expect(started.tune).toHaveLength(FOUNDRY_TUNING.tuneLength);
    expect(foundry.tuneOf(s)).toEqual(started);
    const own = { ...initTune(), tune: ['low', 'mid', 'high', 'low'] satisfies Tone[] };
    expect(foundry.TUNE_RULE.step(ctx, own)).toBe(own);
  });
});

/** The hall: three tones of bell, the Carillonneur on his own `V` shell, an apprentice far from the bells. */
const HALL = 'D . . . . V\n. . . . . .\n{bell:mid} . {bell:low} . {bell:high} .';
const TUNE: Tone[] = ['low', 'mid', 'mid', 'high'];
const endTurn = (s: BattleState) => act(s, { type: 'endTurn' });

/** A board with the tune rule listed and its notes set; a high-HP apprentice outlives the fight's casts. */
function hall(ascii = HALL, tune: Tone[] = TUNE, at = 0, lattices = {}, d = 'A1'): BattleState {
  const s = structuredClone(withLattices(ascii, lattices, { hp: { [d]: 99 } }));
  s.rules = { ...s.rules, [TUNE_RULE_ID]: { tune, at, peals: 0, answered: 0 } };
  return runDraft(s, (ctx) => planTrickMark(ctx, rivalOf(ctx.s))).state;
}
const notes = (events: readonly GameEvent[]) =>
  ev(events, 'foundry:tuneNote').map((e) => dataOf(e));
const causes = (events: readonly GameEvent[]) =>
  ev(events, 'foundry:ring').map((e) => dataOf(e).cause);
const tuneState = (s: BattleState) => foundry.tuneOf(s);

describe('BF-9 playing the tune (P9, P10)', () => {
  it('BF-9: he rings the next note each round', () => {
    const a = endTurn(hall());
    expect(notes(a.events)).toEqual([{ index: 0, tone: 'low', answered: null }]);
    expect(ringTones(a.events)).toEqual(['low']);
    expect(causes(a.events)).toEqual(['note']);
    expect(tuneState(a.state)).toMatchObject({ at: 1, answered: 0 });
    const b = endTurn(a.state);
    expect(notes(b.events)).toEqual([{ index: 1, tone: 'mid', answered: null }]);
    expect(ringTones(b.events)).toEqual(['mid']);
    expect(tuneState(b.state)).toMatchObject({ at: 2 });
  });

  it('BF-9: after the fourth note the Great Peal rings and a new tune begins', () => {
    const r = endTurn(hall(HALL, TUNE, 3));
    expect(notes(r.events)).toEqual([{ index: 3, tone: 'high', answered: null }]);
    expect(ringTones(r.events)).toEqual(['high', 'low', 'mid']);
    expect(causes(r.events)).toEqual(['note', 'peal', 'peal']);
    expect(dataOf(ev(r.events, 'foundry:greatPeal')[0])).toEqual({ tones: ['low', 'mid'] });
    const t = tuneState(r.state);
    expect(t).toMatchObject({ at: 0, peals: 1, answered: 0 });
    expect(t.tune).toHaveLength(FOUNDRY_TUNING.tuneLength);
    for (const tone of new Set(t.tune))
      expect(t.tune.filter((x) => x === tone).length).toBeLessThanOrEqual(
        FOUNDRY_TUNING.maxPerToneInTune,
      );
  });

  it('BF-9: a note is answered when its tone already hums', () => {
    const s = hall(HALL, TUNE, 1, { draughtsman: 'Bolt> Strike' });
    const first = cast(s, 'draughtsman', 'down'); // the bell at A3 is mid: the called tone
    expect(ringTones(first.events)).toEqual(['mid']);
    const r = endTurn(first.state);
    expect(notes(r.events)).toEqual([{ index: 1, tone: 'mid', answered: 'humming' }]);
    expect(causes(r.events)).not.toContain('note');
    expect(tuneState(r.state)).toMatchObject({ at: 0, answered: 1 });
  });

  it('BF-9: a note is answered when no bell of its tone can ring', () => {
    const tune: Tone[] = ['high', 'low', 'mid', 'low'];
    const none = hall('D . . . . V\n. . . . . .\n{bell:low} . {bell:mid} . . .', tune);
    const a = endTurn(none);
    expect(notes(a.events)).toEqual([{ index: 0, tone: 'high', answered: 'nothingToRing' }]);
    expect(tuneState(a.state)).toMatchObject({ at: 0, answered: 1 });
    // a muffled bell is silent too
    const muffled = hall('D . . . . V\n. . . . . .\n{bell:low} . ~{bell:high} . . .', tune);
    const b = endTurn(muffled);
    expect(notes(b.events)).toEqual([{ index: 0, tone: 'high', answered: 'nothingToRing' }]);
    expect(ev(b.events, 'foundry:ring')).toHaveLength(0);
  });

  it('BF-9: a note is answered when he cannot ring it', () => {
    for (const how of ['stunned', 'held'] as const) {
      const s = hall();
      const e = rivalOf(s);
      if (how === 'stunned') e.stunned = true;
      else e.held = 1;
      const r = endTurn(s);
      expect(notes(r.events), how).toEqual([{ index: 0, tone: 'low', answered: 'cannotRing' }]);
      expect(ev(r.events, 'foundry:ring'), how).toHaveLength(0);
      expect(tuneState(r.state), how).toMatchObject({ at: 0, answered: 1 });
    }
  });

  it('BF-9: ringing a tone first is the counter-toll', () => {
    // a dummy stands beside the mid bell; the note called is mid
    const ascii = 'D . . . . V\n. . . . . .\n{bell:mid} d {bell:low} . {bell:high} .';
    const lattices = { draughtsman: 'Bolt> Strike' };
    const control = endTurn(hall(ascii, TUNE, 1, lattices));
    expect(notes(control.events)).toEqual([{ index: 1, tone: 'mid', answered: null }]);
    expect(damageTo(control.events, 'dummy-1').length).toBeGreaterThan(0); // his ring pulsed it
    const rung = cast(hall(ascii, TUNE, 1, lattices), 'draughtsman', 'down');
    expect(damageTo(rung.events, 'dummy-1').length).toBeGreaterThan(0); // our own ring pulsed it once
    const r = endTurn(rung.state);
    expect(notes(r.events)).toEqual([{ index: 1, tone: 'mid', answered: 'humming' }]);
    expect(damageTo(r.events, 'dummy-1')).toHaveLength(0); // his fizzled: nothing pulsed
  });

  it('BF-9: hung great bells answer from afar', () => {
    const ascii = '. . . . D V\n. . . . . .\n{bell:low} . {bell:mid} . {greatBell:1:allied} .';
    const lattices = { draughtsman: 'Bolt> Strike' };
    const control = endTurn(hall(ascii, TUNE, 0, lattices, 'E1'));
    expect(notes(control.events)).toEqual([{ index: 0, tone: 'low', answered: null }]);
    // the hung bell is far from the low bell, and hangs low: one cast rings the tone
    const first = cast(hall(ascii, TUNE, 0, lattices, 'E1'), 'draughtsman', 'down');
    expect(ringTones(first.events)).toEqual(['low']);
    expect(causes(first.events)).toEqual(['hung']);
    const r = endTurn(first.state);
    expect(notes(r.events)).toEqual([{ index: 0, tone: 'low', answered: 'humming' }]);
    expect(tuneState(r.state)).toMatchObject({ at: 0, answered: 1 });
  });

  it('BF-9: he plays the same tune by round for the same seed', () => {
    const play = (seed: number) => {
      let s = structuredClone(withLattices(HALL, {}, { hp: { A1: 99 } }));
      s.rules = { ...s.rules, [TUNE_RULE_ID]: foundry.TUNE_RULE.init(s, { seed }) };
      s = runDraft(s, (ctx) => planTrickMark(ctx, rivalOf(ctx.s))).state;
      const out: unknown[] = [];
      for (let i = 0; i < 9; i++) {
        const r = endTurn(s);
        out.push(...notes(r.events));
        s = r.state;
      }
      return { out, tune: tuneState(s) };
    };
    const a = play(11);
    expect(play(11)).toEqual(a);
    expect(a.out).toHaveLength(9);
    expect(a.tune.peals).toBeGreaterThanOrEqual(1); // two tunes in nine rounds
    expect(play(12).out).not.toEqual(a.out);
  });

  it('BF-9: his planner never rings into his own friends', () => {
    // his Bolt stops at the low bell, which rings and pulses D beside it
    const alone = hall('V . {bell:low} D .', TUNE);
    expect(rivalOf(alone).intent).toMatchObject({ kind: 'cast' });
    // a friend on the bell's other side would be pulsed too: he holds the cast
    const friend = hall('V . {bell:low} D .\n. . Z . .', TUNE);
    expect(rivalOf(friend).intent?.kind).not.toBe('cast');
  });

  it('BF-9: clearing the heart awards the page', () => {
    const won = structuredClone(hall());
    for (const u of won.units) if (u.kind === 'enemy') u.hp = 0;
    const p = bankPages(newProfile(), won, 'foundry', awardsPage);
    expect(p.pages).toEqual(['carillonneur:tune']);
    expect(bankPages(newProfile(), won, 'seam', awardsPage).pages).toEqual([]);
  });

  it('BF-9: his draw descriptor names the called tone', () => {
    const s = hall();
    const e = rivalOf(s);
    const mark = trickMarkOf(e);
    if (!mark) throw new Error('no mark shown');
    const draw = PLAYS_A_TUNE_TRICK.draw(s, e, mark, null);
    expect(draw).toMatchObject({ label: 'note:low', sequence: [1, FOUNDRY_TUNING.tuneLength] });
    expect(draw.tiles).toEqual(pulseTiles(s, 'low'));
    expect(PLAYS_A_TUNE_TRICK.describe(mark)).toContain('low');
    const next = endTurn(s).state;
    const e2 = rivalOf(next);
    const mark2 = trickMarkOf(e2);
    if (!mark2) throw new Error('no mark shown');
    expect(PLAYS_A_TUNE_TRICK.draw(next, e2, mark2, null)).toMatchObject({
      label: 'note:mid',
      sequence: [2, FOUNDRY_TUNING.tuneLength],
    });
  });
});
