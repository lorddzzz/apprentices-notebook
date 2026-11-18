import { describe, expect, it } from 'vitest';
import { footnoteKeyOf, VARIANTS } from '$data';
import { createBattle } from '$engine/battle';
import { emit, ref } from '$engine/ctx';
import { dealDamage } from '$engine/damage';
import { parseLabel } from '$engine/notation';
import { tileAt } from '$engine/queries';
import { hasFootnote } from '$engine/footnotes';
import { WICK_NOTE } from '$engine/jars';
import { rivalPreview } from '$engine/rivals';
import type { EventLog as GameEventLog } from '$engine/events';
import type { ObjectRef } from '$engine/rivals/types';
import { simulate } from '$engine/rivals/plan';
import type { Step } from '$engine/types';
import { clean } from '$engine/rivals/goals';
import { registerTrick } from '$engine/rivals/tricks';
import type { EnemyUnit } from '$engine/types';

describe('rival walk simulation', () => {
  it('scores the cast on the board after a party jar opened underfoot', () => {
    const s = createBattle({ title: 't', board: 'L . . D', seed: 1 }).state;
    const rival = s.units.find((u): u is EnemyUnit => u.kind === 'enemy' && !!u.rival);
    if (!rival) throw new Error('no rival');
    tileAt(s, parseLabel('B1')).jar = {
      owner: 'draughtsman',
      event: 'step',
      rest: null,
      heading: null,
      origin: { caster: 'draughtsman', spell: 'fixture', cast: 0 },
      id: 1,
      seq: 1,
    };
    const note = VARIANTS.find((v) => v.id === 'lamplighter:wick');
    if (!note) throw new Error('no note');
    const undo = registerTrick({
      id: 'canals:walkTest',
      name: 'Walk test',
      init: () => ({}),
      draw: () => ({ label: 'fixture', tiles: [], units: [] }),
      describe: () => 'fixture',
      action: {
        plan: () => [],
        resolve: (ctx, unit, _intent, own) => {
          if (tileAt(ctx.s, parseLabel('B1')).jar) dealDamage(ctx, unit, 1, 'fixture');
          return own;
        },
      },
    });
    const outcome = simulate(
      s,
      rival.id,
      [parseLabel('B1')],
      {
        kind: 'trick',
        trick: 'canals:walkTest',
        lock: null,
        data: {},
        fallback: null,
        order: 0,
      },
      { [footnoteKeyOf(note)]: note.id },
    );
    undo();
    expect(outcome.selfHarm).toBe(0);
  });
});

const TRICK = {
  kind: 'trick',
  trick: 'canals:noteTest',
  lock: null,
  data: {},
  fallback: null,
  order: 1,
} as const;

function fixtureTrick() {
  return registerTrick({
    id: 'canals:noteTest',
    name: 'Note test',
    init: () => ({}),
    draw: () => ({ label: 'fixture', tiles: [], units: [] }),
    describe: () => 'fixture',
    action: {
      plan: () => [],
      // Hurts him unless the Wick note is written: the footnotes must reach the preview's ctx.
      resolve: (ctx, unit, _intent, own) => {
        if (!hasFootnote(ctx, WICK_NOTE)) dealDamage(ctx, unit, 1, 'fixture');
        return own;
      },
    },
  });
}

describe('rivalPreview footnotes', () => {
  it('previews with the battle footnotes', () => {
    const s = createBattle({ title: 't', board: 'L . . D', seed: 1 }).state;
    const rival = s.units.find((u): u is EnemyUnit => u.kind === 'enemy' && !!u.rival);
    const note = VARIANTS.find((v) => v.id === 'lamplighter:wick');
    if (!rival || !note) throw new Error('fixture');
    rival.intent = { ...TRICK };
    const undo = fixtureTrick();
    const without = rivalPreview(s, rival.id);
    const written = rivalPreview(s, rival.id, { [footnoteKeyOf(note)]: note.id });
    undo();
    expect(without?.events.some((e) => e.type === 'damage')).toBe(true);
    expect(written?.events.some((e) => e.type === 'damage')).toBe(false);
  });
});

describe('simulate outcome', () => {
  it('counts harm taken on his own walk as self-harm, so the plan is not clean', () => {
    const s = createBattle({ title: 't', board: 'L . . D', seed: 1 }).state;
    const rival = s.units.find((u): u is EnemyUnit => u.kind === 'enemy' && !!u.rival);
    const note = VARIANTS.find((v) => v.id === 'lamplighter:wick');
    if (!rival || !note) throw new Error('fixture');
    const spark: Step = { role: 'kind', rune: 'spark', at: { x: 0, y: 0 }, auras: [], next: null };
    const rest: Step = { role: 'kind', rune: 'oil', at: { x: 0, y: 0 }, auras: [], next: spark };
    tileAt(s, parseLabel('B1')).jar = {
      owner: rival.id,
      event: 'step',
      rest,
      heading: null,
      origin: { caster: rival.id, spell: 'lantern', cast: 0 },
      id: 1,
      seq: 1,
    };
    const undo = registerTrick({
      id: 'canals:ownWalk',
      name: 'Own walk',
      init: () => ({}),
      draw: () => ({ label: 'fixture', tiles: [], units: [] }),
      describe: () => 'fixture',
      action: { plan: () => [], resolve: (_c, _u, _i, own) => own },
    });
    const outcome = simulate(
      s,
      rival.id,
      [parseLabel('B1')],
      { ...TRICK, trick: 'canals:ownWalk' },
      { [footnoteKeyOf(note)]: note.id },
    );
    undo();
    expect(outcome.selfHarm).toBeGreaterThan(0);
    expect(clean(outcome)).toBe(false);
  });
});

const jarOf = (owner: string, id: number) => ({
  owner,
  event: 'step' as const,
  rest: null,
  heading: null,
  origin: { caster: owner, spell: 'fixture', cast: 0 },
  id,
  seq: id,
});

/** A rival on `L . . D` showing a trick locked on `lock`; `opensJar` is the jar its resolve opens. */
function lockedPreview(
  lock: ObjectRef,
  opensJar: number | null,
  setup?: (s: ReturnType<typeof createBattle>['state'], rival: EnemyUnit) => void,
  phase: GameEventLog = [],
) {
  const s = createBattle({ title: 't', board: 'L . . D', seed: 1 }).state;
  const rival = s.units.find((u): u is EnemyUnit => u.kind === 'enemy' && !!u.rival);
  if (!rival) throw new Error('no rival');
  setup?.(s, rival);
  rival.intent = { ...TRICK, trick: 'canals:lockTest', lock };
  const undo = registerTrick({
    id: 'canals:lockTest',
    name: 'Lock test',
    init: () => ({}),
    draw: () => ({ label: 'fixture', tiles: [], units: [] }),
    describe: () => 'fixture',
    action: {
      plan: () => [],
      resolve: (ctx, unit, _i, own) => {
        if (opensJar !== null)
          emit(ctx, { type: 'jarOpened', at: { x: 1, y: 0 }, by: ref(unit), id: opensJar });
        return own;
      },
    },
  });
  const out = rivalPreview(s, rival.id, {}, phase);
  undo();
  return { out, rival };
}

describe('trick preview locks', () => {
  it('reports the jar that opened, not the locked one, when they differ', () => {
    const setup = (s: Parameters<typeof tileAt>[0], r: EnemyUnit) => {
      tileAt(s, parseLabel('B1')).jar = jarOf(r.id, 1);
    };
    // Jar 2 opening is reported as jar 2, not as the locked jar 1.
    expect(lockedPreview({ kind: 'jar', id: 1 }, 2, setup).out?.opens).toEqual([
      { kind: 'jar', id: 2 },
    ]);
    expect(lockedPreview({ kind: 'jar', id: 1 }, 1, setup).out?.opens).toEqual([
      { kind: 'jar', id: 1 },
    ]);
  });

  it('lands on a trick object at its tile', () => {
    const { out } = lockedPreview({ kind: 'trick', id: 7 }, null, (_s, r) => {
      r.rival?.objects.push({
        id: 7,
        trick: 'canals:lockTest',
        owner: r.id,
        at: { x: 2, y: 0 },
        data: {},
      });
    });
    expect(out?.landing).toEqual({ x: 2, y: 0 });
  });

  it('has no landing and opens nothing when the order is lost', () => {
    const { out } = lockedPreview({ kind: 'jar', id: 9 }, null);
    expect(out?.landing).toBeNull();
    expect(out?.opens).toEqual([]);
  });

  it('fails the order for an object made earlier in the phase', () => {
    const setup = (s: Parameters<typeof tileAt>[0], r: EnemyUnit) => {
      tileAt(s, parseLabel('B1')).jar = jarOf(r.id, 1);
    };
    const made: GameEventLog = [
      {
        type: 'jarSealed',
        at: { x: 1, y: 0 },
        owner: { id: 'x', name: 'X', member: false, at: { x: 1, y: 0 } },
        event: 'step',
        id: 1,
        peek: null,
      },
    ];
    const fresh = lockedPreview({ kind: 'jar', id: 1 }, 1, setup);
    const after = lockedPreview({ kind: 'jar', id: 1 }, 1, setup, made);
    expect(fresh.out?.landing).toEqual({ x: 1, y: 0 });
    expect(after.out?.landing).toBeNull();
    expect(after.out?.opens).toEqual([]);
    expect(after.out?.events.some((e) => e.type === 'orderFails')).toBe(true);
    expect(after.out?.events.some((e) => e.type === 'jarSealed')).toBe(false);
  });
});
