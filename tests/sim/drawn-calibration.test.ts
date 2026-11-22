import { expect, test, vi } from 'vitest';
import { type Drawing, PLAYABLE_DISTRICTS } from '$data';
import {
  COSTS,
  DRAWN_HEART_HP_BONUS,
  DRAWN_LOOT,
  DRAWN_MARGINALIA_HP,
  GEN_LIMITS,
  GEN_TUNING,
  PEN_TUNING,
} from '$data/drawing';
import { newSave, type Profile, parseSaveData, serializeBoard, startTrip } from '$engine';
import { boilOverState } from '$engine/districts/bathhouses/boilOver';
import type { Json } from '$engine/districts/types';
import {
  checkDrawing,
  costOf,
  endingOf,
  HEART_FRAMES,
  inkRoom,
  missingKit,
  parseInkedState,
  penOf,
  storeRoom,
  weightBand,
} from '$engine/drawing';
import { drawnOffers } from '$engine/drawing/loot';
import { startBattle } from '../../src/app/flow';
import {
  CAL_DRAWINGS,
  CAL_PALETTE,
  CAL_PARTIES,
  CAMPAIGN_PROFILES,
  calibrationProfile,
  campaignProfile,
} from '../fixtures/calibration/drawings';
import { measureDrawn } from './calibration/drawn';
import { countEnv, options } from './calibration/runner';

// Candidate measurements feed exact data overrides through the same engine entry points.
vi.mock('$data/drawing', async (original) => {
  const data = await original<typeof import('$data/drawing')>();
  switch (process.env.CAL5_CANDIDATE) {
    case 'step2':
      return { ...data, GEN_TUNING: { ...data.GEN_TUNING, step: 2 } };
    case 'pen5':
      return { ...data, PEN_TUNING: { ...data.PEN_TUNING, pagesPerPoint: 5 } };
    case 'piece2':
      return { ...data, COSTS: { ...data.COSTS, piece: 2 } };
    case 'loot4':
      return {
        ...data,
        DRAWN_LOOT: {
          ...data.DRAWN_LOOT,
          weights: {
            ...data.DRAWN_LOOT.weights,
            heavy: { ...data.DRAWN_LOOT.weights.heavy, page: 4 },
          },
        },
      };
    case 'marginalia32':
      return { ...data, DRAWN_MARGINALIA_HP: 32 };
    default:
      return data;
  }
});

const trialHeats = vi.hoisted(() => [] as number[]);
vi.mock('$engine/drawing/trial', async (original) => {
  const real = await original<typeof import('$engine/drawing/trial')>();
  return {
    ...real,
    botTrial: (...args: Parameters<typeof real.botTrial>) => {
      const heat = boilOverState(args[0])?.heat;
      if (heat !== undefined) trialHeats.push(heat);
      return real.botTrial(...args);
    },
  };
});

const bandInName = (d: Drawing) => d.name.split(' ')[0]?.toLowerCase();

test('CAL-5: frozen drawings cover every rule, shape and master in the full palette', () => {
  const profile = calibrationProfile(CAL_PARTIES.pair);
  const distinct = (values: readonly (string | null)[]) => [...new Set(values)].sort();
  expect(distinct(CAL_DRAWINGS.map((d) => d.rule))).toEqual(distinct([null, ...CAL_PALETTE.rules]));
  expect(distinct(CAL_DRAWINGS.map((d) => d.shape))).toEqual(
    distinct(['plain', ...CAL_PALETTE.shapes]),
  );
  expect(distinct(CAL_DRAWINGS.map((d) => d.heart))).toEqual([...CAL_PALETTE.masters].sort());
  expect([...new Set(CAL_DRAWINGS.map((d) => d.length))].sort()).toEqual([3, 4, 5, 6]);
  for (const d of CAL_DRAWINGS) {
    expect.soft(checkDrawing(profile, d), d.name).toEqual([]);
    expect(missingKit(d), d.name).toBeNull();
    expect.soft(weightBand(d), `${d.name} (cost ${costOf(d)})`).toBe(bandInName(d));
  }
});

test('CAL-5: pen availability is reported for labelled profile sources', () => {
  function row(id: string, source: string, profile: Profile) {
    const pen = penOf(profile);
    const legalDrawings = CAL_DRAWINGS.filter((d) =>
      checkDrawing(profile, d).every((issue) => issue.element === 'pen'),
    );
    const affordable = legalDrawings.filter((d) => costOf(d) <= pen.total);
    return {
      id,
      source,
      handover: endingOf(profile).handover,
      pages: profile.known.length,
      pen,
      affordable: ['light', 'medium', 'heavy'].map(
        (band) => affordable.filter((d) => weightBand(d) === band).length,
      ),
      compatible: legalDrawings.length,
      maxAffordable: Math.max(0, ...affordable.map(costOf)),
      affordableByFrozenBand: ['light', 'medium', 'heavy'].map(
        (band) => affordable.filter((d) => bandInName(d) === band).length,
      ),
    };
  }
  const fixtures = import.meta.glob<{ data: unknown }>('../fixtures/saves/*-returned.json', {
    eager: true,
    import: 'default',
  });
  const rows = [
    ...CAMPAIGN_PROFILES.map((snapshot) =>
      row(snapshot.id, snapshot.source, campaignProfile(snapshot)),
    ),
    ...Object.entries(fixtures).map(([name, envelope]) =>
      row(
        name.split('/').at(-1) ?? name,
        'recorded bot save fixture',
        parseSaveData(envelope.data).profile,
      ),
    ),
  ];
  expect(Object.keys(fixtures)).toHaveLength(PLAYABLE_DISTRICTS.length);
  expect(rows.find((r) => r.id === 'full-palette')?.compatible).toBe(CAL_DRAWINGS.length);
  console.log('CAL5 PEN_TUNING', JSON.stringify({ pen: PEN_TUNING, costs: COSTS }));
  console.log('CAL5 PEN', JSON.stringify(rows));
  console.log(
    'CAL5 COST',
    JSON.stringify(
      CAL_DRAWINGS.map((d) => ({ name: d.name, cost: costOf(d), band: weightBand(d) })),
    ),
  );
});

type Sample = ReturnType<typeof measureDrawn>['samples'][number];

const counts = <T extends string | number>(xs: readonly T[]) => {
  const bins: Partial<Record<T, number>> = {};
  for (const x of xs) bins[x] = (bins[x] ?? 0) + 1;
  return bins;
};

function spread(xs: readonly (number | undefined)[]) {
  const values = xs.filter((x): x is number => x !== undefined).sort((a, b) => a - b);
  return [0.05, 0.5, 0.95].map((p) => values[Math.floor(p * values.length)] ?? null);
}

function fightRow(group: Sample[], attempted: number) {
  const fights = group.flatMap((s) => s.fight ?? []);
  const victories = fights.filter((s) => s.outcome === 'won');
  const wins = victories.length;
  const losses = fights.filter((s) => s.outcome === 'lost').length;
  return {
    attempted,
    reached: group.length,
    errors: group.filter((s) => s.error).length,
    wins,
    losses,
    stalls: fights.length - wins - losses,
    budgetStops: fights.filter((s) => s.exhausted).length,
    rounds: spread(fights.map((s) => s.rounds)),
    winRounds: spread(victories.map((s) => s.rounds)),
    hpIn: spread(fights.map((s) => s.entryHp)),
    chargesIn: spread(fights.map((s) => s.entryCharges)),
    hpLeft: spread(fights.map((s) => s.hp)),
    chargesLeft: spread(fights.map((s) => s.charges)),
    actions: spread(fights.map((s) => s.actions)),
    choices: counts(group.flatMap((s) => s.choice ?? [])),
  };
}

function generationRow(group: Sample[]) {
  const runs = group.flatMap((s) => s.generation ?? []);
  const accepted = runs.filter((s) => s.verified);
  const normal = runs.filter((s) => !s.fallback);
  const fair = normal.filter((s) => !s.dull);
  return {
    offered: runs.length,
    attemptsSpent: counts(runs.map((s) => s.attempts)),
    offeredAttempt: counts(normal.flatMap((s) => s.offerAttempt ?? [])),
    verifiedAttempt: counts(accepted.flatMap((s) => s.offerAttempt ?? [])),
    firstFair: counts(fair.flatMap((s) => s.offerAttempt ?? [])),
    verifiedWithinTwo: normal.filter((s) => s.attempts <= 2 && s.verified).length,
    fallback: runs.length - normal.length,
    unverified: runs.length - accepted.length,
    dull: runs.filter((s) => s.dull).length,
    walkovers: runs.filter((s) => s.walkover).length,
    heldAttempts: runs.reduce((total, s) => total + s.heldAttempts, 0),
    guardrails: counts(runs.flatMap((s) => s.guardrails)),
    offeredIssues: counts(runs.flatMap((s) => s.offeredIssues)),
    invalid: runs.filter((s) => s.offeredIssues.length > 0).length,
    capped: runs.filter((s) => s.capped).length,
    budgets: counts(runs.flatMap((s) => s.budget ?? [])),
    winRounds: spread(runs.map((s) => s.rounds)),
    winHpShare: spread(runs.map((s) => s.hpShare)),
    ops: spread(runs.map((s) => s.ops)),
    maxOps: Math.max(0, ...runs.map((s) => s.ops)),
    ms: spread(runs.filter((s) => s.ms > 0).map((s) => Math.round(s.ms))),
    verifiedMs: spread(accepted.filter((s) => s.ms > 0).map((s) => Math.round(s.ms))),
    timed: runs.filter((s) => s.ms > 0).length,
  };
}

function walkoverRows(ordinary: Sample[]) {
  const rows = new Map<
    string,
    {
      mode: Sample['mode'];
      band: ReturnType<typeof weightBand>;
      depth: number;
      party: number;
      path: 'fallback' | 'dull';
      cause: 'both' | 'rounds' | 'full HP';
      count: number;
    }
  >();
  for (const { mode, drawing, depth, party, generation } of ordinary) {
    if (!generation?.walkover) continue;
    const band = weightBand(drawing);
    const path = generation.fallback ? 'fallback' : 'dull';
    const short =
      generation.rounds !== undefined && generation.rounds <= GEN_TUNING.walkover.rounds;
    const fullHp =
      generation.hpShare !== undefined && generation.hpShare >= GEN_TUNING.walkover.hpLeft;
    const cause = short ? (fullHp ? 'both' : 'rounds') : 'full HP';
    const key = [mode, band, depth, party.length, path, cause].join('/');
    const row = rows.get(key);
    if (row) row.count++;
    else rows.set(key, { mode, band, depth, party: party.length, path, cause, count: 1 });
  }
  return [...rows.values()];
}

test('CAL-5: drawn heart bands and production corpus tables', { timeout: 3_600_000 }, () => {
  const full = process.env.CAL5 === '1';
  const onlyOrdinary = process.env.CAL5_ORDINARY === '1';
  const selected = process.env.CAL5_DRAWING;
  const master = process.env.CAL5_MASTER;
  const band = process.env.CAL5_BAND;
  const onlyHearts = process.env.CAL5_HEARTS === '1' || master !== undefined;
  const pool = selected
    ? CAL_DRAWINGS.filter((d) => d.name === selected)
    : master
      ? CAL_DRAWINGS.filter((d) => d.heart === master)
      : full
        ? CAL_DRAWINGS
        : CAL_DRAWINGS.filter((d) => d.name === 'Light Marginalia');
  const drawings = band === undefined ? pool : pool.filter((d) => bandInName(d) === band);
  expect(drawings.length).toBeGreaterThan(0);
  const opts = {
    ...options(full, 'CAL5_SEEDS'),
    seeds: countEnv('CAL5_SEEDS', full ? 2 : 1),
    hearts: countEnv('CAL5_HEART_SEEDS', full ? 4 : 1),
    carried: onlyOrdinary || onlyHearts ? 0 : countEnv('CAL5_TRIP_SEEDS', full ? 2 : 1),
    onlyOrdinary,
    onlyHearts,
    parties: full && process.env.CAL5_PAIR !== '1' ? [1, 2, 3] : [2],
  };
  const { samples, ends, loadouts } = measureDrawn(drawings, opts, trialHeats);
  const parties = opts.parties;
  const depths = [1, 2, 3, 4, 5, 'heart'] as const;
  const bands = ['light', 'medium', 'heavy'];
  const output = (label: string, value: unknown) =>
    console.log(`CAL5 ${label} ${JSON.stringify(value)}`);
  output('CONFIG', {
    opts,
    limits: GEN_LIMITS,
    tuning: GEN_TUNING,
    marginaliaHp: DRAWN_MARGINALIA_HP,
    heartHpBonus: DRAWN_HEART_HP_BONUS,
    loadouts,
    drawings: drawings.map((d) => ({ ...d, cost: costOf(d) })),
  });
  const ordinary = samples.filter((s) => s.depth < s.drawing.length);
  const hearts = samples.filter((s) => s.depth === s.drawing.length);
  console.table(walkoverRows(ordinary));
  for (const mode of ['fresh', 'carried'] as const) {
    for (const [room, group] of [
      ['ordinary', ordinary],
      ['heart', hearts],
    ] as const) {
      const inMode = group.filter((s) => s.mode === mode);
      if (inMode.length) {
        output('GEN', { mode, room, ...generationRow(inMode) });
        for (const band of bands) {
          const inBand = inMode.filter((s) => weightBand(s.drawing) === band);
          if (inBand.length) output('GEN', { mode, room, band, ...generationRow(inBand) });
        }
      }
    }
    for (const party of parties) {
      for (const band of bands) {
        const inBand = drawings.filter((d) => weightBand(d) === band);
        for (const depth of depths) {
          if (opts.onlyOrdinary && depth === 'heart') continue;
          if (opts.onlyHearts && depth !== 'heart') continue;
          const eligible = inBand.filter((d) => depth === 'heart' || d.length > depth);
          const attempted =
            eligible.length *
            (mode === 'carried' ? opts.carried : depth === 'heart' ? opts.hearts : opts.seeds);
          if (attempted === 0) continue;
          const group = (depth === 'heart' ? hearts : ordinary).filter(
            (s) =>
              s.mode === mode &&
              s.party.length === party &&
              weightBand(s.drawing) === band &&
              (depth === 'heart' || s.depth === depth),
          );
          if (mode === 'fresh') expect(group).toHaveLength(attempted);
          output('FIGHT', { mode, party, band, depth, ...fightRow(group, attempted) });
        }
      }
      for (const master of CAL_PALETTE.masters) {
        const attempted =
          drawings.filter((d) => d.heart === master).length *
          (mode === 'carried' ? opts.carried : opts.hearts);
        if (opts.onlyOrdinary || attempted === 0) continue;
        const group = hearts.filter(
          (s) => s.drawing.heart === master && s.party.length === party && s.mode === mode,
        );
        output('MASTER', {
          mode,
          party,
          master,
          ...fightRow(group, attempted),
          generation: generationRow(group),
        });
      }
    }
  }
  for (const s of samples) {
    const { drawing, depth, generation, fight, mode, seed, party, error } = s;
    if (error) output('ERROR', { name: drawing.name, depth, mode, party, seed, error });
    if (
      (drawing.heart === 'bathSteward' && depth === drawing.length) ||
      drawing.rule === 'foundry:bells' ||
      drawing.shape === 'foundry:peal'
    )
      output('SETUP', {
        name: drawing.name,
        depth,
        mode,
        party: party.length,
        seed,
        bells: generation?.bells,
        stampMin: generation?.stampMin,
        fallback: generation?.fallback,
        stampedNotes: generation?.greatNotes,
        setupNotes: fight?.greatNotes,
        peal: fight?.peal,
        allied: fight?.alliedBells,
        trialHeats: generation?.trialHeats,
        heat: fight?.heat,
        pressure: fight?.pressure,
        boils: fight?.boils,
        firstBoil: fight?.firstBoil,
      });
    if (process.env.CAL5_DETAIL === '1') output('ROOM', s);
  }
  for (const party of parties) {
    output('TRIPS', {
      party,
      ends: counts(ends.filter((e) => e.party === party).map((e) => e.end)),
    });
  }
});

test('CAL-5: seeded drawn loot offers by band and depth', () => {
  const snap = CAMPAIGN_PROFILES.find((p) => p.id === 'handover-high');
  if (!snap) throw new Error('Missing handover-high');
  const base = campaignProfile(snap);
  for (const band of ['light', 'medium', 'heavy']) {
    const drawings = CAL_DRAWINGS.filter((d) => bandInName(d) === band);
    const rows: Record<string, { picks: number[]; offers: string[] }> = {};
    for (const d of drawings) {
      const p: Profile = { ...base, drawings: [d, null, null] };
      // Hold the frozen set even when a counterfactual increases a drawing's cost.
      if (costOf(d) > penOf(p).total) continue;
      for (let seed = 1; seed <= 64; seed++) {
        const trip = startTrip(p, seed, 'inkedPage', { page: 0 });
        for (const [key, depth] of [
          ['opening', 0],
          ['heart', d.length - 1],
        ] as const) {
          rows[key] ??= { picks: [], offers: [] };
          const row = rows[key];
          const offers = drawnOffers(p, trip, depth);
          row.picks.push(offers.picks);
          row.offers.push(...(offers.guaranteed ?? []).map((item) => item.kind));
        }
      }
    }
    console.log(
      'CAL5 LOOT',
      JSON.stringify({
        band,
        weights: DRAWN_LOOT.weights,
        seeds: '1–64 per affordable drawing',
        rooms: Object.fromEntries(
          Object.entries(rows).map(([key, row]) => [
            key,
            { picks: counts(row.picks), cards: counts(row.offers) },
          ]),
        ),
      }),
    );
  }
});

test('CAL-5: a stored drawn room survives save reload without regenerating', () => {
  const profile: Profile = {
    ...calibrationProfile(CAL_PARTIES.pair),
    drawings: [CAL_DRAWINGS[0] ?? null, null, null],
  };
  const seed = 1;
  const trip = inkRoom(profile, startTrip(profile, seed, 'inkedPage', { page: 0 }));
  const save = { ...newSave(seed), profile, trip };
  const reloaded = parseSaveData(JSON.parse(JSON.stringify(save)));
  expect(reloaded.trip).not.toBeNull();
  if (!reloaded.trip) return;
  expect(inkRoom(reloaded.profile, reloaded.trip)).toBe(reloaded.trip);
  expect(startBattle(reloaded)).toEqual(startBattle(save));
});

test('CAL-5: length-six peal load and heart-hook capacity', () => {
  const drawing = CAL_DRAWINGS.find((d) => d.name === 'Heavy Carillonneur');
  const frame = HEART_FRAMES.carillonneur;
  if (!drawing || !frame) throw new Error('Missing the length-six Carillonneur fixture');
  const profile: Profile = {
    ...calibrationProfile(CAL_PARTIES.pair),
    drawings: [drawing, null, null],
  };
  const room = drawing.length - 1;
  const trip = startTrip(profile, 1, 'inkedPage', { page: 0 });
  if (!trip.kit) throw new Error('Missing the peal state');
  const original = parseInkedState(trip.kit.state);
  // Setup probe only. These synthetic entries never count toward combat wins or trip reach.
  const inner = { rooms: 5, rung: [1, 2, 3, 4, 1].map((note, room) => ({ room, note })) };
  const atHeart = {
    ...trip,
    encounter: room,
    kit: {
      ...trip.kit,
      choices: Array.from({ length: room }, (_, after) => ({ after, id: 'push' })),
      state: { ...original, inner } as unknown as Json,
    },
  };
  const inked = storeRoom(atHeart, room, serializeBoard(frame.fallback));
  const save = { ...newSave(1), profile, trip: inked };
  const loaded = parseSaveData(JSON.parse(JSON.stringify(save)));
  expect(parseInkedState(loaded.trip?.kit?.state).inner).toEqual(inner);
  const battle = startBattle(loaded).state;
  const allied = battle.tiles.flatMap((tile) => {
    const data = tile.piece?.data;
    return tile.piece?.id === 'foundry:greatBell' &&
      data &&
      typeof data === 'object' &&
      'allied' in data &&
      data.allied &&
      'note' in data &&
      typeof data.note === 'number'
      ? [data.note]
      : [];
  });
  expect(allied).toHaveLength(4);
  expect(battle.rules).toHaveProperty(['foundry:tune']);
  console.log('CAL5 PEAL_PROBE', JSON.stringify({ rung: inner.rung, allied }));
});
