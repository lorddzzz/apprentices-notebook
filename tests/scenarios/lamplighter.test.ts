import { describe, expect, test } from 'vitest';
import { RIVAL_PAGES, RIVALS } from '$data/rivals';
import {
  type BattleState,
  compileLattice,
  type EnemyUnit,
  type GameEvent,
  parseLabel,
  parseLattice,
  tileAt,
} from '$engine';
import { act, board, expectLogIncludes } from './harness';

/**
 * The Lamplighter (rivals §2–3, RV-5): his real kit and routine, played unpinned. The desired
 * scene: he lays a lantern, waits with it rather than wasting it, herds you back onto it, shows
 * the long wick and opens it under you, and his own trap catches him when you shove him in.
 */

const endTurn = { type: 'endTurn' } as const;
const at = parseLabel;

const rivalOf = (s: BattleState): EnemyUnit => {
  const u = s.units.find((x): x is EnemyUnit => x.kind === 'enemy' && !!x.rival);
  if (!u) throw new Error('no rival');
  return u;
};
const hp = (s: BattleState, id: string) => s.units.find((u) => u.id === id)?.hp ?? 0;
const jarAt = (s: BattleState, lbl: string) => tileAt(s, at(lbl)).jar;
const opened = (events: readonly GameEvent[]) => events.filter((e) => e.type === 'jarOpened');

describe('the Lamplighter’s data', () => {
  test('numbers, kit, wick and page match rivals §2–3', () => {
    const def = RIVALS.lamplighter;
    expect(def).toMatchObject({
      token: 'L',
      district: 'canals',
      hp: 6,
      move: 1,
      elite: true,
      trick: 'canals:longWick',
      fallback: { damage: 1 },
      page: 'lamplighter:lantern',
    });
    expect(def?.spells.map((s) => [s.id, s.lattice, s.charges])).toEqual([
      ['lantern', 'Bolt> Jar Oil Spark', 5],
      ['herd', 'Bolt> Oil Shove', 5],
    ]);
    const page = RIVAL_PAGES['lamplighter:lantern'];
    expect(page).toMatchObject({
      rival: 'lamplighter',
      spell: 'lantern',
      title: 'Leave a lantern',
    });
    expect(page?.lattice).toBe(def?.spells[0]?.lattice);
    expect(page?.note).toMatchObject({ rune: 'jar' });
    expect(() => board(page?.trial.board ?? '')).not.toThrow();
    for (const sp of def?.spells ?? [])
      expect(compileLattice(parseLattice(sp.lattice)).spells).toHaveLength(1);
  });
});

describe('the desired scene', () => {
  // A drop at B1 keeps him on A1; the plate at A2 stops a Bolt cast down.
  const START = 'L _ . . .\n# . . . .\n. . . . D\n. . . . .';

  test('lays a lantern, keeps it, herds you onto it, then lays another and opens it with the wick', () => {
    let s = board(START, { hp: { E3: 12 } });
    // Round 1: no jar, so he aims a lantern near the party (E1 is beside Draughtsman's E3).
    expect(rivalOf(s).intent).toMatchObject({
      kind: 'cast',
      spell: 'lantern',
      aim: { dir: 'right' },
    });

    // You step away; the locked Bolt still lands at E1 and leaves the lantern there.
    s = act(s, { type: 'move', unit: 'draughtsman', to: at('D4') }).state;
    let r = act(s, endTurn);
    expectLogIncludes(r.events, ['lamplighter at A1 seals a jar at E1 (opens on a step)']);
    // Nobody is near it and nobody stands on it: he keeps it. No wick, no new lantern.
    expect(rivalOf(r.state).intent).toBeNull();
    expect(jarAt(r.state, 'E1')?.owner).toBe(rivalOf(s).id);

    // You walk back beside it: his next plan drives you onto it.
    s = act(r.state, { type: 'move', unit: 'draughtsman', to: at('D1') }).state;
    r = act(s, endTurn);
    expect(opened(r.events)).toEqual([]);
    expect(rivalOf(r.state).intent).toMatchObject({
      kind: 'cast',
      spell: 'herd',
      aim: { dir: 'right' },
    });
    const before = hp(r.state, 'draughtsman');
    r = act(r.state, endTurn);
    expectLogIncludes(r.events, [
      'Draughtsman is pushed right to E1',
      'the jar at E1 opens under Draughtsman',
    ]);
    expect(hp(r.state, 'draughtsman')).toBeLessThan(before);

    // The jar is spent, so he lays another, under you this time.
    expect(rivalOf(r.state).intent).toMatchObject({ kind: 'cast', spell: 'lantern' });
    r = act(r.state, endTurn);
    const jar = jarAt(r.state, 'E1');
    expect(jar?.owner).toBe(rivalOf(s).id);

    // The long wick is shown on that jar, and opens it under you.
    expect(rivalOf(r.state).intent).toMatchObject({
      kind: 'trick',
      trick: 'canals:longWick',
      lock: { kind: 'jar', id: jar?.id },
    });
    expect(r.lines).toContain('lamplighter at A1 will use the long wick');
    const hurt = hp(r.state, 'draughtsman');
    r = act(r.state, endTurn);
    expectLogIncludes(r.events, ['the jar at E1 opens under Draughtsman']);
    expect(hp(r.state, 'draughtsman')).toBeLessThan(hurt);
    expect(rivalOf(r.state).rival?.charges).toEqual({ lantern: 3, herd: 4 }); // the wick is free
  });

  test('his own trap catches him: shoved onto his lantern, it opens under him', () => {
    let s = board('S L D . .\n. . . . .\n. . . . .');
    s = act(s, endTurn).state; // the lantern lands under Draughtsman at C1
    expect(jarAt(s, 'C1')?.owner).toBe(rivalOf(s).id);
    expect(rivalOf(s).intent).toMatchObject({ kind: 'trick' });
    s = act(s, { type: 'move', unit: 'draughtsman', to: at('C3') }).state;
    const r = act(s, { type: 'shove', unit: 'stoker', dir: 'right' });
    expectLogIncludes(r.events, [
      'lamplighter at B1 is pushed right to C1',
      'the jar at C1 opens under lamplighter at C1',
    ]);
    expect(rivalOf(r.state).hp).toBeLessThan(rivalOf(s).hp);
    // His wick finds its jar gone: the order fails and never opens anything else.
    const next = act(r.state, endTurn);
    expect(next.events.some((e) => e.type === 'orderFails')).toBe(true);
    expect(opened(next.events)).toEqual([]);
  });
});

describe('he never detonates harmlessly', () => {
  test('every wick he opens in a fight hurts an apprentice, never him', () => {
    let s = board('L . . . D\n. . . . .\n. . S . .', { hp: { E1: 30, C3: 30 } });
    const id = rivalOf(s).id;
    let wicks = 0;
    for (let i = 0; i < 12 && s.phase === 'player'; i++) {
      const shown = rivalOf(s).intent;
      const r = act(s, endTurn);
      if (shown?.kind === 'trick') {
        wicks++;
        const hits = r.events.filter((e) => e.type === 'damage');
        expect(hits.some((e) => e.type === 'damage' && e.target.member)).toBe(true);
        expect(hits.some((e) => e.type === 'damage' && e.target.id === id)).toBe(false);
      }
      s = r.state;
    }
    expect(wicks).toBeGreaterThan(0);
  });
});

describe('without a jar he lays a trap', () => {
  test('in line or not, his first plan is a lantern landing near the party', () => {
    expect(rivalOf(board('L . . . D')).intent).toMatchObject({ kind: 'cast', spell: 'lantern' });
    expect(rivalOf(board('L . . . .\n. . . D .')).intent).toMatchObject({
      kind: 'cast',
      spell: 'lantern',
    });
  });
});
