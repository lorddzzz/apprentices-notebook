import { describe, expect, test } from 'vitest';
import {
  type Action,
  type BattleState,
  describeLog,
  driftPreview,
  type GameEvent,
  legalMoves,
  parseLabel,
  tileAt,
} from '$engine';
import { applySpark, ignite } from '$engine/materials';
import { moveMember, pushUnit } from '$engine/movement';
import { act, board, cast, draft, unitAtLabel, withLattices } from './harness';

/** The current (K-6 to K-12): drift, wading, grates and gates. */

const endTurn: Action = { type: 'endTurn' };
const at = (s: BattleState, lbl: string) => tileAt(s, parseLabel(lbl));
const cells = (...lbls: string[]) => lbls.map(parseLabel);

/** Ends the turn; the drift event (if any) must match what `driftPreview` promised. */
function round(s: BattleState) {
  const preview = driftPreview(s);
  const r = act(s, endTurn);
  const ev = r.events.find((e): e is Extract<GameEvent, { type: 'drift' }> => e.type === 'drift');
  expect(ev !== undefined).toBe(preview.floats.length + preview.units.length > 0);
  if (ev) {
    expect(ev.floats).toEqual(preview.floats);
    expect(ev.units.map((u) => ({ unit: u.unit.id, from: u.from, to: u.to }))).toEqual(
      preview.units,
    );
  }
  return { ...r, drift: ev };
}

/** The log lines about the current and what it set off. */
const core = (events: GameEvent[]) =>
  describeLog(events).filter((l) =>
    /current|drifts|ignites|burns|gate|Spark|stopped|dies|Bump|extinguish/i.test(l),
  );

// A dummy far away keeps the battle alive without attacking.
const DUMMY = '\nS . . . . d';

describe('floats drift (K-8)', () => {
  test('oil drifts one tile along the lane, from a snapshot', () => {
    const r = round(board(`w>o w>o w> .${DUMMY}`));
    expect(core(r.events)).toEqual(['the current carries A1 → B1, B1 → C1']);
    expect(at(r.state, 'A1').oil).toBe(false);
    expect(at(r.state, 'B1').oil).toBe(true);
    expect(at(r.state, 'C1').oil).toBe(true);
    expect(at(r.state, 'D1').oil).toBe(false);
  });

  test('oil meets oil and merges', () => {
    const r = round(board(`w>o w>o . .${DUMMY}`));
    expect(core(r.events)).toEqual(['the current carries A1 → B1']);
    expect(at(r.state, 'A1').oil).toBe(false);
    expect(at(r.state, 'B1').oil).toBe(true);
    expect(at(r.state, 'C1').oil).toBe(false);
  });

  test('a lit float lights the oil it joins, and the fire spreads on', () => {
    const r = round(board(`w>* w>o o .${DUMMY}`));
    expect(core(r.events)).toEqual(['the current carries A1 → B1', 'oil at C1 ignites']);
    expect(at(r.state, 'B1').fire).toBeGreaterThan(0);
    expect(at(r.state, 'A1').fire).toBe(0);
  });

  test('a lit float keeps burning as it drifts', () => {
    const r = round(board(`w>* w>o w>o w>${DUMMY}`));
    expect(core(r.events)).toEqual([
      'the current carries A1 → B1, B1 → C1, C1 → D1',
      'oil at C1 ignites, fire spreads to D1',
    ]);
  });

  test('a float that leaves the board is gone', () => {
    const r = round(board('w>o w>o\nS d'));
    expect(core(r.events)).toEqual(['the current carries A1 → B1, B1 → away']);
    expect(at(r.state, 'B1').oil).toBe(true);
    expect(at(r.state, 'A1').oil).toBe(false);
  });

  test('a float at the lane end onto land stays put (no drift event)', () => {
    const r = round(board(`w>o .${DUMMY}`));
    expect(r.drift).toBeUndefined();
    expect(at(r.state, 'A1').oil).toBe(true);
  });

  test('a stain and an ink puddle drift with their tile', () => {
    const s = draft(board(`w>o w>i w> .${DUMMY}`), (ctx) => {
      at(ctx.s, 'A1').stain = true;
    }).state;
    const r = round(s);
    expect(core(r.events)).toEqual(['the current carries A1 → B1, B1 → C1']);
    expect(at(r.state, 'B1').oil).toBe(true);
    expect(at(r.state, 'B1').stain).toBe(true);
    expect(at(r.state, 'B1').ink).toBe(false);
    expect(at(r.state, 'C1').ink).toBe(true);
    expect(at(r.state, 'A1').stain).toBe(false);
  });

  test('a float follows each tile of a lane that bends', () => {
    const r = round(board(`w>o wv\n. wv${DUMMY}`));
    expect(core(r.events)).toEqual(['the current carries A1 → B1']);
    const r2 = act(r.state, endTurn);
    expect(core(r2.events)).toEqual(['the current carries B1 → B2']);
  });
});

describe('units drift (K-9)', () => {
  test('a member and a rat in the lane are carried', () => {
    const r = round(board(`Dw> w> .\nrw> w> .${DUMMY}`));
    expect(core(r.events)).toEqual(['Draughtsman drifts to B1; rat at A2 drifts to B2']);
    expect(unitAtLabel(r.state, 'B1').name).toBe('Draughtsman');
    expect(unitAtLabel(r.state, 'B2').name).toBe('rat');
  });

  test('eels swim and moths fly: neither is carried', () => {
    const s = board(`ew> w> .\n. mw> w>${DUMMY}`);
    expect(driftPreview(s).units).toEqual([]);
    const r = round(s);
    expect(r.drift).toBeUndefined();
  });

  test('a unit blocked downstream stays', () => {
    for (const blocker of ['=', 'g', 'D', 'w>h']) {
      const s = board(`rw> ${blocker}${DUMMY}`);
      const r = round(s);
      expect(r.drift).toBeUndefined();
      expect(unitAtLabel(r.state, 'A1').name).toBe('rat');
    }
  });

  test('a unit does not drift onto a grate or off the board', () => {
    expect(round(board(`rw> w>h${DUMMY}`)).drift).toBeUndefined();
    expect(round(board(`. . . rw>\n. . . d`)).drift).toBeUndefined();
  });

  test('two units in one lane keep their order: downstream-most first', () => {
    const r = round(board(`rw> rw> w> .${DUMMY}`));
    expect(r.drift?.units.map((u) => `${u.from.x}>${u.to.x}`)).toEqual(['0>1', '1>2']);
    expect(r.drift?.units.map((u) => u.unit.id)).toEqual(['rat-1', 'rat-2']);
  });

  test('two units facing each other do not swap or collide', () => {
    const r = round(board(`rw> rw<${DUMMY}`));
    expect(r.drift).toBeUndefined();
  });

  test('fire that drifts onto a unit burns it in the same round', () => {
    const r = round(board(`w>* rw> =${DUMMY}`));
    expect(describeLog(r.events).slice(0, 5)).toEqual([
      'Enemies act',
      'the current carries A1 → B1',
      'the brass at C1 heats up',
      'Fire hits rat at B1 for 2 (oil-soaked +1)',
      'rat at B1 dies',
    ]);
  });
});

describe('wading and conduction (K-7)', () => {
  test('members walk into water for free', () => {
    const s = board(`D w> w>${DUMMY}`);
    expect(legalMoves(s, 'draughtsman').map((c) => `${c.x},${c.y}`)).toContain('1,0');
    const r = draft(s, (ctx) =>
      moveMember(ctx, unitAtLabel(ctx.s, 'A1') as never, parseLabel('B1')),
    );
    expect(unitAtLabel(r.state, 'B1').name).toBe('Draughtsman');
  });

  test('Spark on water conducts nothing', () => {
    const r = draft(board('S rw> rw> rw>'), (ctx) => applySpark(ctx, cells('B1'), 1));
    expect(r.lines.filter((l) => l.startsWith('Spark hits'))).toHaveLength(1);
    expect(unitAtLabel(r.state, 'C1').hp).toBe(2);
  });
});

describe('grate (K-10)', () => {
  test('floats pass a grate', () => {
    const r = round(board(`w>o w>h w> .${DUMMY}`));
    expect(core(r.events)).toEqual(['the current carries A1 → B1']);
    const r2 = act(r.state, endTurn);
    expect(core(r2.events)).toEqual(['the current carries B1 → C1']);
  });

  test('a Bolt down the lane stops at the grate', () => {
    const s = withLattices('D w>h r', { draughtsman: 'Bolt>' });
    const r = cast(s, 'draughtsman', 'right');
    expect(r.lines.some((l) => l.includes('hits rat'))).toBe(false);
    expect(r.lines).toContain('Bolt is stopped by the grate at B1');
  });

  test('a walk does not enter a grate and the path around is what is left', () => {
    const s = board(`D w>h .${DUMMY}`);
    expect(legalMoves(s, 'draughtsman').map((c) => `${c.x},${c.y}`)).not.toContain('1,0');
    expect(legalMoves(s, 'draughtsman').map((c) => `${c.x},${c.y}`)).not.toContain('2,0');
  });

  test('a shove into a grate bumps', () => {
    const r = draft(board('r w>h'), (ctx) => pushUnit(ctx, unitAtLabel(ctx.s, 'A1'), 'right'));
    expect(r.lines).toContain('rat at A1 bumps into a grate');
  });
});

describe('gate (K-11)', () => {
  test('a gate blocks a walk and a Bolt', () => {
    const s = withLattices('D g r', { draughtsman: 'Bolt>' });
    expect(legalMoves(s, 'draughtsman').map((c) => `${c.x},${c.y}`)).not.toContain('1,0');
    const r = cast(s, 'draughtsman', 'right');
    expect(r.lines.some((l) => l.includes('hits rat'))).toBe(false);
  });

  test('a gate burns from adjacent fire at ignition', () => {
    const r = draft(board('o g'), (ctx) => ignite(ctx, parseLabel('A1')));
    expect(core(r.events)).toEqual(['oil at A1 ignites', 'the lock gate at B1 burns']);
    expect(at(r.state, 'B1').gate).toBe(false);
  });

  test('a gate does not burn from a distance', () => {
    const r = draft(board('o . g'), (ctx) => ignite(ctx, parseLabel('A1')));
    expect(at(r.state, 'C1').gate).toBe(true);
  });

  test('a gate burns at the burn step when fire floats beside it', () => {
    const r = round(board(`w>* w> g${DUMMY}`));
    expect(core(r.events)).toEqual(['the current carries A1 → B1', 'the lock gate at C1 burns']);
    expect(at(r.state, 'C1').gate).toBe(false);
  });
});
