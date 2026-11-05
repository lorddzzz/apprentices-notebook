import { expect, test } from 'vitest';
import { TUNING } from '$data';
import { runDraft } from '$engine/ctx';
import { push } from '$engine/push';
import { tileAt } from '$engine/queries';
import { fourCombos } from '../footnoteHarness';
import { board, unitAtLabel } from '../harness';

test('shove:wall fourCombos: soft or heavy, then ring or through', () => {
  // The foe at B3 is shoved right and crushed into the wall at D3 (the foe at D2 touches it).
  const ascii = '. . . . .\n. . . n .\nD d . {wall} .\n. . . . .';
  const runs = fourCombos(
    'shove:wall',
    ['shove-wall-soft', 'shove-wall-heavy'],
    ['shove-wall-ring', 'shove-wall-through'],
    ({ footnotes }) => {
      const s = board(ascii);
      const r = runDraft(s, (ctx) => push(ctx, unitAtLabel(ctx.s, 'B3'), 'right', 3, null), {
        footnotes,
      });
      const pos = (l: string) => r.state.units.find((u) => u.id === unitAtLabel(s, l).id)?.pos;
      return {
        crush: r.events.find((e) => e.type === 'crush'),
        wall: tileAt(r.state, { x: 3, y: 2 }).state?.id ?? null,
        pushed: pos('B3'),
        beside: pos('D2'),
      };
    },
  );
  const [softRing, softThrough, heavyRing, heavyThrough] = runs.map((r) => r.result);
  const soft = TUNING.crushBase;
  const heavy = TUNING.crushBase + TUNING.crushPerTile + 1;
  // soft wears the wall by two crushes: it breaks at once.
  expect(softRing?.crush).toMatchObject({ damage: soft, line: 'shove:wall' });
  expect(softRing?.wall).toBeNull();
  expect(softRing?.beside).toEqual({ x: 3, y: 0 }); // the ring moved D2 away from the wall (up)
  expect(softRing?.pushed).toEqual({ x: 2, y: 2 });
  // soft + through: the wall broke, so the crushed foe goes on into its tile; no ring.
  expect(softThrough?.wall).toBeNull();
  expect(softThrough?.pushed).toEqual({ x: 3, y: 2 });
  expect(softThrough?.beside).toEqual({ x: 3, y: 1 });
  // heavy: the wall survives one crush, so through has nothing to pass; ring still rings.
  expect(heavyRing?.crush).toMatchObject({ damage: heavy });
  expect(heavyRing?.wall).toBe('wall');
  expect(heavyRing?.beside).toEqual({ x: 3, y: 0 });
  expect(heavyThrough?.wall).toBe('wall');
  expect(heavyThrough?.pushed).toEqual({ x: 2, y: 2 });
  expect(heavyThrough?.beside).toEqual({ x: 3, y: 1 });
});

test('shove:slick fourCombos: far or again, then carry or smear', () => {
  // The foe at A1 is shoved 1 onto the slick at B1; a blot lies at C1 and another foe at D1.
  const ascii = 'd o i d . .';
  const runs = fourCombos(
    'shove:slick',
    ['shove-slick-far', 'shove-slick-again'],
    ['shove-slick-carry', 'shove-slick-smear'],
    ({ footnotes }) => {
      const s = board(ascii);
      const r = runDraft(s, (ctx) => push(ctx, unitAtLabel(ctx.s, 'A1'), 'right', 1, null), {
        footnotes,
      });
      const at = (l: string) => r.state.units.find((u) => u.id === unitAtLabel(s, l).id)?.pos.x;
      return {
        pushed: at('A1'),
        blocker: at('D1'),
        crushes: r.events.filter((e) => e.type === 'crush').length,
        marks: r.events.filter((e) => e.type === 'marked').length,
        slickKept: tileAt(r.state, { x: 1, y: 0 }).state?.slid === undefined,
      };
    },
  );
  const [farCarry, farSmear, againCarry, againSmear] = runs.map((r) => r.result);
  // far + carry: slides to C1, the blocker takes the one tile left; nobody is crushed.
  expect(farCarry).toMatchObject({ pushed: 2, blocker: 4, crushes: 0, marks: 0 });
  // far + smear: slides over the blot (marked) and is crushed into the blocker as before.
  expect(farSmear).toMatchObject({ pushed: 2, blocker: 3, crushes: 1, marks: 1 });
  // again + carry: the plain slide stops at C1 before the blocker; nothing to hand on.
  expect(againCarry).toMatchObject({
    pushed: 2,
    blocker: 3,
    crushes: 0,
    marks: 0,
    slickKept: true,
  });
  expect(againSmear).toMatchObject({
    pushed: 2,
    blocker: 3,
    crushes: 0,
    marks: 1,
    slickKept: true,
  });
});
