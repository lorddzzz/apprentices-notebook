import { describe, expect, test } from 'vitest';
import type { LineId } from '$data';
import {
  type BattleState,
  type Coord,
  type EnemyUnit,
  type Jar,
  parseLabel,
  type RivalIntent,
  scenarioBattle,
  tileAt,
} from '$engine';
import { IDLE, memberMode, onBasic, onCell } from '../../src/app/battleInput';
import { intentPhrase, threatenedMembers } from '../../src/app/describe';
import { overlayFor, rivalMarksOf } from '../../src/app/overlay';
import { viewOf } from '../../src/app/view';

/** The rival telegraph (rivals plan RV-7): path, landing, D2 blanks, D3 harm, the wick, the fallback. */

const at = (lbl: string): Coord => parseLabel(lbl);

const cast = (
  spell: string,
  dir: 'up' | 'right' | 'down' | 'left',
  fallback?: string,
): RivalIntent => ({
  kind: 'cast',
  spell,
  aim: { kind: 'dir', dir },
  fallback: fallback ? at(fallback) : null,
  order: 1,
});

const wick = (id: number, fallback?: string): RivalIntent => ({
  kind: 'trick',
  trick: 'canals:longWick',
  lock: { kind: 'jar', id },
  data: {},
  fallback: fallback ? at(fallback) : null,
  order: 1,
});

function pinned(board: string, label: string, intent: RivalIntent): BattleState {
  return scenarioBattle({ board, pins: { [label]: intent } });
}

const rivalOf = (s: BattleState): EnemyUnit => {
  const u = s.units.find((x): x is EnemyUnit => x.kind === 'enemy' && !!x.rival);
  if (!u) throw new Error('no rival');
  return u;
};

/** His jar `id` on a tile: a step-jar that starts with Oil, then Spark (the Lantern's contents). */
function lay(s: BattleState, label: string, id = 1): BattleState {
  const c = structuredClone(s);
  const jar: Jar = {
    owner: rivalOf(c).id,
    event: 'step',
    rest: {
      role: 'action',
      rune: 'strike',
      at: { x: 0, y: 0 },
      auras: [],
      next: null,
    },
    heading: null,
    origin: { caster: rivalOf(c).id, spell: 'lantern', cast: 0 },
    id,
    seq: id,
  };
  tileAt(c, at(label)).jar = jar;
  c.nextJar = id + 1;
  return c;
}

const NONE = new Set<LineId>();

describe('the cast: path and landing', () => {
  test('a Bolt that meets an apprentice draws its line to that tile, with no flight event needed', () => {
    const s = pinned('. . . . .\nL . . D .\n. . . . .', 'A2', cast('lantern', 'right'));
    const [r] = overlayFor(s, IDLE).rivals ?? [];
    expect(r).toMatchObject({ label: 'Lantern', order: 1, dir: 'right', landing: at('D2') });
    expect(r?.path).toEqual([at('B2'), at('C2'), at('D2')]);
    expect(r?.wick).toBeNull();
  });

  test('a Bolt into open floor lands at the end of its range', () => {
    const s = pinned('L . . . . . .\n. . . . . . D', 'A1', cast('herd', 'right'));
    const [r] = overlayFor(s, IDLE).rivals ?? [];
    expect(r?.landing).toEqual(at('E1'));
    expect(r?.label).toBe('Herd');
  });

  test('moving the caster moves the line, not the aim (drawn from the confirm preview state)', () => {
    const s = scenarioBattle({
      board: '. . . . .\nL . . . D\nS . . . .',
      pins: { A2: cast('lantern', 'right') },
    });
    const before = overlayFor(s, IDLE).rivals?.[0];
    expect(before?.landing).toEqual(at('E2'));
    const shove = onBasic(s, memberMode(s, 'stoker')).mode;
    const confirm = onCell(s, shove, at('A2')).mode;
    const after = overlayFor(s, confirm).rivals?.[0];
    expect(after?.from).toEqual(at('A1'));
    expect(after?.dir).toBe('right');
    expect(after?.landing).toEqual(at('E1'));
  });
});

describe('D2 and D3: blanks and the harm ring', () => {
  const BOARD = '. . . .\n. . . L\nD . . .';

  test('an apprentice the shown order would hurt gets the ring and a warning, even on an unwitnessed line', () => {
    const s = lay(pinned(BOARD, 'D2', wick(1, 'C2')), 'A3');
    const o = overlayFor(s, IDLE, {}, NONE);
    expect(o.highlights).toContainEqual({ kind: 'hurt', at: at('A3') });
    expect(threatenedMembers(s)).toContain('draughtsman');
    const text = intentPhrase(s, rivalOf(s));
    expect(text).toContain('Draughtsman will be hurt');
    // The reason stays blank: no rune, no amount.
    expect(text).not.toMatch(/damage|fire|\d+ damage/i);
  });

  test('unwitnessed effects are blank landings; witnessed ones are drawn as effects', () => {
    const s = pinned('L D # .\n. . . .', 'A1', cast('herd', 'right'));
    const hidden = overlayFor(s, IDLE, {}, NONE);
    const shown = overlayFor(s, IDLE, {}, null);
    const blanksHidden = hidden.highlights.filter((h) => h.kind === 'blank');
    expect(blanksHidden.length).toBeGreaterThan(0);
    expect(shown.highlights.filter((h) => h.kind === 'blank')).toEqual([]);
    expect(hidden.rivals?.[0]?.effects ?? []).toEqual([]);
    expect(shown.rivals?.[0]?.effects.length).toBeGreaterThan(0);
  });

  test('a safe party gets no ring and no warning', () => {
    const s = lay(pinned('D . . .\n. . . L', 'D2', wick(1)), 'A2');
    const o = overlayFor(s, IDLE, {}, NONE);
    expect(o.highlights.filter((h) => h.kind === 'hurt')).toEqual([]);
    expect(threatenedMembers(s)).toEqual([]);
  });
});

describe('the long wick', () => {
  const BOARD = '. . . .\n. . . L\nD . . .';

  test('a line to the jar, labelled with what it starts with; it follows the jar', () => {
    const s = lay(pinned(BOARD, 'D2', wick(1)), 'A3');
    const r = overlayFor(s, IDLE).rivals?.[0];
    expect(r).toMatchObject({ label: 'long wick', landing: null, wick: { to: at('A3') } });
    expect(r?.wick?.contents).toBe('Strike');
    // The jar drifts: the same order, the new tile.
    const moved = structuredClone(s);
    const jar = tileAt(moved, at('A3')).jar;
    tileAt(moved, at('A3')).jar = null;
    tileAt(moved, at('B3')).jar = jar;
    expect(overlayFor(moved, IDLE).rivals?.[0]?.wick?.to).toEqual(at('B3'));
  });

  test('a lost jar leaves the order with nothing to point at', () => {
    const s = pinned(BOARD, 'D2', wick(7));
    const r = overlayFor(s, IDLE).rivals?.[0];
    expect(r?.wick).toBeNull();
    expect(intentPhrase(s, rivalOf(s))).toContain('jar is gone');
  });
});

describe('the fallback ring', () => {
  test('shown with the order, live while an apprentice stands there, off once they leave', () => {
    const s = pinned('D . . .\nL . . .', 'A2', cast('herd', 'down', 'A1'));
    const live = overlayFor(s, IDLE).rivals?.[0];
    expect(live?.fallback).toEqual({ at: at('A1'), live: true });
    // The Bolt goes down into nothing: starved.
    expect(live?.starving).toBe(true);
    const off = structuredClone(s);
    const d = off.units.find((u) => u.id === 'draughtsman');
    if (d) d.pos = at('D2');
    expect(overlayFor(off, IDLE).rivals?.[0]?.fallback).toEqual({ at: at('A1'), live: false });
  });

  test('no fallback tile, no ring', () => {
    const s = pinned('L D . .\n. . . .', 'A1', cast('herd', 'down'));
    expect(overlayFor(s, IDLE).rivals?.[0]?.fallback).toBeNull();
  });
});

describe('wording and playback', () => {
  test('intentPhrase reads the landing, the fallback and the jar', () => {
    const s = pinned('. . . .\nL . D .\n. . . .', 'A2', cast('lantern', 'right', 'A1'));
    expect(intentPhrase(s, rivalOf(s))).toBe(
      'will cast Lantern right (1st) · lands at C2 · if starved, strikes A1',
    );
    const w = lay(pinned('. . . .\n. . . L\nD . . .', 'D2', wick(1)), 'A3');
    expect(intentPhrase(w, rivalOf(w))).toContain('his jar at A3, starts with Strike');
  });

  test('a dry strike is an ordinary attack arrow', () => {
    const s = pinned('L D . .', 'A1', { kind: 'rivalStrike', dir: 'right', order: 1 });
    const o = overlayFor(s, IDLE);
    expect(o.intents).toHaveLength(1);
    expect(o.intents[0]).toMatchObject({ dir: 'right', attack: 'bite', hit: at('B1') });
    expect(o.rivals).toEqual([]);
    expect(o.highlights).toContainEqual({ kind: 'hurt', at: at('B1') });
  });

  test('playback shows each rival intent as a badge, a name and a direction', () => {
    const s = pinned('L . . .\n. . . D', 'A1', cast('lantern', 'right'));
    const marks = rivalMarksOf(viewOf(s).units);
    expect(marks).toMatchObject([
      { label: 'Lantern', order: 1, dir: 'right', path: [], landing: null },
    ]);
    const w = lay(pinned('. . . .\n. . . L\nD . . .', 'D2', wick(1)), 'A3');
    expect(rivalMarksOf(viewOf(w).units)[0]?.label).toBe('long wick');
    const strike = pinned('L D . .', 'A1', { kind: 'rivalStrike', dir: 'right', order: 1 });
    expect(rivalMarksOf(viewOf(strike).units)[0]).toMatchObject({ label: 'Strike', dir: 'right' });
  });
});
