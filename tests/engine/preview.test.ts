import { describe, expect, test } from 'vitest';
import type { LineId } from '$data';
import { type GameEvent, maskPreview, parseLabel, witnessedIn } from '$engine';
import { push } from '$engine/push';
import type { Origin } from '$engine/types';
import { flowFor, lands, unit } from '../scenarios/chemHarness';
import { board, draft, unitAtLabel } from '../scenarios/harness';

/** Design D2, D3 and plan P41, P42: what a preview shows when part of it is still unwitnessed. */

const none = new Set<LineId>();
const at = parseLabel;
const types = (events: readonly GameEvent[]) => events.map((e) => e.type);
const sparkOnMark = () => {
  const s = board('D . . . .\n . . d! . .\n . . . . .');
  return lands(s, [['spark', unit('dummy-1')]], flowFor(s));
};

describe('witnessedIn', () => {
  test('lines in first-seen order, once each', () => {
    const e = (line?: LineId): GameEvent => ({
      type: 'idle',
      unit: ref0,
      ...(line ? { line } : {}),
    });
    const log = [e(), e('spark:mark'), e('shove:wall'), e('spark:mark'), e('shove:slick')];
    expect(witnessedIn(log)).toEqual(['spark:mark', 'shove:wall', 'shove:slick']);
  });
});

const ref0 = { id: 'rat-1', name: 'rat', at: { x: 1, y: 0 }, member: false };

describe('maskPreview', () => {
  test('mask-hides-unwitnessed-result: what an unwitnessed line does is not shown', () => {
    const r = sparkOnMark();
    expect(witnessedIn(r.events)).toContain('spark:mark');
    const m = maskPreview(r.events, none, []);
    const left = types(m.shown);
    expect(left).not.toContain('burst');
    expect(left).not.toContain('markSpent');
    expect(m.shown.every((e) => !e.line)).toBe(true);
    // Witnessed, the same log shows in full.
    const seen = maskPreview(r.events, new Set(witnessedIn(r.events)), []);
    expect(seen.shown).toEqual(r.events);
    expect(seen.blanks).toEqual([]);
  });

  test('mask-keeps-landing-tile: the tile is blank, with nothing said about it', () => {
    const m = maskPreview(sparkOnMark().events, none, []);
    expect(m.blanks).toEqual([at('C2')]);
  });

  test('blanks are one per tile, in first-seen order', () => {
    const s = board('D r o o o {wall}');
    const r = draft(s, (ctx) => push(ctx, unitAtLabel(ctx.s, 'B1'), 'right', 1, null));
    const m = maskPreview(r.events, none, []);
    expect(m.blanks.map((b) => `${b.x},${b.y}`)).toEqual(['4,0']);
    expect(m.shown.every((e) => !e.line)).toBe(true);
  });

  test('harm-warning-on-unwitnessed: party harm shows even when its cause is masked', () => {
    const s = board('D . w>');
    const r = draft(s, (ctx) => push(ctx, unitAtLabel(ctx.s, 'A1'), 'right', 2, null));
    const drop = r.events.find((e) => e.type === 'dropped');
    expect(drop?.line).toBe('shove:water');
    const m = maskPreview(r.events, none, ['draughtsman']);
    expect(m.hurt).toEqual(['draughtsman']);
    expect(types(m.shown)).not.toContain('dropped');
    expect(m.blanks).toContainEqual(at('C1'));
  });

  test('harm is flagged for crush and damage to the party, not to foes', () => {
    const s = board('D r o o o {wall}');
    const foe = draft(s, (ctx) => push(ctx, unitAtLabel(ctx.s, 'B1'), 'right', 1, null));
    expect(maskPreview(foe.events, none, ['draughtsman']).hurt).toEqual([]);
    const hurtParty = board('D o o o {wall}');
    const own = draft(hurtParty, (ctx) => push(ctx, unitAtLabel(ctx.s, 'A1'), 'right', 1, null));
    expect(maskPreview(own.events, none, ['draughtsman']).hurt).toEqual(['draughtsman']);
  });

  test('witnessed-from-foe-cast: a line a foe fired counts, whoever cast it', () => {
    const foeCast: Origin = { caster: 'rat-1', spell: '0,0', cast: 3 };
    const log: GameEvent[] = [
      {
        type: 'dropped',
        unit: ref0,
        at: at('C1'),
        elite: false,
        line: 'shove:water',
        origin: foeCast,
      },
    ];
    expect(witnessedIn(log)).toEqual(['shove:water']);
    expect(maskPreview(log, new Set(witnessedIn(log)), []).shown).toEqual(log);
    expect(maskPreview(log, none, []).blanks).toEqual([at('C1')]);
  });

  test('silent masked events leave no blank', () => {
    const log: GameEvent[] = [
      { type: 'named', what: 'burst', id: 'detonation', line: 'spark:mark' },
    ];
    expect(maskPreview(log, none, [])).toEqual({ shown: [], blanks: [], hurt: [] });
  });
});
