import { describe, expect, test } from 'vitest';
import { BURSTS, CHEMISTRY, type CompoundId, LINES, MIXES, type StateId, TUNING } from '$data';
import { namedIn, parseLabel, tileAt } from '$engine';
import { decayStates, landKind, landKindFree, roundEndChemistry, stainMarks } from '$engine/mix';
import { KIND_HANDLERS } from '$engine/runes/kinds';
import { flowFor, lands, run, stateAt, tile, unit, unitIn } from './chemHarness';
import { board, expectLog, expectLogIncludes } from './harness';

/** Design §4.1–4.2, P13–P17: the five kinds on each layer, the 16 mixes, wash-out, duration. */

const TOKEN: Record<string, string> = { blot: 'i', slick: 'o', cloud: '~', plate: '#' };
const COMPOUND_TOKEN: Record<string, string> = {
  stain: '{stain}',
  brandCloud: '{brand}',
  pool: '{pool}',
  greaseFog: '{fog}',
  skidPlate: '{skid}',
  bank: '{bank}',
  kettle: '{kettle}',
  wall: '{wall}',
};
const PLAIN = { ink: 'blot', oil: 'slick', steam: 'cloud', brass: 'plate' } as const;

/** A 5×3 board with the caster at A1 and `cell` at C2. */
const withCell = (cell: string) => board(`D . . . .\n . . ${cell} . .\n . . . . .`);

describe('the 16 mixes (design §4.2)', () => {
  test('the table has 16 rows, four per kind', () => {
    expect(MIXES).toHaveLength(16);
    for (const k of ['ink', 'oil', 'steam', 'brass']) {
      expect(MIXES.filter((m) => m.kind === k)).toHaveLength(4);
    }
  });

  for (const row of MIXES) {
    test(`${row.kind}-on-${row.on}-makes-${row.makes}`, () => {
      const unitRow = row.on === 'mark' || row.on === 'collar';
      const cell = row.on === 'mark' ? 'r!' : row.on === 'collar' ? 'r' : (TOKEN[row.on] as string);
      const s = withCell(cell);
      const target = unitRow ? unit('rat-1') : tile('C2');
      // A collar is cast on first (a board `&` is a born collar, which a shackle keeps).
      const r = lands(s, [
        ...(row.on === 'collar' ? [['brass', target] as const] : []),
        [row.kind, target],
      ]);
      expect(r.events.find((e) => e.type === 'mixed')).toMatchObject({
        compound: row.makes,
        line: `${row.kind}:${row.on}`,
      });
      if (row.makes === 'deepMark') {
        expect(unitIn(r.state, 'C2').mark?.deep).toBe(true);
      } else if (row.makes === 'shackle') {
        const rat = unitIn(r.state, 'C2');
        expect([rat.shackle, rat.mark, rat.collar]).toEqual([TUNING.compoundRounds, null, false]);
      } else {
        expect(stateAt(r.state, 'C2')?.id).toBe(row.makes);
      }
      expect(r.state.named).toContain(`compound:${row.makes}`);
    });
  }

  test('a mix is symmetric: oil-then-ink and ink-then-oil both make a stain', () => {
    const a = lands(withCell('.'), [
      ['oil', tile('C2')],
      ['ink', tile('C2')],
    ]);
    const b = lands(withCell('.'), [
      ['ink', tile('C2')],
      ['oil', tile('C2')],
    ]);
    expect(stateAt(a.state, 'C2')?.id).toBe('stain');
    expect(stateAt(b.state, 'C2')?.id).toBe('stain');
  });
});

describe('landing on an empty tile or a bare unit (P13, P14)', () => {
  for (const kind of ['ink', 'oil', 'steam', 'brass'] as const) {
    test(`${kind}-on-empty-tile-lands-${PLAIN[kind]}`, () => {
      const r = lands(withCell('.'), [[kind, tile('C2')]]);
      expect(stateAt(r.state, 'C2')?.id).toBe(PLAIN[kind]);
      expectLog(r.events, [`${kind} lands at C2 as ${PLAIN[kind]}`]);
      expect(r.events[0]).not.toHaveProperty('line'); // the headline, not fine print
    });
  }

  test('ink-and-brass-land-on-the-unit-standing-there-oil-and-steam-on-its-tile', () => {
    const s = board('D . . . .\n . . r . .');
    const ink = lands(s, [['ink', unit('rat-1')]]);
    expect(unitIn(ink.state, 'C2').mark).toMatchObject({ deep: false, bound: null });
    expect(stateAt(ink.state, 'C2')).toBeNull();
    const brass = lands(s, [['brass', unit('rat-1')]]);
    expect(unitIn(brass.state, 'C2').collar).toEqual({
      caster: 'draughtsman',
      spell: '0,0',
      cast: 1,
    });
    const oil = lands(s, [['oil', unit('rat-1')]]);
    expect(stateAt(oil.state, 'C2')?.id).toBe('slick');
    expect(unitIn(oil.state, 'C2').mark).toBeNull();
    const steam = lands(s, [['steam', unit('rat-1')]]);
    expect(stateAt(steam.state, 'C2')?.id).toBe('cloud');
  });

  test('a tile target with a unit standing on it lands on the unit (P14)', () => {
    const r = lands(board('D . . . .\n . . r . .'), [['ink', tile('C2')]]);
    expect(unitIn(r.state, 'C2').mark).not.toBeNull();
    expect(stateAt(r.state, 'C2')).toBeNull();
  });

  test('brass-on-a-marked-unit-shackles-it', () => {
    const r = lands(board('D . . . .\n . . r! . .'), [['brass', unit('rat-1')]]);
    expect(unitIn(r.state, 'C2').shackle).toBe(TUNING.compoundRounds);
  });

  test('a born brass collar survives a shackle', () => {
    const r = lands(board('D . . . .\n . . b . .'), [['ink', unit('sentry-1')]]);
    const sentry = unitIn(r.state, 'C2');
    expect(sentry.shackle).toBeGreaterThan(0);
    expect(sentry.collar).toBeNull();
  });

  test('ink on a deep mark washes it back to a plain mark; brass on a shackle collars', () => {
    const a = lands(board('D . . . .\n . . r!! . .'), [['ink', unit('rat-1')]]);
    expect(unitIn(a.state, 'C2').mark?.deep).toBe(false);
    expect(a.events.find((e) => e.type === 'washed')).toMatchObject({
      was: 'deepMark',
      line: 'ink:compound',
    });
    const b = lands(board('D . . . .\n . . r$ . .'), [['brass', unit('rat-1')]]);
    const rat = unitIn(b.state, 'C2');
    expect(rat.shackle).toBe(0);
    expect(rat.collar).not.toBe(false);
    expectLogIncludes(b.events, ['rat at C2 is collared in brass']);
  });

  test('ink on a shackle washes it out and leaves a mark', () => {
    const r = lands(board('D . . . .\n . . r$ . .'), [['ink', unit('rat-1')]]);
    const rat = unitIn(r.state, 'C2');
    expect([rat.shackle, rat.mark?.deep]).toEqual([0, false]);
  });
});

describe('a kind landing on a compound washes it out (P16)', () => {
  for (const [compound, token] of Object.entries(COMPOUND_TOKEN)) {
    for (const kind of ['ink', 'oil', 'steam', 'brass'] as const) {
      test(`${kind}-washes-out-${compound}`, () => {
        const r = lands(withCell(token), [[kind, tile('C2')]]);
        expect(stateAt(r.state, 'C2')?.id).toBe(PLAIN[kind]);
        expect(r.events).toHaveLength(1);
        expect(r.events[0]).toMatchObject({
          type: 'washed',
          was: compound as CompoundId,
          now: PLAIN[kind] as StateId,
          line: `${kind}:compound`,
        });
      });
    }
  }
});

describe('plain states that do not mix', () => {
  test('ink-slides-off-a-blot-and-off-brass', () => {
    const blot = lands(withCell('i'), [['ink', tile('C2')]]);
    expect(stateAt(blot.state, 'C2')?.id).toBe('blot');
    expect(blot.events[0]).toMatchObject({ type: 'miss', line: 'ink:blot' });
    const plate = lands(withCell('#'), [['ink', tile('C2')]]);
    expect(stateAt(plate.state, 'C2')?.id).toBe('plate');
    expect(plate.events[0]).toMatchObject({ type: 'miss', line: 'ink:plate' });
  });

  test('brass-replaces-a-blot', () => {
    const r = lands(withCell('i'), [['brass', tile('C2')]]);
    expect(stateAt(r.state, 'C2')?.id).toBe('plate');
    expect(r.events[0]).toMatchObject({ type: 'landed', makes: 'plate', line: 'brass:blot' });
  });

  test('oil-feeds-a-fire-and-the-others-put-it-out', () => {
    const oil = lands(withCell('*'), [['oil', tile('C2')]]);
    expect(stateAt(oil.state, 'C2')).toMatchObject({ id: 'fire', rounds: TUNING.fireRounds });
    for (const [kind, id] of [
      ['ink', 'blot'],
      ['steam', 'cloud'],
      ['brass', 'plate'],
    ] as const) {
      const r = lands(withCell('*'), [[kind, tile('C2')]]);
      expect(stateAt(r.state, 'C2')?.id).toBe(id);
      expect(r.events[0]).toMatchObject({ line: `${kind}:fire` });
    }
  });

  test('brass-cannot-plate-a-grate', () => {
    const r = lands(board('D . . . .\n . . w>h . .'), [['brass', tile('C2')]]);
    expect(stateAt(r.state, 'C2')).toBeNull();
  });
});

describe('pool (design §4.2)', () => {
  test('pool-soaks-its-four-neighbours', () => {
    const s = board('D . . . .\n . . o . .\n . . . . .');
    const r = lands(s, [['oil', tile('C2')]]);
    expect(stateAt(r.state, 'C2')?.id).toBe('pool');
    for (const lbl of ['C1', 'B2', 'D2', 'C3'])
      expect(stateAt(r.state, lbl)?.id, lbl).toBe('slick');
    expect(stateAt(r.state, 'B1')).toBeNull();
    expectLogIncludes(r.events, ['C2: pool', 'oil lands at C1 as slick']);
  });

  test('pool-leaves-plates-and-other-states-alone', () => {
    const r = lands(board('D . . . .\n # . o ~ .\n . . . . .'), [['oil', tile('C2')]]);
    expect(stateAt(r.state, 'A2')?.id).toBe('plate');
    expect(stateAt(r.state, 'D2')?.id).toBe('cloud');
  });
});

describe('named results (D7)', () => {
  test('a compound is named the first time it happens in a battle, only once', () => {
    const s = withCell('o');
    const a = lands(s, [['ink', tile('C2')]]);
    expect(namedIn(a.events)).toEqual(['compound:stain']);
    // Same fight again: already named, no second silent event.
    const b = run(a.state, (ctx) => {
      tileAt(ctx.s, parseLabel('C2')).state = { id: 'slick', rounds: 0, origin: null };
      landKind(ctx, 'ink', tile('C2'), flowFor(ctx.s));
    });
    expect(namedIn(b.events)).toEqual([]);
    expect(b.state.named).toEqual(['compound:stain']);
  });

  test('the named event is silent', () => {
    const r = lands(withCell('~'), [['steam', tile('C2')]]);
    expectLog(r.events, ['C2: bank']);
  });
});

describe('durations and Lay (P17)', () => {
  test('compound-fades-after-2', () => {
    const made = lands(withCell('o'), [['ink', tile('C2')]]).state;
    expect(stateAt(made, 'C2')).toMatchObject({ id: 'stain', rounds: 2 });
    const one = run(made, (ctx) => decayStates(ctx));
    expect(stateAt(one.state, 'C2')).toMatchObject({ id: 'stain', rounds: 1 });
    expect(one.events).toEqual([]);
    const two = run(one.state, (ctx) => decayStates(ctx));
    expect(stateAt(two.state, 'C2')).toBeNull();
    expectLog(two.events, ['the board fades at C2']);
  });

  test('cloud-2-plate-3-fire-2-slick-and-blot-stay', () => {
    const s = board('D . . . .\n . . . . .');
    const kinds = [
      ['steam', 2],
      ['brass', 3],
      ['oil', 0],
      ['ink', 0],
    ] as const;
    kinds.forEach(([kind, rounds], i) => {
      const r = lands(s, [[kind, tile(`${'ABCD'[i]}2`)]]);
      expect(stateAt(r.state, `${'ABCD'[i]}2`)?.rounds, kind).toBe(rounds);
    });
    const slow = run(
      lands(s, [
        ['oil', tile('A2')],
        ['ink', tile('B2')],
      ]).state,
      (ctx) => {
        decayStates(ctx);
        decayStates(ctx);
        decayStates(ctx);
      },
    );
    expect(stateAt(slow.state, 'A2')?.id).toBe('slick');
    expect(stateAt(slow.state, 'B2')?.id).toBe('blot');
  });

  test('bank-lasts-2-rounds-longer', () => {
    const made = lands(withCell('~'), [['steam', tile('C2')]]).state;
    expect(stateAt(made, 'C2')?.rounds).toBe(TUNING.compoundRounds + CHEMISTRY.bankExtraRounds);
  });

  test('lay-makes-it-permanent', () => {
    const r = lands(withCell('o'), [['ink', tile('C2')]], { lay: true });
    expect(stateAt(r.state, 'C2')).toMatchObject({ id: 'stain', rounds: 0, set: true });
    const later = run(r.state, (ctx) => {
      for (let i = 0; i < 5; i++) decayStates(ctx);
    });
    expect(stateAt(later.state, 'C2')?.id).toBe('stain');
  });

  test('afterglow-adds-a-round-once', () => {
    const r = lands(withCell('o'), [['ink', tile('C2')]], { auras: ['afterglow'] });
    expect(stateAt(r.state, 'C2')).toMatchObject({ afterglow: true });
    let s = r.state;
    const seen: (number | undefined)[] = [];
    for (let i = 0; i < 3; i++) {
      s = run(s, (ctx) => decayStates(ctx)).state;
      seen.push(stateAt(s, 'C2')?.rounds);
    }
    expect(seen).toEqual([2, 1, undefined]);
  });

  test('steep-spreads-each-round-and-the-copies-fade-together', () => {
    const r = lands(board('D . . . .\n . . ~ . .\n . . . . .'), [['oil', tile('C2')]], {
      auras: ['steep'],
    });
    expect(stateAt(r.state, 'C2')).toMatchObject({ id: 'greaseFog', steep: true });
    const one = run(r.state, (ctx) => decayStates(ctx));
    expectLogIncludes(one.events, ['it spreads from C2 to C1, B2, D2, C3']);
    for (const lbl of ['C1', 'B2', 'D2', 'C3']) {
      expect(stateAt(one.state, lbl), lbl).toMatchObject({ id: 'greaseFog', rounds: 1 });
    }
    const two = run(one.state, (ctx) => decayStates(ctx));
    for (const lbl of ['C2', 'C1', 'B2', 'D2', 'C3'])
      expect(stateAt(two.state, lbl), lbl).toBeNull();
  });

  test('a-gifted-steam-or-brass-lasts-a-round-longer', () => {
    const steam = lands(withCell('.'), [['steam', tile('C2')]], { gifted: true });
    expect(stateAt(steam.state, 'C2')?.rounds).toBe(TUNING.cloudRounds + CHEMISTRY.giftRounds);
    const oil = lands(withCell('.'), [['oil', tile('C2')]], { gifted: true });
    expect(stateAt(oil.state, 'C2')?.rounds).toBe(0);
  });

  test('a-shackle-wears-off-after-its-rounds', () => {
    const made = lands(board('D . . . .\n . . r! . .'), [['brass', unit('rat-1')]]).state;
    const one = run(made, (ctx) => decayStates(ctx));
    expect(unitIn(one.state, 'C2').shackle).toBe(1);
    const two = run(one.state, (ctx) => decayStates(ctx));
    expect(unitIn(two.state, 'C2').shackle).toBe(0);
    expectLog(two.events, ['the board fades at C2']);
  });

  test('plates-carry-their-hits-and-origin', () => {
    const r = lands(withCell('.'), [['brass', tile('C2')]]);
    expect(stateAt(r.state, 'C2')).toMatchObject({
      id: 'plate',
      hits: 1,
      origin: { caster: 'draughtsman', cast: 1 },
    });
    const wall = lands(withCell('#'), [['brass', tile('C2')]]);
    expect(stateAt(wall.state, 'C2')).toMatchObject({ id: 'wall', hits: 2 });
  });
});

describe('what a compound does while it lingers', () => {
  test('brand-cloud-marks-whoever-stands-in-it-at-round-end', () => {
    const s = board('D . . . .\n . . r{brand} f . .');
    const r = run(s, (ctx) => roundEndChemistry(ctx));
    expect(unitIn(r.state, 'C2').mark).not.toBeNull();
    expect(unitIn(r.state, 'D2').mark).toBeNull();
    expect(r.events[0]).toMatchObject({ type: 'marked', line: 'ink:brandCloud' });
  });

  test('brand-cloud-skips-the-already-marked', () => {
    const r = run(board('D . . . .\n . . r!{brand} . .'), (ctx) => roundEndChemistry(ctx));
    expect(r.events).toEqual([]);
  });

  test('kettle-scalds-each-adjacent-unit-for-1-at-round-end', () => {
    const s = board('D . . . .\n . d {kettle} d .\n . . . . .');
    const r = run(s, (ctx) => roundEndChemistry(ctx));
    expect(unitIn(r.state, 'B2').hp).toBe(unitIn(s, 'B2').hp - 1);
    expect(unitIn(r.state, 'D2').hp).toBe(unitIn(s, 'D2').hp - CHEMISTRY.kettleHeat);
    expect(r.events.every((e) => e.line === 'steam:kettle')).toBe(true);
  });

  test('fire-burns-whoever-stands-in-it-at-round-end', () => {
    const s = board('D . . . .\n . . d* . .');
    const r = run(s, (ctx) => roundEndChemistry(ctx));
    expect(unitIn(r.state, 'C2').hp).toBe(unitIn(s, 'C2').hp - TUNING.fireDamage);
  });

  test('a-stain-marks-a-unit-that-ends-its-move-on-it', () => {
    const s = board('D . . . .\n . . r{stain} . .');
    const r = run(s, (ctx) => stainMarks(ctx, unitIn(ctx.s, 'C2')));
    expect(unitIn(r.state, 'C2').mark).not.toBeNull();
    expect(r.events[0]).toMatchObject({ type: 'marked', line: 'ink:stain' });
  });
});

describe('a foe lands a kind without a cast', () => {
  test('landKindFree-puts-a-blot-or-a-mark-with-no-origin', () => {
    const s = board('D . . . .\n . . . . .');
    const r = run(s, (ctx) => landKindFree(ctx, 'ink', tile('C2')));
    expect(stateAt(r.state, 'C2')).toMatchObject({ id: 'blot', origin: null });
    const m = run(board('D . . . .\n . S . . .'), (ctx) =>
      landKindFree(ctx, 'ink', unit('stoker')),
    );
    expect(unitIn(m.state, 'B2').mark?.origin).toBeNull();
  });
});

describe('wiring into the handler table and the fine print', () => {
  test('the Kind handlers land through the mixer', () => {
    const s = withCell('o');
    const r = run(s, (ctx) => {
      const flow = flowFor(ctx.s);
      const step = {
        at: { x: 0, y: 0 },
        role: 'kind',
        rune: 'ink',
        auras: [],
        next: null,
      } as const;
      KIND_HANDLERS.ink(ctx, tile('C2'), flow, step);
    });
    expect(stateAt(r.state, 'C2')?.id).toBe('stain');
  });

  test('every mix, wash, burst and page row has a line to be witnessed', () => {
    const ids = new Set<string>(LINES.map((l) => l.id));
    for (const m of MIXES) expect(ids.has(`${m.kind}:${m.on}`), `${m.kind}:${m.on}`).toBe(true);
    for (const kind of ['ink', 'oil', 'steam', 'brass']) {
      expect(ids.has(`${kind}:compound`), `${kind}:compound`).toBe(true);
    }
    for (const b of BURSTS) expect(ids.has(`spark:${b.on}`), `spark:${b.on}`).toBe(true);
    expect(ids.has('spark:collar')).toBe(true);
    for (const l of LINES) {
      expect(l.text.length, l.id).toBeGreaterThan(10);
      expect(l.id).toBe(`${l.subject}:${l.meets}`);
    }
    expect(new Set(LINES.map((l) => l.id)).size).toBe(LINES.length);
  });
});
