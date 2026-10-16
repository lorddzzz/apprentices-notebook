import { expect, test } from 'vitest';
import { TUNING } from '$data';
import { footprint, label, parseLabel, tileAt } from '$engine';
import { applyBrass, applyInk, applyOil, applySteam } from '$engine/materials';
import { board, draft, unitAtLabel } from '../scenarios/harness';

const cells = (...labels: string[]) => labels.map(parseLabel);

test('ink marks unit, pools on empty tiles, skips plates', () => {
  const s = board(`
    D . . .
    . r = .
    . . . d
  `);
  const r = draft(s, (ctx) => applyInk(ctx, footprint(ctx.s, cells('B2'), 2)));
  expect(r.lines).toEqual([
    'Draughtsman is inked',
    'rat at B2 is inked',
    'ink pools at B1, C1, A2, A3, B3, C3',
  ]);
  expect(tileAt(r.state, parseLabel('C2')).ink).toBe(false);
  expect(tileAt(r.state, parseLabel('B2')).ink).toBe(false);
  // already inked units and inked floor stay as they are, silently
  expect(draft(r.state, (ctx) => applyInk(ctx, footprint(ctx.s, cells('B2'), 2))).lines).toEqual(
    [],
  );
});

test('ink into steam diffuses through the whole cloud', () => {
  const s = board(`
    S . ~ r~ .
    . . . f~ d
  `);
  const r = draft(s, (ctx) => applyInk(ctx, cells('C1', 'D1')));
  expect(r.lines).toEqual([
    'ink diffuses through the steam at C1',
    'rat at D1 is inked',
    'familiar at D2 is inked',
  ]);
  expect(r.events[0]).toMatchObject({ type: 'diffuse', tiles: cells('C1', 'D1', 'D2') });
  expect(tileAt(r.state, parseLabel('C1')).ink).toBe(false);
});

test('oil next to fire ignites', () => {
  const r = draft(board('* .'), (ctx) => applyOil(ctx, cells('B1')));
  expect(r.lines).toEqual(['oil coats B1', 'oil at B1 ignites']);
  expect(tileAt(r.state, parseLabel('B1'))).toMatchObject({ oil: true, fire: 2 });
});

test('oil skips plates and oiled tiles', () => {
  const r = draft(board('o = . d'), (ctx) => applyOil(ctx, cells('A1', 'B1', 'C1')));
  expect(r.lines).toEqual(['oil coats C1']);
});

test('steam puts out fire, oil stays', () => {
  const r = draft(board('* . = d'), (ctx) => applySteam(ctx, cells('A1', 'B1', 'C1')));
  expect(r.lines).toEqual(['steam rises at A1, B1', 'steam puts out the fire at A1']);
  expect(tileAt(r.state, parseLabel('A1'))).toMatchObject({ oil: true, fire: 0, steam: 2 });
  expect(tileAt(r.state, parseLabel('C1')).steam).toBe(0);
});

test('brass plates rise on empty tiles and coat units', () => {
  const s = board(`
    r o~ = i
    b r& . .
  `);
  const all = footprint(s, cells('B1', 'C2'), 2);
  const r = draft(s, (ctx) => applyBrass(ctx, all));
  expect(r.lines).toEqual(['rat at A1 is coated in brass', 'brass plates rise at B1, D1, C2, D2']);
  expect(tileAt(r.state, parseLabel('B1'))).toEqual({
    oil: false,
    ink: false,
    steam: 0,
    fire: 0,
    plate: true,
    plateRounds: TUNING.plateRounds,
    vent: false,
    stain: false,
    heat: 0,
    etched: false,
    scald: false,
    water: null,
    grate: false,
    gate: false,
    lamp: false,
  });
  expect(unitAtLabel(r.state, 'A1').brass).toBe(true);
  const one = draft(board('S . d'), (ctx) => applyBrass(ctx, cells('B1')));
  expect(one.lines).toEqual(['a brass plate rises at B1']);
});

test('footprint feeds materials in reading order', () => {
  const s = board('. . .\n. . .\n. . d');
  const r = draft(s, (ctx) => applySteam(ctx, footprint(ctx.s, cells('C3', 'A1'), 1)));
  expect(r.lines).toEqual(['steam rises at A1, C3']);
  expect(footprint(s, cells('B2'), 2).map(label)).toHaveLength(9);
});
