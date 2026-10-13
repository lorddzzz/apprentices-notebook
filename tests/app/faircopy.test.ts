import { describe, expect, test } from 'vitest';
import { TUNING } from '$data';
import {
  type Cluster,
  clustersOf,
  type FiredCell,
  latticeOf,
  newProfile,
  type Profile,
  parseLattice,
  recordProof,
  setMemberLattice,
} from '$engine';
import {
  fairCopyUnlocked,
  fairTap,
  glowCells,
  NO_SELECTION,
  previewFairCopy,
} from '../../src/app/faircopy';

const M = 'draughtsman';
const c = (x: number, y: number) => ({ x, y });

/** A profile whose Draughtsman page holds `ascii`, with `casts` copies of the whole spell as proof. */
function proven(ascii: string, casts = TUNING.provenCasts): Profile {
  let p = setMemberLattice(newProfile(), M, parseLattice(ascii));
  const lattice = latticeOf(p, M);
  const whole = clustersOf(lattice)
    .filter((cl) => cl.kind === 'spell')
    .sort((a, b) => b.cells.length - a.cells.length)[0];
  if (!whole) throw new Error('no spell cluster');
  const mask: FiredCell[] = whole.cells.map((at) => {
    const r = lattice.runes.find((x) => x.at.x === at.x && x.at.y === at.y);
    if (!r || 'glyph' in r) throw new Error('no rune');
    return r.dir ? { at, rune: r.rune, dir: r.dir } : { at, rune: r.rune };
  });
  for (let i = 0; i < casts; i++) p = recordProof(p, M, [mask]);
  return p;
}

const CHAIN = 'Bolt> Ink OnInked Spark .';

function selected(p: Profile, at = c(1, 0)): Cluster {
  const r = fairTap(p, M, NO_SELECTION, at);
  if (!r.state.cluster) throw new Error(r.message ?? 'nothing selected');
  return r.state.cluster;
}

describe('glow and select', () => {
  test('nothing glows before the fifth cast, everything of the proven spell after', () => {
    expect(glowCells(proven(CHAIN, TUNING.provenCasts - 1), M).size).toBe(0);
    expect(fairCopyUnlocked(proven(CHAIN, TUNING.provenCasts - 1))).toBe(false);
    const p = proven(CHAIN);
    expect([...glowCells(p, M)].sort()).toEqual(['0,0', '1,0', '2,0', '3,0']);
    expect(fairCopyUnlocked(p)).toBe(true);
  });

  test('tapping a glowing cell selects the maximal proven cluster', () => {
    const cl = selected(proven(CHAIN));
    expect(cl.cells).toHaveLength(4);
    expect(cl.root).toEqual(c(0, 0));
  });

  test('proof from the other member counts (masks are combined)', () => {
    const p0 = proven(CHAIN);
    const moved: Profile = {
      ...p0,
      proof: { ...p0.proof, draughtsman: [], stoker: p0.proof.draughtsman },
    };
    expect(selected(moved).cells).toHaveLength(4);
  });

  test('tapping an unproven cell selects nothing and says why', () => {
    const p = proven('Bolt> Ink OnInked Spark Oil', 0);
    const r = fairTap(p, M, NO_SELECTION, c(1, 0));
    expect(r.state.cluster).toBeNull();
    expect(r.message).toMatch(/proven/i);
  });
});

describe('trim', () => {
  test('tapping the tail drops it; the smaller cluster is still selected', () => {
    const p = proven(CHAIN);
    const r = fairTap(p, M, { cluster: selected(p) }, c(3, 0));
    expect(r.message).toBeNull();
    expect(r.state.cluster?.cells).toEqual([c(0, 0), c(1, 0), c(2, 0)]);
  });

  test('cannot trim below the minimum', () => {
    const p = proven(CHAIN);
    const three = fairTap(p, M, { cluster: selected(p) }, c(3, 0)).state;
    const r = fairTap(p, M, three, c(2, 0));
    expect(r.state).toBe(three);
    expect(r.message).toContain(String(TUNING.glyphMinCells));
  });

  test('the root and a middle cell cannot be trimmed', () => {
    const p = proven(CHAIN);
    const sel = { cluster: selected(p) };
    expect(fairTap(p, M, sel, c(0, 0)).state).toBe(sel);
    const mid = fairTap(p, M, sel, c(1, 0));
    expect(mid.state).toBe(sel);
    expect(mid.message).toMatch(/end/i);
  });
});

describe('previewFairCopy', () => {
  test('ink before and after, with the cells saved', () => {
    const p = proven(CHAIN);
    const pv = previewFairCopy(p, M, selected(p));
    expect(pv.chain.map((s) => s.rune)).toEqual(['bolt', 'ink', 'onInked', 'spark']);
    expect(pv.chain[0]?.dir).toBe('right');
    expect(pv.inkAfter).toBe(pv.inkBefore - Math.floor(4 / 3));
  });

  test('outside runes the collapse strands are listed by name', () => {
    const p = proven(CHAIN);
    const three = fairTap(p, M, { cluster: selected(p) }, c(3, 0)).state.cluster;
    if (!three) throw new Error('no trim');
    expect(previewFairCopy(p, M, three).disconnected).toEqual([{ at: c(3, 0), name: 'Spark' }]);
    expect(previewFairCopy(p, M, selected(p)).disconnected).toEqual([]);
  });

  test('an aura touching the cluster and a cell outside it blocks, naming it (P3)', () => {
    const p = proven('Bolt> Ink Bendv . .\n. Amp Spark . .');
    const whole = selected(p);
    expect(previewFairCopy(p, M, whole).blocking).toEqual([]); // Amp touches Ink and Spark: both inside
    const trimmed = fairTap(p, M, { cluster: whole }, c(2, 1)).state.cluster;
    if (!trimmed) throw new Error('no trim');
    expect(previewFairCopy(p, M, trimmed).blocking).toEqual([
      'The Amplify at B2 also powers runes outside the selection',
    ]);
  });

  test('a second spell entering from the side blocks, naming its source', () => {
    const p = proven('Bolt> Ink OnInked Spark .\n. Bolt^ . . .');
    const pv = previewFairCopy(p, M, selected(p));
    expect(pv.blocking).toEqual(['The Bolt at B2 also flows through this selection']);
  });

  test('an idiom names the Glyph and makes the first compile free', () => {
    const p = proven('Bolt> Ink OnInked Spark .');
    const pv = previewFairCopy(p, M, selected(p));
    expect(pv.idiom).toBe('cashingIn');
    expect(pv.suggestedName).toBe('Cashing In');
    expect(pv.free).toBe(true);
    expect(pv.costLine).toBe('Fair-copy (free: idiom)');
    expect(pv.canAfford).toBe(true);
  });

  test('no idiom: empty name, 1 vellum, affordability follows the vellum', () => {
    const base = proven('Bolt> Oil Ink .');
    const none = previewFairCopy(base, M, selected(base));
    expect(none.idiom).toBeNull();
    expect(none.suggestedName).toBe('');
    expect(none.costLine).toBe('Fair-copy (1 vellum)');
    expect(none.canAfford).toBe(false);
    const rich = { ...base, vellum: 1 };
    expect(previewFairCopy(rich, M, selected(rich)).canAfford).toBe(true);
  });

  test('a second Glyph of the same idiom is not free', () => {
    const p = proven('Bolt> Ink OnInked Spark .');
    const first = previewFairCopy(p, M, selected(p));
    expect(first.free).toBe(true);
    const owned: Profile = {
      ...p,
      glyphs: [
        {
          id: 'g1',
          name: 'x',
          kind: 'spell',
          cells: [],
          entry: c(0, 0),
          exits: [],
          idiom: 'cashingIn',
        },
      ],
    };
    expect(previewFairCopy(owned, M, selected(owned)).free).toBe(false);
  });
});
