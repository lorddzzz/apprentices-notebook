import { describe, expect, test } from 'vitest';
import '$engine';
import { type InventionDef, LINES } from '$data';
import { type BattleState, type GameEvent, libraryOf } from '$engine';
import { ev, ringTones, struckAt, unit } from '../districts/foundry/helpers';
import { act, cast, withLattices } from './harness';

/**
 * BF-F1: the Resonance audit (footnotes audit, section 12). Toll, Coil, Unison, Rivet and Filings
 * against bells, the hum, muffle, retune and the ringers' staff. Each new row has `behaviour`
 * tests (green today: the rule the row describes) and a `fires` test, `it.fails` until BF-F2/BF-F3
 * stamp the row at the site the audit names and drop its `pending` flag. The `behaviour` tests also
 * pin the audited behaviours that get no row (the table's "none" rows).
 */

const inv = (
  id: string,
  method: InventionDef['method'],
  parts: InventionDef['parts'],
  extra: Partial<InventionDef> = {},
): InventionDef => ({ id: `inv:${id}`, name: id, method, parts, solvent: null, ...extra });
const opts = {
  inventions: libraryOf([
    inv('after-rivet', 'repeat', ['strike'], { solvent: 'rivet' }),
    inv('after-filings', 'repeat', ['strike'], { solvent: 'filings' }),
  ]),
};

const endTurn = (s: BattleState) => act(s, { type: 'endTurn' });
const lineSet = (events: readonly GameEvent[]): string[] =>
  events.flatMap((e) => (e.line ? [e.line] : []));
const count = (events: readonly GameEvent[], type: GameEvent['type']) =>
  events.filter((e) => e.type === type).length;

test('BF-F1: the four new Resonance rows exist, are foundry rows, and are stamped (no longer pending)', () => {
  for (const id of ['toll:bell', 'coil:bell', 'unison:bell', 'filings:bell']) {
    const row = LINES.find((l) => l.id === id);
    expect(row, id).toBeDefined();
    expect(row?.district, id).toBe('foundry');
    // BF-F2 stamped Toll, Coil and Unison; BF-F3 stamped Filings.
    expect(row?.pending, id).toBeUndefined();
  }
  // The solvents' own rows are live and untouched; Toll, Coil and Unison had none.
  for (const id of ['rivet:unit', 'filings:plate']) {
    expect(LINES.find((l) => l.id === id)?.pending, id).toBeUndefined();
  }
});

describe('Toll', () => {
  const TOLL = { draughtsman: 'Bolt> Toll Spark' } as const;
  const TWO_MID = 'D . {bell:mid} . {bell:mid}\n. . . . .\n. . . . r';

  test('BF-F1: toll:bell behaviour: a bell holds no state, so a Toll at one joins nothing', () => {
    const r = cast(withLattices(TWO_MID, TOLL), 'draughtsman', 'right');
    expect(struckAt(r.events, 2, 0)).toHaveLength(1); // the Bolt stopped at it
    expect(struckAt(r.events, 4, 0)).toHaveLength(0); // its tone-mate is not reached
    expect(ev(r.events, 'foundry:bellStruck')).toHaveLength(1);
    expect(ringTones(r.events)).toEqual(['mid']); // it rings as it would without Toll
    const plain = cast(
      withLattices(TWO_MID, { draughtsman: 'Bolt> Spark' }),
      'draughtsman',
      'right',
    );
    expect(ev(plain.events, 'foundry:bellStruck')).toHaveLength(1);
  });

  test('BF-F1: toll:bell fires', () => {
    const r = cast(withLattices(TWO_MID, TOLL), 'draughtsman', 'right');
    expect(lineSet(r.events)).toContain('toll:bell');
  });

  test('BF-F1: Toll through a muffled bell follows the cloud, and a Bolt stops at the cloud before the bell (To2, no row)', () => {
    const s = withLattices('D . ~{bell:mid} ~ ~{bell:mid}\n. . . . .\n. . . . r', {
      draughtsman: 'Bolt> Toll Strike',
    });
    const r = cast(s, 'draughtsman', 'right');
    expect(lineSet(r.events)).toContain('bolt:cloud'); // Bolt's own row: the cloud hides the bell
    expect(ev(r.events, 'foundry:bellStruck')).toHaveLength(0);
    expect(ev(r.events, 'foundry:ring')).toHaveLength(0);
  });

  test('BF-F1: a Toll with Spark across a cloud over bells bursts the whole cloud: every bell struck, all silent (To3, no row)', () => {
    const s = withLattices('D . ~{bell:mid} ~ ~{bell:mid}\n. . . . .\n. . . . r', {
      draughtsman: 'Bolt> Spark',
    });
    const r = cast(s, 'draughtsman', 'right');
    expect(struckAt(r.events, 2, 0).length).toBeGreaterThan(0);
    expect(struckAt(r.events, 4, 0).length).toBeGreaterThan(0);
    expect(ev(r.events, 'foundry:ring')).toHaveLength(0);
    expect(ev(r.events, 'foundry:muffled').length).toBeGreaterThan(0);
  });
});

describe('Coil', () => {
  const COIL = { draughtsman: '. Coil\nBolt> Spark' } as const;
  const STORM = 'D . ~ ~ {bell:low}\n. . . r .\nr . . . .';

  test('BF-F1: coil:bell behaviour: Coil widens a burst for units, but a bell just past it is not struck', () => {
    const coil = cast(withLattices(STORM, COIL), 'draughtsman', 'right');
    const bare = cast(withLattices(STORM, { draughtsman: 'Bolt> Spark' }), 'draughtsman', 'right');
    const hurt = (r: typeof coil) =>
      r.events.filter((e) => e.type === 'damage' && e.target.id === 'rat-1').length;
    expect(hurt(coil)).toBe(1); // the rat below the cloud's end is in Coil's extra tile
    expect(hurt(bare)).toBe(0);
    expect(ev(coil.events, 'foundry:bellStruck')).toHaveLength(0); // the bell beyond the cloud is too
    expect(ev(coil.events, 'foundry:ring')).toHaveLength(0);
  });

  test('BF-F1: coil:bell behaviour: a ring is not a burst, so Coil leaves its pulse as wide as ever', () => {
    const ring = 'D . {bell:mid} r r\n. . . . .\n. . . . r';
    const pulsed = (lattice: string) => {
      const r = cast(withLattices(ring, { draughtsman: lattice }), 'draughtsman', 'right');
      return ev(r.events, 'foundry:pulse').flatMap(
        (e) => ((e.data ?? {}) as { units?: string[] }).units ?? [],
      );
    };
    expect(pulsed('Bolt> Strike')).toEqual(['rat-1']); // beside the bell only
    expect(pulsed('. Coil\nBolt> Strike')).toEqual(['rat-1']);
  });

  test('BF-F1: coil:bell fires', () => {
    const r = cast(withLattices(STORM, COIL), 'draughtsman', 'right');
    expect(lineSet(r.events)).toContain('coil:bell');
  });
});

describe('Unison', () => {
  const PAGES = { stoker: 'Bolt> Strike', draughtsman: 'Bolt> Unison Strike' } as const;
  // S shoots left along row 0 and D shoots up column 2: both reach the bell at C1. D shoots left along row 2
  // at a second mid bell, the bell's tone-mate.
  const ROOM = '. . {bell:mid} . S\n. . . . .\n{bell:mid} . D . r';
  const triggered = (events: readonly GameEvent[]): boolean[] =>
    events.flatMap((e) => (e.type === 'triggered' ? [e.passed] : []));

  test('BF-F1: unison:bell behaviour: it passes for another apprentice on that same bell, not on a tone-mate', () => {
    const first = cast(withLattices(ROOM, PAGES), 'stoker', 'left');
    expect(triggered(cast(first.state, 'draughtsman', 'up').events)).toEqual([true]);
    expect(triggered(cast(first.state, 'draughtsman', 'left').events)).toEqual([false]); // same tone, other bell
  });

  test('BF-F1: unison:bell behaviour: a basic Shove strikes the bell and signs nothing (P23)', () => {
    const s = withLattices(
      'D . {bell:mid} S r',
      { draughtsman: 'Bolt> Unison Strike' },
      { kits: { stoker: { action: 'shove' } } },
    );
    const shoved = act(s, { type: 'shove', unit: 'stoker', dir: 'left' });
    expect(struckAt(shoved.events, 2, 0)).toHaveLength(1); // it did strike
    expect(triggered(cast(shoved.state, 'draughtsman', 'right').events)).toEqual([false]);
  });

  test('BF-F1: Unison cannot hold back a bell: the Bolt that stops at it strikes it before Unison reads (Un2, no row)', () => {
    const alone = cast(withLattices(ROOM, PAGES), 'draughtsman', 'up');
    expect(triggered(alone.events)).toEqual([false]);
    expect(struckAt(alone.events, 2, 0)).toHaveLength(1);
    expect(ringTones(alone.events)).toEqual(['mid']);
  });

  test("BF-F1: lock 3 counts two apprentices' strikes, not a Unison (Un3, no row)", () => {
    const s = withLattices(
      '. . {greatBell:3} . S\n. . . . .\n. . D . r',
      { stoker: 'Bolt> Strike', draughtsman: 'Bolt> Strike' },
      {},
    );
    const a = cast(s, 'stoker', 'left');
    expect(ev(a.events, 'foundry:bellRung')).toHaveLength(0);
    expect(ev(cast(a.state, 'draughtsman', 'up').events, 'foundry:bellRung')).toHaveLength(1);
  });

  test('BF-F1: unison:bell fires', () => {
    const first = cast(withLattices(ROOM, PAGES), 'stoker', 'left');
    const r = cast(first.state, 'draughtsman', 'up');
    expect(lineSet(r.events)).toContain('unison:bell');
  });
});

describe('Rivet', () => {
  const cast1 = (ascii: string) =>
    cast(
      withLattices(ascii, { draughtsman: 'Bolt> inv:after-rivet' }, opts),
      'draughtsman',
      'right',
    );

  test('BF-F1: Rivet on a Clapper pins it in place, it still rings when struck, and a pulse hurts it without pushing (Ri1, no row)', () => {
    const r = cast1('D . Q {bell:low} . .\n. . . . . r');
    expect(unit(r.state, 'clapper-1').held).toBeGreaterThan(0);
    expect(lineSet(r.events)).toContain('rivet:unit');
    expect(ringTones(r.events)).toEqual(['low']);
    expect(ev(r.events, 'foundry:pulse')).toHaveLength(1);
    expect(lineSet(r.events)).toContain('shove:held'); // the pulse's push met the hold
    const next = endTurn(r.state);
    expect(unit(next.state, 'clapper-1').pos).toEqual({ x: 2, y: 0 }); // it did not walk
  });

  test('BF-F1: held stops a foe walking, not acting: a Rivet-held Detuner beside a bell still retunes it, a Ringer still rings (Ri2, Ri3, no row)', () => {
    const det = cast1('D . X {bell:low} . .\n. . . . . r');
    expect(unit(det.state, 'detuner-1').held).toBeGreaterThan(0);
    expect(ev(endTurn(det.state).events, 'foundry:retuned')).toHaveLength(1);
    const ringer = cast1('D . Z{rope:low} . .\n. . . {bell:low} . r');
    expect(unit(ringer.state, 'ringer-1').held).toBeGreaterThan(0);
    expect(ringTones(endTurn(ringer.state).events)).toContain('low');
  });

  test('BF-F1: Rivet at a bell holds nothing: a bell is no unit (Ri5, no row)', () => {
    const r = cast1('D . {bell:low} . r');
    expect(count(r.events, 'held')).toBe(0);
    expect(struckAt(r.events, 2, 0)).toHaveLength(1);
  });
});

describe('Filings', () => {
  const run = (ascii: string) =>
    cast(
      withLattices(ascii, { draughtsman: 'Bolt> inv:after-filings' }, opts),
      'draughtsman',
      'right',
    );
  const BELL = 'D . {bell:mid} . r\n. . = . .';

  test('BF-F1: filings:bell behaviour: with brass beside a bell Filings comes back, and the second run strikes nothing', () => {
    const first = run(BELL);
    expect(first.state.scheduled.map((e) => e.kind)).toContain('filings');
    expect(lineSet(first.events)).toContain('filings:plate');
    expect(struckAt(first.events, 2, 0)).toHaveLength(1);
    const next = endTurn(first.state);
    expect(lineSet(next.events)).toContain('strike:empty'); // the repeated Strike finds no unit
    expect(ev(next.events, 'foundry:bellStruck')).toHaveLength(0);
    expect(ev(next.events, 'foundry:ring')).toHaveLength(0);
  });

  test('BF-F1: a bell is never brass: with no plate beside it Filings does not come back (Fi2, no row)', () => {
    const r = run('D . {bell:mid} . r');
    expect(r.state.scheduled.map((e) => e.kind)).not.toContain('filings');
  });

  test('BF-F1: filings:bell behaviour: a Clapper that walked off is missed by the second run', () => {
    const first = run('D . Q . r\n. . = . .');
    const hp = unit(first.state, 'clapper-1').hp;
    const next = endTurn(first.state);
    expect(unit(next.state, 'clapper-1').pos).not.toEqual({ x: 2, y: 0 });
    expect(lineSet(next.events)).toContain('strike:empty');
    expect(unit(next.state, 'clapper-1').hp).toBe(hp);
  });

  test('BF-F1: filings:bell fires', () => {
    const next = endTurn(run(BELL).state);
    expect(lineSet(next.events)).toContain('filings:bell');
  });
});
