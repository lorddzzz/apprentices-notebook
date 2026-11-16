import { describe, expect, test } from 'vitest';
import {
  type BattleState,
  type GameEvent,
  label,
  type Origin,
  parseLabel,
  tileAt,
  type Unit,
} from '$engine';
import type { FootnoteIds } from '$engine/ctx';
import { parseGuildHand } from '$engine/districts/cartographers/guildHand';
import {
  GUILD_HAND_RULE_ID,
  type GuildHandState,
  PENCIL_PIECE,
} from '$engine/districts/cartographers/types';
import { applyMark } from '$engine/marks';
import { listRules } from '$engine/rules';
import type { Bound } from '$engine/types';
import { fourCombos, withFootnotes } from '../footnoteHarness';
import { draft, withLattices } from '../harness';
import { castWith, step, tileAim } from './castHelper';

/**
 * CG-F3: the Board runes' margin lines (`swap:held`, `swap:unit`, `draw:jar`, `draw:drop`,
 * `erase:unit`, `erase:mark`) and their capstones (cartographers.md sections 2 and 3). Each
 * variant runs once without and once with itself written.
 */

const NOTE = 'registrar:swap';
const ORIGIN: Origin = { caster: 'draughtsman', spell: '0,0', cast: 1 };
const GUARD: Bound = { action: 'guard', event: 'hit', solvent: null, heading: null };

const unit = (s: BattleState, id: string): Unit => {
  const u = s.units.find((x) => x.id === id);
  if (!u) throw new Error(`no unit ${id}`);
  return u;
};
const count = (events: readonly GameEvent[], type: GameEvent['type']): number =>
  events.filter((e) => e.type === type).length;
const lines = (events: readonly GameEvent[]): string[] =>
  events.flatMap((e) => (e.line ? [e.line] : []));
const pieceOf = (s: BattleState, lbl: string): string | null => {
  const p = tileAt(s, parseLabel(lbl)).piece;
  if (!p) return null;
  if (p.id !== PENCIL_PIECE) return p.id.replace('cartographers:', '');
  const d = p.data as { fate: string | null; due: number | null };
  return d.fate ? `pencil ${d.fate}@${d.due}` : 'pencil';
};
const stateOf = (s: BattleState, lbl: string): string | null =>
  tileAt(s, parseLabel(lbl)).state?.id ?? null;
const touch = (s: BattleState, lbl: string, fns: FootnoteIds, member = 'draughtsman') =>
  castWith(s, tileAim(lbl), fns, member);

/** The guild's hand listed as a hall lists it, with no new pencil planned (the note needs the hand). */
const hall = (s: BattleState): BattleState => {
  const t = structuredClone(s);
  t.rules = listRules(t, [GUILD_HAND_RULE_ID], {
    [GUILD_HAND_RULE_ID]: { seed: 1, perRound: 0, redraw: 0 },
  });
  return t;
};
const circlesOf = (s: BattleState): GuildHandState['circles'] =>
  parseGuildHand(s.rules?.[GUILD_HAND_RULE_ID]).circles;

// ── swap:held ──────────────────────────────────────────

describe('swap:held', () => {
  // A held rat at B1 with a second rat below it; or the Draughtsman held and the rat free.
  const ROOM = 'D r . .\n. r . .';
  const meet = (fns: FootnoteIds, who: 'target' | 'caster') => {
    const s = withLattices(ROOM, { draughtsman: 'Touch> Swap' });
    unit(s, who === 'target' ? 'rat-1' : 'draughtsman').held = 2;
    const r = touch(s, 'B1', fns);
    return {
      at: label(unit(r.state, 'draughtsman').pos),
      rat2: label(unit(r.state, 'rat-2').pos),
      ratHeld: unit(r.state, 'rat-1').held,
      held: unit(r.state, 'draughtsman').held,
      shield: unit(r.state, 'draughtsman').shield,
      lines: [...new Set(lines(r.events))],
    };
  };

  test('CG-F3: fourCombos reads for every margin line (swap:held)', () => {
    expect(meet({}, 'target')).toMatchObject({ at: 'A1', rat2: 'B2', ratHeld: 2, shield: 0 });
    expect(meet({}, 'target').lines).toContain('swap:held');
    const runs = fourCombos(
      'swap:held',
      ['swap-held-around', 'swap-held-slip'],
      ['swap-held-ease', 'swap-held-brace'],
      (c) => ({ target: meet(c.footnotes, 'target'), caster: meet(c.footnotes, 'caster') }),
    );
    const [ae, ab, se, sb] = runs.map((r) => r.result);
    // around + ease: the aimed unit's hold shortens and the Swap goes on around it.
    expect(ae?.target).toMatchObject({ at: 'B2', rat2: 'A1', ratHeld: 1 });
    expect(ab?.target).toMatchObject({ at: 'B2', rat2: 'A1', ratHeld: 2, shield: 1 });
    // slip does nothing for a held target: the refusal stands; ease and brace still pay.
    expect(se?.target).toMatchObject({ at: 'A1', ratHeld: 1, shield: 0 });
    expect(sb?.target).toMatchObject({ at: 'A1', ratHeld: 2, shield: 1 });
    // slip: your own hold ends and you trade places; around leaves a held caster refused.
    expect(se?.caster).toMatchObject({ at: 'B1', held: 0, shield: 0 });
    expect(sb?.caster).toMatchObject({ at: 'B1', held: 0, shield: 1 });
    expect(ae?.caster).toMatchObject({ at: 'A1', held: 1 });
    expect(ab?.caster).toMatchObject({ at: 'A1', held: 2, shield: 1 });
  });

  test('swap-held-around: a Swap aimed at a held unit trades with the first unheld unit beside it', () => {
    expect(meet({}, 'target')).toMatchObject({ at: 'A1', rat2: 'B2' });
    expect(meet(withFootnotes(['swap-held-around']), 'target')).toMatchObject({
      at: 'B2',
      rat2: 'A1',
    });
  });

  test('swap-held-slip: a held caster still trades places, and the hold ends', () => {
    expect(meet({}, 'caster')).toMatchObject({ at: 'A1', held: 2 });
    expect(meet(withFootnotes(['swap-held-slip']), 'caster')).toMatchObject({
      at: 'B1',
      held: 0,
    });
  });

  test('swap-held-ease: a Swap that meets a hold lifts one turn off it', () => {
    expect(meet({}, 'target').ratHeld).toBe(2);
    expect(meet(withFootnotes(['swap-held-ease']), 'target').ratHeld).toBe(1);
  });

  test('swap-held-brace: a Swap that meets a hold gives you 1 shield, refused or not', () => {
    expect(meet({}, 'target').shield).toBe(0);
    const braced = meet(withFootnotes(['swap-held-brace']), 'target');
    expect(braced).toMatchObject({ shield: 1, at: 'A1' });
  });
});

// ── swap:unit ──────────────────────────────────────────

describe('swap:unit', () => {
  // Both tiles carry pencil: the Draughtsman on A1 (rub), a rat on B1 (ink). A Swap trades them.
  const ROOM = 'D{pencil:rub@3} r{pencil:ink@3} . . r\n. . . . .';
  const run = (fns: FootnoteIds, room = ROOM) => {
    const s = hall(withLattices(room, { draughtsman: 'Touch> Swap' }));
    const r = touch(s, 'B1', fns);
    return {
      a1: pieceOf(r.state, 'A1'),
      b1: pieceOf(r.state, 'B1'),
      ratHeld: unit(r.state, 'rat-1').held,
      circles: circlesOf(r.state)?.length ?? 0,
      lines: [...new Set(lines(r.events))],
      events: r.events,
    };
  };
  const view = ({ events: _e, lines: _l, ...rest }: ReturnType<typeof run>) => rest;

  test('CG-F3: fourCombos reads for every margin line (swap:unit, six combinations with the note)', () => {
    const plain = run({});
    expect(view(plain)).toEqual({ a1: 'pencil rub@3', b1: 'pencil ink@3', ratHeld: 0, circles: 0 });
    expect(plain.lines).toContain('swap:unit');
    const lvl1: [string, string] = ['swap-unit-carry', 'swap-unit-strand'];
    const runs = fourCombos('swap:unit', lvl1, ['swap-unit-ink', 'swap-unit-due'], (c) =>
      view(run(c.footnotes)),
    );
    const [ci, cd, si, sd] = runs.map((r) => r.result);
    // carry + ink: the carried rub pencil is inked where you arrive; the foe keeps the other's paper.
    expect(ci).toEqual({ a1: 'pencil ink@3', b1: null, ratHeld: 0, circles: 0 });
    // carry + due: both carried pencils arrive a round later due.
    expect(cd).toEqual({ a1: 'pencil ink@4', b1: 'pencil rub@4', ratHeld: 0, circles: 0 });
    // strand + ink: you on inked paper, the foe held on pencil.
    expect(si).toEqual({ a1: 'pencil rub@3', b1: null, ratHeld: 1, circles: 0 });
    expect(sd).toEqual({ a1: 'pencil rub@4', b1: 'pencil ink@4', ratHeld: 1, circles: 0 });
    // The note: a third level II option; the foe on pencil is circled, whichever level I is written.
    const noted = fourCombos('swap:unit', lvl1, [NOTE, NOTE], (c) => view(run(c.footnotes)));
    expect(noted[0]?.result).toEqual({
      a1: 'pencil ink@3',
      b1: 'pencil rub@3',
      ratHeld: 0,
      circles: 1,
    });
    expect(noted[2]?.result).toEqual({
      a1: 'pencil rub@3',
      b1: 'pencil ink@3',
      ratHeld: 1,
      circles: 1,
    });
  });

  test('swap-unit-carry: each unit takes the pencil under it to its new tile', () => {
    expect(run({}).a1).toBe('pencil rub@3');
    expect(view(run(withFootnotes(['swap-unit-carry'])))).toMatchObject({
      a1: 'pencil ink@3',
      b1: 'pencil rub@3',
    });
  });

  test('swap-unit-strand: a foe the Swap leaves on pencil is held', () => {
    expect(run({}).ratHeld).toBe(0);
    expect(run(withFootnotes(['swap-unit-strand'])).ratHeld).toBe(1);
    // Left on plain paper, it is not.
    expect(run(withFootnotes(['swap-unit-strand']), 'D r{pencil} . . r').ratHeld).toBe(0);
  });

  test('swap-unit-ink: the pencil you are left standing on is inked in', () => {
    expect(run({}).b1).toBe('pencil ink@3');
    const r = run(withFootnotes(['swap-unit-ink']));
    expect(r.b1).toBeNull();
    expect(count(r.events, 'cartographers:inked' as GameEvent['type'])).toBe(1);
  });

  test('swap-unit-due: every pencil tile under the pair has its fate put off a round', () => {
    expect(view(run(withFootnotes(['swap-unit-due'])))).toMatchObject({
      a1: 'pencil rub@4',
      b1: 'pencil ink@4',
    });
    // An unplanned pencil is untouched.
    expect(run(withFootnotes(['swap-unit-due']), 'D{pencil} r{pencil} . . r').a1).toBe('pencil');
  });

  test('registrar:swap: a foe left on pencil is circled, and only inside a hall', () => {
    const noted = run(withFootnotes([NOTE]));
    expect(noted.circles).toBe(1);
    expect(count(noted.events, 'cartographers:circled' as GameEvent['type'])).toBe(1);
    // No pencil under the foe: no circle. No hand listed: the note never fires.
    expect(run(withFootnotes([NOTE]), 'D r{pencil} . . r').circles).toBe(0);
    const s = withLattices(ROOM, { draughtsman: 'Touch> Swap' });
    const bare = touch(s, 'B1', withFootnotes([NOTE]));
    expect(count(bare.events, 'cartographers:circled' as GameEvent['type'])).toBe(0);
  });

  test('registrar:swap: a circled foe still on pencil at round end is erased; one that steps off is not', () => {
    const s = hall(withLattices(ROOM, { draughtsman: 'Touch> Swap' }));
    const circled = touch(s, 'B1', withFootnotes([NOTE])).state;
    expect(circlesOf(circled)).toEqual([
      { at: { x: 0, y: 0 }, unit: 'rat-1', holder: 'draughtsman' },
    ]);
    // Held so it cannot walk off on its own turn: it is on its circled tile when the round closes.
    const stays = structuredClone(circled);
    unit(stays, 'rat-1').held = 2;
    const end = step(stays, { type: 'endTurn' }, withFootnotes([NOTE]));
    expect(count(end.events, 'cartographers:struck' as GameEvent['type'])).toBe(1);
    expect(unit(end.state, 'rat-1').hp).toBe(0);
    expect(circlesOf(end.state)).toBeUndefined(); // omitted once spent
    // A foe that stepped off the circled tile is let go.
    const left = structuredClone(circled);
    unit(left, 'rat-1').pos = parseLabel('C2');
    unit(left, 'rat-1').held = 2;
    const free = step(left, { type: 'endTurn' }, withFootnotes([NOTE]));
    expect(count(free.events, 'cartographers:struck' as GameEvent['type'])).toBe(0);
    expect(unit(free.state, 'rat-1').hp).toBeGreaterThan(0);
    expect(circlesOf(free.state)).toBeUndefined();
  });

  test("registrar:swap: the holder's fall lifts the circle", () => {
    const s = hall(withLattices(ROOM, { draughtsman: 'Touch> Swap' }));
    const circled = touch(s, 'B1', withFootnotes([NOTE])).state;
    unit(circled, 'rat-1').held = 2;
    unit(circled, 'draughtsman').hp = 0;
    const end = step(circled, { type: 'endTurn' }, withFootnotes([NOTE]));
    expect(count(end.events, 'cartographers:struck' as GameEvent['type'])).toBe(0);
  });
});

// ── Swap capstones ─────────────────────────────────────

describe('swap capstones', () => {
  test('CG-F3: one scenario per capstone (swap)', () => {
    const step1 = (fns: FootnoteIds, room: string, aim: string) => {
      const s = withLattices(room, { draughtsman: 'Touch> Swap' });
      const r = touch(s, aim, fns);
      return label(unit(r.state, 'draughtsman').pos);
    };
    // swap-cap-step: nobody at the target, so you step onto empty paper within two.
    expect(step1({}, 'D . . r', 'B1')).toBe('A1');
    expect(step1(withFootnotes(['swap-cap-step']), 'D . . r', 'B1')).toBe('B1');
    expect(step1(withFootnotes(['swap-cap-step']), 'D {blank} . r', 'B1')).toBe('A1'); // never blank
  });

  test('swap-cap-pact: a Swap with a friend gives you both 1 shield', () => {
    const shields = (fns: FootnoteIds, room: string) => {
      const s = withLattices(room, { draughtsman: 'Touch> Swap' });
      const r = touch(s, 'B1', fns);
      return [unit(r.state, 'draughtsman').shield, unit(r.state, 'stoker').shield];
    };
    expect(shields({}, 'D S . r')).toEqual([0, 0]);
    expect(shields(withFootnotes(['swap-cap-pact']), 'D S . r')).toEqual([1, 1]);
    expect(shields(withFootnotes(['swap-cap-pact']), 'D r . S')).toEqual([0, 0]); // a foe is no friend
  });
});

// ── draw:jar ───────────────────────────────────────────

describe('draw:jar', () => {
  /** The Stoker seals a jar on B2; the Draughtsman (A2) then draws it along the row. */
  const jarRoom = (row: string): BattleState => {
    const s = withLattices(`. S . . . d\n${row}`, {
      stoker: 'Touch> Jar Guard',
      draughtsman: 'Touch> Draw',
    });
    return touch(s, 'B2', {}, 'stoker').state;
  };
  const jarsOn = (s: BattleState): string[] =>
    s.tiles.flatMap((t, i) =>
      t.jar ? [`${label({ x: i % s.width, y: Math.floor(i / s.width) })}:${t.jar.owner}`] : [],
    );
  const draw = (room: BattleState, fns: FootnoteIds) => touch(room, 'B2', fns);

  /** The jar's end tile along an empty lane, whether it opened under a foe, and a jar trade. */
  const scenario = (fns: FootnoteIds) => {
    const lane = draw(jarRoom('D . . . . r'), fns);
    const under = draw(jarRoom('D . r . . .'), fns);
    const crowded = jarRoom('D . . . . d');
    const t = tileAt(crowded, parseLabel('C2'));
    const b = tileAt(crowded, parseLabel('B2'));
    if (!b.jar) throw new Error('no jar');
    t.jar = { ...structuredClone(b.jar), owner: 'draughtsman', id: 90, seq: 90 };
    const traded = draw(crowded, fns);
    return {
      lane: jarsOn(lane.state),
      opened: count(under.events, 'jarOpened'),
      under: jarsOn(under.state),
      traded: jarsOn(traded.state),
    };
  };

  test('CG-F3: fourCombos reads for every margin line (draw:jar)', () => {
    expect(scenario({})).toEqual({
      lane: ['C2:stoker'],
      opened: 1,
      under: [],
      traded: ['B2:stoker', 'C2:draughtsman'],
    });
    const runs = fourCombos(
      'draw:jar',
      ['draw-jar-slide', 'draw-jar-quiet'],
      ['draw-jar-trade', 'draw-jar-claim'],
      (c) => scenario(c.footnotes),
    );
    const [st, sc, qt, qc] = runs.map((r) => r.result);
    // slide + trade: the lane is run to its end; the jar traded stays the one traded.
    expect(st).toMatchObject({ lane: ['E2:stoker'], traded: ['B2:draughtsman', 'C2:stoker'] });
    // slide + claim: the jar is yours where it ends.
    expect(sc).toMatchObject({ lane: ['E2:draughtsman'], traded: ['B2:stoker', 'C2:draughtsman'] });
    // quiet + trade: nothing opens under the foe, and the traded pair arrives quiet too.
    expect(qt).toMatchObject({ lane: ['C2:stoker'], opened: 0, under: ['C2:stoker'] });
    expect(qt?.traded).toEqual(['B2:draughtsman', 'C2:stoker']);
    expect(qc).toMatchObject({ lane: ['C2:draughtsman'], opened: 0 });
  });

  test('draw-jar-slide: a jar you Draw keeps going until the next tile holds a unit, a jar, blank paper or the edge', () => {
    expect(jarsOn(draw(jarRoom('D . . . . r'), {}).state)).toEqual(['C2:stoker']);
    const slid = (room: string) =>
      jarsOn(draw(jarRoom(room), withFootnotes(['draw-jar-slide'])).state);
    expect(slid('D . . . . r')).toEqual(['E2:stoker']);
    expect(slid('D . . {blank} . d')).toEqual(['C2:stoker']);
    expect(slid('D . . . . .')).toEqual(['F2:stoker']);
  });

  test('draw-jar-quiet: a jar you Draw does not open on arrival, even under a unit', () => {
    expect(count(draw(jarRoom('D . r . . .'), {}).events, 'jarOpened')).toBe(1);
    const q = draw(jarRoom('D . r . . .'), withFootnotes(['draw-jar-quiet']));
    expect(count(q.events, 'jarOpened')).toBe(0);
    expect(jarsOn(q.state)).toEqual(['C2:stoker']);
  });

  test('draw-jar-trade: a jar you Draw onto another jar trades places with it', () => {
    expect(scenario({}).traded).toEqual(['B2:stoker', 'C2:draughtsman']);
    expect(scenario(withFootnotes(['draw-jar-trade'])).traded).toEqual([
      'B2:draughtsman',
      'C2:stoker',
    ]);
  });

  test('draw-jar-claim: a jar you Draw becomes yours', () => {
    expect(scenario({}).lane).toEqual(['C2:stoker']);
    expect(scenario(withFootnotes(['draw-jar-claim'])).lane).toEqual(['C2:draughtsman']);
  });
});

// ── draw:drop ──────────────────────────────────────────

describe('draw:drop', () => {
  // A slick at B1, blank paper at C1, free paper beyond. The Draughtsman draws it right.
  const ROOM = 'D o {blank} . r';
  const run = (fns: FootnoteIds) => {
    const s = withLattices(ROOM, { draughtsman: 'Touch> Draw' });
    const r = touch(s, 'B1', fns);
    return {
      b1: stateOf(r.state, 'B1'),
      d1: stateOf(r.state, 'D1'),
      c1: pieceOf(r.state, 'C1'),
      shield: unit(r.state, 'draughtsman').shield,
      lines: [...new Set(lines(r.events))],
    };
  };

  test('CG-F3: fourCombos reads for every margin line (draw:drop)', () => {
    expect(run({})).toMatchObject({ b1: 'slick', d1: null, c1: 'blank', shield: 0 });
    expect(run({}).lines).toContain('draw:drop');
    const runs = fourCombos(
      'draw:drop',
      ['draw-drop-over', 'draw-drop-mend'],
      ['draw-drop-yield', 'draw-drop-spend'],
      (c) => run(c.footnotes),
    );
    const [oy, os, my, ms] = runs.map((r) => r.result);
    // over clears the gap, so nothing is refused: neither yield nor spend fires.
    expect(oy).toMatchObject({ b1: null, d1: 'slick', c1: 'blank', shield: 0 });
    expect(os).toMatchObject({ b1: null, d1: 'slick', c1: 'blank' });
    // mend + yield: the hole is pencilled and you gain a shield; the Draw still fails.
    expect(my).toMatchObject({ b1: 'slick', c1: 'pencil', shield: 1 });
    // mend + spend: spend decides, so the tile ends inked and not pencil.
    expect(ms).toMatchObject({ b1: null, d1: null, c1: null });
  });

  test('draw-drop-over: a Draw hops over one blank tile to the paper beyond it', () => {
    expect(run(withFootnotes(['draw-drop-over'])).d1).toBe('slick');
    // A tile beyond that is blank too: refused as ever.
    const s = withLattices('D o {blank} {blank} r', { draughtsman: 'Touch> Draw' });
    const r = touch(s, 'B1', withFootnotes(['draw-drop-over']));
    expect(stateOf(r.state, 'B1')).toBe('slick');
  });

  test('draw-drop-mend: a Draw refused by blank paper pencils the blank tile in, bare', () => {
    const r = run(withFootnotes(['draw-drop-mend']));
    expect(r).toMatchObject({ c1: 'pencil', b1: 'slick' });
  });

  test('draw-drop-yield: a Draw refused by blank paper gives you 1 shield', () => {
    expect(run({}).shield).toBe(0);
    expect(run(withFootnotes(['draw-drop-yield'])).shield).toBe(1);
  });

  test('draw-drop-spend: the state a Draw is refused at blank paper is spent, and the tile inked in', () => {
    const r = run(withFootnotes(['draw-drop-spend']));
    expect(r).toMatchObject({ b1: null, c1: null });
    const s = withLattices(ROOM, { draughtsman: 'Touch> Draw' });
    expect(count(touch(s, 'B1', withFootnotes(['draw-drop-spend'])).events, 'stateFades')).toBe(1);
  });
});

// ── Draw capstones ─────────────────────────────────────

describe('draw capstones', () => {
  test('CG-F3: one scenario per capstone (draw)', () => {
    // draw-cap-mix: a slick drawn onto a blot mixes as if landed (a compound, not a refusal).
    const mixed = (fns: FootnoteIds) => {
      const s = withLattices('D o i . r', { draughtsman: 'Touch> Draw' });
      const r = touch(s, 'B1', fns);
      return {
        b1: stateOf(r.state, 'B1'),
        c1: stateOf(r.state, 'C1'),
        mixed: count(r.events, 'mixed'),
      };
    };
    expect(mixed({})).toEqual({ b1: 'slick', c1: 'blot', mixed: 0 });
    const m = mixed(withFootnotes(['draw-cap-mix']));
    expect(m.b1).toBeNull();
    expect(m.c1).not.toBe('blot');
    expect(m.mixed).toBe(1);
    // draw-cap-drag: the unit standing on the drawn state goes one tile along too.
    const dragged = (fns: FootnoteIds) => {
      const s = withLattices('D ri . . r', { draughtsman: 'Touch> Draw' });
      const r = touch(s, 'B1', fns);
      return label(unit(r.state, 'rat-1').pos);
    };
    expect(dragged({})).toBe('B1');
    expect(dragged(withFootnotes(['draw-cap-drag']))).toBe('C1');
  });

  test('draw-cap-mix: a compound is not mixed onto a state: refused as today', () => {
    const s = withLattices('D {stain} i . r', { draughtsman: 'Touch> Draw' });
    const r = touch(s, 'B1', withFootnotes(['draw-cap-mix']));
    expect(stateOf(r.state, 'B1')).toBe('stain');
    expect(stateOf(r.state, 'C1')).toBe('blot');
  });
});

// ── erase:unit ─────────────────────────────────────────

describe('erase:unit', () => {
  // The Draughtsman un-draws B1 under a rat. B2 is pencil under the Stoker, C1 holds a slick.
  const ROOM = 'D r{pencil} o .\n. S{pencil} . d';
  const run = (fns: FootnoteIds) => {
    const s = withLattices(ROOM, { draughtsman: 'Touch> Erase' });
    const r = touch(s, 'B1', fns);
    const stoker = unit(r.state, 'stoker');
    return {
      rat: unit(r.state, 'rat-1').out ?? (unit(r.state, 'rat-1').hp > 0 ? 'here' : 'dead'),
      b1: pieceOf(r.state, 'B1'),
      b2: pieceOf(r.state, 'B2'),
      c1: stateOf(r.state, 'C1'),
      stoker: stoker.out ?? (stoker.hp > 0 ? label(stoker.pos) : 'dead'),
      lines: [...new Set(lines(r.events))],
    };
  };
  const view = ({ lines: _l, ...rest }: ReturnType<typeof run>) => rest;

  test('CG-F3: fourCombos reads for every margin line (erase:unit)', () => {
    const plain = run({});
    expect(view(plain)).toEqual({
      rat: 'erased',
      b1: 'blank',
      b2: 'pencil',
      c1: 'slick',
      stoker: 'B2',
    });
    expect(plain.lines).toContain('erase:unit');
    const runs = fourCombos(
      'erase:unit',
      ['erase-unit-trace', 'erase-unit-wide'],
      ['erase-unit-spare', 'erase-unit-sweep'],
      (c) => view(run(c.footnotes)),
    );
    const [ts, tw, ws, ww] = runs.map((r) => r.result);
    // trace + spare: the tile stays pencil; nobody else was on it.
    expect(ts).toEqual({ rat: 'erased', b1: 'pencil', b2: 'pencil', c1: 'slick', stoker: 'B2' });
    // trace + sweep: pencil stays, the slick beside is cleared.
    expect(tw).toEqual({ rat: 'erased', b1: 'pencil', b2: 'pencil', c1: null, stoker: 'B2' });
    // wide + spare: the member on a neighbouring pencil is set down, not erased.
    expect(ws?.b2).toBe('blank');
    expect(ws?.stoker).not.toBe('erased');
    expect(ws?.stoker).not.toBe('B2');
    // wide + sweep: the Stoker is erased, and the slick beside goes.
    expect(ww).toMatchObject({ b1: 'blank', b2: 'blank', c1: null, stoker: 'erased' });
  });

  test('erase-unit-trace: a tile you un-draw turns back to bare pencil; the foe is still erased', () => {
    expect(run(withFootnotes(['erase-unit-trace']))).toMatchObject({ b1: 'pencil', rat: 'erased' });
  });

  test('erase-unit-wide: an Erase on pencil also un-draws every pencil tile touching the first', () => {
    expect(run({}).b2).toBe('pencil');
    expect(run(withFootnotes(['erase-unit-wide'])).b2).toBe('blank');
  });

  test('erase-unit-spare: a party member on pencil you un-draw is set down on the nearest paper', () => {
    // The Stoker stands on the tile aimed at.
    const s = withLattices('D S{pencil} . . r', { draughtsman: 'Touch> Erase' });
    const plain = touch(s, 'B1', {});
    expect(unit(plain.state, 'stoker').out).toBe('erased');
    const spared = touch(s, 'B1', withFootnotes(['erase-unit-spare']));
    expect(unit(spared.state, 'stoker').out ?? null).toBeNull();
    expect(label(unit(spared.state, 'stoker').pos)).toBe('C1');
    expect(pieceOf(spared.state, 'B1')).toBe('blank');
    // A foe on it is erased as ever.
    expect(run(withFootnotes(['erase-unit-spare'])).rat).toBe('erased');
  });

  test('erase-unit-sweep: the states and jars beside an un-drawn tile are erased too', () => {
    expect(run({}).c1).toBe('slick');
    expect(run(withFootnotes(['erase-unit-sweep'])).c1).toBeNull();
  });
});

// ── erase:mark ─────────────────────────────────────────

describe('erase:mark', () => {
  const run = (fns: FootnoteIds, room: string, bound: boolean) => {
    const s = draft(withLattices(room, { draughtsman: 'Touch> Erase' }), (ctx) => {
      for (const u of ctx.s.units) {
        if (u.kind === 'enemy' || u.id === 'stoker') {
          applyMark(ctx, u, { deep: false, bound: bound ? GUARD : null, origin: ORIGIN });
        }
      }
    }).state;
    const r = touch(s, 'B1', fns);
    const mark = (id: string): string | null => {
      const u = r.state.units.find((x) => x.id === id);
      if (!u) return null;
      return u.mark ? (u.mark.bound ? 'bound' : 'plain') : null;
    };
    return {
      first: mark('rat-1'),
      beside: mark('rat-2'),
      friend: mark('stoker'),
      shield: [
        unit(r.state, 'rat-1').shield,
        r.state.units.find((x) => x.id === 'stoker')?.shield ?? 0,
      ],
      released: count(r.events, 'released'),
    };
  };
  const ROOM = 'D r r .\n. S . d';

  test('CG-F3: fourCombos reads for every margin line (erase:mark)', () => {
    expect(run({}, ROOM, true)).toEqual({
      first: null,
      beside: 'bound',
      friend: 'bound',
      shield: [0, 0],
      released: 0,
    });
    const runs = fourCombos(
      'erase:mark',
      ['erase-mark-clean', 'erase-mark-release'],
      ['erase-mark-ward', 'erase-mark-reset'],
      (c) => run(c.footnotes, 'D r r .\nS . . d', true),
    );
    const [cw, cr, rw, rr] = runs.map((r) => r.result);
    // clean + ward: the rat beside is lifted too (a foe, so no shield for it).
    expect(cw).toMatchObject({ first: null, beside: null, released: 0 });
    // clean + reset: the target's bound mark comes back plain, so does the one beside.
    expect(cr).toMatchObject({ first: 'plain', beside: 'plain' });
    // release + ward: the target's mark releases (its action: a shield).
    expect(rw).toMatchObject({ first: null, released: 1 });
    // release + reset: it fires once, then stays as a plain mark.
    expect(rr).toMatchObject({ first: 'plain', released: 1 });
  });

  test('erase-mark-clean: an Erase that lifts a mark also lifts the marks of the units beside the target', () => {
    expect(run({}, ROOM, false).beside).toBe('plain');
    expect(run(withFootnotes(['erase-mark-clean']), ROOM, false)).toMatchObject({
      first: null,
      beside: null,
      friend: null,
    });
  });

  test('erase-mark-release: a mark you Erase is released as it goes', () => {
    expect(run({}, ROOM, true).released).toBe(0);
    const r = run(withFootnotes(['erase-mark-release']), ROOM, true);
    expect(r).toMatchObject({ first: null, released: 1 });
    expect(r.shield[0]).toBeGreaterThan(0); // the bound Guard lands on the rat that bore it
  });

  test('erase-mark-ward: a friend whose mark you Erase gains 1 shield', () => {
    const s = draft(withLattices('D S . d', { draughtsman: 'Touch> Erase' }), (ctx) => {
      applyMark(ctx, unit(ctx.s, 'stoker'), { deep: false, bound: null, origin: ORIGIN });
    }).state;
    expect(unit(touch(s, 'B1', {}).state, 'stoker').shield).toBe(0);
    expect(unit(touch(s, 'B1', withFootnotes(['erase-mark-ward'])).state, 'stoker').shield).toBe(1);
    // A foe's mark pays no one.
    expect(run(withFootnotes(['erase-mark-ward']), 'D r . d', false).shield).toEqual([0, 0]);
  });

  test('erase-mark-reset: a bound mark you Erase comes back as a plain mark', () => {
    expect(run({}, ROOM, true).first).toBeNull();
    expect(run(withFootnotes(['erase-mark-reset']), ROOM, true).first).toBe('plain');
    // A plain mark is simply lifted.
    expect(run(withFootnotes(['erase-mark-reset']), ROOM, false).first).toBeNull();
  });
});

// ── Erase capstones ────────────────────────────────────

describe('erase capstones', () => {
  test('CG-F3: one scenario per capstone (erase)', () => {
    // erase-cap-through: nothing at the target, so the Erase acts on the next tile along its heading.
    const through = (fns: FootnoteIds) => {
      const s = withLattices('D . o r', { draughtsman: 'Touch> Erase' });
      return stateOf(touch(s, 'B1', fns).state, 'C1');
    };
    expect(through({})).toBe('slick');
    expect(through(withFootnotes(['erase-cap-through']))).toBeNull();
    // It falls through once only, and only from an Erase that found nothing.
    const once = withLattices('D . . o r', { draughtsman: 'Touch> Erase' });
    expect(stateOf(touch(once, 'B1', withFootnotes(['erase-cap-through'])).state, 'D1')).toBe(
      'slick',
    );
    // erase-cap-salvage: the state on an un-drawn tile is drawn to the nearest paper, not erased.
    const salvaged = (fns: FootnoteIds) => {
      const s = withLattices('D ro{pencil} . . r', { draughtsman: 'Touch> Erase' });
      const r = touch(s, 'B1', fns);
      return {
        b2: stateOf(r.state, 'B1'),
        kept: r.state.tiles.some((t, i) => t.state?.id === 'slick' && i !== 1),
        drawn: count(r.events, 'drawn'),
        fades: count(r.events, 'stateFades'),
      };
    };
    expect(salvaged({})).toMatchObject({ b2: null, kept: false, drawn: 0 });
    expect(salvaged(withFootnotes(['erase-cap-salvage']))).toMatchObject({
      b2: null,
      kept: true,
      drawn: 1,
    });
  });
});
