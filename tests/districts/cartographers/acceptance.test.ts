import { describe, expect, expectTypeOf, it } from 'vitest';
import { APPRENTICES, ENEMIES, type LineId, PLAYABLE_DISTRICTS, VARIANTS } from '$data';
import {
  CARTOGRAPHERS_FOE_IDS,
  CARTOGRAPHERS_FOE_TOKENS,
  CARTOGRAPHERS_PIECE_TOKENS,
  CARTOGRAPHERS_TABLE_IDS,
  DEFAULT_PENCIL,
  HEARING_RIVALS,
  type PencilConfig,
} from '$data/districts/cartographers/types';
import { DISTRICT_TOKENS, DISTRICTS, tokenCollisions } from '$data/districts/index';
import { RIVAL_TOKENS, RIVALS } from '$data/rivals';
import { newProfile, type Profile } from '$engine';
import { KIT } from '$engine/districts';
import { CARTOGRAPHERS_MODULE } from '$engine/districts/cartographers';
import { TRACER_RULE_ID } from '$engine/districts/cartographers/foes';
import {
  CARTOGRAPHERS_EVENT_TYPES,
  CARTOGRAPHERS_PIECES,
  CIRCLE_ART,
  GUILD_HAND_RULE_ID,
  type GuildHandState,
  HAND_SALT,
  initGuildHand,
  PENCIL_RULE_ID,
  type PencilData,
} from '$engine/districts/cartographers/types';
import type { Json } from '$engine/districts/types';
import { EN_SALT } from '$engine/drawing/types';
import { DISTRICT_UI } from '$ui/districts';
import { marginOf, writeAt } from '../../../src/app/desk';

/**
 * CG-W0: the Cartographers' module is registered and inert (cartographers-plan §2 P1–P3, §4). The
 * real contract tests run now; each `it.todo` below is a later task's acceptance, named by the
 * plan's §5 row. Its owner writes the test and removes the marker.
 */

describe('CG-W0 registration', () => {
  it('CG-17: the cartographers are playable: threshold gate, six rooms, the hearing', () => {
    const d = DISTRICTS.cartographers;
    expect(d.gate.kind).toBe('threshold'); // CG-14
    expect(d.rooms).toHaveLength(6); // CG-9, CG-10
    expect(d.lean.lean).toBe('paper');
    expect(d.hear).toMatchObject([{ kind: 'pages', atLeast: 5, except: ['registrar'] }]);
    expect(PLAYABLE_DISTRICTS).toContain('cartographers');
    expect(d.tables).toEqual([...CARTOGRAPHERS_TABLE_IDS]);
  });

  it("the module declares events, the paper pieces, the rules, the guild's hands, the heart and the bot", () => {
    const m = CARTOGRAPHERS_MODULE;
    expect(m.id).toBe('cartographers');
    expect((m.events ?? []).map((e) => e.type)).toEqual([...CARTOGRAPHERS_EVENT_TYPES]);
    expect((m.pieces ?? []).map((p) => p.token)).toEqual([...CARTOGRAPHERS_PIECE_TOKENS]);
    expect((m.rules ?? []).map((r) => r.id)).toEqual([
      GUILD_HAND_RULE_ID,
      PENCIL_RULE_ID,
      TRACER_RULE_ID, // CG-6: the tracer's memory
    ]);
    expect((m.foes ?? []).map((f) => f.id)).toEqual(
      [...CARTOGRAPHERS_FOE_IDS].map((id) => `cartographers:${id}`),
    ); // CG-5, CG-6
    expect(m.offerKinds ?? []).toEqual([]); // bindEvent is the bridges' registration
    expect(m.trip?.id).toBe('cartographers:doorway'); // CG-8
    expect(m.heart).toMatchObject({ foe: 'registrar', rules: [GUILD_HAND_RULE_ID] }); // CG-10
    expect(m.bot?.value).toBeTypeOf('function'); // CG-10
    expect(DISTRICT_UI.cartographers).toBeDefined();
  });

  it('it is in the kit (CG-1); the two fixture tests moved their mocked module to another id', () => {
    expect(KIT.modules.cartographers).toBe(CARTOGRAPHERS_MODULE);
  });

  it('every event has a line', () => {
    for (const def of CARTOGRAPHERS_MODULE.events ?? []) {
      expect(def.describe({ type: def.type })).toMatch(/\.$/);
    }
  });
});

describe('CG-W0 contracts', () => {
  it('P1: the three paper pieces are declared (not registered); the circle is an art key', () => {
    expect(CARTOGRAPHERS_PIECES.map((p) => p.token)).toEqual([...CARTOGRAPHERS_PIECE_TOKENS]);
    const solid = Object.fromEntries(CARTOGRAPHERS_PIECES.map((p) => [p.token, p.solid]));
    expect(solid).toEqual({ pencil: 'none', blank: 'unitsAndShots', outline: 'units' });
    expect(CARTOGRAPHERS_PIECES.every((p) => p.id.startsWith('cartographers:'))).toBe(true);
    expect(CIRCLE_ART).toBe('cartographers:circle');
    expect(CARTOGRAPHERS_PIECES[0]?.data?.init).toEqual({ fate: null, due: null });
  });

  it('P3: the hand draws from a salt outside EN range', () => {
    expect(GUILD_HAND_RULE_ID).toBe('cartographers:guildHand');
    expect(HAND_SALT).toBeGreaterThan(EN_SALT.to);
    expect(initGuildHand()).toEqual({ ...DEFAULT_PENCIL, planned: 0 });
  });

  it('P4: the pencil config is plain JSON with the default third', () => {
    expectTypeOf<PencilConfig>().toMatchTypeOf<Json>();
    expectTypeOf<PencilData>().toMatchTypeOf<Json>();
    expectTypeOf<GuildHandState>().toMatchTypeOf<Json>();
    expect(DEFAULT_PENCIL.share).toBeCloseTo(1 / 3);
  });

  it('the hearing set names the Lamplighter and the four masters, all rivals; six tables', () => {
    expect(HEARING_RIVALS).toHaveLength(5);
    for (const id of HEARING_RIVALS) expect(Object.hasOwn(RIVALS, id)).toBe(true);
    expect(HEARING_RIVALS).not.toContain('registrar');
    expect(CARTOGRAPHERS_TABLE_IDS).toHaveLength(6);
    expect(CARTOGRAPHERS_TABLE_IDS.every((t) => t.startsWith('cartographers:'))).toBe(true);
  });

  it('foe tokens are claimed and collide with no foe, roster, rival, district or board char', () => {
    expect(CARTOGRAPHERS_FOE_IDS.map((id) => CARTOGRAPHERS_FOE_TOKENS[id])).toEqual([
      'A',
      'F',
      'I',
    ]);
    expect(
      DISTRICT_TOKENS.filter((t) => t.district === 'cartographers' && t.kind === 'foe').map(
        (t) => t.id,
      ),
    ).toEqual([...CARTOGRAPHERS_FOE_IDS]);
    expect(
      DISTRICT_TOKENS.filter((t) => t.district === 'cartographers' && t.kind === 'piece').map(
        (t) => t.token,
      ),
    ).toEqual([...CARTOGRAPHERS_PIECE_TOKENS]);
    const builtIn = [
      ...Object.values(ENEMIES)
        .filter((e) => !Object.hasOwn(RIVALS, e.id))
        .filter((e) => !DISTRICT_TOKENS.some((t) => t.kind === 'foe' && t.id === e.id))
        .map((e) => e.token),
      ...Object.values(APPRENTICES).map((a) => a.token),
      ...'DSRNBWTCE',
      ...'Piow~=#*hgl@_{!&$+>^v<.x',
    ];
    expect(tokenCollisions([...DISTRICT_TOKENS, ...RIVAL_TOKENS], [...new Set(builtIn)])).toEqual(
      [],
    );
  });
});

// ── Pack B: runes on paper and outlines ──────────────────
// CG-3 passes in runes.test.ts (and the CG-1 draw:blank test moved there with it).
// CG-4 passes in outline.test.ts.

// ── Pack C: the guild's hands ────────────────────────────
// CG-5 and CG-6 (the surveyor, the eraser, the tracer) pass in hands.test.ts under their plan titles.

// ── Pack D: the Registrar ────────────────────────────────
// CG-7 passes in tests/rivals/registrar.test.ts under its plan titles.

// ── Pack E: trip shape, loot and threshold ───────────────
// CG-8 (trip shape and loot) lives in trip.test.ts, which mocks stub rooms through the kit.
// CG-11 (the redraft threshold) lives in threshold.test.ts.

// ── Pack F: rooms ────────────────────────────────────────
// CG-9 and CG-10 pass in tests/data/cartographers-rooms.test.ts under their plan titles (the
// heart room's frame in tests/districts/heart-frames.test.ts).

// ── Pack G: hearing, Bench and hall fuzz ─────────────────
// CG-13 and CG-14 pass in bench.test.ts and hearing.test.ts under their plan titles.

// ── Pack I and J: footnotes ──────────────────────────────
// CG-F1: every cartographers line row has a firing scenario (tests/scenarios/cartographers-lines.test.ts)

/** The authored shape of a margin: each line has two level I and two level II options; the note adds a third on `swap:unit`. */
const margin = (line: LineId, level: 1 | 2): string[] =>
  VARIANTS.filter((v) => 'line' in v.slot && v.slot.line === line && v.slot.level === level).map(
    (v) => v.id,
  );
const capstones = (subject: string): string[] =>
  VARIANTS.filter((v) => v.subject === subject && 'capstone' in v.slot).map((v) => v.id);

describe('CG-F3 Swap, Draw and Erase batch', () => {
  it('CG-F3: fourCombos reads for every margin line', () => {
    // The scenarios (tests/scenarios/footnotes/cartographers-runes.test.ts) read every pairing.
    for (const line of [
      'swap:held',
      'swap:unit',
      'draw:jar',
      'draw:drop',
      'erase:unit',
      'erase:mark',
    ] as const) {
      expect(margin(line, 1), line).toHaveLength(2);
      expect(margin(line, 2), line).toHaveLength(line === 'swap:unit' ? 3 : 2);
    }
    expect(margin('swap:unit', 2)).toContain('registrar:swap');
  });
  it('CG-F3: one scenario per capstone', () => {
    for (const s of ['swap', 'draw', 'erase']) expect(capstones(s), s).toHaveLength(2);
  });
});

describe('CG-F4 Quicksilver, Graphite and the Registrar note', () => {
  it('CG-F4: fourCombos reads for every margin line', () => {
    // The scenarios (tests/scenarios/footnotes/cartographers-solvents.test.ts) read every pairing.
    for (const line of ['quicksilver:edge', 'graphite:unit'] as const) {
      expect(margin(line, 1), line).toHaveLength(2);
      expect(margin(line, 2), line).toHaveLength(2);
    }
  });
  it('CG-F4: one scenario per capstone', () => {
    for (const s of ['quicksilver', 'graphite']) expect(capstones(s), s).toHaveLength(2);
  });
  it("CG-F4: the registrar's note is hidden until his page is held", () => {
    const profile = (pages: Profile['pages']): Profile => {
      const base = newProfile();
      return {
        ...base,
        known: [...new Set([...base.known, 'swap' as const])],
        witnessed: ['swap:unit'],
        footnotes: { swap: { points: 99, slots: {} } },
        solvents: { ...base.solvents, quicksilver: 4 },
        pages,
      };
    };
    const frame = (p: Profile) =>
      marginOf(p, 'swap').lines.find((l) => l.line === 'swap:unit')?.frames[1];
    expect(frame(profile([]))?.variants.map((v) => v.id)).not.toContain('registrar:swap');
    const held = frame(profile(['registrar:pullIn']));
    expect(held?.variants.map((v) => v.id)).toEqual(
      expect.arrayContaining(['swap-unit-ink', 'swap-unit-due', 'registrar:swap']),
    );
    const w = writeAt(profile(['registrar:pullIn']), 'swap', 'registrar:swap', { atHome: true });
    if ('error' in w) throw new Error(w.error);
    expect(frame(w.profile)?.variants.find((v) => v.id === 'registrar:swap')).toMatchObject({
      chosen: true,
      credit: "Copied from the Registrar's register.",
    });
  });
});
