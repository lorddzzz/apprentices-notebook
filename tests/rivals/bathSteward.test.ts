import { describe, expect, test } from 'vitest';
import type { MemberId } from '$data';
import { BATH_HEART, BATHER_AREA_SOURCES } from '$data/districts/bathhouses';
import { BATHHOUSES } from '$data/footnotes/bathhouses';
import { RIVAL_PAGES, RIVALS } from '$data/rivals';
import { BATH_STEWARD_PAGE, BATH_STEWARD_RIVAL, STEWARD_TRICK_ID } from '$data/rivals/bathSteward';
import {
  type BattleState,
  describeLog,
  isCloud,
  newProfile,
  type Profile,
  parseLabel,
  tileAt,
} from '$engine';
import { runDraft } from '$engine/ctx';
import { dealDamage } from '$engine/damage';
import { BATHHOUSES_MODULE } from '$engine/districts/bathhouses';
import { STEWARD_TRICK } from '$engine/districts/bathhouses/heart';
import { BOIL_OVER_RULE_ID } from '$engine/districts/bathhouses/types';
import { footnoteIds } from '$engine/footnotes';
import { bankPages, rivalNoteVisible } from '$engine/rivals/pages';
import { rivalAct } from '$engine/rivals/resolve';
import { trickOf } from '$engine/rivals/tricks';
import { spawnRival } from '$engine/rivals/unit';
import { listRules } from '$engine/rules';
import { awardsPage } from '$engine/standIn';
import { marginOf, writeAt } from '../../src/app/desk';
import { withFootnotes } from '../scenarios/footnoteHarness';
import { castWith } from '../scenarios/footnotes/castHelper';
import { act, board, cast, draft, expectLogIncludes, withLattices } from '../scenarios/harness';
import { rivalOf } from './fixtures/harness';

/**
 * BH-17a/b: the Bath-Steward as data through RV's authoring API, live. The def, goals and page are
 * the real data (`data/rivals/bathSteward.ts`); his trick (stoke, steams away) is the district's
 * registered one (`engine/districts/bathhouses/heart.ts`), and he stands on his own `H` shell.
 */

const at = parseLabel;
const endTurn = (s: BattleState) => act(s, { type: 'endTurn' });

/** The Steward on his own `H` shell, the gauge listed, his round-1 telegraph planned. */
function hall(
  ascii: string,
  gauge = false,
  lattices: Partial<Record<MemberId, string>> = {},
): BattleState {
  const s = structuredClone(withLattices(ascii, lattices));
  if (gauge) s.rules = listRules(s, [BOIL_OVER_RULE_ID], { [BOIL_OVER_RULE_ID]: { heat: 4 } });
  return runDraft(s, (ctx) => {
    const e = rivalOf(ctx.s);
    e.rival = spawnRival(BATH_STEWARD_RIVAL);
    e.hp = BATH_STEWARD_RIVAL.hp;
    e.maxHp = BATH_STEWARD_RIVAL.hp;
    e.intent = null;
    rivalAct(ctx, e, 1, false);
  }).state;
}

describe('data', () => {
  test('the def, its page and the Seep note link', () => {
    expect(BATH_STEWARD_RIVAL).toMatchObject({
      token: 'H',
      hp: 14,
      move: 0,
      page: BATH_STEWARD_PAGE.id,
    });
    expect(RIVAL_PAGES[BATH_STEWARD_PAGE.id]).toBe(BATH_STEWARD_PAGE);
    expect(BATH_STEWARD_PAGE.lattice).toBe('Vat> Seep Steam');
    expect(BATH_STEWARD_PAGE.note).toEqual({
      rune: 'seep',
      line: 'seep:member',
      variant: 'bathSteward:seep',
    });
    expect(BATH_STEWARD_PAGE.annotation.length).toBeGreaterThan(0);
    expect(BATH_STEWARD_PAGE.story.length).toBeGreaterThan(0);
  });
});

const hp = (s: BattleState, id: string) => s.units.find((u) => u.id === id)?.hp ?? 0;

describe('the trial scene', () => {
  const SCENE = '. . . . . . .\n. H D . . . .\n. . . . . . .';

  test('he lays steam over his own tile, then shoves from within it', () => {
    const s = hall(SCENE);
    expect(rivalOf(s).intent).toMatchObject({ kind: 'cast', spell: 'steamHall' });
    let r = endTurn(s);
    expectLogIncludes(r.events, ['Bath-Steward at B2 casts Vat at C2']);
    expect(isCloud(tileAt(r.state, at('B2')))).toBe(true);
    expect(isCloud(tileAt(r.state, at('C2')))).toBe(true);
    expect(isCloud(tileAt(r.state, at('E2')))).toBe(true); // wide: Vat 2x2 and Seep's neighbours
    r = endTurn(r.state);
    expectLogIncludes(r.events, ['Bath-Steward at B2 casts Bolt right']);
    expect(describeLog(r.events)).toContain('Draughtsman is pushed right to D2');
    expect(rivalOf(r.state).rival?.charges).toMatchObject({ steamHall: 4, shove: 4 });
  });

  test('he stokes when two apprentices stand in cloud and the house has a gauge', () => {
    const wet = '. . . . . . .\n. H~ D~ S~ . . .\n. . . . . . .';
    const s = hall(wet, true);
    expect(rivalOf(s).intent).toMatchObject({ kind: 'trick', trick: STEWARD_TRICK_ID });
    const r = endTurn(s);
    expectLogIncludes(r.events, [
      'Bath-Steward at B2 uses the Steward',
      'the Steward stokes the house (+4)',
    ]);
    const lines = describeLog(r.events);
    expect(lines).not.toContain('sets something aside');
    expect(lines).not.toContain('object is gone');
    // One in cloud is not enough, nor is a board with no gauge.
    const one = hall('. . . . . . .\n. H~ D~ S . . .\n. . . . . . .', true);
    expect(rivalOf(one).intent).toMatchObject({ kind: 'cast' });
    expect(rivalOf(hall(wet)).intent).toMatchObject({ kind: 'cast' });
  });

  test('steams away: struck in his cloud he re-forms across it (RV-14 parity); a storm or a cut lands', () => {
    // The RV-14 `steam` fixture's board and answer: the farthest free tile of that cloud, E2.
    const lattices = { draughtsman: 'Bolt> Strike' };
    const s = hall('D . . H~ ~\n. . . ~ ~\n. . . . .', false, lattices);
    const r = cast(s, 'draughtsman', 'right');
    expectLogIncludes(r.events, [
      'Strike leaves Bath-Steward at D1 unharmed',
      'Bath-Steward at D1 moves to E2',
    ]);
    expect(rivalOf(r.state)).toMatchObject({ pos: at('E2'), hp: BATH_STEWARD_RIVAL.hp });

    // Out of cloud the hit lands.
    const dry = cast(hall('D . H .\n. . . .', false, lattices), 'draughtsman', 'right');
    expect(rivalOf(dry.state).hp).toBe(BATH_STEWARD_RIVAL.hp - 2);

    // A burst of the cloud is not steamed away.
    const hit = draft(s, (ctx) => {
      dealDamage(ctx, rivalOf(ctx.s), 2, BATHER_AREA_SOURCES[0] ?? 'Storm');
    });
    expect(hp(hit.state, rivalOf(hit.state).id)).toBe(BATH_STEWARD_RIVAL.hp - 2);
  });

  test('the scene in order: lay, shove from within, then steams away when struck in the cloud', () => {
    let s = hall(SCENE);
    const seen: string[] = [];
    for (let i = 0; i < 2; i++) {
      const k = rivalOf(s).intent;
      seen.push(k?.kind === 'cast' ? k.spell : (k?.kind ?? 'none'));
      s = endTurn(s).state;
    }
    expect(seen).toEqual(['steamHall', 'shove']);
  });

  test('steams away is the district-registered beforeHarm reaction, and the district is still drawing', () => {
    expect(trickOf(STEWARD_TRICK_ID)).toBe(STEWARD_TRICK);
    expect(BATHHOUSES_MODULE.tricks).toContain(STEWARD_TRICK);
    expect(STEWARD_TRICK.beforeHarm).toBeDefined();
    expect(BATH_STEWARD_RIVAL.trick).toBe(STEWARD_TRICK_ID);
  });
});

describe('listed and banked', () => {
  test('he is in the rival lists, on the board as H', () => {
    expect(RIVALS.bathSteward).toBe(BATH_STEWARD_RIVAL);
    expect(board('H').units.find((u) => u.kind === 'enemy')).toMatchObject({
      def: 'bathSteward',
      hp: 14,
    });
    expect(awardsPage({ def: 'bathSteward' })).toBe(true);
    expect(BATH_HEART.heart).toBe(true);
  });

  test('a downed Steward in his own house banks his page, once; alive or elsewhere it does not', () => {
    const p = newProfile();
    const b = structuredClone(board('H . S'));
    expect(bankPages(p, b, 'bathhouses', awardsPage)).toBe(p);
    for (const u of b.units) if (u.kind === 'enemy') u.hp = 0;
    const won = bankPages(p, b, 'bathhouses', awardsPage);
    expect(won.pages).toEqual([BATH_STEWARD_PAGE.id]);
    expect(bankPages(won, b, 'bathhouses', awardsPage)).toBe(won);
    expect(bankPages(p, b, 'canals', awardsPage)).toBe(p);
  });
});

describe('the Steward’s note on Seep (level II, seep:member)', () => {
  const NOTE = 'bathSteward:seep';
  const seepReady = (pages: Profile['pages']): Profile => ({
    ...newProfile(),
    pages,
    witnessed: ['seep:member'],
    footnotes: { seep: { points: 200, slots: { 'seep:member@1': 'seep-member-spare-self' } } },
    solventsFound: ['bathSalt'],
    solvents: { ...newProfile().solvents, bathSalt: 4 },
  });
  const slotTwo = (p: Profile) => marginOf(p, 'seep').lines.find((l) => l.line === 'seep:member');
  const offered = (p: Profile) =>
    (slotTwo(p)?.frames.find((f) => f.level === 2)?.variants ?? []).map((v) => v.id);

  test('hidden without his page', () => {
    expect(rivalNoteVisible(newProfile(), NOTE)).toBe(false);
    expect(offered(seepReady([]))).not.toContain(NOTE);
  });

  test('offered once his page is held, credited, and writing it files it in the slot', () => {
    const p = seepReady([BATH_STEWARD_PAGE.id]);
    expect(rivalNoteVisible(p, NOTE)).toBe(true);
    const frame = slotTwo(p)?.frames.find((f) => f.level === 2);
    expect(frame?.variants.map((v) => v.id)).toContain(NOTE);
    expect(frame?.variants.find((v) => v.id === NOTE)?.credit).toBe(
      "Copied from the Steward's towel book.",
    );
    expect(BATHHOUSES.find((v) => v.id === NOTE)?.rival).toBe('bathSteward');
    const r = writeAt(p, 'seep', NOTE, { atHome: true });
    if ('error' in r) throw new Error(r.error);
    expect(footnoteIds(r.profile)['seep:member@2']).toBe(NOTE);
  });

  test('written: an ally of yours on a cloud beside the target is passed over, the rest re-forms', () => {
    // Seep Strike on the rat at B1: the Stoker beside it stands on cloud, with free cloud to E1.
    const room = () =>
      withLattices(
        'D r S~ ~ ~\n. . . . .',
        { draughtsman: 'Bolt> Seep Strike' },
        { hp: { A1: 9, B1: 9, C1: 9 } },
      );
    const plain = cast(room(), 'draughtsman', 'right');
    expect(hp(plain.state, 'stoker')).toBeLessThan(9);
    const noted = castWith(room(), { kind: 'dir', dir: 'right' }, withFootnotes([NOTE]));
    expect(hp(noted.state, 'stoker')).toBe(9);
  });
});
