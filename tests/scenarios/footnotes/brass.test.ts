import { expect, test } from 'vitest';
import { TUNING } from '$data';
import { parseLabel } from '$engine';
import { burstAt } from '$engine/bursts';
import { type Ctx, runDraft } from '$engine/ctx';
import { landKind } from '$engine/mix';
import { push } from '$engine/push';
import { tileAt } from '$engine/queries';
import { damages, flowFor, heading, tile, unit } from '../chemHarness';
import { type Combo, fourCombos } from '../footnoteHarness';
import { board, unitAtLabel } from '../harness';

const at = (l: string) => parseLabel(l);

/**
 * Brass on the plate C2 heading right makes a wall; then Spark on the plate B3 conducts through
 * a wall at C3 to the plate D3. Units: C4 touches the wall, D4 only the far plate, B4 only the near one.
 */
function plateLine(combo: Combo) {
  const { footnotes } = combo;
  const s = board('D . . . .\n. . # . .\n. # {wall} # .\n. d d d .');
  const make = runDraft(
    s,
    (ctx: Ctx) => {
      const heads = new Map([heading(tile('C2'), 'right')]);
      landKind(ctx, 'brass', tile('C2'), flowFor(s, { headings: heads }));
    },
    { footnotes },
  );
  const wall = (l: string) => {
    const st = tileAt(make.state, at(l)).state;
    return st ? { id: st.id, rounds: st.rounds, hits: st.hits } : null;
  };
  const spark = runDraft(s, (ctx: Ctx) => burstAt(ctx, at('B3'), 'tile', flowFor(s)), {
    footnotes,
  });
  const hurt = (l: string) =>
    damages(spark.events)
      .filter((d) => d.includes(`@${at(l).x},${at(l).y} `))
      .map((d) => Number(d.split(' ')[1]));
  return { c2: wall('C2'), d2: wall('D2'), b4: hurt('B4'), c4: hurt('C4'), d4: hurt('D4') };
}

test('brass:plate fourCombos: stand or twin, then hum or ground', () => {
  const runs = fourCombos(
    'brass:plate',
    ['brass-plate-stand', 'brass-plate-twin'],
    ['brass-plate-hum', 'brass-plate-ground'],
    plateLine,
  );
  const [standHum, standGround, twinHum, twinGround] = runs.map((r) => r.result);
  for (const r of [standHum, standGround]) {
    expect(r?.c2).toEqual({ id: 'wall', rounds: 0, hits: 2 });
    expect(r?.d2).toBeNull();
  }
  for (const r of [twinHum, twinGround]) {
    expect(r?.c2).toEqual({ id: 'wall', rounds: TUNING.compoundRounds, hits: 1 });
    expect(r?.d2).toEqual({ id: 'wall', rounds: TUNING.compoundRounds, hits: 1 });
  }
  // hum: the unit touching the wall takes 1 more; the others take the plain 2.
  for (const r of [standHum, twinHum]) {
    expect(r?.b4).toEqual([2]);
    expect(r?.c4).toEqual([2, 1]);
    expect(r?.d4).toEqual([2]);
  }
  // ground: the burst stops at the wall; the far plate's unit is spared.
  for (const r of [standGround, twinGround]) {
    expect(r?.b4).toEqual([2]);
    expect(r?.c4).toEqual([2]);
    expect(r?.d4).toEqual([]);
  }
});

/** Brass on the marked B2, a push at it, then a second run: Spark on the shackle heading right. */
function markLine(combo: Combo) {
  const { footnotes } = combo;
  const s = board('D . . . .\n. d! . . .\n. . . . .');
  let shackle = 0;
  let marked = false;
  const pushed = runDraft(
    s,
    (ctx: Ctx) => {
      landKind(ctx, 'brass', unit('dummy-1'), flowFor(s));
      const u = unitAtLabel(ctx.s, 'B2');
      shackle = u.shackle;
      marked = u.mark !== null;
      push(ctx, u, 'right', 1, null);
    },
    { footnotes },
  );
  const sparked = runDraft(
    s,
    (ctx: Ctx) => {
      const flow = flowFor(s, { headings: new Map([heading(unit('dummy-1'), 'right')]) });
      landKind(ctx, 'brass', unit('dummy-1'), flow);
      landKind(ctx, 'spark', unit('dummy-1'), flow);
    },
    { footnotes },
  );
  const after = sparked.state.units.find((u) => u.id === 'dummy-1');
  return {
    shackle,
    marked,
    pushedTo: pushed.state.units.find((u) => u.id === 'dummy-1')?.pos.x,
    missed: pushed.events.some((e) => e.type === 'miss' && e.line === 'brass:mark'),
    thrownTo: after?.pos.x,
    markLeft: after?.mark != null,
    snapped: after?.shackle === 0,
  };
}

test('brass:mark fourCombos: long or keep, then anchor or throw', () => {
  const runs = fourCombos(
    'brass:mark',
    ['brass-mark-long', 'brass-mark-keep'],
    ['brass-mark-anchor', 'brass-mark-throw'],
    markLine,
  );
  const [longAnchor, longThrow, keepAnchor, keepThrow] = runs.map((r) => r.result);
  for (const r of [longAnchor, longThrow]) {
    expect(r?.shackle).toBe(TUNING.compoundRounds + 1);
    expect(r?.marked).toBe(false);
  }
  for (const r of [keepAnchor, keepThrow]) {
    expect(r?.shackle).toBe(TUNING.compoundRounds - 1);
    expect(r?.marked).toBe(true);
  }
  // anchor: a shackled unit stays put under a push, and the refusal is the line's.
  for (const r of [longAnchor, keepAnchor]) {
    expect(r?.pushedTo).toBe(1);
    expect(r?.missed).toBe(true);
    expect(r?.thrownTo).toBe(2); // the snap frees it, so the plain throw of 1 still works
  }
  for (const r of [longThrow, keepThrow]) {
    expect(r?.pushedTo).toBe(2); // not anchored
    expect(r?.thrownTo).toBe(3); // thrown two tiles
    expect(r?.snapped).toBe(true);
  }
  // keep: the shackle snaps first and the mark stays.
  for (const r of [keepAnchor, keepThrow]) expect(r?.markLeft).toBe(true);
  for (const r of [longAnchor, longThrow]) expect(r?.markLeft).toBe(false);
});
