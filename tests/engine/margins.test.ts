import { describe, expect, test } from 'vitest';
import { CODEX, type CodexEntryDef, type LineId, type RuneId, TUNING } from '$data';
import {
  awardFootnotePoints,
  type FiredCell,
  footnoteThreshold,
  isGlyph,
  newProfile,
  type Profile,
  parseLattice,
  recordProof,
  setMemberLattice,
} from '$engine';
import { answeredIds, marginsOpen, newlyAnswered, noteFor } from '$engine/margins';

/** SM-12: the margins answer (P12). Fixture answers stand in for SM-14's authored ones. */

const FIRST = 'first note';
const entry = (
  id: string,
  kind: CodexEntryDef['kind'],
  when: 'proof' | 'mastery',
): CodexEntryDef => ({
  id,
  kind,
  ref: id.slice(id.indexOf(':') + 1),
  title: id,
  text: 'text',
  ownerNote: FIRST,
  answer: { when, text: `answer ${id}` },
});
const FIXTURE: readonly CodexEntryDef[] = [
  entry('rune:bolt', 'rune', 'proof'),
  entry('rune:shove', 'rune', 'proof'),
  entry('rune:ink', 'rune', 'mastery'),
  entry('idiom:bonfire', 'idiom', 'proof'),
  entry('compound:stain', 'compound', 'proof'),
  { ...entry('rune:oil', 'rune', 'proof'), answer: undefined },
];

const CHAIN = 'Bolt> Ink Oil Spark .';
const chainMask: FiredCell[] = [
  { at: { x: 0, y: 0 }, rune: 'bolt', dir: 'right' },
  { at: { x: 1, y: 0 }, rune: 'ink' },
  { at: { x: 2, y: 0 }, rune: 'oil' },
  { at: { x: 3, y: 0 }, rune: 'spark' },
];

/** A household whose draughtsman holds the chain, proven in `casts` casts. */
function proven(casts: number): Profile {
  let p: Profile = newProfile();
  p = setMemberLattice(p, 'draughtsman', parseLattice(CHAIN));
  p = setMemberLattice(p, 'stoker', { shape: parseLattice('. .').shape, runes: [] });
  for (let i = 0; i < casts; i++) p = recordProof(p, 'draughtsman', [chainMask]);
  return p;
}
const fallen = (p: Profile): Profile => ({ ...p, city: { ...p.city, hearts: ['seam'] } });
const note = (p: Profile, id: string) => noteFor(p, id, FIXTURE);

const WALL = 'ink:mark' as LineId;
const withInkLevel = (p: Profile, level: 1 | 2 | 3): Profile => {
  const know = { ...p, known: [...new Set<RuneId>([...p.known, 'ink'])], witnessed: [WALL] };
  const pts = footnoteThreshold('ink', level);
  return awardFootnotePoints(know, Array<LineId>(pts).fill(WALL));
};

describe('the gate: nothing answers before the Marginalia falls', () => {
  test('a proven, mastered household still reads the first note', () => {
    const p = withInkLevel(proven(TUNING.provenCasts), 2);
    expect(marginsOpen(p)).toBe(false);
    expect(note(p, 'rune:bolt')).toEqual({ text: FIRST, answered: false });
    expect(note(p, 'rune:ink')).toEqual({ text: FIRST, answered: false });
    expect(answeredIds(p, FIXTURE)).toEqual([]);
  });

  test('once the heart is cleared the same profile answers', () => {
    const p = fallen(proven(TUNING.provenCasts));
    expect(marginsOpen(p)).toBe(true);
    expect(note(p, 'rune:bolt')).toEqual({ text: 'answer rune:bolt', answered: true });
  });
});

describe('proof answers', () => {
  test('a rune in an unproven cluster does not answer; the fifth proving cast does', () => {
    expect(note(fallen(proven(TUNING.provenCasts - 1)), 'rune:bolt').answered).toBe(false);
    expect(note(fallen(proven(TUNING.provenCasts)), 'rune:bolt').answered).toBe(true);
  });

  test('only runes the proven cluster holds answer', () => {
    const p = fallen(proven(TUNING.provenCasts));
    expect(note(p, 'rune:shove')).toEqual({ text: FIRST, answered: false });
  });

  test('proof in either household lattice counts (the stoker rebuilds it)', () => {
    let p: Profile = newProfile();
    p = setMemberLattice(p, 'draughtsman', { shape: parseLattice('. .').shape, runes: [] });
    p = setMemberLattice(p, 'stoker', parseLattice(CHAIN));
    for (let i = 0; i < TUNING.provenCasts; i++) p = recordProof(p, 'draughtsman', [chainMask]);
    expect(note(fallen(p), 'rune:bolt').answered).toBe(true);
  });

  test('an idiom answers once it has been performed', () => {
    const p = fallen(proven(0));
    expect(note(p, 'idiom:bonfire').answered).toBe(false);
    expect(note({ ...p, named: ['idiom:bonfire'] }, 'idiom:bonfire').answered).toBe(true);
  });

  test('compound pages keep their one note, and a page without an answer too', () => {
    const p = fallen({ ...proven(TUNING.provenCasts), named: ['compound:stain'] });
    expect(note(p, 'compound:stain').answered).toBe(false);
    expect(note(p, 'rune:oil')).toEqual({ text: FIRST, answered: false });
  });
});

describe('mastery answers', () => {
  test('level I is not enough; level II answers', () => {
    expect(note(fallen(withInkLevel(newProfile(), 1)), 'rune:ink').answered).toBe(false);
    expect(note(fallen(withInkLevel(newProfile(), 2)), 'rune:ink')).toEqual({
      text: 'answer rune:ink',
      answered: true,
    });
    expect(note(fallen(withInkLevel(newProfile(), 3)), 'rune:ink').answered).toBe(true);
  });

  test('proof alone does not answer a mastery page', () => {
    expect(note(fallen(proven(TUNING.provenCasts)), 'rune:ink').answered).toBe(false);
  });
});

describe('what changes', () => {
  test('newlyAnswered lists pages that answer now and did not before', () => {
    const before = fallen(proven(TUNING.provenCasts - 1));
    const after = fallen(proven(TUNING.provenCasts));
    expect(newlyAnswered(before, after, FIXTURE)).toEqual(['rune:bolt']);
    expect(newlyAnswered(after, after, FIXTURE)).toEqual([]);
  });

  test('the Marginalia falling brings every held answer at once', () => {
    const p = proven(TUNING.provenCasts);
    expect(newlyAnswered(p, fallen(p), FIXTURE)).toEqual(['rune:bolt']);
  });
});

describe('Lab and Bench never trigger it', () => {
  test('the Bench and Lab write no proof or footnote points', async () => {
    // Proof and points are written by finished trip fights only (trip/finish.ts); this pins the call sites.
    const { readFileSync, readdirSync, statSync } = await import('node:fs');
    const { join } = await import('node:path');
    const hits: string[] = [];
    const walk = (dir: string): void => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(ts|svelte)$/.test(name)) {
          const src = readFileSync(path, 'utf8');
          if (/\b(recordProof|awardFootnotePoints|learnFromFight)\(/.test(src)) hits.push(path);
        }
      }
    };
    walk('src');
    const rel = hits.map((h) => h.replaceAll('\\', '/'));
    expect(rel.filter((h) => !h.startsWith('src/engine/'))).toEqual([]);
    expect(rel).toContain('src/engine/trip/finish.ts');
    expect(rel.filter((h) => /bench|lab/i.test(h))).toEqual([]);
  });

  test('a method an invention uses is proven by the casts of an invention that uses it', () => {
    const inv = {
      id: 'inv:echo' as const,
      name: 'Echo',
      method: 'repeat' as const,
      parts: ['spark' as const],
      solvent: null,
    };
    let p: Profile = { ...newProfile(), inventions: [inv] };
    const lattice = parseLattice(CHAIN);
    const cells = lattice.runes.map((r) =>
      !isGlyph(r) && r.rune === 'ink' ? { ...r, rune: inv.id } : r,
    );
    p = setMemberLattice(p, 'draughtsman', { ...lattice, runes: cells });
    p = setMemberLattice(p, 'stoker', { shape: parseLattice('. .').shape, runes: [] });
    const mask = chainMask.map((c) => (c.rune === 'ink' ? { ...c, rune: inv.id } : c));
    for (let i = 0; i < TUNING.provenCasts; i++) p = recordProof(p, 'draughtsman', [mask]);
    const codex = [entry('method:repeat', 'method', 'proof')];
    expect(noteFor(fallen(p), 'method:repeat', codex).answered).toBe(true);
    const few = recordProof({ ...p, proof: { draughtsman: [], stoker: [] } }, 'draughtsman', [
      mask,
    ]);
    expect(noteFor(fallen(few), 'method:repeat', codex).answered).toBe(false);
  });

  test('the shipped codex has no answers yet, so every page reads its first note', () => {
    const p = fallen(proven(TUNING.provenCasts));
    for (const e of CODEX) if (!e.answer) expect(noteFor(p, e.id).answered).toBe(false);
  });
});
