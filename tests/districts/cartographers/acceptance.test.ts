import { describe, expect, expectTypeOf, it } from 'vitest';
import { APPRENTICES, ENEMIES, PLAYABLE_DISTRICTS } from '$data';
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

/**
 * CG-W0: the Cartographers' module is registered and inert (cartographers-plan §2 P1–P3, §4). The
 * real contract tests run now; each `it.todo` below is a later task's acceptance, named by the
 * plan's §5 row. Its owner writes the test and removes the marker.
 */

describe('CG-W0 registration', () => {
  it('the district stays hidden: drawing, roomless, not playable, with the stub hearing', () => {
    const d = DISTRICTS.cartographers;
    expect(d.gate.kind).toBe('drawing');
    expect(d.rooms).toHaveLength(0);
    expect(d.lean.lean).toBe('paper');
    expect(d.hear).toMatchObject([{ kind: 'pages', atLeast: 5, except: ['registrar'] }]);
    expect(PLAYABLE_DISTRICTS).not.toContain('cartographers');
    expect(d.tables).toEqual([...CARTOGRAPHERS_TABLE_IDS]);
  });

  it("the module declares events, the paper pieces, the rules and the guild's hands: no heart or bot yet", () => {
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
    expect(m.heart).toBeUndefined(); // CG-10, through frame.ts's placeFrame
    expect(m.bot).toBeUndefined(); // CG-10, through BotTerms
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

// ── Pack A: paper and the guild's hand ───────────────────
describe('CG-1 paper pieces', () => {
  it.todo('CG-1: draw onto blank fails with draw:blank');
});

// ── Pack B: runes on paper and outlines ──────────────────
describe('CG-3 board runes on paper', () => {
  it.todo('CG-3: erase on pencil under a foe erases it');
  it.todo('CG-3: erase on an outline un-draws the foe');
  it.todo('CG-3: inked paper cannot be erased');
  it.todo('CG-3: quicksilver un-draws the mirrored pencil');
  it.todo('CG-3: graphite after an un-draw leaves it blank');
  it.todo('CG-3: redraft still names on pencil');
});

describe('CG-4 drawn-in reinforcements', () => {
  it.todo('CG-4: an outline inks at its due round');
  it.todo('CG-4: a standing unit delays the inking a round');
  it.todo('CG-4: erase un-draws an outline foe');
});

// ── Pack C: the guild's hands ────────────────────────────
// CG-5 and CG-6 (the surveyor, the eraser, the tracer) pass in hands.test.ts under their plan titles.

// ── Pack D: the Registrar ────────────────────────────────
describe('CG-7 the Registrar', () => {
  it.todo('CG-7: aims are locked at the telegraph');
  it.todo('CG-7: starved Erase falls back to the swap');
  it.todo('CG-7: Erase on the tile lifts a circle');
  it.todo('CG-7: moving off lifts a circle');
  it.todo('CG-7: killing the holder lifts a circle');
  it.todo('CG-7: with no hand left the Registrar holds the circle');
  it.todo('CG-7: a unit still circled at round end is erased');
  it.todo('CG-7: the page banks on a win and is kept on a wipe');
  it.todo('CG-7: clearing the heart adds cartographers to city.hearts');
});

// ── Pack E: trip shape, loot and threshold ───────────────
// CG-8 (trip shape and loot) lives in trip.test.ts, which mocks stub rooms through the kit.
// CG-11 (the redraft threshold) lives in threshold.test.ts.

// ── Pack F: rooms ────────────────────────────────────────
describe('CG-9 rooms 1-3', () => {
  it.todo('CG-9: checkRoom passes for every room 1-3 layout at party sizes 1-3');
  it.todo('CG-9: a scripted solve exists for every room 1-3 layout');
});

describe('CG-10 rooms 4-5 and the heart room', () => {
  it.todo('CG-10: checkRoom passes for every room 4-5 and heart layout');
  it.todo('CG-10: a scripted solve exists for every deep layout');
  it.todo('CG-10: the heart room is a return point');
});

// ── Pack G: hearing, Bench and hall fuzz ─────────────────
describe('CG-13 Bench and Lab parity', () => {
  it.todo('CG-13: the bench offers pencil after it is met and not before');
  it.todo('CG-13: the registrar is never on the bench');
  it.todo('CG-13: each cg scenario opens from #/lab?scenario=');
});

describe('CG-14 hearing, map and lore', () => {
  it.todo('CG-14: the hearing meets at five pages');
  it.todo("CG-14: the hearing misses at four pages or with the Registrar's");
  it.todo("CG-14: SM's gate reads cartographers in city.hearts");
});

// ── Pack I and J: footnotes ──────────────────────────────
describe('CG-F1 footnote audit', () => {
  it.todo('CG-F1: every cartographers line row has a firing scenario');
});

describe('CG-F3 Swap, Draw and Erase batch', () => {
  it.todo('CG-F3: fourCombos reads for every margin line');
  it.todo('CG-F3: one scenario per capstone');
});

describe('CG-F4 Quicksilver, Graphite and the Registrar note', () => {
  it.todo('CG-F4: fourCombos reads for every margin line');
  it.todo('CG-F4: one scenario per capstone');
  it.todo("CG-F4: the registrar's note is hidden until his page is held");
});
