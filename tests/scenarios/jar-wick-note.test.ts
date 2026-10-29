import { describe, expect, test } from 'vitest';
import { LAMPLIGHTER_WICK } from '$data/rivals/lamplighter';
import {
  type BattleState,
  type GameEvent,
  type Jar,
  newProfile,
  parseLabel,
  tileAt,
  unitAt,
} from '$engine';
import { runDraft } from '$engine/ctx';
import { awardFootnotePoints, pointLines, rivalCasters } from '$engine/footnotes';
import { enemyWalk } from '$engine/movement';
import { withFootnotes } from './footnoteHarness';
import { board } from './harness';

/**
 * The Lamplighter's Jar note (footnotes §1 "Rival notes", RV-20b): a foe may trip your jar, and a
 * rival's own step does so only with the note written. The contents stay yours either way.
 */

const at = parseLabel;
const NOTE = LAMPLIGHTER_WICK.id;

/** The Draughtsman's step-jar: a Strike on whoever opens it. */
const strikeJar = (): Jar => ({
  owner: 'draughtsman',
  event: 'step',
  rest: { role: 'action', rune: 'strike', at: { x: 0, y: 0 }, auras: [], next: null },
  heading: null,
  origin: { caster: 'draughtsman', spell: 'x', cast: 0 },
});

/** A board with the jar on B1 and `who` (L the rival, r a plain rat) on C1, walking onto it. */
const walkOnto = (who: 'L' | 'r', written: boolean) => {
  const s: BattleState = structuredClone(board(`D . ${who}`));
  tileAt(s, at('B1')).jar = strikeJar();
  const r = runDraft(
    s,
    (ctx) => {
      const u = unitAt(ctx.s, at('C1'));
      if (u?.kind !== 'enemy') throw new Error('no walker');
      enemyWalk(ctx, u, [at('B1')]);
    },
    { footnotes: written ? withFootnotes([NOTE]) : {} },
  );
  return { s, r, pts: pointLines(r.events, rivalCasters(r.state)) };
};
const opened = (events: readonly GameEvent[]) => events.filter((e) => e.type === 'jarOpened');

describe('the Lamplighter’s Jar note: whose step opens your jar', () => {
  test('a plain foe trips it with or without the note, and the Jar line is witnessed', () => {
    for (const written of [false, true]) {
      const { r, pts } = walkOnto('r', written);
      expect(opened(r.events), `written=${written}`).toHaveLength(1);
      expect(r.events.find((e) => e.type === 'jarOpened')?.line).toBe('jar:unit');
      expect(tileAt(r.state, at('B1')).jar).toBeNull();
      expect(pts).toContain('jar:unit');
    }
  });

  test('a rival walking onto your jar leaves it closed without the note', () => {
    const { r, pts } = walkOnto('L', false);
    expect(opened(r.events)).toHaveLength(0);
    expect(tileAt(r.state, at('B1')).jar?.owner).toBe('draughtsman');
    expect(pts).toEqual([]);
  });

  test('with the note he trips it; the contents run as yours and the points are the household’s', () => {
    const { s, r, pts } = walkOnto('L', true);
    const [open] = opened(r.events);
    expect(open).toMatchObject({
      type: 'jarOpened',
      line: 'jar:unit',
      origin: { caster: 'draughtsman' },
    });
    expect(tileAt(r.state, at('B1')).jar).toBeNull();
    const rival = unitAt(r.state, at('B1'));
    const before = unitAt(s, at('C1'));
    expect(rival?.hp).toBeLessThan(before?.hp ?? 0);
    expect(pts).toEqual(['jar:unit']);
    const p = { ...newProfile(), known: [...newProfile().known, 'jar' as const] };
    const earned = awardFootnotePoints(p, pts);
    expect(earned.footnotes.jar?.points ?? 0).toBe((p.footnotes.jar?.points ?? 0) + 1);
  });

  test('the rival’s own jar opens under him on his step, note or not', () => {
    const s: BattleState = structuredClone(board('D . . L'));
    const rivalId = unitAt(s, at('D1'))?.id ?? '';
    tileAt(s, at('C1')).jar = {
      ...strikeJar(),
      owner: rivalId,
      origin: { caster: rivalId, spell: 'x', cast: 0 },
    };
    const r = runDraft(s, (ctx) => {
      const u = unitAt(ctx.s, at('D1'));
      if (u?.kind !== 'enemy') throw new Error('no rival');
      enemyWalk(ctx, u, [at('C1')]);
    });
    expect(opened(r.events)).toHaveLength(1);
    expect(r.events.find((e) => e.type === 'jarOpened')?.line).toBeUndefined();
  });
});
