import { describe, expect, test } from 'vitest';
import type { BasicActionId, HabitId } from '$data';
import {
  type Action,
  type BattleState,
  type Dir,
  type GameEvent,
  type Jar,
  parseLabel,
  tileAt,
  type Unit,
} from '$engine';
import { burstAt } from '$engine/bursts';
import { maskPreview } from '$engine/lines';
import { applyMark } from '$engine/marks';
import { roundEndChemistry } from '$engine/mix';
import { act, board, draft } from './harness';

/**
 * The body habits (actions-habits plan P12, P14; party.md §2): the runaway's `fuseOnStep` (her own
 * Fuse jar opens on any arrival of hers) and the towel-bearer's `steamproof` (steam deals her no
 * damage, and a warded hit is not a hit). Each is given to the Draughtsman through the kits.
 */

type Member = 'draughtsman' | 'stoker';
type Kits = Partial<Record<Member, { action?: BasicActionId; habit?: HabitId | null }>>;
const at = parseLabel;
const basic = (type: BasicActionId, dir: Dir, unit: Member = 'draughtsman'): Action =>
  ({ type, unit, dir }) as Action;
const fuseJar = (owner = 'draughtsman'): Jar => ({
  owner,
  event: 'dusk',
  rest: null,
  heading: null,
  origin: { caster: owner, spell: 'x', cast: 0 },
});
const unit = (s: BattleState, id: string): Unit => {
  const u = s.units.find((x) => x.id === id);
  if (!u) throw new Error(`no ${id}`);
  return u;
};
/** A battle with a Fuse jar on `jarAt`; the Draughtsman carries `habit` unless kits say more. */
const withJar = (
  ascii: string,
  jarAt: string,
  kits: Kits = {},
  habit: HabitId | null = 'fuseOnStep',
  owner = 'draughtsman',
): BattleState => {
  const s = structuredClone(
    board(ascii, { kits: { ...kits, draughtsman: { habit, ...kits.draughtsman } } }),
  );
  tileAt(s, at(jarAt)).jar = fuseJar(owner);
  return s;
};
const opened = (events: readonly GameEvent[]) => events.filter((e) => e.type === 'jarOpened');

describe('fuseOnStep: her own Fuse jar opens on any arrival (P12)', () => {
  test('a walk onto it opens it under her; the opening carries the habit, no fine print', () => {
    const r = act(withJar('D . .', 'B1'), { type: 'move', unit: 'draughtsman', to: at('B1') });
    expect(opened(r.events)).toEqual([
      expect.objectContaining({
        habit: 'fuseOnStep',
        by: expect.objectContaining({ id: 'draughtsman' }),
      }),
    ]);
    expect(opened(r.events)[0]?.line).toBeUndefined();
    expect(tileAt(r.state, at('B1')).jar).toBeNull();
  });

  test('a hop onto it opens it as her own step', () => {
    const s = withJar('D . .', 'C1', { draughtsman: { action: 'hop' } });
    const r = act(s, basic('hop', 'right'));
    expect(opened(r.events)).toEqual([expect.objectContaining({ habit: 'fuseOnStep' })]);
    expect(opened(r.events)[0]?.line).toBeUndefined();
  });

  test('a hop over it does not open it (Hop enters only its landing)', () => {
    const s = withJar('D . .', 'B1', { draughtsman: { action: 'hop' } });
    const r = act(s, basic('hop', 'right'));
    expect(opened(r.events)).toEqual([]);
    expect(tileAt(r.state, at('B1')).jar?.owner).toBe('draughtsman');
  });

  test('fuseOnStep:jar: pushed, pulled or swapped onto it, it opens with the fine print', () => {
    const shove = withJar('S D .', 'C1', { stoker: { action: 'shove' } });
    const pull = withJar('S . D', 'B1', { stoker: { action: 'pull' } });
    const swap = withJar('D S', 'B1', { draughtsman: { action: 'swap' } });
    for (const [s, a] of [
      [shove, basic('shove', 'right', 'stoker')],
      [pull, basic('pull', 'right', 'stoker')],
      [swap, basic('swap', 'right')],
    ] as const) {
      const r = act(s, a);
      expect(opened(r.events), a.type).toEqual([
        expect.objectContaining({ habit: 'fuseOnStep', line: 'fuseOnStep:jar' }),
      ]);
    }
  });

  test('without the habit her Fuse jar waits for dusk', () => {
    const r = act(withJar('D . .', 'B1', {}, null), {
      type: 'move',
      unit: 'draughtsman',
      to: at('B1'),
    });
    expect(opened(r.events)).toEqual([]);
    expect(tileAt(r.state, at('B1')).jar?.event).toBe('dusk');
  });

  test("someone else's Fuse jar waits, and so does hers under someone else", () => {
    const theirs = withJar('D . .', 'B1', {}, 'fuseOnStep', 'stoker');
    const r = act(theirs, { type: 'move', unit: 'draughtsman', to: at('B1') });
    expect(opened(r.events)).toEqual([]);
    const hers = withJar('S . D', 'B1', {}, 'fuseOnStep');
    const walked = act(hers, { type: 'move', unit: 'stoker', to: at('B1') });
    expect(opened(walked.events)).toEqual([]);
  });
});

describe('steamproof: steam never hurts her (P14)', () => {
  const steamproof = { kits: { draughtsman: { habit: 'steamproof' as const } } };
  const burst = (ascii: string, tile: string) =>
    draft(board(ascii, steamproof), (ctx) => burstAt(ctx, at(tile), 'tile', null));
  const unharmed = (events: readonly GameEvent[]) => events.filter((e) => e.type === 'unharmed');
  const damageTo = (events: readonly GameEvent[], id: string) =>
    events.filter((e) => e.type === 'damage' && e.target.id === id);

  test('a Storm skips her and hits the rest; the ward carries the habit', () => {
    const r = burst('D~ r~', 'B1');
    expect(unharmed(r.events)).toEqual([
      expect.objectContaining({ habit: 'steamproof', harm: 'steam', source: 'Storm' }),
    ]);
    expect(damageTo(r.events, 'draughtsman')).toEqual([]);
    expect(damageTo(r.events, 'rat-1')).toHaveLength(1);
    expect(r.lines).toContain('Storm leaves Draughtsman unharmed');
  });

  test('Thunderhead and the Kettle blowing skip her', () => {
    for (const [ascii, tile, source] of [
      ['D{bank} r{bank}', 'B1', 'Thunderhead'],
      ['D {kettle} r', 'B1', 'Kettle'],
    ] as const) {
      const r = burst(ascii, tile);
      expect(damageTo(r.events, 'draughtsman'), source).toEqual([]);
      expect(unharmed(r.events)[0], source).toMatchObject({ source, habit: 'steamproof' });
      expect(damageTo(r.events, 'rat-1').length, source).toBeGreaterThan(0);
    }
  });

  test('the Kettle heat at round end skips her', () => {
    const r = draft(board('D {kettle} r', steamproof), (ctx) => roundEndChemistry(ctx));
    expect(damageTo(r.events, 'draughtsman')).toEqual([]);
    expect(unharmed(r.events)).toEqual([expect.objectContaining({ source: 'Kettle' })]);
    expect(damageTo(r.events, 'rat-1')).toHaveLength(1);
  });

  test('without the habit the same storm hurts her', () => {
    const r = draft(board('D~ r~'), (ctx) => burstAt(ctx, at('B1'), 'tile', null));
    expect(damageTo(r.events, 'draughtsman')).toHaveLength(1);
    expect(unharmed(r.events)).toEqual([]);
  });

  test('steamproof:greaseFog: a Flashover is fire and still burns her', () => {
    const r = burst('D{fog} r{fog}', 'B1');
    const hers = damageTo(r.events, 'draughtsman');
    expect(hers).toEqual([expect.objectContaining({ line: 'steamproof:greaseFog' })]);
    expect(damageTo(r.events, 'rat-1')[0]?.line).toBe('spark:greaseFog');
    expect(unharmed(r.events)).toEqual([]);
  });

  test('steamproof:brandCloud: a Brand storm skips her, the brand cloud still marks her', () => {
    const r = burst('D{brand} r{brand}', 'B1');
    expect(damageTo(r.events, 'draughtsman')).toEqual([]);
    const end = draft(board('D{brand} r{brand}', steamproof), (ctx) => roundEndChemistry(ctx));
    expect(unit(end.state, 'draughtsman').mark).not.toBeNull();
    const marks = end.events.filter((e) => e.type === 'marked');
    expect(marks[0]).toMatchObject({ unit: { id: 'draughtsman' }, line: 'steamproof:brandCloud' });
    // A foe in a brand cloud is marked under the plain ink line.
    const foe = draft(board('D . r{brand}', steamproof), (ctx) => roundEndChemistry(ctx));
    expect(foe.events.find((e) => e.type === 'marked')?.line).toBe('ink:brandCloud');
  });

  test('a warded hit is not a hit: a bound `hit` mark stays bound, nobody is hurt', () => {
    const r = draft(board('D~ r~', steamproof), (ctx) => {
      const d = unit(ctx.s, 'draughtsman');
      applyMark(ctx, d, {
        deep: false,
        bound: { action: 'shove', event: 'hit', solvent: null, heading: 'right' },
        origin: null,
      });
      burstAt(ctx, at('B1'), 'tile', null);
    });
    expect(unit(r.state, 'draughtsman').mark?.bound?.event).toBe('hit');
    expect(r.events.some((e) => e.type === 'released')).toBe(false);
    expect(unit(r.state, 'draughtsman').hp).toBe(unit(board('D'), 'draughtsman').hp);
    expect(maskPreview(r.events, new Set(), ['draughtsman']).hurt).toEqual([]);
  });
});

test('steamproof-headline-unmasked: a habit event under an unwitnessed line still shows (AH P11)', () => {
  const unharmed: GameEvent = {
    type: 'unharmed',
    unit: { id: 'draughtsman', member: true },
    source: 'Storm',
    harm: 'steam',
    line: 'spark:cloud',
    habit: 'steamproof',
  } as GameEvent;
  const hit: GameEvent = { ...unharmed, habit: undefined } as GameEvent;
  const { shown } = maskPreview([unharmed, hit], new Set(), ['draughtsman']);
  expect(shown).toEqual([unharmed]);
});
