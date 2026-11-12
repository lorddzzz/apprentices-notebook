import { describe, expect, test } from 'vitest';
import { ATTACKS, ENEMIES } from '$data';
import { FEEDER_PIPS } from '$data/districts/bathhouses/types';
import { type BattleState, unitAt } from '$engine';
import { hasTrait } from '$engine/arrival';
import { behaviourPreview } from '$engine/behaviours';
import { dealDamage } from '$engine/damage';
import { KIT } from '$engine/districts';
import { forecastBoilOver } from '$engine/districts/bathhouses/boilOver';
import { ATTENDANT_FOE, aimShove, BOILERMAN_FOE } from '$engine/districts/bathhouses/foes';
import { BOIL_OVER_RULE_ID, type BoilOverState } from '$engine/districts/bathhouses/types';
import { listRules } from '$engine/rules';
import type { EnemyUnit } from '$engine/types';
import { intentPhrase } from '../../../src/app/describe';
import { act, board, draft, expectLogIncludes, parseLabel } from '../../scenarios/harness';

/**
 * The attendant and the boilerman (bathhouses-plan P7, P9; BH-5). Tokens: `t` the attendant,
 * `c` the boilerman. Round 1 telegraphs without moving, so a board's first intent is planned where
 * the foes stand; `endTurn` resolves it.
 */

const at = parseLabel;
const rows = (...r: string[]) => r.join('\n');
const foe = (s: BattleState, def: string): EnemyUnit => {
  const u = s.units.find((v) => v.kind === 'enemy' && v.def === def);
  if (u?.kind !== 'enemy') throw new Error(`no ${def}`);
  return u;
};
const hpOf = (s: BattleState, id: string) => s.units.find((u) => u.id === id)?.hp;
const posOf = (s: BattleState, id: string) => s.units.find((u) => u.id === id)?.pos;
const telegraphOf = (e: EnemyUnit) => (e.intent?.kind === 'behaviour' ? e.intent.telegraph : null);

describe('data: the foes and the shove attack', () => {
  test('registered as behaviours, tokens t and c, sized against the canal foes', () => {
    expect(KIT.foes['bathhouses:attendant']).toBe(ATTENDANT_FOE);
    expect(KIT.foes['bathhouses:boilerman']).toBe(BOILERMAN_FOE);
    expect(ENEMIES.attendant).toMatchObject({ token: 't', attack: 'shove', elite: true });
    expect(ENEMIES.boilerman).toMatchObject({ token: 'c', attack: 'bite', elite: false });
    // The canals' foes run 1–4 HP (moth, eel, snuffer); neither bath foe outweighs the snuffer.
    for (const id of ['attendant', 'boilerman'] as const) {
      expect(ENEMIES[id].hp).toBeGreaterThanOrEqual(ENEMIES.eel.hp);
      expect(ENEMIES[id].hp).toBeLessThanOrEqual(ENEMIES.snuffer.hp);
      expect(ENEMIES[id].blurb.length).toBeGreaterThan(20);
    }
  });

  test('the shove deals nothing itself and pushes 2 (AttackDef.push); only the boilerman feeds', () => {
    expect(ATTACKS.shove).toMatchObject({ kind: 'adjacent', damage: 0, push: 2 });
    const s = board('t c');
    expect(hasTrait(foe(s, 'boilerman'), 'feeds')).toBe(true);
    expect(hasTrait(foe(s, 'attendant'), 'feeds')).toBe(false);
  });
});

describe('the attendant: heading choice (P9)', () => {
  test('picks the heading whose first obstruction is nearest: a plate one tile off', () => {
    const s = board(rows('. . . . .', '. . . . .', '= . S t .', '. . . . .', '. . . . .'));
    // up and down run 2 tiles to the edge, left 1 to the plate; right is the attendant itself.
    expect(aimShove(s, foe(s, 'attendant'))).toMatchObject({
      victim: { id: 'stoker' },
      dir: 'left',
      distance: 1,
    });
    expect(telegraphOf(foe(s, 'attendant'))).toEqual({
      label: 'shove:left',
      tiles: [at('C3'), at('B3'), at('A3')],
      units: ['stoker'],
    });
    expect(intentPhrase(s, foe(s, 'attendant'))).toBe('will shove C3 left (1st)');
  });

  test('ties go to DIRS order: up before down and left', () => {
    const s = board('S t . .');
    // up 0 (edge), down 0 (edge), left 0 (edge): up wins.
    expect(aimShove(s, foe(s, 'attendant'))).toMatchObject({ dir: 'up', distance: 0 });
  });

  test('ties between apprentices go to reading order', () => {
    const s = board(rows('. . .', '. D .', '. t .', '. S .', '. . .'));
    // Draughtsman (B2) and Stoker (B4) both have a 1-tile run up/down and left/right; the
    // Draughtsman comes first in reading order and `up` first in DIRS.
    expect(aimShove(s, foe(s, 'attendant'))).toMatchObject({
      victim: { id: 'draughtsman' },
      dir: 'up',
      distance: 1,
    });
  });

  test('nobody beside it: it walks two tiles at the nearest apprentice and aims once there', () => {
    const s = board('S . . t . .');
    expect(foe(s, 'attendant').intent).toBeNull();
    const r = act(s, { type: 'endTurn' });
    expect(unitAt(r.state, at('B1'))?.def).toBe('attendant');
    expect(telegraphOf(foe(r.state, 'attendant'))?.label).toBe('shove:up'); // one row: the edge is 0 up
  });
});

describe('the attendant: shove and crush through the push pipeline', () => {
  test('crush into a plate: pushed 1, crushed for 1 + 1, the plate stays', () => {
    const s = board(rows('. . . . .', '. . . . .', '= . S t .', '. . . . .', '. . . . .'), {
      hp: { C3: 6 },
    });
    const r = act(s, { type: 'endTurn' });
    expectLogIncludes(r.events, [
      'attendant at D3 shoves Stoker left',
      'Stoker is pushed left to B3',
      'Stoker is crushed against the plate for 2',
      'Crush hits Stoker for 2',
    ]);
    expect(hpOf(r.state, 'stoker')).toBe(4);
    expect(posOf(r.state, 'stoker')).toEqual(at('B3'));
  });

  test('crush into the wall (the edge): not moved, crushed for 1', () => {
    const s = board('S t . .', { hp: { A1: 6 } });
    const r = act(s, { type: 'endTurn' });
    expectLogIncludes(r.events, [
      'attendant at B1 shoves Stoker up',
      'Stoker is crushed against the wall for 1',
      'Crush hits Stoker for 1',
    ]);
    expect(hpOf(r.state, 'stoker')).toBe(5);
    expect(posOf(r.state, 'stoker')).toEqual(at('A1'));
  });

  test('crush into a unit: both are hurt (2 to the shoved, 1 to the one struck)', () => {
    const s = board(rows('. . . . .', '. . . . .', 'r . S t .', '. . . . .', '. . . . .'), {
      hp: { C3: 6 },
    });
    expect(aimShove(s, foe(s, 'attendant'))).toMatchObject({ dir: 'left', distance: 1 });
    const r = act(s, { type: 'endTurn' });
    expectLogIncludes(r.events, [
      'Stoker is crushed against rat at A3 for 2',
      'Crush hits Stoker for 2',
      'Crush hits rat at A3 for 1',
    ]);
    expect(hpOf(r.state, 'stoker')).toBe(4);
    expect(foe(r.state, 'rat').hp).toBe(ENEMIES.rat.hp - 1);
  });

  test('the telegraph and the preview match the result', () => {
    const s = board(rows('. . . . .', '. . . . .', '= . S t .', '. . . . .', '. . . . .'), {
      hp: { C3: 6 },
    });
    expect(behaviourPreview(s)).toEqual([
      { kind: 'ghost', unit: 'stoker', from: at('C3'), to: at('B3') },
      { kind: 'tile', at: at('A3'), tone: 'warn' },
      { kind: 'pulse', at: at('B3') },
    ]);
    const tg = telegraphOf(foe(s, 'attendant'));
    const r = act(s, { type: 'endTurn' });
    expect(posOf(r.state, 'stoker')).toEqual(tg?.tiles[1]);
    const crush = r.events.find((e) => e.type === 'crush');
    expect(crush && 'at' in crush ? crush.at : null).toEqual(tg?.tiles[2]);
  });

  test('a victim who stepped away is missed', () => {
    const s = structuredClone(
      board(rows('. . . . .', '= . S t .', '. . . . .'), { hp: { C2: 6 } }),
    );
    const stoker = s.units.find((u) => u.id === 'stoker');
    if (!stoker) throw new Error('board');
    stoker.pos = at('C1');
    const r = act(s, { type: 'endTurn' });
    expectLogIncludes(r.events, ['Shove hits nothing']);
    expect(hpOf(r.state, 'stoker')).toBe(6);
  });
});

describe('the boilerman: the feeder (P7)', () => {
  const ID = BOIL_OVER_RULE_ID;
  const bath = (ascii: string): BattleState => {
    const s = structuredClone(board(ascii));
    s.rules = listRules(s, [ID], { [ID]: { heat: 1 } });
    return s;
  };
  const gauge = (s: BattleState) => s.rules?.[ID] as BoilOverState;

  test('beside a vent he adds 2 pips to the fill; one tile off, nothing', () => {
    const beside = bath(rows('S . . . .', '. . . @ c'));
    const off = bath(rows('S . . . c', '. . @ . .'));
    const fb = forecastBoilOver(beside, gauge(beside));
    const fo = forecastBoilOver(off, gauge(off));
    expect(fb.feeders).toBe(1);
    expect(fo.feeders).toBe(0);
    expect(fb.forecast - fo.forecast).toBe(FEEDER_PIPS * 4);
  });

  test('killing him removes his pips from the forecast', () => {
    const s = bath(rows('S . . . .', '. . . @ c'));
    expect(forecastBoilOver(s, gauge(s)).feeders).toBe(1);
    const r = draft(s, (ctx) => dealDamage(ctx, foe(ctx.s, 'boilerman'), 9, 'Strike'));
    expect(foe(r.state, 'boilerman').hp).toBe(0);
    const f = forecastBoilOver(r.state, gauge(r.state));
    expect(f.feeders).toBe(0);
    expect(forecastBoilOver(s, gauge(s)).forecast - f.forecast).toBe(FEEDER_PIPS * 4);
  });

  test('at his vent he telegraphs the feed and tags the vent with his pips', () => {
    const s = board(rows('S . . . .', '. . . @ c'));
    const c = foe(s, 'boilerman');
    expect(telegraphOf(c)).toEqual({ label: 'feed', tiles: [at('D2')], units: [] });
    expect(intentPhrase(s, c)).toBe('will feed the vent at D2 (1st)');
    expect(behaviourPreview(s)).toEqual([{ kind: 'outline', cells: [at('D2')], label: '+2' }]);
  });

  test('walks to the nearest unguarded vent and stays there', () => {
    const s = board(rows('S . . . . .', '. . . . . .', '@ . . . . c'));
    expect(foe(s, 'boilerman').intent).toBeNull();
    const r = act(s, { type: 'endTurn' });
    expect(posOf(r.state, foe(r.state, 'boilerman').id)).toEqual(at('D3'));
    const r2 = act(r.state, { type: 'endTurn' });
    expect(posOf(r2.state, foe(r2.state, 'boilerman').id)).toEqual(at('B3'));
    expect(telegraphOf(foe(r2.state, 'boilerman'))?.label).toBe('feed');
    const r3 = act(r2.state, { type: 'endTurn' });
    expect(posOf(r3.state, foe(r3.state, 'boilerman').id)).toEqual(at('B3'));
  });

  test('a vent already fed by another boilerman is guarded: he goes for the other', () => {
    const s = board(rows('S . . . . . .', '. . . . . . .', '@ c c . . . @'));
    const [first, second] = s.units.filter((u) => u.kind === 'enemy');
    if (!first || !second) throw new Error('board');
    const r = act(s, { type: 'endTurn' });
    expect(posOf(r.state, first.id)).toEqual(at('B3'));
    expect(posOf(r.state, second.id)).toEqual(at('E3'));
  });

  test('an apprentice beside him is bitten for 1 instead', () => {
    const s = board(rows('. . . . .', '. . . @ c', '. . . . S'), { hp: { E3: 6 } });
    expect(telegraphOf(foe(s, 'boilerman'))?.label).toBe('bite');
    const r = act(s, { type: 'endTurn' });
    expectLogIncludes(r.events, ['Bite hits Stoker for 1']);
    expect(hpOf(r.state, 'stoker')).toBe(5);
  });
});

describe("FU-7: the boilerman's vent", () => {
  test("FU-7: a boilerman's vent puffs over a standing state; other vents do not", () => {
    // Vent B2 has a boilerman beside it (C2); vent F2 has nobody. Both carry a slick.
    const s = structuredClone(board(rows('S . . . . .', '@ c . . . @')));
    for (const lbl of ['A2', 'F2']) {
      const t = s.tiles[s.width * at(lbl).y + at(lbl).x];
      if (!t) throw new Error(lbl);
      t.state = { id: 'slick', rounds: 5, origin: null };
    }
    const r = act(s, { type: 'endTurn' });
    const idx = (c: { x: number; y: number }) => r.state.width * c.y + c.x;
    expect(r.state.tiles[idx(at('A2'))]?.state?.id).toBe('cloud');
    expect(r.state.tiles[idx(at('F2'))]?.state?.id).toBe('slick');
  });
});
