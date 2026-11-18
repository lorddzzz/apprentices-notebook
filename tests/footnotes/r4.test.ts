import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { capstoneKey, type LineId, slotKey, VARIANTS, type VariantDef } from '$data';
import {
  footnoteCost,
  footnoteIds,
  footnoteOffers,
  type GameEvent,
  newProfile,
  type Profile,
  pointLines,
  slotsOf,
} from '$engine';
import { marginOf } from '../../src/app/desk';

/** Pack R4: review fixes to footnote points, sleeping slots, costs and ids (CL-4 d). */

const WALL: LineId = 'shove:wall';
const W1 = slotKey(WALL, 1);
const W2 = slotKey(WALL, 2);
const V: VariantDef[] = [
  { id: 't-soft', subject: 'shove', slot: { line: WALL, level: 1 }, text: 'Soft.' },
  { id: 't-l2a', subject: 'shove', slot: { line: WALL, level: 2 }, text: 'Level II, a.' },
  { id: 't-l2b', subject: 'shove', slot: { line: WALL, level: 2 }, text: 'Level II, b.' },
];

const at = (cast: number, line: LineId): GameEvent =>
  ({
    type: 'won',
    line,
    origin: { caster: 'stoker', spell: 'bolt', cast },
  }) as GameEvent;

function profile(over: Partial<Profile> = {}): Profile {
  const p = newProfile();
  return { ...p, known: [...p.known, 'shove'], witnessed: [WALL], ...over };
}

describe('pointLines: a new cast starts a new run', () => {
  test('one line firing in two casts earns two points; one cast earns one', () => {
    expect(pointLines([at(1, WALL), at(1, WALL), at(2, WALL)])).toEqual([WALL, WALL]);
    expect(pointLines([at(1, WALL), at(1, WALL)])).toEqual([WALL]);
  });
});

describe('a written slot above the level sleeps', () => {
  const dropped = profile({
    footnotes: { shove: { points: 8, slots: { [W1]: 't-soft', [W2]: 't-l2a' } } },
  });

  test('footnoteIds drops it; the Desk and slotsOf show it written but asleep', () => {
    expect(footnoteIds(dropped, V)).toEqual({ [W1]: 't-soft' });
    const w2 = slotsOf(dropped, 'shove', { variants: V }).find((s) => s.key === W2);
    expect(w2).toMatchObject({ state: 'locked', written: 't-l2a', sleeping: true });
    expect(w2?.options.map((v) => v.id)).toEqual(['t-l2a']);
    const frame = marginOf(dropped, 'shove', { variants: V }).lines[0]?.frames.find(
      (f) => f.key === W2,
    );
    expect(frame).toMatchObject({ state: 'locked', sleeping: true });
  });

  test('an awake slot is not sleeping', () => {
    const awake = { ...dropped, footnotes: { shove: { points: 25, slots: { [W2]: 't-l2a' } } } };
    expect(footnoteIds(awake, V)).toEqual({ [W2]: 't-l2a' });
    expect(slotsOf(awake, 'shove', { variants: V }).find((s) => s.key === W2)?.sleeping).toBe(
      false,
    );
  });
});

describe('costs and offers', () => {
  test('footnoteCost is null for a key of another subject', () => {
    const p = profile();
    expect(footnoteCost(p, 'shove', capstoneKey('bind'))).toBeNull();
    expect(footnoteCost(p, 'shove', slotKey('bind:cloud', 1))).toBeNull();
    expect(footnoteCost(p, 'shove', capstoneKey('shove'))).toBeNull(); // own capstone, unaffordable
  });

  test('footnoteOffers takes FootnoteOpts', () => {
    const p = profile({ footnotes: { shove: { points: 8, slots: {} } } });
    expect(footnoteOffers(p, 'shove', { variants: V }).map((v) => v.id)).toEqual(['t-soft']);
  });
});

describe('footnote ids in handlers are known', () => {
  test('every hasFootnote / fn literal in src/engine names a content variant', () => {
    const known = new Set(VARIANTS.map((v) => v.id));
    const root = new URL('../../src/engine/', import.meta.url);
    const files = (readdirSync(root, { recursive: true }) as string[]).filter((f) =>
      f.endsWith('.ts'),
    );
    const re = /(?:hasFootnote\([^,()'"<>:]+,|\bfn\()\s*['"]([^'"]+)['"]/g;
    const unknown: string[] = [];
    let seen = 0;
    for (const f of files) {
      for (const m of readFileSync(new URL(f, root), 'utf8').matchAll(re)) {
        seen++;
        if (!known.has(m[1] as string)) unknown.push(`${f}: ${m[1]}`);
      }
    }
    expect(seen).toBeGreaterThan(50);
    expect(unknown).toEqual([]);
  });
});
