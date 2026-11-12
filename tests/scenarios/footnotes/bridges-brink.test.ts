import { describe, expect, test } from 'vitest';
import { TUNING } from '$data';
import type { BattleState } from '$engine';
import { runDraft } from '$engine/ctx';
import type { BoardRule } from '$engine/districts/types';
import { tileAt } from '$engine/queries';
import { boardRules } from '$engine/rules';
import { roundEnd } from '$engine/turn';
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

describe('brink-cap-fall', () => {
  // The dummy at C2 stands on a cracked span beside fog (D2), so Brink passes. The rest is a Fork
  // of two Strikes: it hits the units above and below the target's tile, not the target.
  const PAGE = '. . Strike .\nBolt> Brink Fork .\n. . Strike .';
  const FALL = '. . d . .\nD . d{span} _ .\n. . d . .';
  const cast = (ascii: string, fns: string[], page = PAGE) => {
    const s = withLattices(ascii, { draughtsman: page });
    return castWith(s, { kind: 'dir', dir: 'right' }, withFootnotes(fns));
  };
  /** Dusk with a probe in the `late` slot, after the collapse, that records the queue as it stands. */
  const dusk = (s: BattleState, fns: string[]) => {
    const seen: number[] = [];
    const probe: BoardRule = {
      id: 'bridges:test-probe',
      slot: 'late',
      order: 1_000_000,
      scope: 'district',
      activatedBy: { kind: 'terrain', flag: 'drop' },
      init: () => null,
      step: (ctx, own) => {
        seen.push(ctx.s.scheduled.filter((e) => e.kind === 'brink').length);
        return own;
      },
    };
    const start = { ...s, rules: { ...s.rules, [probe.id]: null } };
    const r = runDraft(start, (ctx) => roundEnd(ctx, [...boardRules(), probe]), {
      footnotes: withFootnotes(fns),
    });
    return { ...r, seen };
  };
  const brinks = (s: BattleState) => s.scheduled.filter((e) => e.kind === 'brink');
  const FNS = ['brink-cap-fall'];

  test("brink-cap-fall: a target that falls at dusk takes Brink's rest again on the tile it stood on", () => {
    const first = cast(FALL, FNS);
    expect(lost(first.state, 'dummy-1')).toBe(TUNING.strikeDamage);
    expect(lost(first.state, 'dummy-3')).toBe(TUNING.strikeDamage);
    expect(brinks(first.state)).toHaveLength(1);
    const end = dusk(first.state, FNS);
    expect(lost(end.state, 'dummy-1')).toBe(TUNING.strikeDamage * 2);
    expect(lost(end.state, 'dummy-3')).toBe(TUNING.strikeDamage * 2);
    expect(end.events.filter((e) => e.type === 'damage')).toHaveLength(2);
    // Without the footnote the same dusk repeats nothing.
    const plain = dusk(cast(FALL, []).state, []);
    expect(lost(plain.state, 'dummy-1')).toBe(TUNING.strikeDamage);
  });

  test('brink-cap-fall: a target that walks off, is set down by hold-cap-hang or keeps its tile by right of way gets no replay', () => {
    const first = cast(FALL, FNS);
    // Walks off: it is not on the falling tile at dusk.
    const walked = structuredClone(first.state);
    const walker = unit(walked, 'dummy-2');
    walker.pos = { x: 0, y: 0 };
    expect(lost(dusk(walked, FNS).state, 'dummy-1')).toBe(TUNING.strikeDamage);
    // Set down by hold-cap-hang: held, so the tile falls without it.
    const hung = structuredClone(first.state);
    unit(hung, 'dummy-2').held = 1;
    const hang = dusk(hung, [...FNS, 'hold-cap-hang']);
    expect(tileAt(hang.state, { x: 2, y: 1 }).terrain.drop).toBe(true);
    expect(lost(hang.state, 'dummy-1')).toBe(TUNING.strikeDamage);
    // Right of way: the Chief Warden does not fall (a keystone stands elsewhere on the board).
    const chief = cast('. . d . .\nD . K{span} _ .\n. . d . {keystone:2}', FNS);
    expect(brinks(chief.state)).toHaveLength(1);
    const kept = dusk(chief.state, FNS);
    expect(lost(kept.state, 'dummy-1')).toBe(TUNING.strikeDamage);
    // He is set on a standing tile unhurt, not dropped.
    expect(unit(kept.state, 'chiefWarden-1').out ?? null).toBeNull();
  });

  test('brink-cap-fall: a caster who falls in the same collapse has no replay', () => {
    const first = cast('. . d . .\nD{span} . d{span} _ .\n. . d . .', FNS);
    expect(brinks(first.state)).toHaveLength(1);
    const end = dusk(first.state, FNS);
    expect(unit(end.state, 'draughtsman').out).toBe('fell');
    expect(tileAt(end.state, { x: 2, y: 1 }).terrain.drop).toBe(true);
    expect(lost(end.state, 'dummy-1')).toBe(TUNING.strikeDamage);
  });

  test("brink-cap-fall: the replay keeps half's strength and never records another", () => {
    // Both span tiles are cracked: with `brink-cracked-half` Brink passes beside the second, one step weaker.
    const first = cast('. . d . .\nD . d{span} {span} .\n. . d . .', [
      ...FNS,
      'brink-cracked-half',
    ]);
    expect(lost(first.state, 'dummy-1')).toBe(TUNING.strikeDamage - 1);
    expect(brinks(first.state)).toHaveLength(1);
    const end = dusk(first.state, [...FNS, 'brink-cracked-half']);
    expect(lost(end.state, 'dummy-1')).toBe((TUNING.strikeDamage - 1) * 2);
    // Nothing waits again after the replay, even before the dusk's last call.
    expect(end.seen).toEqual([0]);
  });

  test('brink-cap-fall: no brink entry outlives the dusk, on a board without bridges too', () => {
    const first = cast('. . . . .\nD . d _ .\n. . . . .', FNS);
    expect(brinks(first.state)).toHaveLength(1);
    const end = runDraft(first.state, (ctx) => roundEnd(ctx), { footnotes: withFootnotes(FNS) });
    expect(brinks(end.state)).toHaveLength(0);
    expect(end.events.some((e) => e.type === 'scheduled' || e.type === 'repeated')).toBe(false);
  });
});
