import { describe, expect, it } from 'vitest';
import type { Drawing, EnemyId, Meets } from '$data';
import { COSTS, NEEDS } from '$data/drawing';
import { newSave, type Profile } from '$engine';
import { checkDrawing, costOf, paletteOf, penOf, weightBand } from '$engine/drawing';

const base = (): Profile => newSave(1).profile;
const withProfile = (edit: Partial<Profile>): Profile => ({ ...base(), ...edit });
const drawing = (edit: Partial<Drawing> = {}): Drawing => ({
  name: 'Wet room',
  rule: null,
  foes: ['rat'],
  pieces: [],
  shape: 'plain',
  length: 3,
  heart: 'marginalia',
  ...edit,
});
/** A household that has met everything the tests draw, with a pen big enough for any drawing. */
const rich = (): Profile =>
  withProfile({
    met: ['span', 'pier'] as Meets[],
    foesMet: ['rat', 'eel', 'moth', 'mother', 'lamplighter'] as EnemyId[],
    city: {
      ...base().city,
      open: ['seam', 'canals', 'bridges'],
      hearts: ['seam', 'canals', 'inkQuarter', 'bathhouses', 'bridges'],
    },
    pages: ['lamplighter:lantern'],
    known: Array.from({ length: 60 }, () => 'bolt') as Profile['known'],
  });

describe('EN-5: compatibility', () => {
  it('EN-5: each need greys its element with its sentence', () => {
    const p = rich();
    const owners: Record<string, Partial<Drawing>> = {
      eel: { foes: ['eel'] },
      moth: { foes: ['moth'] },
      mother: { heart: 'mother' },
      postmaster: { heart: 'postmaster' },
      bathSteward: { heart: 'bathSteward' },
      chiefWarden: { heart: 'chiefWarden' },
      carillonneur: { heart: 'carillonneur' },
      'bathhouses:heat': { shape: 'bathhouses:heat' },
      'bridges:span': { shape: 'bridges:span' },
      'foundry:peal': { shape: 'foundry:peal' },
    };
    expect(Object.keys(owners).sort()).toEqual(Object.keys(NEEDS).sort());
    for (const [id, edit] of Object.entries(owners)) {
      const issues = checkDrawing(p, drawing(edit)).filter((i) => i.id === id);
      const reasons = issues.map((i) => i.reason);
      for (const need of NEEDS[id] ?? []) expect(reasons, id).toContain(need.reason);
    }
    const reasons = checkDrawing(p, drawing({ foes: ['eel'] })).map((i) => i.reason);
    expect(reasons).toContain('The eel needs water: draw the current.');
  });

  it('EN-5: a rule brings its pieces; a satisfied need greys nothing', () => {
    const p = rich();
    const ok = drawing({ rule: 'bridges:collapse', heart: 'chiefWarden' });
    expect(
      checkDrawing(p, ok).filter((i) => i.element === 'heart' && i.id === 'chiefWarden'),
    ).toEqual([]);
  });

  it('EN-5: not-in-palette elements, an over-long name and the pen are each one issue', () => {
    const p = base();
    const issues = checkDrawing(
      p,
      drawing({ name: '   ', foes: ['eel'], rule: 'bridges:collapse' }),
    );
    const kinds = issues.map((i) => i.element);
    expect(kinds).toEqual(expect.arrayContaining(['name', 'rule', 'foe', 'heart', 'pen']));
    expect(issues.filter((i) => i.element === 'name')).toHaveLength(1);
    expect(
      checkDrawing(p, drawing({ name: 'x'.repeat(25) })).some((i) => i.element === 'name'),
    ).toBe(true);
  });
});

describe('EN-5: palette, pen and cost', () => {
  it('EN-5: the palette grows only with met content', () => {
    const empty = paletteOf(base());
    expect(empty.rules).toEqual([]);
    expect(empty.pieces).toEqual([]);
    expect(empty.shapes).toEqual([]);
    expect(empty.masters).toEqual([]);
    const p = rich();
    const grown = paletteOf(p);
    expect(grown.rules).toContain('bridges:collapse');
    expect(grown.pieces).toEqual(expect.arrayContaining(['bridges:span', 'bridges:pier']));
    expect(grown.shapes).toContain('bridges:span');
    expect(grown.shapes).not.toContain('foundry:peal');
    expect(grown.masters).toEqual(
      expect.arrayContaining(['marginalia', 'mother', 'postmaster', 'bathSteward', 'chiefWarden']),
    );
    expect(grown.masters).toContain('lamplighter');
    expect(grown.foes).toEqual(['rat', 'eel', 'moth']);
    expect(paletteOf({ ...p, pages: [] }).masters).not.toContain('lamplighter');
    expect(paletteOf({ ...p, met: [] }).rules).toEqual([]);
  });

  it('EN-5: pen parts sum to the total', () => {
    const p = rich();
    const pen = penOf({
      ...p,
      footnotes: {
        bolt: { points: 9, slots: {}, capstone: 'x' },
        splash: { points: 1, slots: {} },
      },
    });
    expect(pen.parts).toEqual({ hearts: 5, pages: 15, capstones: 1 });
    expect(pen.total).toBe(pen.parts.hearts + pen.parts.pages + pen.parts.capstones);
    expect(penOf(base()).parts.hearts).toBe(0);
  });

  it('EN-5: cost sums the elements and the weight band follows P7', () => {
    expect(costOf(drawing())).toBe(COSTS.minion + COSTS.hearts.marginalia);
    const full = drawing({
      rule: 'bridges:collapse',
      foes: ['rat', 'eel'],
      pieces: ['bridges:span', 'bridges:pier'],
      shape: 'bridges:span',
      length: 6,
      heart: 'registrar',
    });
    expect(costOf(full)).toBe(3 + (1 + 2) + 2 + 2 + 3 + 4);
    expect(weightBand(drawing())).toBe('light');
    expect(weightBand(drawing({ length: 6, rule: 'bridges:collapse', heart: 'postmaster' }))).toBe(
      'medium',
    );
    expect(weightBand(full)).toBe('heavy');
  });
});
