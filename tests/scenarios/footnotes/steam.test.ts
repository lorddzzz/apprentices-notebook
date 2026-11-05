import { expect, test } from 'vitest';
import { TUNING } from '$data';
import { parseLabel } from '$engine';
import { burstAt } from '$engine/bursts';
import { type Ctx, runDraft } from '$engine/ctx';
import { landKind, roundEndChemistry } from '$engine/mix';
import { push } from '$engine/push';
import { tileAt } from '$engine/queries';
import { damages, flowFor, tile } from '../chemHarness';
import { type Combo, fourCombos } from '../footnoteHarness';
import { board, unitAtLabel } from '../harness';

const at = (l: string) => parseLabel(l);

/**
 * Steam on the plate C3 makes a kettle; B2 is diagonal to it, D3 beside it, C5 is pushed up
 * into it. Round end scalds, then the push crushes.
 */
function kettleLine(combo: Combo) {
  const s = board('D . . . .\n. d . . .\n. . # d .\n. . . . .\n. . d . .');
  let rounds = 0;
  let scalds: string[] = [];
  const r = runDraft(
    s,
    (ctx: Ctx) => {
      landKind(ctx, 'steam', tile('C3'), flowFor(s));
      rounds = tileAt(ctx.s, at('C3')).state?.rounds ?? 0;
      const before = damages(ctx.log).length;
      roundEndChemistry(ctx);
      scalds = damages(ctx.log).slice(before);
      push(ctx, unitAtLabel(ctx.s, 'C5'), 'up', 2, null);
    },
    { footnotes: combo.footnotes },
  );
  const cloud = tileAt(r.state, at('C2')).state?.id ?? null;
  const crush = damages(r.events).filter((d) => d.endsWith('Kettle'));
  return { rounds, scalds, cloud, crush, events: r.events };
}

test('steam:kettle fourCombos: corners or long, then press or breath', () => {
  const runs = fourCombos(
    'steam:kettle',
    ['steam-kettle-corners', 'steam-kettle-long'],
    ['steam-kettle-press', 'steam-kettle-breath'],
    kettleLine,
  );
  const [cornPress, cornBreath, longPress, longBreath] = runs.map((r) => r.result);
  const at2 = (r: typeof cornPress, x: number, y: number) =>
    r?.scalds.filter((d) => d.includes(`@${x},${y} `)) ?? [];
  for (const r of [cornPress, cornBreath]) {
    expect(at2(r, 1, 1)).toHaveLength(1); // the diagonal unit
    expect(r?.rounds).toBe(TUNING.compoundRounds);
  }
  for (const r of [longPress, longBreath]) {
    expect(at2(r, 1, 1)).toHaveLength(0);
    expect(r?.rounds).toBe(TUNING.compoundRounds + 1);
  }
  for (const r of [cornPress, cornBreath, longPress, longBreath]) {
    expect(at2(r, 3, 2)).toHaveLength(1); // the unit beside it, always
  }
  // breath: a cloud on the first empty tile beside it (C2); press: the crush is scalded for 1 more.
  for (const r of [cornBreath, longBreath]) expect(r?.cloud).toBe('cloud');
  for (const r of [cornPress, longPress]) expect(r?.cloud).toBeNull();
  for (const r of [cornPress, longPress]) {
    // the two round-end scalds plus the crush's own (the corners run has a third at round end)
    const crushes = r?.events.filter(
      (e) => e.type === 'damage' && e.source === 'Kettle' && e.line === 'steam:kettle',
    );
    expect(crushes?.length).toBeGreaterThan(0);
    expect(r?.crush.length).toBe(r === cornPress ? 3 : 2);
  }
  for (const r of [cornBreath, longBreath]) expect(r?.crush.length).toBe(r === cornBreath ? 2 : 1);
});

/**
 * Steam on the cloud C2 (B2-D2) makes a bank; Spark on it storms the unit on C2, and the cloud
 * is then cleared away before round end. A fog at B4 beside a bank holding a unit at C4 tests
 * the damp.
 */
function cloudLine(combo: Combo) {
  const { footnotes } = combo;
  const s = board('D . . . .\n. ~ d~ ~ .\n. . . . .\n. {fog} d{bank} . .');
  let bank = { c2: '', b2: '', rounds: 0 };
  let thunder = 0;
  runDraft(
    s,
    (ctx: Ctx) => {
      landKind(ctx, 'steam', tile('C2'), flowFor(s));
      const id = (l: string) => tileAt(ctx.s, at(l)).state?.id ?? '';
      bank = { c2: id('C2'), b2: id('B2'), rounds: tileAt(ctx.s, at('C2')).state?.rounds ?? 0 };
      burstAt(ctx, at('C2'), 'tile', flowFor(s));
      for (const l of ['B2', 'C2', 'D2']) tileAt(ctx.s, at(l)).state = null;
      roundEndChemistry(ctx);
      thunder = damages(ctx.log).filter((d) => d.endsWith('Thunderhead')).length;
    },
    { footnotes },
  );
  const fogRun = runDraft(s, (ctx: Ctx) => burstAt(ctx, at('B4'), 'tile', flowFor(s)), {
    footnotes,
  });
  const flashed = damages(fogRun.events).filter((d) => d.endsWith('Flashover'));
  return { bank, thunder, flashed, after: tileAt(fogRun.state, at('C4')).state?.id ?? null };
}

test('steam:cloud fourCombos: wide or long, then thunder or damp', () => {
  const runs = fourCombos(
    'steam:cloud',
    ['steam-cloud-wide', 'steam-cloud-long'],
    ['steam-cloud-thunder', 'steam-cloud-damp'],
    cloudLine,
  );
  const [wideThunder, wideDamp, longThunder, longDamp] = runs.map((r) => r.result);
  const bankRounds = TUNING.compoundRounds + 2;
  for (const r of [wideThunder, wideDamp]) {
    expect(r?.bank).toEqual({ c2: 'bank', b2: 'bank', rounds: bankRounds });
  }
  for (const r of [longThunder, longDamp]) {
    expect(r?.bank).toEqual({ c2: 'bank', b2: 'cloud', rounds: bankRounds + 1 });
  }
  // thunder: the round-end storm strikes where the bank was though the cloud is gone.
  for (const r of [wideThunder, longThunder]) expect(r?.thunder).toBe(2);
  for (const r of [wideDamp, longDamp]) expect(r?.thunder).toBe(1);
  // damp: the flashover stops at the bank, so the unit in it is spared; either way the bank stays.
  for (const r of [wideDamp, longDamp]) expect(r?.flashed).toHaveLength(0);
  for (const r of [wideThunder, longThunder]) expect(r?.flashed).toHaveLength(1);
  for (const r of [wideThunder, wideDamp, longThunder, longDamp]) expect(r?.after).toBe('bank');
});
