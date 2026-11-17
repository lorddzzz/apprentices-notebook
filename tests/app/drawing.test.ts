import { describe, expect, test } from 'vitest';
import type { Drawing } from '$data';
import { newSave, type Profile, type Trip } from '$engine';
import { drawingsOf, paletteOf, penOf } from '$engine/drawing';
import { blankDrawing, EMPTY_SLOT, saveDraft, tableView, toggle } from '../../src/app/drawing';
import { resolveScreen } from '../../src/app/flow';
import { fullHousehold, handoverProfile } from '../drawing/fixtures';

const named = (d: Drawing, name = 'The first'): Drawing => ({ ...d, name });
const ids = (rows: { id: string }[]) => rows.map((r) => r.id);

describe('the drawing table', () => {
  test('EN-6: rows list only the palette', () => {
    const p = handoverProfile();
    const v = tableView(p, 0, null, null);
    const palette = paletteOf(p);
    expect(ids(v.rows.foe)).toEqual(palette.foes);
    expect(ids(v.rows.piece)).toEqual(palette.pieces);
    expect(ids(v.rows.heart)).toEqual(palette.masters);
    expect(ids(v.rows.rule)).toEqual(['none', ...palette.rules]);
    expect(ids(v.rows.shape)).toEqual(['plain', ...palette.shapes]);
    expect(ids(v.rows.foe)).not.toContain('eel');
    expect(ids(v.rows.heart)).not.toContain('registrar');
    expect(v.slots).toEqual([null, null, null]);
    expect(EMPTY_SLOT).toBe('a district not yet drawn');
  });

  test('EN-6: a row whose need is unmet is greyed with its sentence', () => {
    const p = fullHousehold();
    const v = tableView(p, 0, { ...blankDrawing(p), name: 'Wet' }, null);
    const eel = v.rows.foe.find((r) => r.id === 'eel');
    expect(eel?.greyed).toBe('The eel needs water: draw the current.');
    const mother = v.rows.heart.find((r) => r.id === 'mother');
    expect(mother?.greyed).toMatch(/lamp-mother needs water/);
    // Drawing the current lifts the grey.
    const wet = tableView(p, 0, toggle(v.draft, 'rule', 'canals:current'), null);
    expect(wet.rows.foe.find((r) => r.id === 'eel')?.greyed).toBeNull();
    expect(wet.rows.heart.find((r) => r.id === 'mother')?.greyed).toBeNull();
  });

  test('EN-6: an over-budget draft cannot be saved and says why', () => {
    const p = fullHousehold();
    let d = named(blankDrawing(p), 'Heavy');
    d = toggle(d, 'rule', 'canals:current');
    d = { ...d, length: 6, heart: 'registrar', foes: ['rat', 'familiar', 'sentry'] };
    const lean: Profile = { ...p, known: [] };
    const v = tableView(lean, 0, d, null);
    expect(penOf(lean).total).toBeLessThan(v.cost);
    expect(v.canSave).toBe(false);
    expect(v.issues.some((i) => i.element === 'pen' && i.reason.includes('pen holds'))).toBe(true);
    expect(() => saveDraft({ ...newSave(1), profile: lean }, 0, d)).toThrow();
  });

  test('EN-6: a fourth foe or a third piece is refused', () => {
    const p = fullHousehold();
    let d = blankDrawing(p);
    for (const foe of ['rat', 'familiar', 'sentry', 'eel']) d = toggle(d, 'foe', foe);
    expect(d.foes).toHaveLength(3);
    expect(d.foes).not.toContain('eel');
    const [a, b, c] = paletteOf(p).pieces;
    let q = blankDrawing(p);
    for (const piece of [a, b, c]) q = toggle(q, 'piece', piece as string);
    expect(q.pieces).toEqual([a, b]);
    const v = tableView(p, 0, q, null);
    expect(v.rows.piece.find((r) => r.id === c)?.greyed).toMatch(/Two extra/);
    // A picked row can always be taken off again.
    expect(toggle(q, 'piece', a as string).pieces).toEqual([b]);
  });

  test('EN-6: a page in use by a trip is locked', () => {
    const p = handoverProfile();
    const plain = named(blankDrawing(p));
    const trip = (district: string, slot: number) =>
      ({
        district,
        kit: {
          state: { slot, drawing: plain, rooms: [null, null, null], inner: null },
          choices: [],
          checkpoint: false,
          bonuses: [],
        },
      }) as unknown as Trip;
    expect(tableView(p, 1, plain, null).canSave).toBe(true);
    const locked = tableView(p, 1, plain, trip('inkedPage', 1));
    expect(locked.locked).toBe(true);
    expect(locked.canSave).toBe(false);
    expect(tableView(p, 0, plain, trip('inkedPage', 1)).locked).toBe(false);
    expect(tableView(p, 1, plain, trip('canals', 1)).locked).toBe(false);
    const save = { ...newSave(1), profile: p, trip: trip('inkedPage', 1) };
    expect(() => saveDraft(save, 1, plain)).toThrow(/in use/);
    const stored = saveDraft({ ...newSave(1), profile: p }, 1, plain);
    expect(drawingsOf(stored.profile)[1]).toEqual(plain);
  });

  test('EN-6: the table is closed before the handover', () => {
    expect(resolveScreen('drawing', null, null, null)).toEqual({
      screen: 'study',
      redirect: 'study',
    });
    const early = { ...handoverProfile(), ending: undefined };
    expect(resolveScreen('drawing', null, null, null, early).screen).toBe('study');
    expect(resolveScreen('drawing', null, null, null, handoverProfile())).toEqual({
      screen: 'drawingTable',
      redirect: null,
    });
    const trip = { status: 'fight' } as unknown as Trip;
    expect(resolveScreen('drawing', trip, null, null, handoverProfile()).screen).toBe('battle');
  });
});
