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
import { burnGates } from '$engine/current';
import { moveMember } from '$engine/movement';
import { push } from '$engine/push';
import { act, board, cast, draft, unitAtLabel, withLattices } from './harness';

/** The current (K-6 to K-12): drift, wading, grates and gates. */

const endTurn: Action = { type: 'endTurn' };
const at = (s: BattleState, lbl: string) => tileAt(s, parseLabel(lbl));

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
const id = (s: BattleState, lbl: string) => at(s, lbl).state?.id ?? null;

describe('floats drift (K-8)', () => {
  test('a slick drifts one tile along the lane, from a snapshot', () => {
    const r = round(board(`w>o w>o w> .${DUMMY}`));
    expect(core(r.events)).toEqual(['the current carries A1 → B1, B1 → C1']);
    expect(['A1', 'B1', 'C1', 'D1'].map((l) => id(r.state, l))).toEqual([
      null,
      'slick',
      'slick',
      null,
    ]);
  });

  test('a slick meets a slick and they merge', () => {
    const r = round(board(`w>o w>o . .${DUMMY}`));
    expect(core(r.events)).toEqual(['the current carries A1 → B1']);
    expect(['A1', 'B1', 'C1'].map((l) => id(r.state, l))).toEqual([null, 'slick', null]);
  });

  test('a lit float joining a slick sets it alight', () => {
    const r = round(board(`w>* w>o o .${DUMMY}`));
    expect(core(r.events)).toEqual(['the current carries A1 → B1']);
    expect(id(r.state, 'B1')).toBe('fire');
    expect(id(r.state, 'A1')).toBeNull();
  });

  test('a lit float keeps burning as it drifts', () => {
    const r = round(board(`w>* w>o w>o w>${DUMMY}`));
    expect(core(r.events)).toEqual(['the current carries A1 → B1, B1 → C1, C1 → D1']);
    expect(['B1', 'C1', 'D1'].map((l) => id(r.state, l))).toEqual(['fire', 'slick', 'slick']);
  });

  test('a float that leaves the board is gone', () => {
    const r = round(board('w>o w>o\nS d'));
    expect(core(r.events)).toEqual(['the current carries A1 → B1, B1 → away']);
    expect(id(r.state, 'B1')).toBe('slick');
    expect(id(r.state, 'A1')).toBeNull();
  });

  test('a float at the lane end onto land stays put (no drift event)', () => {
    const r = round(board(`w>o .${DUMMY}`));
    expect(r.drift).toBeUndefined();
    expect(id(r.state, 'A1')).toBe('slick');
  });

  test('a stain and a blot drift with their tile; a cloud stays', () => {
    const r = round(board(`w>{stain} w>i w> w>~ .${DUMMY}`));
    expect(core(r.events)).toEqual(['the current carries A1 → B1, B1 → C1']);
    expect(['A1', 'B1', 'C1', 'D1'].map((l) => id(r.state, l))).toEqual([
      null,
      'stain',
      'blot',
      'cloud',
    ]);
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
    expect(describeLog(r.events).slice(0, 3)).toEqual([
      'Enemies act',
      'the current carries A1 → B1',
      'Fire hits rat at B1 for 1',
    ]);
  });
});

describe('wading (K-7)', () => {
  test('members walk into water for free', () => {
    const s = board(`D w> w>${DUMMY}`);
    expect(legalMoves(s, 'draughtsman').map((c) => `${c.x},${c.y}`)).toContain('1,0');
    const r = draft(s, (ctx) =>
      moveMember(ctx, unitAtLabel(ctx.s, 'A1') as never, parseLabel('B1')),
    );
    expect(unitAtLabel(r.state, 'B1').name).toBe('Draughtsman');
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
    expect(r.lines).toContain('Bolt is stopped by the grate at B1');
    expect(r.lines).toContain('bolt aims at B1');
  });

  test('a walk does not enter a grate and the path around is what is left', () => {
    const s = board(`D w>h .${DUMMY}`);
    expect(legalMoves(s, 'draughtsman').map((c) => `${c.x},${c.y}`)).not.toContain('1,0');
    expect(legalMoves(s, 'draughtsman').map((c) => `${c.x},${c.y}`)).not.toContain('2,0');
  });

  test('a shove into a grate crushes', () => {
    const r = draft(board('r w>h'), (ctx) => push(ctx, unitAtLabel(ctx.s, 'A1'), 'right', 1, null));
    expect(r.lines[0]).toMatch(/^rat at A1 is crushed against/);
  });
});

describe('gate (K-11)', () => {
  test('a gate blocks a walk and a Bolt', () => {
    const s = withLattices('D g r', { draughtsman: 'Bolt>' });
    expect(legalMoves(s, 'draughtsman').map((c) => `${c.x},${c.y}`)).not.toContain('1,0');
    const r = cast(s, 'draughtsman', 'right');
    expect(r.lines).toContain('Bolt is stopped by the lock gate at B1');
  });

  test('a gate burns from adjacent fire', () => {
    const r = draft(board('* g'), burnGates);
    expect(core(r.events)).toEqual(['the lock gate at B1 burns']);
    expect(at(r.state, 'B1').terrain.gate).toBe(false);
  });

  test('a gate does not burn from a distance', () => {
    const r = draft(board('* . g'), burnGates);
    expect(at(r.state, 'C1').terrain.gate).toBe(true);
  });

  test('a gate burns at the burn step when fire floats beside it', () => {
    const r = round(board(`w>* w> g${DUMMY}`));
    expect(core(r.events)).toEqual(['the current carries A1 → B1', 'the lock gate at C1 burns']);
    expect(at(r.state, 'C1').terrain.gate).toBe(false);
  });
});
