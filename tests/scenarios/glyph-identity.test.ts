import { describe, expect, test } from 'vitest';
import {
  type Aim,
  type Cluster,
  compileLattice,
  disconnected,
  fairCopy,
  type GlyphDef,
  type GlyphLibrary,
  glyphRunes,
  type Lattice,
  parseLattice,
  roleOf,
  type Spell,
  sharingSpells,
  stepsOf,
  tidyCollapse,
  toGlyphDef,
  withOpenCell,
} from '$engine';
import {
  at,
  BOARDS,
  battleWith,
  CASES,
  c,
  castLog,
  flatCompile,
  glyphFromFlat,
  libOf,
  ORDER,
  PATTERN,
  provenGlyphs,
  ROOT,
  SHAPE,
  sameCasts,
  TAIL_DOWN,
  TAIL_UP,
} from './glyph-identity-kit';

describe('identity: a Glyph casts exactly what its flat cluster casts', () => {
  for (const k of CASES) {
    test(k.name, () => {
      const flat = parseLattice(k.flat);
      const def = glyphFromFlat(
        k.glyph.id,
        k.glyph.kind,
        flat,
        k.glyph.cells,
        k.glyph.root,
        'right',
      );
      const library = libOf(def);
      const flatSpells = flatCompile(flat).spells;
      const compiledSpells = flatCompile(parseLattice(k.compiled), library).spells;
      expect(flatSpells).toHaveLength(1);
      expect(compiledSpells).toHaveLength(1);

      const logs = BOARDS.map((b) => {
        const aim: Aim = k.splash ? { kind: 'tile', at: b.tile } : { kind: 'dir', dir: 'right' };
        const a = castLog(battleWith(b.ascii, flatSpells, k.weak), aim);
        const z = castLog(battleWith(b.ascii, compiledSpells, k.weak), aim);
        expect(z).toEqual(a);
        return a;
      });
      expect(logs.some((log) => log.some((line) => line.includes(k.mustInclude)))).toBe(true);
      expect(new Set(logs.map((log) => log.join('\n'))).size).toBeGreaterThan(1); // boards differ
    });
  }
});

describe('rotation', () => {
  for (const dir of ORDER) {
    test(`a Spell Glyph placed ${dir} casts what the rotated flat cluster casts`, () => {
      const flat: Lattice = {
        shape: SHAPE,
        runes: [...PATTERN, TAIL_UP, TAIL_DOWN].map((p) => ({
          ...p,
          at: at(p.at, dir),
          ...(p.dir ? { dir } : {}),
        })),
      };
      const def: GlyphDef = {
        id: 'rot',
        name: 'Rot',
        kind: 'spell',
        cells: PATTERN,
        entry: c(0, 0),
        exits: [],
        idiom: null,
        version: 1,
        params: [],
        extraExit: null,
      };
      // Inner flow leaves up and down (local); the tails sit at the socket's neighbours.
      const compiled: Lattice = {
        shape: SHAPE,
        runes: [
          { at: ROOT, glyph: 'rot', dir },
          { at: at(c(0, -1), dir), rune: 'spark' },
          { at: at(c(0, 1), dir), rune: 'spark' },
        ],
      };
      const fs = flatCompile(flat).spells;
      const cs = flatCompile(compiled, libOf(def)).spells;
      expect(cs[0]?.path[0]?.dir).toBe(dir);
      expect(cs[0]?.glyph).toBe('rot');
      for (const b of BOARDS) {
        const aim: Aim = { kind: 'dir', dir: 'right' };
        expect(castLog(battleWith(b.ascii, cs), aim)).toEqual(
          castLog(battleWith(b.ascii, fs), aim),
        );
      }
      const names = (sp: Spell | undefined): string[] =>
        stepsOf(sp?.first ?? null).map((st) => ('rune' in st ? st.rune : st.role));
      expect(names(cs[0])).toEqual(names(fs[0]));
      expect(names(fs[0])).toEqual(['fork', 'ink', 'spark', 'oil', 'spark']);
      // The Coil over the Bolt reaches it in the local frame whatever the rotation.
      expect(cs[0]?.sourceAuras).toEqual(fs[0]?.sourceAuras);
      expect(cs[0]?.sourceAuras).toEqual(['coil']);
    });
  }
});

describe('fairCopy', () => {
  test('a payload cluster entered downward: the collapsed lattice casts the same log', () => {
    const flat = parseLattice('Bolt> Bendv . .\n. Ink . .\n. Tally . .\n. Spark . .\n. Oil . .');
    const cluster: Cluster = {
      root: c(1, 1),
      cells: [c(1, 1), c(1, 2), c(1, 3)],
      auras: [],
      kind: 'payload',
    };
    const def = glyphFromFlat('dn', 'payload', flat, cluster.cells, cluster.root, 'down');
    const folded = fairCopy(flat, cluster, def);
    expect(folded.runes.find((r) => r.at.x === 1 && r.at.y === 1)).toEqual({
      at: c(1, 1),
      glyph: 'dn',
      dir: 'down',
    });
    expect(folded.runes).toHaveLength(4); // Bolt, Bend, Glyph, Oil
    expect(disconnected(flat, cluster)).toEqual([c(1, 4)]); // Oil no longer touches the exit
    // Re-lay the tail at the socket's exit neighbour and the cast is unchanged.
    const relaid: Lattice = {
      shape: folded.shape,
      runes: folded.runes.map((r) => ('rune' in r && r.rune === 'oil' ? { ...r, at: c(1, 2) } : r)),
    };
    const fs = flatCompile(flat).spells;
    const cs = flatCompile(relaid, libOf(def)).spells;
    for (const b of BOARDS) {
      const aim: Aim = { kind: 'dir', dir: 'right' };
      expect(castLog(battleWith(b.ascii, cs), aim)).toEqual(castLog(battleWith(b.ascii, fs), aim));
    }
  });

  test('a spell cluster takes the source arrow; its auras leave with it', () => {
    const flat = parseLattice('Coil . . . .\nBoltv . . . .\nInk . . . .\nSpark . . . .');
    const cluster: Cluster = {
      root: c(0, 1),
      cells: [c(0, 1), c(0, 2)],
      auras: [c(0, 0)],
      kind: 'spell',
    };
    const def = glyphFromFlat(
      'sp',
      'spell',
      flat,
      [...cluster.cells, ...cluster.auras],
      c(0, 1),
      'down',
    );
    const folded = fairCopy(flat, cluster, def);
    expect(folded.runes).toEqual([
      { at: c(0, 1), glyph: 'sp', dir: 'down' },
      { at: c(0, 3), rune: 'spark' },
    ]);
  });

  test('disconnected names the outside runes the collapse strands', () => {
    // After the collapse the Glyph's flow leaves at the socket's neighbour, not at the old tail.
    const flat = parseLattice('Bolt> Ink Tally Spark .');
    const cluster: Cluster = {
      root: c(0, 0),
      cells: [c(0, 0), c(1, 0), c(2, 0)],
      auras: [],
      kind: 'spell',
    };
    expect(disconnected(flat, cluster)).toEqual([c(3, 0)]);
    // Nothing is stranded when the cluster already ends the flow.
    const whole = parseLattice('Bolt> Ink Tally . .');
    expect(disconnected(whole, cluster)).toEqual([]);
  });
});

describe('a fresh Fair Copy with one open cell and no args', () => {
  test('behaves identically to the Glyph without the open cell', () => {
    let n = 0;
    for (const g of provenGlyphs(60, 1)) {
      const open = ['kind', 'action'];
      const cell = g.def.cells.find((c) => open.includes(roleOf(c.rune) ?? ''));
      if (!cell) continue;
      n += 1;
      const withCell = withOpenCell(g.def, cell.at);
      expect(withCell.params).toEqual([`${cell.at.x},${cell.at.y}`]);
      const why = sameCasts(
        g.compiled,
        g.compiled,
        { [g.def.id]: withCell },
        { [g.def.id]: g.def },
      );
      if (why) throw new Error(why);
      expect(glyphRunes(withCell)).toEqual(glyphRunes(g.def));
    }
    expect(n).toBeGreaterThanOrEqual(10);
  }, 120_000);
});

describe('a tail that a second spell also enters from the side', () => {
  // Bolt> Ink Oil Spark, and a Touch pointing down onto the Spark: the Spark is still "reached"
  // after the collapse (by the Touch), but the Bolt's own tail is cut at the Glyph's exit.
  const flat = parseLattice('. . . Touchv\nBolt> Ink Oil Spark');
  const cluster: Cluster = {
    root: c(0, 1),
    cells: [c(0, 1), c(1, 1), c(2, 1)],
    auras: [],
    kind: 'spell',
  };
  const tail = (l: Lattice, glyphs: GlyphLibrary, source: string): string[] => {
    const spell = compileLattice(l, glyphs).spells.find((s) => s.source === source);
    return stepsOf(spell?.first ?? null).flatMap((st) => ('rune' in st ? [st.rune] : []));
  };

  test('disconnected names the Spark even though the Touch still reaches it', () => {
    expect(disconnected(flat, cluster)).toEqual([c(3, 1)]);
    expect(sharingSpells(flat, cluster)).toEqual([]); // the shared cell is outside the cluster
  });

  test('the collapse does not slide the Spark (the Touch would lose it) and the cast does change', () => {
    const def = toGlyphDef(flat, cluster, 'Fuzzed', 'g1');
    const tidy = tidyCollapse(flat, cluster, def);
    expect(tidy.slid).toBe(0);
    const library = libOf(def);
    expect(tail(flat, {}, 'bolt')).toEqual(['ink', 'oil', 'spark']);
    expect(tail(tidy.lattice, library, 'bolt')).toEqual(['ink', 'oil']); // the Spark is dropped
    // The Touch is untouched: it still reaches the Spark.
    expect(tail(tidy.lattice, library, 'touch')).toEqual(['spark']);
  });

  test('without the Touch the same cluster slides its tail up and keeps the cast', () => {
    const alone = parseLattice('. . . .\nBolt> Ink Oil Spark');
    const def = toGlyphDef(alone, cluster, 'Fuzzed', 'g1');
    expect(disconnected(alone, cluster)).toEqual([c(3, 1)]);
    const tidy = tidyCollapse(alone, cluster, def);
    expect(tidy.slid).toBe(1);
    expect(tail(tidy.lattice, libOf(def), 'bolt')).toEqual(['ink', 'oil', 'spark']);
  });
});
