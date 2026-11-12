import { describe, expect, test } from 'vitest';
import { TUNING } from '$data';
import type { BattleState } from '$engine';
import { fourCombos, withFootnotes } from '../footnoteHarness';
import { withLattices } from '../harness';
import { castWith } from './castHelper';

/** BR-19a: Brink's two margin lines (`brink:cracked`, `brink:drop`) and its capstone options. */

const unit = (s: BattleState, id: string) => {
  const u = s.units.find((x) => x.id === id);
  if (!u) throw new Error(`no ${id}`);
  return u;
};
const brink = (ascii: string, fns: string[]) => {
  const s = withLattices(ascii, { draughtsman: 'Bolt> Brink Strike' });
  return castWith(s, { kind: 'dir', dir: 'right' }, withFootnotes(fns));
};
const lost = (s: BattleState, id: string): number => unit(s, id).maxHp - unit(s, id).hp;

describe('brink:cracked', () => {
  // The foe at C2 stands beside a cracked span (C3, no pier). The foe at E2 stands beside fog.
  const CRACKED = '. . . . .\nD . r . r\n. . {span} . _';
  const run = (fns: string[]) => {
    const r = brink(CRACKED, fns);
    return {
      passed: r.events.some((e) => e.type === 'triggered' && e.passed),
      hit: lost(r.state, 'rat-1'),
      other: lost(r.state, 'rat-2'),
      shield: unit(r.state, 'draughtsman').shield,
      line: r.events.find((e) => e.type === 'triggered')?.line,
    };
  };

  test('brink:cracked fourCombos: dusk or half, then look or find', () => {
    const runs = fourCombos(
      'brink:cracked',
      ['brink-cracked-dusk', 'brink-cracked-half'],
      ['brink-cracked-look', 'brink-cracked-find'],
      ({ l1, l2 }) => {
        const r = brink(CRACKED, [l1, l2]);
        return {
          passed: r.events.some((e) => e.type === 'triggered' && e.passed),
          hit: lost(r.state, 'rat-1'),
          other: lost(r.state, 'rat-2'),
          shield: unit(r.state, 'draughtsman').shield,
        };
      },
    );
    expect(run([])).toMatchObject({ passed: false, hit: 0, line: 'brink:cracked' });
    const [duskLook, duskFind, halfLook, halfFind] = runs.map((r) => r.result);
    // dusk: the cracked tile is an edge now, so the rest lands in full; look and find never fire.
    expect(duskLook).toMatchObject({ passed: true, hit: TUNING.strikeDamage, other: 0, shield: 0 });
    expect(duskFind).toMatchObject({ passed: true, hit: TUNING.strikeDamage, other: 0 });
    // half: one step weaker.
    expect(halfLook).toMatchObject({ passed: true, hit: TUNING.strikeDamage - 1, shield: 0 });
    expect(halfFind).toMatchObject({ passed: true, hit: TUNING.strikeDamage - 1, other: 0 });
  });

  test('brink-cracked-look: a Brink that still misses beside a cracked tile gives you a Guard of 1', () => {
    expect(run(['brink-cracked-look'])).toMatchObject({ passed: false, hit: 0, shield: 1 });
  });

  test('brink-cracked-find: a miss acts on the nearest unit within 2 that stands at an edge, at full strength', () => {
    const r = run(['brink-cracked-find']);
    expect(r).toMatchObject({ hit: 0, other: TUNING.strikeDamage, passed: true });
  });
});

describe('brink:drop', () => {
  // `orth`: the foe stands beside fog. `diag`: fog only on its diagonal.
  const ORTH = 'D . d _ .\n. . . . .';
  const DIAG = 'D . d . .\n. . . _ .';
  const run = (fns: string[]) => {
    const one = (ascii: string) => {
      const r = brink(ascii, fns);
      const dummy = unit(r.state, 'dummy-1');
      return {
        passed: r.events.some((e) => e.type === 'triggered' && e.passed),
        hit: lost(r.state, 'dummy-1'),
        held: dummy.held,
        pos: dummy.pos,
        dropped: r.events.some((e) => e.type === 'dropped'),
        line: r.events.find((e) => e.type === 'triggered')?.line,
      };
    };
    return { orth: one(ORTH), diag: one(DIAG) };
  };

  test('brink:drop fourCombos: near or keen, then stay or nudge', () => {
    const runs = fourCombos(
      'brink:drop',
      ['brink-drop-near', 'brink-drop-keen'],
      ['brink-drop-stay', 'brink-drop-nudge'],
      ({ l1, l2 }) => run([l1, l2]),
    );
    const plain = run([]);
    expect(plain.orth).toMatchObject({
      passed: true,
      hit: TUNING.strikeDamage,
      line: 'brink:drop',
    });
    expect(plain.diag).toMatchObject({ passed: false, hit: 0 });
    const [nearStay, nearNudge, keenStay, keenNudge] = runs.map((r) => r.result);
    // near: the diagonal counts, and the fog line signs it.
    expect(nearStay?.diag).toMatchObject({
      passed: true,
      hit: TUNING.strikeDamage,
      held: 1,
      line: 'brink:drop',
    });
    expect(nearStay?.orth).toMatchObject({ hit: TUNING.strikeDamage, held: 1 });
    // near + nudge: the diagonal foe is pushed toward the nearest fog tile along its row, then held by nothing.
    expect(nearNudge?.diag.pos).toEqual({ x: 3, y: 0 });
    expect(nearNudge?.orth).toMatchObject({ dropped: true });
    // keen: one step stronger beside fog; the diagonal still misses.
    expect(keenStay?.orth).toMatchObject({ hit: TUNING.strikeDamage + 1, held: 1 });
    expect(keenStay?.diag).toMatchObject({ passed: false, hit: 0, held: 0 });
    expect(keenNudge?.orth).toMatchObject({ dropped: true });
  });
});

describe('brink capstones', () => {
  test('brink-cap-rim: Brink never misses on the rim: the room walls count as an edge', () => {
    const plain = brink('D . d . .\n. . . . .', []);
    expect(plain.events.some((e) => e.type === 'triggered' && !e.passed)).toBe(true);
    expect(lost(plain.state, 'dummy-1')).toBe(0);
    const rim = brink('D . d . .\n. . . . .', ['brink-cap-rim']);
    expect(rim.events.find((e) => e.type === 'triggered')).toMatchObject({
      passed: true,
      line: 'brink:edge',
    });
    expect(lost(rim.state, 'dummy-1')).toBe(TUNING.strikeDamage);
  });
});
