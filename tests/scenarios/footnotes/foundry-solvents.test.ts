import { describe, expect, test } from 'vitest';
import { type InventionDef, VARIANTS } from '$data';
import { CARILLONNEUR_PAGE, CARILLONNEUR_TOLL } from '$data/rivals/carillonneur';
import { type BattleState, type GameEvent, libraryOf, newProfile, type Profile } from '$engine';
import { type FootnoteIds, runDraft } from '$engine/ctx';
import { dealDamage } from '$engine/damage';
import { marginOf, writeAt } from '../../../src/app/desk';
import { ev, ringTones, struckAt, unit } from '../../districts/foundry/helpers';
import { fourCombos, withFootnotes } from '../footnoteHarness';
import { withLattices } from '../harness';
import { castWith, step } from './castHelper';

/**
 * BF-F3: the Resonance solvents' margin lines (`rivet:unit`, `filings:bell`), their capstones
 * (foundry.md section 4) and the Carillonneur's note in the Toll margin.
 */

const inv = (
  id: string,
  parts: InventionDef['parts'],
  solvent: InventionDef['solvent'],
): InventionDef => ({ id: `inv:${id}`, name: id, method: 'repeat', parts, solvent });
const opts = {
  inventions: libraryOf([
    inv('after-rivet', ['strike'], 'rivet'),
    inv('rivet-guard', ['guard'], 'rivet'),
    inv('after-filings', ['strike'], 'filings'),
  ]),
};
const lineSet = (events: readonly GameEvent[]): string[] =>
  events.flatMap((e) => (e.line ? [e.line] : []));
const cast = (
  ascii: string,
  spell: string,
  fns: FootnoteIds,
  hp: Record<string, number> = {},
  member = 'draughtsman',
) =>
  castWith(
    withLattices(ascii, { [member]: spell }, { ...opts, hp }),
    { kind: 'dir', dir: 'right' },
    fns,
    member,
  );
const endTurn = (s: BattleState, fns: FootnoteIds) => step(s, { type: 'endTurn' }, fns);

// ── Rivet ──────────────────────────────────────────────

describe('rivet:unit', () => {
  const RIVET = 'Bolt> inv:after-rivet';
  /** One more hit of 1 on a unit, after the Rivet landed on it. */
  const bite = (s: BattleState, id: string, fns: FootnoteIds) =>
    runDraft(s, (ctx) => dealDamage(ctx, unit(ctx.s, id), 1, 'Bite'), { footnotes: fns });

  const anvil = (fns: FootnoteIds) => {
    const r = cast('D . d . . .\n. . . . . r', RIVET, fns);
    const hit = bite(r.state, 'dummy-1', fns);
    const e = hit.events.find((x) => x.type === 'damage');
    return { amount: e?.type === 'damage' ? e.amount : 0, line: e?.line };
  };
  const spare = (fns: FootnoteIds) =>
    unit(cast('D . S . . r', RIVET, fns).state, 'stoker').held > 0;
  const clapperRang = (fns: FootnoteIds) =>
    ringTones(cast('D . Q . {bell:low} .\n. . . . . r', 'Bolt> inv:rivet-guard', fns).events);
  const gagged = (fns: FootnoteIds) => {
    const det = cast('D . X {bell:low} . .\n. . . . . r', RIVET, fns);
    const ringer = cast('D . Z{rope:low} . .\n. . . {bell:low} . r', RIVET, fns);
    return {
      retunes: ev(endTurn(det.state, fns).events, 'foundry:retuned').length,
      rings: ringTones(endTurn(ringer.state, fns).events),
    };
  };

  test('BF-F3: fourCombos reads for every margin line (rivet:unit)', () => {
    expect(anvil({})).toMatchObject({ amount: 1 });
    expect(spare({})).toBe(true);
    expect(clapperRang({})).toEqual([]);
    expect(gagged({})).toEqual({ retunes: 1, rings: ['low'] });
    const runs = fourCombos(
      'rivet:unit',
      ['rivet-unit-anvil', 'rivet-unit-spare'],
      ['rivet-unit-strike', 'rivet-unit-gag'],
      (c) => ({
        anvil: anvil(c.footnotes),
        spared: !spare(c.footnotes),
        rang: clapperRang(c.footnotes),
        gag: gagged(c.footnotes),
      }),
    );
    const [as, ag, ss, sg] = runs.map((r) => r.result);
    // anvil + strike: pinned, rung at once, and punished.
    expect(as).toMatchObject({
      anvil: { amount: 2, line: 'rivet:unit' },
      spared: false,
      rang: ['low'],
    });
    // anvil + gag: a gagged Detuner or Ringer stands there and takes one more.
    expect(ag?.anvil.amount).toBe(2);
    expect(ag?.gag).toEqual({ retunes: 0, rings: [] });
    // spare + strike: your party is never held; the Clapper is a foe, unaffected.
    expect(ss).toMatchObject({ anvil: { amount: 1 }, spared: true, rang: ['low'] });
    expect(sg).toMatchObject({ spared: true, gag: { retunes: 0, rings: [] } });
  });

  test('rivet-unit-anvil: a unit you Rivet takes one more from every hit while it is held', () => {
    expect(anvil({})).toEqual({ amount: 1, line: undefined });
    expect(anvil(withFootnotes(['rivet-unit-anvil']))).toEqual({ amount: 2, line: 'rivet:unit' });
    // A hit of nothing stays nothing, and a unit that is not held takes the plain hit.
    const s = withLattices('D . d . . .\n. . . . . r', {}, opts);
    const fresh = bite(s, 'dummy-1', withFootnotes(['rivet-unit-anvil']));
    expect(fresh.events.find((e) => e.type === 'damage')).toMatchObject({ amount: 1 });
  });

  test('rivet-unit-anvil: never stacks with Hold: a unit held twice takes one more, not two', () => {
    const fns = withFootnotes(['rivet-unit-anvil', 'hold-held-exposed']);
    const s = withLattices('D . d . . .\n. . . . . r', {}, opts);
    const r = runDraft(
      s,
      (ctx) => {
        const u = unit(ctx.s, 'dummy-1');
        u.held = 2;
        u.holds = 2;
        dealDamage(ctx, u, 1, 'Bite');
      },
      { footnotes: fns },
    );
    expect(r.events.find((e) => e.type === 'damage')).toMatchObject({
      amount: 2,
      line: 'hold:held',
    });
  });

  test('rivet-unit-spare: Rivet never holds your own party', () => {
    expect(spare({})).toBe(true);
    expect(spare(withFootnotes(['rivet-unit-spare']))).toBe(false);
    // A foe is still held.
    const r = cast('D . d . . .\n. . . . . r', RIVET, withFootnotes(['rivet-unit-spare']));
    expect(unit(r.state, 'dummy-1').held).toBeGreaterThan(0);
  });

  test('rivet-unit-strike: a Clapper you Rivet rings its tone as the Rivet lands', () => {
    expect(clapperRang({})).toEqual([]);
    const r = cast(
      'D . Q . {bell:low} .\n. . . . . r',
      'Bolt> inv:rivet-guard',
      withFootnotes(['rivet-unit-strike']),
    );
    expect(ringTones(r.events)).toEqual(['low']);
    expect(unit(r.state, 'clapper-1').held).toBeGreaterThan(0); // pinned where its pulse falls
    expect(lineSet(r.events)).toContain('rivet:unit');
  });

  test('rivet-unit-gag: a Ringer or Detuner you Rivet loses its next act', () => {
    expect(gagged({})).toEqual({ retunes: 1, rings: ['low'] });
    expect(gagged(withFootnotes(['rivet-unit-gag']))).toEqual({ retunes: 0, rings: [] });
  });

  test('BF-F3: rivet-cap-pair: a held unit beside another unit holds that one too, once', () => {
    const run = (fns: FootnoteIds) => {
      const r = cast('D . r r r .\n. . . . . .', RIVET, fns, { C1: 9, D1: 9, E1: 9 });
      return ['rat-1', 'rat-2', 'rat-3'].map((id) => unit(r.state, id).held > 0);
    };
    expect(run({})).toEqual([true, false, false]);
    expect(run(withFootnotes(['rivet-cap-pair']))).toEqual([true, true, false]); // no chain
    // The pair is held under the line, and rivet-unit-spare still keeps your party out.
    const r = cast(
      'D . r S . .\n. . . . . .',
      RIVET,
      withFootnotes(['rivet-cap-pair', 'rivet-unit-spare']),
    );
    expect(unit(r.state, 'stoker').held).toBe(0);
  });

  test('BF-F3: rivet-cap-lock: a bell beside a held unit cannot be retuned until your next turn', () => {
    const retunes = (fns: FootnoteIds, turns: number) => {
      let s = cast('D . X {bell:low} . .\n. . . . . r', RIVET, fns, { C1: 9 }).state;
      let count = 0;
      for (let i = 0; i < turns; i++) {
        const r = endTurn(s, fns);
        count += ev(r.events, 'foundry:retuned').length;
        s = r.state;
      }
      return count;
    };
    expect(retunes({}, 1)).toBe(1);
    const lock = withFootnotes(['rivet-cap-lock']);
    expect(retunes(lock, 1)).toBe(0); // the Detuner's act misses
    const r = endTurn(
      cast('D . X {bell:low} . .\n. . . . . r', RIVET, lock, { C1: 9 }).state,
      lock,
    );
    expect(r.events.some((e) => e.type === 'miss' && e.source === 'Retune')).toBe(true);
    expect(retunes(lock, 2)).toBeGreaterThan(0); // the lock ends with the round
  });
});

// ── Filings ────────────────────────────────────────────

describe('filings:bell', () => {
  const FILINGS = 'Bolt> inv:after-filings';
  const BELL = 'D . {bell:mid} . r\n. . = . .';
  const turns = (ascii: string, fns: FootnoteIds, n: number) => {
    let s = cast(ascii, FILINGS, fns);
    const out = [s];
    for (let i = 0; i < n; i++) {
      s = endTurn(s.state, fns) as typeof s;
      out.push(s);
    }
    return out;
  };
  /** Runs of Filings (not the invention's own Repeat) that came back to the bell. */
  const filingsRuns = (events: readonly GameEvent[]): number =>
    events.filter((e) => e.type === 'repeated' && e.line === 'filings:bell').length;
  const filingsQueued = (s: BattleState): number =>
    s.scheduled.filter((e) => e.kind === 'filings').length;
  const struckTurns = (fns: FootnoteIds) =>
    turns(BELL, fns, 3)
      .slice(1)
      .map((r) => struckAt(r.events, 2, 0).length);

  test('BF-F3: fourCombos reads for every margin line (filings:bell)', () => {
    expect(struckTurns({})).toEqual([0, 0, 0]);
    const runs = fourCombos(
      'filings:bell',
      ['filings-bell-strike', 'filings-bell-follow'],
      ['filings-bell-brass', 'filings-bell-twice'],
      (c) => ({
        struck: struckTurns(c.footnotes),
        bare: filingsQueued(cast('D . {bell:mid} . r', FILINGS, c.footnotes).state),
        runs: turns(BELL, c.footnotes, 3)
          .slice(1)
          .map((r) => filingsRuns(r.events)),
      }),
    );
    const [sb, st, fb, ft] = runs.map((r) => r.result);
    // strike + brass: a bell with no brass beside it is struck again next turn and rings.
    expect(sb).toMatchObject({ struck: [1, 0, 0], bare: 1, runs: [1, 0, 0] });
    // strike + twice: struck on both of the next two turns (the hum clears every round end).
    expect(st).toMatchObject({ struck: [1, 1, 0], bare: 0, runs: [1, 1, 0] });
    // follow + brass: independent axes; a bell counts as brass and nothing is struck.
    expect(fb).toMatchObject({ struck: [0, 0, 0], bare: 1, runs: [1, 0, 0] });
    expect(ft).toMatchObject({ struck: [0, 0, 0], bare: 0, runs: [1, 1, 0] });
  });

  test('filings-bell-strike: the second run strikes the bell it comes back to, so it rings again', () => {
    const r = turns(BELL, withFootnotes(['filings-bell-strike']), 1)[1];
    expect(struckAt(r?.events ?? [], 2, 0)).toHaveLength(1);
    expect(ringTones(r?.events ?? [])).toEqual(['mid']);
    expect(lineSet(r?.events ?? [])).toContain('filings:bell');
  });

  test('filings-bell-follow: the second run hits the unit it reached, wherever it stands then', () => {
    const hits = (fns: FootnoteIds) => {
      const second = turns('D . Q . r\n. . = . .', fns, 1)[1];
      return (second?.events ?? []).filter(
        (e) => e.type === 'damage' && e.target.id === 'clapper-1' && e.source === 'Strike',
      ).length;
    };
    expect(hits({})).toBe(0); // the Clapper walked off: the run is missed
    expect(hits(withFootnotes(['filings-bell-follow']))).toBe(1);
    // The miss is told: a Clapper that walked off is `filings:bell`.
    const plain = turns('D . Q . r\n. . = . .', {}, 1)[1];
    expect(lineSet(plain?.events ?? [])).toContain('filings:bell');
  });

  test('filings-bell-brass: a bell counts as brass, so Filings comes back to a bell with no brass beside it', () => {
    const scheduled = (fns: FootnoteIds) =>
      cast('D . {bell:mid} . r', FILINGS, fns).state.scheduled.map((e) => e.kind);
    expect(scheduled({})).not.toContain('filings');
    expect(scheduled(withFootnotes(['filings-bell-brass']))).toContain('filings');
  });

  test('filings-bell-twice: Filings comes back at the start of each of your next two turns', () => {
    const runs = (fns: FootnoteIds) =>
      turns(BELL, fns, 3)
        .slice(1)
        .map((r) => filingsRuns(r.events));
    expect(runs({})).toEqual([1, 0, 0]);
    expect(runs(withFootnotes(['filings-bell-twice']))).toEqual([1, 1, 0]);
  });

  test('BF-F3: filings-cap-plate: when Filings comes back and no brass touches the target, a plate lands', () => {
    const run = (fns: FootnoteIds) => {
      const first = cast('D . r = . .\n. . . . . r', FILINGS, fns, { C1: 9 });
      // The plate fades and the rat it struck is gone (a walking rat leaves a slick behind it).
      const s = structuredClone(first.state);
      s.units = s.units.filter((u) => u.id !== 'rat-1');
      const plate = s.tiles.findIndex((t) => t.state?.id === 'plate');
      if (plate >= 0)
        s.tiles[plate] = { ...s.tiles[plate], state: null } as (typeof s.tiles)[number];
      const next = endTurn(s, fns);
      return next.events.some((e) => e.type === 'landed' && e.kind === 'brass' && e.at.x === 2);
    };
    expect(run({})).toBe(false);
    expect(run(withFootnotes(['filings-cap-plate']))).toBe(true);
  });

  test('BF-F3: filings-cap-plate: brass beside the target means no plate, and a bell tile takes none', () => {
    const next = turns(BELL, withFootnotes(['filings-cap-plate']), 1)[1];
    expect(next?.events.some((e) => e.type === 'landed' && e.kind === 'brass')).toBe(false);
  });

  test('BF-F3: filings-cap-guard: when Filings comes back, you gain 1 shield', () => {
    const shield = (fns: FootnoteIds) => {
      const next = turns(BELL, fns, 1)[1];
      return unit(next?.state as BattleState, 'draughtsman').shield;
    };
    expect(shield({})).toBe(0);
    expect(shield(withFootnotes(['filings-cap-guard']))).toBe(1);
  });
});

// ── The Carillonneur's note ────────────────────────────

describe("the Carillonneur's note in the Toll margin", () => {
  const PAGE = CARILLONNEUR_PAGE.id;
  /** Witnessed `toll:bell`, Toll at level II, both solvents found. */
  const ready = (pages: Profile['pages']): Profile => ({
    ...newProfile(),
    pages,
    witnessed: ['toll:bell'],
    footnotes: { toll: { points: 999, slots: {} } },
    solventsFound: ['rivet', 'filings'],
    solvents: { ...newProfile().solvents, rivet: 4, filings: 4 },
  });
  const levelTwo = (p: Profile) => marginOf(p, 'toll').lines[0]?.frames[1];
  const offered = (p: Profile) => (levelTwo(p)?.variants ?? []).map((v) => v.id);

  test("BF-F3: the Carillonneur's note is hidden, then offered, then credited", () => {
    // Hidden until `carillonneur:tune` is held: the level II frame lists only the authored pair.
    expect(offered(ready([]))).toEqual(['toll-bell-beside', 'toll-bell-next']);
    // Offered at level II of toll:bell once the page is held, with its credit in the margin.
    const held = ready([PAGE]);
    expect(offered(held)).toEqual(['toll-bell-beside', 'toll-bell-next', CARILLONNEUR_TOLL]);
    const note = levelTwo(held)?.variants.find((v) => v.id === CARILLONNEUR_TOLL);
    expect(note?.credit).toBe("Copied from the Carillonneur's tuning sheet.");
    expect(note?.text).toBe(VARIANTS.find((v) => v.id === CARILLONNEUR_TOLL)?.text);
    // Writing it files it in the slot, credited, and the engine reads it there.
    const r = writeAt(held, 'toll', CARILLONNEUR_TOLL, { atHome: true });
    if ('error' in r) throw new Error(r.error);
    expect(r.profile.footnotes.toll?.slots['toll:bell@2']).toBe(CARILLONNEUR_TOLL);
    expect(levelTwo(r.profile)?.state).toBe('filled');
    expect(withFootnotes([CARILLONNEUR_TOLL])).toEqual({ 'toll:bell@2': CARILLONNEUR_TOLL });
  });
});
