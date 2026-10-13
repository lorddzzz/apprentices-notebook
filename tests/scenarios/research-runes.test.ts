import { expect, test } from 'vitest';
import { TUNING } from '$data';
import { parseLabel, tileAt } from '$engine';
import {
  applyBrass,
  applyEtch,
  applyKiln,
  applyScald,
  applySpark,
  applySteam,
} from '$engine/materials';
import { act, board, cast, draft, expectLog, unitAtLabel, withLattices } from './harness';

/** The six Seam recipes' runes (research design §3.3). */

const at = (s: Parameters<typeof tileAt>[0], label: string) => tileAt(s, parseLabel(label));

test('smear: the mark passes one hop to each adjacent unit, no further', () => {
  const s = withLattices(
    `
    D . r r
    . . r .
    . . . r
  `,
    { draughtsman: 'Bolt> Smear' },
    { hp: { C1: 5 } },
  );
  const r = cast(s, 'draughtsman', 'right');
  expectLog(r.events, [
    'Draughtsman casts Bolt right',
    'Bolt hits rat at C1 for 2',
    'rat at C1 is inked',
    'the ink on rat at C1 smears to rat at D1, rat at C2',
    'rat at D1 is inked',
    'rat at C2 is inked',
  ]);
  expect(unitAtLabel(r.state, 'D3').inked).toBe(false); // two hops away
});

test('smear at the board edge: nothing beyond to pass to, nothing logged', () => {
  const s = withLattices('D . r', { draughtsman: 'Bolt> Smear' }, { hp: { C1: 5 } });
  const r = cast(s, 'draughtsman', 'right');
  expectLog(r.events, [
    'Draughtsman casts Bolt right',
    'Bolt hits rat at C1 for 2',
    'rat at C1 is inked',
  ]);
});

test('torch: oils the tile and the fire runs along connected oil', () => {
  const s = withLattices('S . . o o r', { stoker: 'Bolt> Torch' }, { hp: { F1: 5 } });
  const r = cast(s, 'stoker', 'right');
  expectLog(r.events, [
    'Stoker casts Bolt right',
    'Bolt hits rat at F1 for 2',
    'oil coats F1',
    'oil at F1 ignites, fire spreads to D1, E1',
    'Fire hits rat at F1 for 2 (oil-soaked +1)',
  ]);
  for (const c of ['D1', 'E1', 'F1']) expect(at(r.state, c).fire).toBe(2);
});

test('fog: oil then steam on the tile', () => {
  const s = withLattices('D . r', { draughtsman: 'Bolt> Fog' }, { hp: { C1: 5 } });
  const r = cast(s, 'draughtsman', 'right');
  expectLog(r.events, [
    'Draughtsman casts Bolt right',
    'Bolt hits rat at C1 for 2',
    'oil coats C1',
    'steam rises at C1',
  ]);
  expect(at(r.state, 'C1')).toMatchObject({ oil: true, steam: 2 });
});

test('mist: inks every unit in the whole cloud, then the steam is gone', () => {
  const s = withLattices(
    `
    . . . .
    . r~ r~ r~
    . . . .
    . S . .
  `,
    { stoker: 'Splash> Mist' },
    { hp: { B2: 5, C2: 5, D2: 5 } },
  );
  const r = cast(s, 'stoker', { kind: 'tile', at: parseLabel('B2') });
  expectLog(r.events, [
    'Stoker casts Splash at B2',
    'Splash bursts at B2',
    'Splash hits rat at B2 for 1',
    'Splash hits rat at C2 for 1',
    'mist drifts through the steam at B2, C2, D2',
    'rat at B2 is inked',
    'rat at C2 is inked',
    'rat at D2 is inked',
    'the steam at B2, C2, D2 fades',
  ]);
  expect(at(r.state, 'C2').steam).toBe(0);
});

test('mist with no steam does nothing and logs nothing', () => {
  const s = withLattices('D . r', { draughtsman: 'Bolt> Mist' }, { hp: { C1: 5 } });
  const r = cast(s, 'draughtsman', 'right');
  expectLog(r.events, ['Draughtsman casts Bolt right', 'Bolt hits rat at C1 for 2']);
  expect(unitAtLabel(r.state, 'C1').inked).toBe(false);
});

test('quill: hits the first unit, then pools ink under it', () => {
  const s = withLattices('D . r', { draughtsman: 'Quill>' }, { hp: { C1: 5 } });
  const r = cast(s, 'draughtsman', 'right');
  expectLog(r.events, [
    'Draughtsman casts Quill right',
    'Quill hits rat at C1 for 2',
    'ink pools at C1',
  ]);
  expect(at(r.state, 'C1').ink).toBe(true);
});

test('quill that hits nothing flies like a bolt and pools nothing', () => {
  const s = withLattices('D . .\nr . .', { draughtsman: 'Quill>' });
  const r = cast(s, 'draughtsman', 'right');
  expectLog(r.events, ['Draughtsman casts Quill right', 'Quill lands at C1']);
  expect(at(r.state, 'C1').ink).toBe(false);
});

test('brand: marks the unit and brands it', () => {
  const s = withLattices('D . r', { draughtsman: 'Bolt> Brand' }, { hp: { C1: 5 } });
  const r = cast(s, 'draughtsman', 'right');
  expectLog(r.events, [
    'Draughtsman casts Bolt right',
    'Bolt hits rat at C1 for 2',
    'rat at C1 is inked',
    'rat at C1 is branded',
  ]);
  expect(unitAtLabel(r.state, 'C1').branded).toBe(true);
});

test('brand never pools on empty floor', () => {
  const s = withLattices('D . .\nr . .', { draughtsman: 'Bolt> Brand' });
  const r = cast(s, 'draughtsman', 'right');
  expectLog(r.events, ['Draughtsman casts Bolt right', 'Bolt lands at C1']);
  expect(at(r.state, 'C1').ink).toBe(false);
});

test('brand + fire: a branded unit takes +2', () => {
  const r = draft(board('S d%o o'), (ctx) => applySpark(ctx, [parseLabel('C1')], 1));
  expectLog(r.events, [
    'oil at C1 ignites, fire spreads to B1',
    'Fire hits dummy at B1 for 3 (branded +2)',
  ]);
});

test('brand and oil-soaked do not stack: the larger applies', () => {
  const s = board('S r%o o', { hp: { B1: 9 } });
  const r = draft(s, (ctx) => applySpark(ctx, [parseLabel('C1')], 1));
  expectLog(r.events, [
    'oil at C1 ignites, fire spreads to B1',
    'Fire hits rat at B1 for 3 (branded +2)',
  ]);
});

test('notation: % round-trips as branded', () => {
  const s = board('S r!%');
  expect(unitAtLabel(s, 'B1')).toMatchObject({ inked: true, branded: true });
});

// ── Scald, Etch, Kiln (plan S7–S9) ──────────────────────

const cells = (...labels: string[]) => labels.map(parseLabel);
const endTurn = { type: 'endTurn' } as const;
const scaldLines = (lines: string[]) => lines.filter((l) => l.startsWith('Scald hits'));

test('scald: clouds the tiles, puts out fire, scalds a unit at round end, then fades', () => {
  const lit = draft(board('D d *\n. . d'), (ctx) => applyScald(ctx, cells('B1', 'C1', 'C2')));
  expectLog(lit.events, ['scalding steam rises at B1, C1, C2', 'steam puts out the fire at C1']);
  expect(at(lit.state, 'C1')).toMatchObject({ steam: TUNING.steamRounds, scald: true, fire: 0 });

  const r1 = act(lit.state, endTurn);
  expect(scaldLines(r1.lines)).toEqual([
    'Scald hits dummy at B1 for 1',
    'Scald hits dummy at C2 for 1',
  ]);
  const r2 = act(r1.state, endTurn);
  expect(scaldLines(r2.lines)).toHaveLength(2);
  expect(r2.lines).toContain('the steam at B1, C1, C2 fades');
  expect(at(r2.state, 'B1')).toMatchObject({ steam: 0, scald: false });
  expect(scaldLines(act(r2.state, endTurn).lines)).toEqual([]);
});

test('scald: inked +1 applies, and a unit outside the cloud is spared', () => {
  const r = act(board('D r! . r', { hp: { B1: 9 } }), endTurn);
  expect(scaldLines(r.lines)).toEqual([]);
  const lit = draft(board('D r! . r', { hp: { B1: 9 } }), (ctx) => applyScald(ctx, cells('B1')));
  expect(scaldLines(act(lit.state, endTurn).lines)).toEqual([
    'Scald hits rat at B1 for 2 (inked +1)',
  ]);
});

test('scald: steam over a scalding tile keeps scalding; fresh steam over a faded one is plain', () => {
  const lit = draft(board('D s .'), (ctx) => applyScald(ctx, cells('C1')));
  expect(at(lit.state, 'B1').scald).toBe(true);
  const s = board('D s .');
  const merged = draft(s, (ctx) => ctx.s && applySteam(ctx, cells('B1')));
  expect(at(merged.state, 'B1')).toMatchObject({ scald: true, steam: TUNING.steamRounds });
  const fresh = draft(board('D . .'), (ctx) => {
    at(ctx.s, 'B1').scald = true; // stale flag with no steam
    applySteam(ctx, cells('B1'));
  });
  expect(at(fresh.state, 'B1').scald).toBe(false);
});

test('scald: a plate is not clouded', () => {
  const r = draft(board('D ='), (ctx) => applyScald(ctx, cells('B1')));
  expectLog(r.events, []);
});

test('etch: inks the unit and etches a brass unit and a plate; a second etch changes nothing', () => {
  const s = board('D d& = r');
  const r = draft(s, (ctx) => applyEtch(ctx, cells('B1', 'C1', 'D1')));
  expectLog(r.events, [
    'dummy at B1 is inked',
    'rat at D1 is inked',
    'a mark is etched into the brass at C1, B1',
  ]);
  expect(at(r.state, 'C1').etched).toBe(true);
  expect(unitAtLabel(r.state, 'B1').etched).toBe(true);
  expect(unitAtLabel(r.state, 'D1').etched).toBe(false);
  const again = draft(r.state, (ctx) => applyEtch(ctx, cells('B1', 'C1')));
  expect(again.lines.some((l) => l.includes('etched'))).toBe(false);
});

test('etch: an etched network carries Spark to inked units beside it', () => {
  // Plates B1..B2 form a network with the etched one; the inked rat stands beside the network.
  const s = board('S = = r!\n. . . .', { hp: { D1: 9 } });
  const lit = draft(s, (ctx) => applyEtch(ctx, cells('C1')));
  expect(at(lit.state, 'C1').etched).toBe(true);
  const r = draft(lit.state, (ctx) => applySpark(ctx, cells('B1'), 1));
  expect(r.lines).toContain('Spark hits rat at D1 for 2 (inked +1)');
  expect(r.lines.some((l) => l.includes('detonat') || l.includes('Detonation'))).toBe(true);
});

test('etch: without an etched plate the same network leaves the beside rat alone', () => {
  const r = draft(board('S = = r!', { hp: { D1: 9 } }), (ctx) => applySpark(ctx, cells('B1'), 1));
  expect(r.lines.some((l) => l.includes('rat'))).toBe(false);
});

test('kiln: raises a plate that is already hot and scalds its neighbours at round end', () => {
  const lit = draft(board('D . r\n. . .'), (ctx) => applyKiln(ctx, cells('B1')));
  expectLog(lit.events, ['a brass plate rises at B1', 'the brass at B1 heats up']);
  expect(at(lit.state, 'B1')).toMatchObject({ plate: true, heat: 2 });
  const withRat = draft(board('D . r'), (ctx) => applyKiln(ctx, cells('C1')));
  expect(unitAtLabel(withRat.state, 'C1')).toMatchObject({ brass: true, heat: 0 });

  const s = draft(board('D . .\n. r .'), (ctx) => applyKiln(ctx, cells('B1')));
  const r = act(s.state, endTurn);
  expect(r.lines.filter((l) => l.startsWith('Heated brass hits'))).toEqual([
    'Heated brass hits Draughtsman for 1',
    'Heated brass hits rat at B2 for 1',
  ]);
});

test('kiln: plain Brass alone stays cold', () => {
  const cold = draft(board('D .'), (ctx) => applyBrass(ctx, cells('B1')));
  expect(at(cold.state, 'B1').heat).toBe(0);
});
