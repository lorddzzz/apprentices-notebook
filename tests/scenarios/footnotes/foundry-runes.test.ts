import { describe, expect, test } from 'vitest';
import type { BattleState, GameEvent } from '$engine';
import type { FootnoteIds } from '$engine/ctx';
import { ev, ringTones, struckAt, unit } from '../../districts/foundry/helpers';
import { fourCombos, withFootnotes } from '../footnoteHarness';
import { withLattices } from '../harness';
import { castWith, firstSpell, step } from './castHelper';

/**
 * BF-F2: the Resonance runes' margin lines (`toll:bell`, `coil:bell`, `unison:bell`) and their
 * capstones (foundry.md section 2). Each variant runs once without and once with itself written.
 */

const NOTE = 'carillonneur:toll';
const lineSet = (events: readonly GameEvent[]): string[] =>
  events.flatMap((e) => (e.line ? [e.line] : []));
const cast = (
  s: BattleState,
  member: string,
  dir: 'left' | 'right' | 'up' | 'down',
  fns: FootnoteIds,
) => castWith(s, { kind: 'dir', dir }, fns, member);
const endTurn = (s: BattleState, fns: FootnoteIds) => step(s, { type: 'endTurn' }, fns);
/** Hits a unit took from anything but a bell's pulse. */
const hitBy = (events: readonly GameEvent[], id: string): number =>
  events.filter((e) => e.type === 'damage' && e.target.id === id && e.source !== 'Bell').length;
const pulsed = (events: readonly GameEvent[]): string[] =>
  ev(events, 'foundry:pulse').flatMap((e) => ((e.data ?? {}) as { units?: string[] }).units ?? []);

// ── Toll ───────────────────────────────────────────────

describe('toll:bell', () => {
  // The Bolt stops at the low bell (C1). A rat stands beside it, a second low bell hangs at E2, a
  // Clapper (clapper-1, low) and a Ringer on a low rope stand across the room.
  const ROOM = 'D . {bell:low} r . .\n. . . . {bell:low} .\n. . . . . Q\n. . Z{rope:low} . . .';
  const run = (footnotes: FootnoteIds) => {
    const s = withLattices(ROOM, { draughtsman: 'Bolt> Toll Strike' });
    const r = cast(s, 'draughtsman', 'right', footnotes);
    return {
      clapper: hitBy(r.events, 'clapper-1'),
      ringer: hitBy(r.events, 'ringer-1'),
      rat: hitBy(r.events, 'rat-1'),
      nextStruck: struckAt(r.events, 4, 1).length,
      lines: lineSet(r.events),
    };
  };

  test('BF-F2: fourCombos reads for every margin line (toll:bell, six combinations with the note)', () => {
    const plain = run({});
    expect(plain).toMatchObject({ clapper: 0, ringer: 0, rat: 0, nextStruck: 0 });
    expect(plain.lines).toContain('toll:bell'); // a Toll aimed at a bell joins nothing, and says so
    const lvl1: [string, string] = ['toll-bell-clappers', 'toll-bell-ringers'];
    const runs = fourCombos('toll:bell', lvl1, ['toll-bell-beside', 'toll-bell-next'], (c) =>
      run(c.footnotes),
    );
    const [cb, cn, rb, rn] = runs.map((r) => r.result);
    // clappers + beside: the Clapper and the unit beside the bell are both reached, once each.
    expect(cb).toMatchObject({ clapper: 1, ringer: 0, rat: 1, nextStruck: 0 });
    // clappers + next: the second bell is only struck; the Clapper stays the only extra target.
    expect(cn).toMatchObject({ clapper: 1, ringer: 0, rat: 0, nextStruck: 1 });
    expect(rb).toMatchObject({ clapper: 0, ringer: 1, rat: 1, nextStruck: 0 });
    expect(rn).toMatchObject({ clapper: 0, ringer: 1, rat: 0, nextStruck: 1 });
    // The note: every bell of the tone struck, the rest beside each; on top of the level I pair.
    const withNote = fourCombos('toll:bell', lvl1, [NOTE, NOTE], (c) => run(c.footnotes));
    const [nc, , nr] = withNote.map((r) => r.result);
    expect(nc).toMatchObject({ clapper: 1, ringer: 0, rat: 1, nextStruck: 1 });
    expect(nr).toMatchObject({ clapper: 0, ringer: 1, rat: 1, nextStruck: 1 });
  });

  test('toll-bell-clappers: a Toll aimed at a bell reaches the Clapper of its tone', () => {
    expect(run({}).clapper).toBe(0);
    expect(run(withFootnotes(['toll-bell-clappers'])).clapper).toBe(1);
  });

  test('toll-bell-ringers: a Toll aimed at a bell reaches the Ringer on a rope of its tone', () => {
    expect(run({}).ringer).toBe(0);
    expect(run(withFootnotes(['toll-bell-ringers'])).ringer).toBe(1);
  });

  test('toll-bell-beside: a Toll aimed at a bell reaches the unit beside it', () => {
    expect(run({}).rat).toBe(0);
    expect(run(withFootnotes(['toll-bell-beside'])).rat).toBe(1);
  });

  test('toll-bell-next: a Toll aimed at a bell strikes the nearest other bell of its tone, under the line', () => {
    expect(run({}).nextStruck).toBe(0);
    const s = withLattices(ROOM, { draughtsman: 'Bolt> Toll Strike' });
    const r = cast(s, 'draughtsman', 'right', withFootnotes(['toll-bell-next']));
    const struck = struckAt(r.events, 4, 1);
    expect(struck).toHaveLength(1);
    expect((struck[0] as unknown as GameEvent).line).toBe('toll:bell');
    // One ring of the tone, however many bells were struck.
    expect(ringTones(r.events)).toEqual(['low']);
  });

  test('carillonneur:toll: the note strikes every bell of the tone and the rest lands beside each', () => {
    // A third bell with a rat of its own beside it.
    const s = withLattices('D . {bell:low} . . .\n. . . . {bell:low} r .\n. . . . . .', {
      draughtsman: 'Bolt> Toll Strike',
    });
    const plain = cast(s, 'draughtsman', 'right', {});
    const noted = cast(s, 'draughtsman', 'right', withFootnotes([NOTE]));
    expect(hitBy(plain.events, 'rat-1')).toBe(0);
    expect(hitBy(noted.events, 'rat-1')).toBe(1); // beside the far bell, reached from the first
    expect(struckAt(noted.events, 4, 1)).toHaveLength(1);
    expect(lineSet(noted.events)).toContain('toll:bell');
  });

  test('BF-F2: toll-cap-gap: a Toll joins tiles of its state across a gap of one tile', () => {
    const run2 = (fns: FootnoteIds) => {
      const s = withLattices('D . ~ . r~ .', { draughtsman: 'Bolt> Toll Strike' });
      return hitBy(cast(s, 'draughtsman', 'right', fns).events, 'rat-1');
    };
    expect(run2({})).toBe(0);
    expect(run2(withFootnotes(['toll-cap-gap']))).toBe(1);
  });

  test("BF-F2: toll-cap-knell: the pulses of a Toll's strike push one tile further", () => {
    const run2 = (fns: FootnoteIds) => {
      const s = withLattices('D . {bell:low} r . . .', { draughtsman: 'Bolt> Toll Strike' });
      const r = cast(s, 'draughtsman', 'right', fns);
      return unit(r.state, 'rat-1').pos.x;
    };
    expect(run2({})).toBe(4);
    expect(run2(withFootnotes(['toll-cap-knell']))).toBe(5);
  });

  test('BF-F2: toll-cap-knell leaves a ring that no Toll struck as it was', () => {
    const s = withLattices('D . {bell:low} r . . .', { draughtsman: 'Bolt> Strike' });
    const r = cast(s, 'draughtsman', 'right', withFootnotes(['toll-cap-knell']));
    expect(unit(r.state, 'rat-1').pos.x).toBe(4);
  });
});

// ── Coil ───────────────────────────────────────────────

describe('coil:bell', () => {
  const COIL = '. Coil\nBolt> Spark';
  // A two-tile cloud, a bell on Coil's extra tile past its end, a rat two tiles below the bell.
  const STORM = 'D . ~ ~ {bell:low}\n. . . . .\n. . . . r';
  const run = (footnotes: FootnoteIds) => {
    const s = withLattices(STORM, { draughtsman: COIL });
    const r = cast(s, 'draughtsman', 'right', footnotes);
    return {
      struck: struckAt(r.events, 4, 0).length,
      retuned: ev(r.events, 'foundry:retuned').length,
      rings: ringTones(r.events),
      muffled: ev(r.events, 'foundry:muffled').length,
      cloud: r.events.some((e) => e.type === 'landed' && e.makes === 'cloud' && e.at.x === 4),
      ratPulsed: pulsed(r.events).includes('rat-1'),
      lines: lineSet(r.events),
    };
  };

  test('BF-F2: fourCombos reads for every margin line (coil:bell)', () => {
    const plain = run({});
    expect(plain).toMatchObject({ struck: 0, retuned: 0, rings: [], muffled: 0 });
    expect(plain.lines).toContain('coil:bell');
    const runs = fourCombos(
      'coil:bell',
      ['coil-bell-strike', 'coil-bell-retune'],
      ['coil-bell-pulse', 'coil-bell-muffle'],
      (c) => run(c.footnotes),
    );
    const [sp, sm, rp, rm] = runs.map((r) => r.result);
    // strike + pulse: the bell the burst's edge strikes rings and pulses wide.
    expect(sp).toMatchObject({ struck: 1, rings: ['low'], ratPulsed: true, muffled: 0 });
    // strike + muffle: a strike with no ring (the cloud is read at the end of the action): silent.
    expect(sm).toMatchObject({ struck: 1, rings: [], muffled: 1, cloud: true, ratPulsed: false });
    // retune + pulse: a retuned bell is not struck, so nothing rings and no pulse widens.
    expect(rp).toMatchObject({ struck: 0, retuned: 1, rings: [], ratPulsed: false });
    // retune + muffle: retuned and silenced, a quiet detune.
    expect(rm).toMatchObject({ struck: 0, retuned: 1, rings: [], cloud: true });
  });

  test('coil-bell-strike: a bell on the extra tile is struck by the burst, under the line', () => {
    expect(run({}).struck).toBe(0);
    const r = run(withFootnotes(['coil-bell-strike']));
    expect(r).toMatchObject({ struck: 1, rings: ['low'] });
  });

  test('coil-bell-retune: a bell on the extra tile is retuned one tone up instead, and not struck', () => {
    const s = withLattices(STORM, { draughtsman: COIL });
    const r = cast(s, 'draughtsman', 'right', withFootnotes(['coil-bell-retune']));
    const [retuned] = ev(r.events, 'foundry:retuned');
    expect(retuned?.data).toMatchObject({ from: 'low', to: 'mid' });
    expect(struckAt(r.events, 4, 0)).toHaveLength(0);
  });

  test('coil-bell-pulse: a ring a Coil-widened burst caused pulses one tile further', () => {
    const fns = withFootnotes(['coil-bell-strike', 'coil-bell-pulse']);
    expect(run(withFootnotes(['coil-bell-strike'])).ratPulsed).toBe(false);
    expect(run(fns).ratPulsed).toBe(true);
    // A ring no burst caused keeps the plain pulse, whatever is written.
    const s = withLattices('D . {bell:low} . .\n. . . . .\n. . r . .', {
      draughtsman: 'Bolt> Strike',
    });
    expect(pulsed(cast(s, 'draughtsman', 'right', fns).events)).not.toContain('rat-1');
  });

  test('coil-bell-muffle: a bell on the extra tile takes a cloud for one round', () => {
    expect(run({}).cloud).toBe(false);
    expect(run(withFootnotes(['coil-bell-muffle'])).cloud).toBe(true);
  });

  test('coil-bell-muffle: strike + muffle is a silent strike, a bell struck and clouded rings nothing', () => {
    const r = run(withFootnotes(['coil-bell-strike', 'coil-bell-muffle']));
    expect(r).toMatchObject({ struck: 1, muffled: 1, rings: [] });
  });

  test('BF-F2: coil-cap-surge: a widened burst that hits three units reaches one tile further, once', () => {
    const crowd = (ascii: string, fns: FootnoteIds, far: string) => {
      const s = withLattices(ascii, { draughtsman: COIL });
      const r = cast(s, 'draughtsman', 'right', fns);
      return {
        far: hitBy(r.events, far),
      };
    };
    // Three rats in Coil's reach (beside the cloud), a fourth one tile past it.
    const three = 'D . ~ ~ r .\n. . r r r .';
    expect(crowd(three, {}, 'rat-4').far).toBe(0);
    expect(crowd(three, withFootnotes(['coil-cap-surge']), 'rat-4').far).toBe(1);
    // Two units in reach are not a crowd: the headline stays one tile.
    const two = 'D . ~ ~ . .\n. . r r r .';
    expect(crowd(two, withFootnotes(['coil-cap-surge']), 'rat-3').far).toBe(0);
  });
});

// ── Unison ─────────────────────────────────────────────

describe('unison:bell', () => {
  const PAGES = { stoker: 'Bolt> Strike', draughtsman: 'Bolt> Unison Strike' } as const;
  const triggered = (events: readonly GameEvent[]): boolean[] =>
    events.flatMap((e) => (e.type === 'triggered' ? [e.passed] : []));

  /** The stoker lands on bell C1; the draughtsman (below it) answers on its tone-mate A3. */
  const TONE = '. . {bell:mid} . S\n. . . . .\n{bell:mid} . D . r';
  /** The stoker's cast lands on a rat beside bell C1; the draughtsman beside it answers on the bell. */
  const BESIDE = '. . {bell:mid} r S\n. . D . .\nd . . . .';
  /** The stoker lands on the bell; the next turn the draughtsman (beside it) answers on it. */
  const LATER = '. . {bell:mid} . S\n. . D . .\nd . . . .';

  const toneRun = (fns: FootnoteIds) => {
    const first = cast(withLattices(TONE, PAGES), 'stoker', 'left', fns);
    const r = cast(first.state, 'draughtsman', 'left', fns);
    return { passed: triggered(r.events), lines: lineSet(r.events) };
  };
  const besideRun = (fns: FootnoteIds) => {
    const first = cast(withLattices(BESIDE, PAGES), 'stoker', 'left', fns);
    const hp = unit(first.state, 'draughtsman').hp;
    const r = cast(first.state, 'draughtsman', 'up', fns);
    return {
      passed: triggered(r.events),
      rang: ringTones(r.events),
      draughtsmanHp: hp - unit(r.state, 'draughtsman').hp,
    };
  };
  const laterRun = (fns: FootnoteIds) => {
    const first = cast(withLattices(LATER, PAGES), 'stoker', 'left', fns);
    const next = endTurn(first.state, fns);
    const r = cast(next.state, 'draughtsman', 'up', fns);
    return { passed: triggered(r.events) };
  };

  test('BF-F2: fourCombos reads for every margin line (unison:bell)', () => {
    expect(toneRun({}).passed).toEqual([false]);
    expect(toneRun({}).lines).toContain('unison:bell');
    expect(besideRun({}).passed).toEqual([false]);
    expect(laterRun({}).passed).toEqual([false]);
    const runs = fourCombos(
      'unison:bell',
      ['unison-bell-tone', 'unison-bell-beside'],
      ['unison-bell-lingers', 'unison-bell-hush'],
      (c) => ({
        tone: toneRun(c.footnotes),
        beside: besideRun(c.footnotes),
        later: laterRun(c.footnotes),
      }),
    );
    const [tl, th, bl, bh] = runs.map((r) => r.result);
    // tone + lingers: a cast on one bell counts for every bell of its tone, now and next turn.
    expect(tl?.tone.passed).toEqual([true]);
    expect(tl?.later.passed).toEqual([true]);
    // tone + hush: tone-wide; the answering ring is tone-mate's, which already hums: nothing rings.
    expect(th?.tone.passed).toEqual([true]);
    expect(th?.later.passed).toEqual([false]);
    // beside + lingers: a cast beside a bell counts, and a cast on it lingers.
    expect(bl?.beside.passed).toEqual([true]);
    expect(bl?.later.passed).toEqual([true]);
    expect(bl?.beside.draughtsmanHp).toBe(1); // the plain pulse reached the apprentice beside the bell
    // beside + hush: the same pass, and the ring it causes does not pulse the party.
    expect(bh?.beside.passed).toEqual([true]);
    expect(bh?.beside.rang).toEqual(['mid']);
    expect(bh?.beside.draughtsmanHp).toBe(0);
    expect(bh?.tone.passed).toEqual([false]);
  });

  test('unison-bell-tone: a cast on a bell counts for Unison on every bell of its tone', () => {
    expect(toneRun(withFootnotes(['unison-bell-tone'])).passed).toEqual([true]);
  });

  test('unison-bell-beside: a cast beside a bell counts for Unison on it', () => {
    expect(besideRun(withFootnotes(['unison-bell-beside'])).passed).toEqual([true]);
  });

  test('unison-bell-lingers: a cast on a bell still counts during your next turn', () => {
    expect(laterRun({}).passed).toEqual([false]);
    expect(laterRun(withFootnotes(['unison-bell-lingers'])).passed).toEqual([true]);
  });

  test('unison-bell-lingers: it counts two turns, not three', () => {
    const fns = withFootnotes(['unison-bell-lingers']);
    const first = cast(withLattices(LATER, PAGES), 'stoker', 'left', fns);
    const second = endTurn(endTurn(first.state, fns).state, fns);
    expect(triggered(cast(second.state, 'draughtsman', 'up', fns).events)).toEqual([false]);
  });

  test('unison-bell-hush: a ring a passed Unison caused does not pulse your own party', () => {
    const fns = withFootnotes(['unison-bell-beside', 'unison-bell-hush']);
    expect(besideRun(withFootnotes(['unison-bell-beside'])).draughtsmanHp).toBe(1);
    const r = besideRun(fns);
    expect(r.draughtsmanHp).toBe(0);
    expect(r.passed).toEqual([true]);
  });

  test('BF-F2: unison-cap-three: when two other apprentices signed the target, the rest acts twice', () => {
    const lattices = {
      stoker: 'Bolt> Strike',
      draughtsman: 'Bolt> Strike',
      runaway: 'Bolt> Unison Strike',
    } as const;
    // The stoker (E1, from the right) and the draughtsman (C3, from below) hit the dummy at C1; the
    // runaway (A1, from the left) answers it with a Unison.
    const run = (fns: FootnoteIds, signers: ('stoker' | 'draughtsman')[]) => {
      const s = withLattices('R . d . S\n. . . . .\n. . D . .', lattices, { hp: { C1: 9 } });
      let state = s;
      for (const who of signers)
        state = cast(state, who, who === 'stoker' ? 'left' : 'up', fns).state;
      const r = cast(state, 'runaway', 'right', fns);
      return r.events.filter(
        (e) => e.type === 'damage' && e.target.id === 'dummy-1' && e.source === 'Strike',
      ).length;
    };
    const cap = withFootnotes(['unison-cap-three']);
    expect(run({}, ['stoker', 'draughtsman'])).toBe(1);
    expect(run(cap, ['stoker', 'draughtsman'])).toBe(2);
    // One signer is a pair, not a trio.
    expect(run(cap, ['stoker'])).toBe(1);
  });

  test('BF-F2: unison-cap-share: each apprentice whose cast signed a passing Unison gains 1 shield', () => {
    const run = (fns: FootnoteIds) => {
      const s = withLattices('. . {bell:mid} . S\n. . . . .\n. . D . r', PAGES);
      const a = cast(s, 'stoker', 'left', fns);
      const b = cast(a.state, 'draughtsman', 'up', fns);
      return {
        stoker: unit(b.state, 'stoker').shield,
        draughtsman: unit(b.state, 'draughtsman').shield,
        events: b.events,
      };
    };
    expect(run({}).stoker).toBe(0);
    const shared = run(withFootnotes(['unison-cap-share']));
    expect(shared.stoker).toBe(1); // the one who signed it
    expect(shared.draughtsman).toBe(0); // the caster is not a signer
    expect(shared.events.some((e) => e.type === 'shieldGained' && e.line === 'unison:bell')).toBe(
      true,
    );
  });
});
