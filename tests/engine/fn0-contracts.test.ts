import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  capstoneKey,
  FOOTNOTES,
  type FootnoteKey,
  type FootnoteKind,
  type FootnoteSubject,
  footnoteKeyOf,
  HABIT_IDS,
  isFootnoteSubject,
  type LineId,
  METHOD_IDS,
  type MethodId,
  RUNE_IDS,
  type RuneId,
  SOLVENT_IDS,
  type SolventId,
  slotKey,
  subjectKind,
  type VariantDef,
  variantLevel,
  variantLine,
} from '$data';
import { type FootnoteEntry, footnoteIds, newProfile, type Profile, parseSaveData } from '$engine';
import type { FootnoteIds } from '$engine/ctx';
import { fourCombos, withFootnotes } from '../scenarios/footnoteHarness';

const WALL: LineId = 'shove:wall';
const fixture = (id: string, slot: VariantDef['slot']): VariantDef => ({
  id,
  subject: 'shove',
  slot,
  text: id,
});
const V: VariantDef[] = [
  fixture('shove-a1', { line: WALL, level: 1 }),
  fixture('shove-b1', { line: WALL, level: 1 }),
  fixture('shove-a2', { line: WALL, level: 2 }),
  fixture('shove-b2', { line: WALL, level: 2 }),
  fixture('shove-cap', { capstone: true }),
];

describe('FN-0 contracts', () => {
  it('subjects are runes, methods and solvents; habits and basic actions are not', () => {
    expectTypeOf<FootnoteSubject>().toEqualTypeOf<RuneId | MethodId | SolventId>();
    for (const r of RUNE_IDS) expect(subjectKind(r)).toBe('rune');
    for (const m of METHOD_IDS) expect(subjectKind(m)).toBe('method');
    for (const s of SOLVENT_IDS) expect(subjectKind(s)).toBe('solvent');
    for (const h of [...HABIT_IDS, 'pull', 'hop']) expect(isFootnoteSubject(h)).toBe(false);
  });

  it('thresholds are per kind, three ascending numbers each', () => {
    const kinds: FootnoteKind[] = ['rune', 'method', 'solvent'];
    for (const k of kinds) {
      const [a, b, c] = FOOTNOTES.levels[k];
      expect(a < b && b < c, k).toBe(true);
    }
    expect(FOOTNOTES.levels.method).toEqual([5, 15, 36]);
    expect(FOOTNOTES.levels.solvent).toEqual([5, 15, 36]);
  });

  it('keys: a line slot per level, one capstone per subject', () => {
    expect(slotKey(WALL, 1)).toBe('shove:wall@1');
    expect(capstoneKey('bind')).toBe('bind@cap');
    expect(V.map(footnoteKeyOf)).toEqual([
      'shove:wall@1',
      'shove:wall@1',
      'shove:wall@2',
      'shove:wall@2',
      'shove@cap',
    ]);
    expect(V.map(variantLevel)).toEqual([1, 1, 2, 2, 3]);
    expect(variantLine(V[4] as VariantDef)).toBeNull();
    expectTypeOf<keyof FootnoteIds>().toEqualTypeOf<FootnoteKey>();
  });

  it('the profile holds slots, a capstone and the found solvents', () => {
    const p = newProfile();
    expect(p.footnotes).toEqual({});
    expect(p.solventsFound).toEqual([]);
    const entry: FootnoteEntry = {
      points: 30,
      slots: { 'shove:wall@1': 'shove-a1', 'shove:wall@2': 'shove-b2' },
      capstone: 'shove-cap',
    };
    const written: Profile = { ...p, footnotes: { shove: entry, bind: { points: 2, slots: {} } } };
    expect(footnoteIds(written, V)).toEqual({
      'shove:wall@1': 'shove-a1',
      'shove:wall@2': 'shove-b2',
      'shove@cap': 'shove-cap',
    });
    const save = { profile: written, trip: null, seedCounter: 1, lastTrip: null };
    expect(parseSaveData(JSON.parse(JSON.stringify(save)))).toEqual(save);
  });

  it('a pre-FN save: chosen lines become level I slots, found solvents are inferred', () => {
    const p = newProfile();
    const old = {
      ...p,
      solvents: { ...p.solvents, pitch: 2 },
      footnotes: { shove: { points: 6, chosen: { 'shove:wall': 'shove-wall-soft' } } },
    } as Record<string, unknown>;
    delete old.solventsFound;
    const back = parseSaveData({ profile: old, trip: null, seedCounter: 1, lastTrip: null });
    expect(back.profile.footnotes.shove).toEqual({
      points: 6,
      slots: { 'shove:wall@1': 'shove-wall-soft' },
    });
    expect(back.profile.solventsFound).toEqual(['pitch']);
  });

  it('fourCombos runs level I × level II, all four, and rejects a wrong pair', () => {
    const runs = fourCombos(
      WALL,
      ['shove-a1', 'shove-b1'],
      ['shove-a2', 'shove-b2'],
      (c) => c.footnotes,
      V,
    );
    expect(runs.map((r) => `${r.combo.l1}+${r.combo.l2}`)).toEqual([
      'shove-a1+shove-a2',
      'shove-a1+shove-b2',
      'shove-b1+shove-a2',
      'shove-b1+shove-b2',
    ]);
    expect(runs[3]?.result).toEqual({ 'shove:wall@1': 'shove-b1', 'shove:wall@2': 'shove-b2' });
    expect(() =>
      fourCombos(WALL, ['shove-a2', 'shove-b1'], ['shove-a2', 'shove-b2'], () => 0, V),
    ).toThrow();
    expect(() => withFootnotes(['shove-a1', 'shove-b1'], V)).toThrow('share the slot');
    expect(withFootnotes(['shove-cap'], V)).toEqual({ 'shove@cap': 'shove-cap' });
  });
});
