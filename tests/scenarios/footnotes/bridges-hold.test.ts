import { describe, expect, test } from 'vitest';
import { TUNING } from '$data';
import type { BattleState } from '$engine';
import { tileAt } from '$engine';
import { runDraft } from '$engine/ctx';
import { dealDamage } from '$engine/damage';
import { push } from '$engine/push';
import { holdUnit } from '$engine/runes/actions';
import { fourCombos, withFootnotes } from '../footnoteHarness';
import { board, withLattices } from '../harness';
import { castWith, step } from './castHelper';

/** BR-19a: Hold's two margin lines (`hold:held`, `hold:cracked`) and its two capstones. */

const unit = (s: BattleState, id: string) => {
  const u = s.units.find((x) => x.id === id);
  if (!u) throw new Error(`no ${id}`);
  return u;
};
const endTurn = (s: BattleState, fns = {}) => step(s, { type: 'endTurn' }, fns);

describe('hold:held', () => {
  // The rat at C1 is already held; the dummy stands beside it at D1.
  const second = (footnotes: Parameters<typeof castWith>[2]) => {
    const s = withLattices('D . r d .', { draughtsman: 'Bolt> Hold' });
    unit(s, 'rat-1').held = 1;
    const r = castWith(s, { kind: 'dir', dir: 'right' }, footnotes);
    const rat = unit(r.state, 'rat-1');
    return {
      rat: rat.held,
      dummy: unit(r.state, 'dummy-1').held,
      free: rat.holdFreeUntil ?? null,
      line: r.events.find((e) => e.type === 'held')?.line,
    };
  };

  test('hold:held fourCombos: extend or pass, then exposed or shake', () => {
    const runs = fourCombos(
      'hold:held',
      ['hold-held-extend', 'hold-held-pass'],
      ['hold-held-exposed', 'hold-held-shake'],
      ({ footnotes }) => second(footnotes),
    );
    const [extExp, extShake, passExp, passShake] = runs.map((r) => r.result);
    expect(second({})).toMatchObject({ rat: 1, dummy: 0 }); // no stacking without a footnote
    // extend + exposed: a long pin, held two turns, and exposed.
    expect(extExp).toMatchObject({ rat: 2, dummy: 0, line: 'hold:held' });
    // extend + shake: the second Hold frees it at the next turn and the safe window wins.
    expect(extShake).toMatchObject({ rat: 1, dummy: 0, free: 2 });
    // pass: the second Hold goes on to the unit beside it; the first is not held twice.
    expect(passExp).toMatchObject({ rat: 1, dummy: 1, line: 'hold:held' });
    expect(passShake).toMatchObject({ rat: 1, dummy: 1, free: null });
  });

  test("hold-held-exposed: a foe's attack on a unit held twice deals one more", () => {
    const run = (holds: number, fns: string[]) => {
      const s = board('S . r . .');
      const r = runDraft(
        s,
        (ctx) => {
          for (let i = 0; i < holds; i++) holdUnit(ctx, unit(ctx.s, 'stoker'), 1);
          dealDamage(ctx, unit(ctx.s, 'stoker'), 1, 'Bite');
        },
        { footnotes: withFootnotes(fns) },
      );
      return { hp: unit(r.state, 'stoker').maxHp - unit(r.state, 'stoker').hp, events: r.events };
    };
    expect(run(2, []).hp).toBe(1);
    expect(run(1, ['hold-held-exposed']).hp).toBe(1); // held once: not exposed
    const twice = run(2, ['hold-held-exposed']);
    expect(twice.hp).toBe(2);
    expect(twice.events.find((e) => e.type === 'damage')).toMatchObject({
      amount: 2,
      line: 'hold:held',
    });
    // A hit of nothing stays nothing.
    const s = board('S . r . .');
    const zero = runDraft(
      s,
      (ctx) => {
        holdUnit(ctx, unit(ctx.s, 'stoker'), 1);
        holdUnit(ctx, unit(ctx.s, 'stoker'), 1);
        dealDamage(ctx, unit(ctx.s, 'stoker'), 0, 'Nothing');
      },
      { footnotes: withFootnotes(['hold-held-exposed']) },
    );
    expect(unit(zero.state, 'stoker').hp).toBe(unit(s, 'stoker').hp);
  });

  test('hold-held-shake: the next Hold misses, the one after lands', () => {
    const s = board('S . r . .');
    const fns = withFootnotes(['hold-held-shake']);
    const r = runDraft(
      s,
      (ctx) => {
        const rat = unit(ctx.s, 'rat-1');
        holdUnit(ctx, rat, 1);
        holdUnit(ctx, rat, 1); // held twice: freed at the next turn, immune for a round
        expect(rat.held).toBe(1);
        holdUnit(ctx, rat, 1); // the next Hold misses
        expect(rat.holds).toBe(2);
      },
      { footnotes: fns },
    );
    const missed = r.events.filter((e) => e.type === 'miss');
    expect(missed).toHaveLength(1);
    expect(missed[0]?.line).toBe('hold:held');
    // Two rounds on, the unit is free and a Hold lands again.
    const later = structuredClone(r.state);
    later.round += 2;
    unit(later, 'rat-1').held = 0;
    const again = runDraft(later, (ctx) => holdUnit(ctx, unit(ctx.s, 'rat-1'), 1), {
      footnotes: fns,
    });
    expect(unit(again.state, 'rat-1').held).toBe(1);
    expect(again.events.some((e) => e.type === 'miss')).toBe(false);
  });
});

describe('hold:cracked', () => {
  // Two foes on a span with no pier: both tiles are cracked. The member beside them is held by the knot.
  const board3 = 'D . r{span} S{span} .\n. . . . .';
  const dusk = (footnotes: Parameters<typeof castWith>[2]) => {
    const s = withLattices(board3, { draughtsman: 'Bolt> Hold' });
    const held = castWith(s, { kind: 'dir', dir: 'right' }, footnotes);
    const end = endTurn(held.state, footnotes);
    const stoker = end.state.units.find((u) => u.id === 'stoker');
    return {
      stokerHeld: unit(held.state, 'stoker').held,
      ratOut: unit(end.state, 'rat-1').hp <= 0 || unit(end.state, 'rat-1').out != null,
      ratTile: tileAt(end.state, { x: 2, y: 0 }).terrain.drop,
      stokerOut: stoker?.out != null,
      stokerAt: stoker && stoker.out == null ? stoker.pos : null,
    };
  };

  test('hold:cracked fourCombos: lean or pinned, then spare or knot', () => {
    const runs = fourCombos(
      'hold:cracked',
      ['hold-cracked-lean', 'hold-cracked-pinned'],
      ['hold-cracked-spare', 'hold-cracked-knot'],
      ({ footnotes }) => dusk(footnotes),
    );
    const [leanSpare, leanKnot, pinSpare, pinKnot] = runs.map((r) => r.result);
    expect(dusk({})).toMatchObject({ stokerHeld: 0, ratTile: true }); // the span falls
    // lean + spare: the knot is not there, so the stoker is not held; spare has nothing to lower.
    expect(leanSpare).toMatchObject({ stokerHeld: 0 });
    // lean + knot: both held, so the first dusk waits and nothing falls.
    expect(leanKnot).toMatchObject({ stokerHeld: 1, ratTile: false, stokerOut: false });
    // pinned + spare: the foe falls with the span, no stoker was held.
    expect(pinSpare).toMatchObject({ ratTile: true });
    // pinned + knot: the member is held too, so it falls (exposed, and not lowered).
    expect(pinKnot).toMatchObject({ stokerHeld: 1, stokerOut: true });
  });

  test('hold-cracked-pinned: a crush on a unit held on a cracked span deals one more, and the two never stack', () => {
    const run = (fns: string[], extraHolds: number) => {
      // The rat at B1 is pushed into the held rat at C1 (on a cracked span).
      const s = board('D r r{span} . .\n. . . . .');
      const r = runDraft(
        s,
        (ctx) => {
          const held = unit(ctx.s, 'rat-2');
          for (let i = 0; i < 1 + extraHolds; i++) holdUnit(ctx, held, 1);
          push(ctx, unit(ctx.s, 'rat-1'), 'right', 1, null);
        },
        { footnotes: withFootnotes(fns) },
      );
      const hits = r.events.filter((e) => e.type === 'damage' && e.target.id === 'rat-2');
      return hits.map((e) => (e.type === 'damage' ? e.amount : 0));
    };
    expect(run([], 0)).toEqual([TUNING.crushStruck]);
    expect(run(['hold-cracked-pinned'], 0)).toEqual([TUNING.crushStruck + 1]);
    // Held twice as well: exposed by both lines, still one step.
    expect(run(['hold-cracked-pinned', 'hold-held-exposed'], 1)).toEqual([TUNING.crushStruck + 1]);
  });

  test('hold-cracked-spare and -lean: a held member is lowered; a held foe waits one dusk, once', () => {
    const member = withLattices('D . S{span} . .\n. . . . d', { draughtsman: 'Bolt> Hold' });
    const spare = withFootnotes(['hold-cracked-spare']);
    const held = castWith(member, { kind: 'dir', dir: 'right' }, spare);
    const after = endTurn(held.state, spare);
    const stoker = unit(after.state, 'stoker');
    expect(stoker.out ?? null).toBeNull();
    expect(stoker.pos).not.toEqual({ x: 2, y: 0 });
    // Without it the member falls out of the room.
    expect(
      unit(endTurn(castWith(member, { kind: 'dir', dir: 'right' }, {}).state).state, 'stoker').out,
    ).toBeTruthy();
    // Lean: the held foe's tile waits a dusk; the next dusk (held again) it falls.
    const foe = withLattices('D . r{span} . .\n. . . . .', { draughtsman: 'Bolt> Hold' });
    const lean = withFootnotes(['hold-cracked-lean']);
    const first = endTurn(castWith(foe, { kind: 'dir', dir: 'right' }, lean).state, lean);
    expect(tileAt(first.state, { x: 2, y: 0 }).terrain.drop).toBe(false);
    expect(unit(first.state, 'rat-1').hp).toBeGreaterThan(0);
    const again = unit(first.state, 'rat-1');
    again.held = 1; // held a second time
    const second = endTurn(first.state, lean);
    expect(tileAt(second.state, { x: 2, y: 0 }).terrain.drop).toBe(true);
  });

  test('hold-cap-crush: a foe you held takes the fall as a crush on top of the drop', () => {
    // The sentry (an elite) is held on the cracked span at C1.
    const s = withLattices('D . b{span} . .\n. . . . .', { draughtsman: 'Bolt> Hold' });
    const run = (fns: string[]) => {
      const held = castWith(s, { kind: 'dir', dir: 'right' }, withFootnotes(fns));
      const end = endTurn(held.state, withFootnotes(fns));
      return end.events
        .filter((e) => e.type === 'damage')
        .map((e) => (e.type === 'damage' ? [e.source, e.amount] : []));
    };
    const plain = run([]);
    const crushed = run(['hold-cap-crush']);
    expect(crushed.length).toBe(plain.length + 1);
    expect(crushed).toContainEqual(['Crush', TUNING.crushBase]);
  });

  test('hold-cap-hang: a unit you held would fall and hangs instead, held a turn', () => {
    const s = withLattices('D . r{span} . .\n. . . . .', { draughtsman: 'Bolt> Hold' });
    const fns = withFootnotes(['hold-cap-hang']);
    const held = castWith(s, { kind: 'dir', dir: 'right' }, fns);
    const end = endTurn(held.state, fns);
    const rat = unit(end.state, 'rat-1');
    expect(rat.hp).toBeGreaterThan(0);
    expect(rat.out ?? null).toBeNull();
    expect(rat.pos).not.toEqual({ x: 2, y: 0 }); // set on the nearest standing tile
    expect(tileAt(end.state, { x: 2, y: 0 }).terrain.drop).toBe(true); // the span still falls
    expect(end.events.find((e) => e.type === 'moved' && e.line === 'hold:cracked')).toBeDefined();
  });
});
