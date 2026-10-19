import { describe, expect, test } from 'vitest';
import { BURSTS, CHEMISTRY, type CompoundId, TUNING } from '$data';
import { namedIn } from '$engine';
import { roundEndChemistry } from '$engine/mix';
import { damages, heading, lands, run, stateAt, tile, unit, unitIn } from './chemHarness';
import { board, expectLogIncludes } from './harness';

/** Design §4.3, P18, P19: Spark and the five bursts, then the burst page. dummy: 12 hp, a minion. */

const hp = (s: Parameters<typeof unitIn>[0], lbl: string) => unitIn(s, lbl).hp;
const lost = (
  before: Parameters<typeof unitIn>[0],
  after: Parameters<typeof unitIn>[0],
  lbl: string,
) => hp(before, lbl) - hp(after, lbl);
/** A 5×3 board: row 1 holds the caster at A1, row 2 the scene, row 3 is empty. */
const scene = (row2: string, opts: Parameters<typeof board>[1] = {}) =>
  board(`D . . . .\n${row2}\n. . . . .`, opts);

describe('Spark (P14)', () => {
  test('spark-on-marked-is-4', () => {
    const s = scene('. . d! . .');
    const r = lands(s, [['spark', unit('dummy-1')]]);
    expect(damages(r.events).map((d) => d.split(' ').slice(1).join(' '))).toEqual([
      '1 Spark',
      '3 Detonation',
    ]);
    expect(lost(s, r.state, 'C2')).toBe(4);
    expect(unitIn(r.state, 'C2').mark).toBeNull();
    expect(r.events.find((e) => e.type === 'burst')).toMatchObject({
      burst: 'detonation',
      line: 'spark:mark',
    });
    expect(r.state.named).toEqual(['burst:detonation']);
  });

  test('spark-on-a-bare-unit-is-1', () => {
    const s = scene('. . d . .');
    const r = lands(s, [['spark', unit('dummy-1')]]);
    expect(lost(s, r.state, 'C2')).toBe(TUNING.sparkDamage);
    expect(r.events.some((e) => e.type === 'burst')).toBe(false);
  });

  test('spark-on-nothing-hits-nothing', () => {
    const r = lands(scene('. . . . .'), [['spark', tile('C2')]]);
    expect(r.lines).toEqual(['Spark hits nothing']);
    const blot = lands(scene('. . i . .'), [['spark', tile('C2')]]);
    expect(blot.lines).toEqual(['Spark hits nothing']);
  });

  test('the-unit-layer-bursts-before-the-tile-layer', () => {
    const s = scene('. . d!o . .');
    const r = lands(s, [['spark', unit('dummy-1')]]);
    const bursts = r.events.flatMap((e) => (e.type === 'burst' ? [e.burst] : []));
    expect(bursts).toEqual(['detonation', 'fire']);
    expect(lost(s, r.state, 'C2')).toBe(1 + 3 + 2);
  });

  test('a-unit-killed-by-the-spark-leaves-no-unit-layer-but-the-tile-still-bursts', () => {
    const s = scene('. . r!o . .', { hp: { C2: 1 } });
    const r = lands(s, [['spark', unit('rat-1')]]);
    expect(r.events.filter((e) => e.type === 'died')).toHaveLength(1);
    expect(r.events.flatMap((e) => (e.type === 'burst' ? [e.burst] : []))).toEqual(['fire']);
  });

  test('spark-then-oil-differs-from-oil-then-spark', () => {
    const s = scene('. . d . .');
    const sparkFirst = lands(s, [
      ['spark', unit('dummy-1')],
      ['oil', unit('dummy-1')],
    ]);
    const oilFirst = lands(s, [
      ['oil', unit('dummy-1')],
      ['spark', unit('dummy-1')],
    ]);
    expect(lost(s, sparkFirst.state, 'C2')).toBe(1);
    expect(stateAt(sparkFirst.state, 'C2')?.id).toBe('slick');
    expect(lost(s, oilFirst.state, 'C2')).toBe(3);
    expect(stateAt(oilFirst.state, 'C2')?.id).toBe('fire');
  });
});

describe('the five bursts (design §4.3)', () => {
  test('detonation-spends-the-mark-without-releasing', () => {
    const r = lands(scene('. . d! . .'), [['spark', unit('dummy-1')]]);
    expectLogIncludes(r.events, ['detonation bursts at C2, hitting dummy at C2']);
  });

  test('fire-runs-along-oil', () => {
    const long = board('D . . . .\n . o o o d\n . . . . .');
    const r = lands(long, [['spark', tile('B2')]]);
    for (const lbl of ['B2', 'C2', 'D2']) {
      expect(stateAt(r.state, lbl), lbl).toMatchObject({ id: 'fire', rounds: TUNING.fireRounds });
    }
    // The dummy stands on bare floor at E2, so the fire doesn't reach it: it ran along the oil only.
    expect(lost(long, r.state, 'E2')).toBe(0);
    const burn = board('D . . . .\n . o o o do\n . . . . .');
    const b = lands(burn, [['spark', tile('B2')]]);
    expect(lost(burn, b.state, 'E2')).toBe(2);
    expect(b.events.find((e) => e.type === 'burst')).toMatchObject({
      burst: 'fire',
      line: 'spark:slick',
      tiles: [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 3, y: 1 },
        { x: 4, y: 1 },
      ],
    });
  });

  test('fire-stops-at-a-gap-and-never-enters-steam', () => {
    const s = board('D . . . .\n . o ~ o d\n . . . . .');
    const r = lands(s, [['spark', tile('B2')]]);
    expect(stateAt(r.state, 'B2')?.id).toBe('fire');
    expect(stateAt(r.state, 'C2')?.id).toBe('cloud');
    expect(stateAt(r.state, 'D2')?.id).toBe('slick');
  });

  test('fire-burns-whoever-stays-in-it-at-round-end-then-fades', () => {
    const s = scene('. . d* . .');
    const r = run(s, (ctx) => roundEndChemistry(ctx));
    expect(lost(s, r.state, 'C2')).toBe(TUNING.fireDamage);
  });

  test('storm-connected-cloud', () => {
    const s = board('D . . . .\n . d~ ~ d~ d\n . . . . .');
    const r = lands(s, [['spark', tile('C2')]]);
    expect(lost(s, r.state, 'B2')).toBe(2);
    expect(lost(s, r.state, 'D2')).toBe(2);
    expect(lost(s, r.state, 'E2')).toBe(0); // beside the cloud, not in it
    expect(r.events.find((e) => e.type === 'burst')).toMatchObject({
      burst: 'storm',
      line: 'spark:cloud',
    });
    expect(stateAt(r.state, 'C2')?.id).toBe('cloud'); // the storm leaves the cloud
  });

  test('storm-joins-every-kind-of-cloud', () => {
    const s = board('D . . . .\n . d~ {bank} d{fog} d{brand} .\n . . . . .');
    const r = lands(s, [['spark', tile('C2')]]);
    expect([lost(s, r.state, 'B2'), lost(s, r.state, 'D2'), lost(s, r.state, 'E2')]).toEqual([
      2, 2, 2,
    ]);
  });

  test('conduct-reaches-collars', () => {
    const s = board('D . . . .\n # # b d .\n . . . d .');
    // A plate chain, a collared sentry on its end, a dummy touching the sentry, one far away.
    const r = lands(s, [['spark', tile('A2')]]);
    expect(lost(s, r.state, 'D2')).toBe(2);
    expect(hp(r.state, 'C2')).toBe(hp(s, 'C2') - 2); // the sentry is on the brass
    expect(lost(s, r.state, 'D3')).toBe(0);
    expect(r.events.find((e) => e.type === 'burst')).toMatchObject({
      burst: 'conduct',
      line: 'spark:plate',
    });
  });

  test('spark-on-a-collared-unit-conducts-through-its-brass', () => {
    const s = board('D . . . .\n . # b d .\n . . . . .');
    const r = lands(s, [['spark', unit('sentry-1')]]);
    expect(r.events.find((e) => e.type === 'burst')).toMatchObject({
      burst: 'conduct',
      line: 'spark:collar',
    });
    expect(lost(s, r.state, 'D2')).toBe(2);
    expect(hp(r.state, 'C2')).toBe(hp(s, 'C2') - 1 - 2); // Spark 1, then Conduct 2
  });

  test('coil-reaches-one-further', () => {
    const plain = board('D . . . .\n # . d . .\n . . . . .');
    const without = lands(plain, [['spark', tile('A2')]]);
    expect(lost(plain, without.state, 'C2')).toBe(0);
    const coiled = lands(plain, [['spark', tile('A2')]], { auras: ['coil'] });
    expect(lost(plain, coiled.state, 'C2')).toBe(2);
    // A storm hits the units in the cloud; with Coil, the ones beside it too.
    const cloud = board('D . . . .\n ~ d . . .\n . . . . .');
    expect(lost(cloud, lands(cloud, [['spark', tile('A2')]]).state, 'B2')).toBe(0);
    expect(
      lost(cloud, lands(cloud, [['spark', tile('A2')]], { auras: ['coil'] }).state, 'B2'),
    ).toBe(2);
  });

  test('surge-3-and-an-arc-of-1', () => {
    const s = board('D . . . .\n . d* . . d\n . . . . .');
    const r = lands(s, [['spark', unit('dummy-1')]]);
    // Spark 1 + Surge 3 on the one in the fire; the arc hits the nearest other unit (the caster).
    expect(damages(r.events).map((d) => d.split(' ').slice(1).join(' '))).toEqual([
      '1 Spark',
      '3 Surge',
      '1 Arc',
    ]);
    expect(r.events.find((e) => e.type === 'burst')).toMatchObject({
      burst: 'surge',
      line: 'spark:fire',
    });
    expect(lost(s, r.state, 'B2')).toBe(4);
  });
});

describe('the burst page (P18)', () => {
  test('deep-mark-two-sparks', () => {
    const s = scene('. . d!! . .');
    const one = lands(s, [['spark', unit('dummy-1')]]);
    expect(lost(s, one.state, 'C2')).toBe(4);
    expect(unitIn(one.state, 'C2').mark).toMatchObject({ deep: false }); // a plain mark is left
    expect(one.events.find((e) => e.type === 'burst')).toMatchObject({
      burst: 'page:deepMark',
      line: 'spark:deepMark',
    });
    const two = lands(one.state, [['spark', unit('dummy-1')]]);
    expect(unitIn(two.state, 'C2').mark).toBeNull();
    expect(lost(s, two.state, 'C2')).toBe(8);
  });

  test('inkfire', () => {
    const s = board('D . . . .\n . d{stain} o d . \n . . . . .');
    const r = lands(s, [['spark', tile('B2')]]);
    // The stain and the oil beside it burn; whoever it hits is marked.
    expect(stateAt(r.state, 'B2')?.id).toBe('fire');
    expect(stateAt(r.state, 'C2')?.id).toBe('fire');
    expect(unitIn(r.state, 'B2').mark).not.toBeNull();
    expect(unitIn(r.state, 'D2').mark).toBeNull(); // not on the oil
    expect(lost(s, r.state, 'B2')).toBe(1 + 2); // Spark 1 (it stands there), Inkfire 2
    expect(r.events.find((e) => e.type === 'burst')).toMatchObject({
      burst: 'page:stain',
      line: 'spark:stain',
    });
  });

  test('brand-cloud-storm-double', () => {
    const s = board('D . . . .\n . d!{brand} {brand} d{brand} . \n . . . . .');
    const r = lands(s, [['spark', tile('C2')]]);
    expect(lost(s, r.state, 'B2')).toBe(4); // marked: hit twice
    expect(lost(s, r.state, 'D2')).toBe(2);
    expect(damages(r.events)).toHaveLength(3);
    expect(unitIn(r.state, 'B2').mark).not.toBeNull(); // a storm doesn't spend it
    expect(r.events.find((e) => e.type === 'burst')).toMatchObject({
      burst: 'page:brandCloud',
      line: 'spark:brandCloud',
    });
  });

  test('shackle-snaps', () => {
    const s = scene('. . d$ . .');
    const r = lands(s, [['spark', unit('dummy-1')]], {
      headings: new Map([heading(unit('dummy-1'), 'right')]),
    });
    expect(unitIn(r.state, 'D2').shackle).toBe(0);
    expect(hp(r.state, 'D2')).toBe(hp(s, 'C2') - 1 - 3); // Spark 1, snap 3
    expect(r.events.find((e) => e.type === 'push')).toMatchObject({ dir: 'right' });
    expect(r.events.find((e) => e.type === 'burst')).toMatchObject({
      burst: 'page:shackle',
      line: 'spark:shackle',
    });
  });

  test('pool-goes-up-at-once', () => {
    const s = board('D . d . .\n . d d d .\n . . d . .');
    const r = lands(s, [
      ['oil', tile('C2')],
      ['oil', tile('C2')],
      ['spark', tile('C2')],
    ]);
    // The pool and its four neighbours go up together; everyone on them takes 3.
    for (const lbl of ['C1', 'B2', 'C2', 'D2', 'C3']) {
      expect(stateAt(r.state, lbl)?.id, lbl).toBe('fire');
    }
    for (const lbl of ['C1', 'B2', 'D2', 'C3']) expect(lost(s, r.state, lbl), lbl).toBe(3);
    expect(lost(s, r.state, 'C2')).toBe(1 + 3);
    expect(r.events.find((e) => e.type === 'burst')).toMatchObject({
      burst: 'page:pool',
      line: 'spark:pool',
    });
  });

  test('flashover', () => {
    const s = board('D . . . .\n . d{fog} {fog} {fog} . \n . . . . .');
    const r = lands(s, [['spark', tile('C2')]]);
    expect(lost(s, r.state, 'B2')).toBe(2);
    for (const lbl of ['B2', 'C2', 'D2']) {
      expect(stateAt(r.state, lbl), lbl).toMatchObject({
        id: 'fire',
        rounds: CHEMISTRY.flashoverFireRounds,
      });
    }
    expect(r.events.find((e) => e.type === 'burst')).toMatchObject({
      burst: 'page:greaseFog',
      line: 'spark:greaseFog',
    });
  });

  test('skid-plate-shoots', () => {
    const s = board('D . . . .\n {skid} . . d .\n . . . . .');
    const r = lands(s, [['spark', tile('A2')]], {
      headings: new Map([heading(tile('A2'), 'right')]),
    });
    expect(stateAt(r.state, 'A2')).toBeNull(); // the plate is spent
    expect(unitIn(r.state, 'E2').hp).toBe(hp(s, 'D2') - 3); // shot into D2, then pushed on to E2
    expect(damages(r.events)).toHaveLength(1);
    expect(r.events.find((e) => e.type === 'push')).toMatchObject({ dir: 'right' });
    expect(r.events.find((e) => e.type === 'burst')).toMatchObject({
      burst: 'page:skidPlate',
      line: 'spark:skidPlate',
      tiles: [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 3, y: 1 },
      ],
    });
  });

  test('skid-plate-stops-at-a-plate-and-breaks-with-no-heading', () => {
    const blocked = board('D . . . .\n {skid} . # d .\n . . . . .');
    const r = lands(blocked, [['spark', tile('A2')]], {
      headings: new Map([heading(tile('A2'), 'right')]),
    });
    expect(damages(r.events)).toEqual([]);
    const none = lands(board('D . . . .\n {skid} . . d .\n . . . . .'), [['spark', tile('A2')]]);
    expect(stateAt(none.state, 'A2')).toBeNull();
    expect(none.events.find((e) => e.type === 'burst')).toMatchObject({ line: 'spark:noHeading' });
  });

  test('kettle-blows', () => {
    const s = board('D . . . .\n . d {kettle} d . \n . . d . .');
    const r = lands(s, [['spark', tile('C2')]]);
    expect(lost(s, r.state, 'B2')).toBe(2);
    expect(lost(s, r.state, 'D2')).toBe(2);
    expect(lost(s, r.state, 'C3')).toBe(2);
    expect(stateAt(r.state, 'C2')?.id).toBe('cloud'); // it leaves steam
    expect(r.events.find((e) => e.type === 'burst')).toMatchObject({
      burst: 'page:kettle',
      line: 'spark:kettle',
    });
  });

  test('wall-rings', () => {
    const s = board('D . . . .\n . d {wall} d . \n . . . . .');
    const r = lands(s, [['spark', tile('C2')]]);
    expect(stateAt(r.state, 'C2')?.id).toBe('wall'); // it rings and stands
    // Each unit touching it takes 1 and is pushed one tile away.
    expect(unitIn(r.state, 'A2').hp).toBe(11);
    expect(unitIn(r.state, 'E2').hp).toBe(11);
    const pushes = r.events.flatMap((e) => (e.type === 'push' ? [e.dir] : []));
    expect(pushes).toEqual(['left', 'right']);
    expect(r.events.find((e) => e.type === 'burst')).toMatchObject({
      burst: 'page:wall',
      line: 'spark:wall',
    });
  });

  test('thunderhead', () => {
    const s = board('D . . . .\n . d{bank} {bank} . .\n . . . . .');
    const r = lands(s, [['spark', tile('C2')]]);
    expect(lost(s, r.state, 'B2')).toBe(2);
    expect(r.state.scheduled).toEqual([
      expect.objectContaining({ kind: 'thunderhead', when: 'roundEnd' }),
    ]);
    const later = run(r.state, (ctx) => roundEndChemistry(ctx));
    expect(hp(later.state, 'B2')).toBe(hp(r.state, 'B2') - 2); // again at round end
    expect(later.state.scheduled).toEqual([]);
    expect(later.events.find((e) => e.type === 'burst')).toMatchObject({
      burst: 'page:bank',
      line: 'spark:bank',
    });
  });

  test('thunderhead-fizzles-if-the-bank-is-gone', () => {
    const s = board('D . . . .\n . d{bank} {bank} . .\n . . . . .');
    const r = lands(s, [['spark', tile('C2')]]);
    const gone = run(r.state, (ctx) => {
      for (const t of ctx.s.tiles) t.state = null;
      roundEndChemistry(ctx);
    });
    expect(hp(gone.state, 'B2')).toBe(hp(r.state, 'B2'));
    expect(gone.state.scheduled).toEqual([]);
  });
});

describe('named results (D7)', () => {
  test('every burst is named once, the first time it happens', () => {
    const s = board('D . . . .\n . d~ ~ . .\n . . . . .');
    const first = lands(s, [['spark', tile('B2')]]);
    expect(namedIn(first.events)).toEqual(['burst:storm']);
    const again = lands(first.state, [['spark', tile('B2')]]);
    expect(namedIn(again.events)).toEqual([]);
  });

  test('the table has the 5 bursts and the 10 page rows, one per compound', () => {
    expect(BURSTS).toHaveLength(15);
    const page = BURSTS.filter((b) => b.burst.startsWith('page:')).map((b) => b.on);
    const compounds: CompoundId[] = [
      'deepMark',
      'stain',
      'brandCloud',
      'shackle',
      'pool',
      'greaseFog',
      'skidPlate',
      'bank',
      'kettle',
      'wall',
    ];
    expect([...page].sort()).toEqual([...compounds].sort());
    expect(new Set(BURSTS.map((b) => b.burst)).size).toBe(15);
  });
});
