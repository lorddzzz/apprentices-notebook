import { expect, test } from 'vitest';
import { type GameEvent, memberById, parseLabel } from '$engine';
import { markUnit } from '$engine/bursts';
import { type Ctx, runDraft } from '$engine/ctx';
import { landKind } from '$engine/mix';
import { moveMember } from '$engine/movement';
import { push } from '$engine/push';
import { tileAt } from '$engine/queries';
import { flowFor, tile, unit } from '../chemHarness';
import { type Combo, fourCombos } from '../footnoteHarness';
import { board, unitAtLabel } from '../harness';

const at = (l: string) => parseLabel(l);
type S = Parameters<typeof unitAtLabel>[0];
const id = (s: S, l: string) => unitAtLabel(s, l).id;
const of = (s: S, l: string, state: S) => state.units.find((u) => u.id === id(s, l));
const taken = (events: GameEvent[], uid: string, source: string) =>
  events.flatMap((e) =>
    e.type === 'damage' && e.target.id === uid && e.source === source ? [e.amount] : [],
  );

/** Ink on a marked B2 (neighbour C2); Spark on a deep-marked B2; a deep-marked B2 pushed onto oil. */
function markLine(combo: Combo) {
  const { footnotes } = combo;
  const s1 = board('D . . . .\n. d d . .');
  const r1 = runDraft(
    s1,
    (ctx: Ctx) => {
      markUnit(ctx, unitAtLabel(ctx.s, 'B2'), null);
      landKind(ctx, 'ink', unit(id(s1, 'B2')), flowFor(s1));
    },
    { footnotes },
  );
  const s2 = board('D . . . .\n. d!! d . .');
  const r2 = runDraft(s2, (ctx: Ctx) => landKind(ctx, 'spark', unit(id(s2, 'B2')), flowFor(s2)), {
    footnotes,
  });
  const s3 = board('D . . . .\n. d!! o o .');
  const r3 = runDraft(s3, (ctx: Ctx) => push(ctx, unitAtLabel(ctx.s, 'B2'), 'right', 1, null), {
    footnotes,
  });
  return {
    overflow: {
      first: of(s1, 'B2', r1.state)?.mark,
      next: of(s1, 'C2', r1.state)?.mark,
      line: r1.events.find((e) => e.type === 'marked' && e.unit.id === id(s1, 'C2'))?.line,
    },
    peel: {
      first: of(s2, 'B2', r2.state)?.mark,
      next: of(s2, 'C2', r2.state)?.mark,
      flare: taken(r2.events, id(s2, 'C2'), 'Flare'),
      lifted: r2.events.find((e) => e.type === 'markLifted')?.line,
    },
    slid: of(s3, 'B2', r3.state)?.pos.x,
  };
}

test('ink:mark fourCombos: overflow or heavy, then pass or flare', () => {
  const runs = fourCombos(
    'ink:mark',
    ['ink-mark-overflow', 'ink-mark-heavy'],
    ['ink-mark-pass', 'ink-mark-flare'],
    markLine,
  );
  const [ovPass, ovFlare, hvPass, hvFlare] = runs.map((r) => r.result);
  // overflow: the first mark stays plain, the neighbour is marked; heavy leaves the deep mark.
  for (const r of [ovPass, ovFlare]) {
    expect(r?.overflow.first?.deep).toBe(false);
    expect(r?.overflow.next).toBeTruthy();
    expect(r?.overflow.line).toBe('ink:mark');
    expect(r?.slid).toBeGreaterThan(2);
  }
  for (const r of [hvPass, hvFlare]) {
    expect(r?.overflow.first?.deep).toBe(true);
    expect(r?.overflow.next).toBeFalsy();
    expect(r?.slid).toBe(2); // a deep-marked unit pushed onto oil stops at once
  }
  // pass: the plain mark left over jumps to the neighbour; flare: the neighbour takes 1.
  for (const r of [ovPass, hvPass]) {
    expect(r?.peel.first).toBeFalsy();
    expect(r?.peel.next?.deep).toBe(false);
    expect(r?.peel.lifted).toBe('ink:mark');
    expect(r?.peel.flare).toEqual([]);
  }
  for (const r of [ovFlare, hvFlare]) {
    expect(r?.peel.first?.deep).toBe(false);
    expect(r?.peel.next).toBeFalsy();
    expect(r?.peel.flare).toEqual([1]);
  }
});

test('ink-mark-overflow with no unit beside falls back to the deep mark', () => {
  const s = board('D . . .\n. . d .');
  const footnotes = fourCombos(
    'ink:mark',
    ['ink-mark-overflow', 'ink-mark-heavy'],
    ['ink-mark-pass', 'ink-mark-flare'],
    (c) => c.footnotes,
  )[0]?.result;
  const r = runDraft(
    s,
    (ctx: Ctx) => {
      markUnit(ctx, unitAtLabel(ctx.s, 'C2'), null);
      landKind(ctx, 'ink', unit(id(s, 'C2')), flowFor(s));
    },
    { footnotes: footnotes ?? {} },
  );
  expect(of(s, 'C2', r.state)?.mark?.deep).toBe(true);
});

function stainLine(combo: Combo) {
  const { footnotes } = combo;
  // A dummy pushed across a stain; a member walking across one; a marked dummy pushed onto one.
  const sp = board('D . . . .\nd {stain} . . .');
  const rp = runDraft(sp, (ctx: Ctx) => push(ctx, unitAtLabel(ctx.s, 'A2'), 'right', 3, null), {
    footnotes,
  });
  const sw = board('D {stain} . . .');
  const rw = runDraft(
    sw,
    (ctx: Ctx) => moveMember(ctx, memberById(ctx.s, 'draughtsman'), at('C1')),
    { footnotes },
  );
  const sd = board('D . . . .\nd {stain} . . .');
  const rd = runDraft(
    sd,
    (ctx: Ctx) => {
      markUnit(ctx, unitAtLabel(ctx.s, 'A2'), null);
      push(ctx, unitAtLabel(ctx.s, 'A2'), 'right', 1, null);
    },
    { footnotes },
  );
  // A spark lights the slick at A2; a dummy stands on the stain beside it.
  const sk = board('D . . . .\no d{stain} . . .');
  const rk = runDraft(sk, (ctx: Ctx) => landKind(ctx, 'spark', tile('A2'), flowFor(sk)), {
    footnotes,
  });
  return {
    pushed: of(sp, 'A2', rp.state)?.mark,
    pushedLine: rp.events.filter((e) => e.type === 'marked').map((e) => e.line),
    walked: memberById(rw.state, 'draughtsman').mark,
    deep: of(sd, 'A2', rd.state)?.mark?.deep,
    wick: {
      mark: of(sk, 'B2', rk.state)?.mark,
      inkfire: taken(rk.events, id(sk, 'B2'), 'Inkfire'),
      fire: taken(rk.events, id(sk, 'B2'), 'Fire'),
    },
  };
}

test('ink:stain fourCombos: pushed or wet, then deepen or wick', () => {
  const runs = fourCombos(
    'ink:stain',
    ['ink-stain-pushed', 'ink-stain-wet'],
    ['ink-stain-deepen', 'ink-stain-wick'],
    stainLine,
  );
  const [pDeepen, pWick, wDeepen, wWick] = runs.map((r) => r.result);
  // pushed: marked on the stain it crossed; without it only a landing marks.
  for (const r of [pDeepen, pWick]) {
    expect(r?.pushed).toBeTruthy();
    expect(r?.pushedLine).toEqual(['ink:stain']);
    expect(r?.walked).toBeFalsy();
  }
  // wet: the walker is marked crossing; the push is not (it ends off the stain).
  for (const r of [wDeepen, wWick]) {
    expect(r?.walked).toBeTruthy();
    expect(r?.pushed).toBeFalsy();
  }
  // deepen: a marked unit pushed onto a stain gets a deep mark; wick leaves it plain.
  for (const r of [pDeepen, wDeepen]) expect(r?.deep).toBe(true);
  for (const r of [pWick, wWick]) expect(r?.deep).toBe(false);
  // wick: Inkfire marks and hurts the unit on the stain; deepen leaves plain fire.
  for (const r of [pWick, wWick]) {
    expect(r?.wick.mark).toBeTruthy();
    expect(r?.wick.inkfire).toEqual([2]);
    expect(r?.wick.fire).toEqual([]);
  }
  for (const r of [pDeepen, wDeepen]) {
    expect(r?.wick.mark).toBeFalsy();
    expect(r?.wick.inkfire).toEqual([]);
    expect(r?.wick.fire).toEqual([2]);
  }
});

/** A mark on B2 spreads through the cloud B2-E2: S is an apprentice, D2 is already marked, B3 sits beside it. */
function spreadLine(combo: Combo) {
  const s = board('D . . . .\n. d~ S~ d!~ d~\n. d . . .');
  const r = runDraft(s, (ctx: Ctx) => markUnit(ctx, unitAtLabel(ctx.s, 'B2'), null), {
    footnotes: combo.footnotes,
  });
  return {
    ally: of(s, 'C2', r.state)?.mark,
    marked: of(s, 'D2', r.state)?.mark,
    beside: of(s, 'B3', r.state)?.mark,
    cloud: ['B2', 'C2', 'D2', 'E2'].map((l) => tileAt(r.state, at(l)).state?.id),
    spread: r.events.find((e) => e.type === 'markSpread')?.line,
  };
}

test('ink:spread fourCombos: kin or seep, then brand or deep', () => {
  const runs = fourCombos(
    'ink:spread',
    ['ink-spread-kin', 'ink-spread-seep'],
    ['ink-spread-brand', 'ink-spread-deep'],
    spreadLine,
  );
  const [kinBrand, kinDeep, seepBrand, seepDeep] = runs.map((r) => r.result);
  // kin spares the apprentice; seep reaches her and the unit beside the cloud.
  for (const r of [kinBrand, kinDeep]) {
    expect(r?.ally).toBeFalsy();
    expect(r?.beside).toBeFalsy();
  }
  for (const r of [seepBrand, seepDeep]) {
    expect(r?.ally).toBeTruthy();
    expect(r?.beside).toBeTruthy();
    expect(r?.spread).toBe('ink:spread');
  }
  // brand: the cloud turns brand; deep: the marked unit D2 is deepened.
  for (const r of [kinBrand, seepBrand]) {
    expect(r?.cloud).toEqual(['brandCloud', 'brandCloud', 'brandCloud', 'brandCloud']);
    expect(r?.marked?.deep).toBe(false);
  }
  for (const r of [kinDeep, seepDeep]) {
    expect(r?.cloud).toEqual(['cloud', 'cloud', 'cloud', 'cloud']);
    expect(r?.marked?.deep).toBe(true);
  }
});
