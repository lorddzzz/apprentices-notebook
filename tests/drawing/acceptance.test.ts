import { describe, expect, expectTypeOf, it, test } from 'vitest';
import type { ApprenticeId, Drawing, EnemyId, MasterId, ShapeId } from '$data';
import { newSave, type Profile, parseSaveData, type SaveData } from '$engine';
import {
  type Credits,
  checkGenerated,
  creditsOf,
  DRAWING_SLOTS,
  drawingsOf,
  EN_SALT,
  endingOf,
  generateRoom,
  handover,
  ledgerOf,
  MASTER_IDS,
  NAME_MAX,
  readDrawing,
} from '$engine/drawing';
import { botTrial } from '$engine/drawing/trial';
import type {
  FoeKit,
  GenKit,
  HeartFrame,
  Issue,
  Need,
  PieceKit,
  RuleKit,
  ShapeKit,
} from '$engine/drawing/types';
import { botTrial as simBotTrial } from '$engine/sim';

/**
 * EN-W0 (ending-plan §4, §5): the ending's contracts exist, are inert and read strictly. Every
 * `it.todo` below is a later task's acceptance; its owner fills it in and removes the marker.
 */

const DRAWING: Drawing = {
  name: 'The wet room',
  rule: 'canals:current',
  foes: ['eel', 'moth'],
  pieces: ['canals:lamp'],
  shape: 'plain',
  length: 4,
  heart: 'mother',
};

/** A save that round-trips through JSON like the app's own storage, with `edit` applied to its profile. */
function reload(edit: (profile: Record<string, unknown>) => void = () => {}): SaveData {
  const raw = JSON.parse(JSON.stringify(newSave(1))) as { profile: Record<string, unknown> };
  edit(raw.profile);
  return parseSaveData(raw);
}

describe('EN-W0: the profile fields', () => {
  test('EN-W0: a profile without the ending fields parses with empty defaults', () => {
    const p = reload().profile;
    expect(drawingsOf(p)).toEqual([null, null, null]);
    expect(endingOf(p)).toEqual({ handover: false, creditsSeen: false });
    expect(ledgerOf(p)).toEqual({ casts: 0, biggest: null, districts: [] });
  });

  test('empty fields are not stored, so recorded saves keep their form', () => {
    const p = reload((profile) => {
      profile.drawings = [null, null, null];
      profile.ending = { handover: false, creditsSeen: false };
      profile.ledger = { casts: 0, biggest: null, districts: [] };
    }).profile;
    expect(Object.keys(p)).not.toEqual(expect.arrayContaining(['drawings']));
    expect('ending' in p).toBe(false);
    expect('ledger' in p).toBe(false);
  });

  test('saved values round-trip', () => {
    const ledger = {
      casts: 41,
      biggest: { chain: 9, caster: 'draughtsman' as ApprenticeId, name: 'Bonfire' },
      districts: ['seam', 'canals'],
    };
    const p = reload((profile) => {
      profile.drawings = [DRAWING, null, null];
      profile.ending = { handover: true, creditsSeen: false };
      profile.ledger = ledger;
    }).profile;
    expect(drawingsOf(p)).toEqual([DRAWING, null, null]);
    expect(endingOf(p)).toEqual({ handover: true, creditsSeen: false });
    expect(ledgerOf(p)).toEqual(ledger);
  });

  test('a malformed value is dropped, never thrown', () => {
    const p = reload((profile) => {
      profile.drawings = [{ ...DRAWING, length: 9 }, 'x', DRAWING, DRAWING];
      profile.ending = { handover: 'yes', creditsSeen: true };
      profile.ledger = {
        casts: -3,
        biggest: { chain: 2, caster: 'nobody', name: 'x' },
        districts: ['seam', 'nowhere', 'seam', 'canals'],
      };
    }).profile;
    expect(drawingsOf(p)).toEqual([null, null, DRAWING]);
    expect(endingOf(p)).toEqual({ handover: false, creditsSeen: true });
    expect(ledgerOf(p)).toEqual({ casts: 0, biggest: null, districts: ['seam', 'canals'] });
    expect(
      reload((profile) => {
        profile.drawings = 'junk';
        profile.ending = 7;
        profile.ledger = [];
      }).profile,
    ).toEqual(reload().profile);
  });

  test('a drawing is checked on its limits: name 1-24 trimmed, 1-3 foes, 2 pieces, length 3-6', () => {
    expect(readDrawing({ ...DRAWING, name: `  ${DRAWING.name}  ` })?.name).toBe(DRAWING.name);
    expect(NAME_MAX).toBe(24);
    expect(DRAWING_SLOTS).toBe(3);
    for (const bad of [
      { name: '   ' },
      { name: 'x'.repeat(25) },
      { foes: [] },
      { foes: ['eel', 'eel', 'moth', 'rat'] },
      { foes: ['nothing'] },
      { pieces: ['canals:a', 'canals:b', 'canals:c'] },
      { pieces: ['nodistrict:a'] },
      { length: 2 },
      { length: 7 },
      { shape: 'bathhouses' },
      { heart: 'rat' },
      { rule: 'current' },
    ]) {
      expect(readDrawing({ ...DRAWING, ...bad }), JSON.stringify(bad)).toBeNull();
    }
    expect(readDrawing({ ...DRAWING, rule: null, shape: 'bathhouses:heat' })).not.toBeNull();
  });

  test('types: the drawing, its ids and the profile fields', () => {
    expectTypeOf<Drawing['length']>().toEqualTypeOf<3 | 4 | 5 | 6>();
    expectTypeOf<Drawing['shape']>().toEqualTypeOf<ShapeId | 'plain'>();
    expectTypeOf<Drawing['foes']>().toEqualTypeOf<EnemyId[]>();
    expectTypeOf<Profile['drawings']>().toEqualTypeOf<(Drawing | null)[] | undefined>();
    expect([...MASTER_IDS].sort()).toEqual(
      (
        [
          'marginalia',
          'mother',
          'lamplighter',
          'postmaster',
          'bathSteward',
          'chiefWarden',
          'carillonneur',
          'registrar',
        ] satisfies MasterId[]
      ).sort(),
    );
  });
});

describe('EN-W0: the stubs and kit interfaces', () => {
  const profile = newSave(1).profile;
  const calls: [string, string, () => unknown][] = [
    [
      'EN-S1',
      'generateRoom',
      () => generateRoom({ profile, drawing: DRAWING, party: [], seed: 1, room: 0 }),
    ],
    ['EN-S1', 'checkGenerated', () => checkGenerated(undefined as never, undefined as never)],
    ['EN-10', 'handover', () => handover(profile)],
    ['EN-11', 'creditsOf', () => creditsOf(profile)],
  ];
  test.each(calls)('%s: %s throws "not built" until its task', (task, _name, call) => {
    expect(call).toThrow(`not built (${task})`);
  });

  test('botTrial is the engine bot of EN-0, not a stub', () => {
    expect(botTrial).toBe(simBotTrial);
  });

  test('EN takes salts 7000-7999 and keeps the fallback inside them', () => {
    expect(EN_SALT).toEqual({ from: 7000, to: 7999, fallback: 7900 });
  });

  test('every kit interface carries needs with a reason (P5)', () => {
    expectTypeOf<RuleKit['needs']>().toEqualTypeOf<readonly Need[]>();
    expectTypeOf<PieceKit['needs']>().toEqualTypeOf<readonly Need[]>();
    expectTypeOf<FoeKit['needs']>().toEqualTypeOf<readonly Need[]>();
    expectTypeOf<ShapeKit['needs']>().toEqualTypeOf<readonly Need[]>();
    expectTypeOf<HeartFrame['needs']>().toEqualTypeOf<readonly Need[]>();
    expectTypeOf<Need['reason']>().toEqualTypeOf<string>();
    expectTypeOf<GenKit['frames']>().toEqualTypeOf<readonly HeartFrame[]>();
    expectTypeOf<Issue['reason']>().toEqualTypeOf<string>();
    expectTypeOf<Credits['biggest']>().toEqualTypeOf<{
      chain: number;
      caster: ApprenticeId;
      name: string;
    } | null>();
  });
});

// ── Acceptance owed by later tasks (ending-plan §5), by task ──────────────────

describe('EN-1 (Pack D): the ledger', () => {
  it.todo('EN-1: counts grow on return and on wipe');
  it.todo('EN-1: lab and bench never feed the ledger');
  it.todo('EN-1: city.open keeps opening order');
  it.todo('EN-1: the ledger round-trips through save');
});

describe('EN-9 (Pack D): the owner and the mender', () => {
  it.todo('EN-9: mender joins Storm across one gap');
  it.todo('EN-9: mender joins Conduct across one gap');
  it.todo('EN-9: mender ignites fire across one gap');
  it.todo('EN-9: mender joins Toll across one gap');
  it.todo('EN-9: a unit in the gap blocks the join');
  it.todo('EN-9: no diagonal join');
  it.todo('EN-9: dusk fire does not jump the gap');
  it.todo('EN-9: the same page cast by another apprentice behaves as today');
  it.todo("EN-9: the owner's starter page fires a Storm");
});

describe('EN-S1 (Pack B): the generator spike', () => {
  it.todo('EN-S1: guardrails hold on 500 seeds');
  it.todo('EN-S1: no event-cap overrun inside trials');
  it.todo('EN-S1: same input gives the same layout, attempts and ops');
});

describe('EN-2 and EN-3 (Pack E): the generator and the module', () => {
  it.todo('EN-2: checkGenerated is green on every seed of every fixture drawing');
  it.todo('EN-2: same input gives the same layout, attempts and ops');
  it.todo('EN-2: no foe starts within distance 2 of any P');
  it.todo('EN-2: depth bands scale the foe budget');
  it.todo('EN-2: unverified fallbacks are zero');
  it.todo('EN-3: trips of length 3 and 6 start, reload, return and wipe');
  it.todo('EN-3: reload replays stored layouts without running the bot');
  it.todo('EN-3: a redraw during a trip changes nothing');
  it.todo('EN-3: no hearing, heart, page or recruit is given');
});

describe('EN-5 and EN-8 (Pack F): palette, pen and loot', () => {
  it.todo('EN-5: every offered combination generates');
  it.todo('EN-8: offers come only from source districts or basics');
  it.todo('EN-8: a page you hold is never offered');
  it.todo('EN-8: solvents come only from drawn districts');
});

describe('EN-4 (Pack G): the generation worker', () => {
  it.todo('EN-4: worker results equal the synchronous path');
});

describe('EN-K1 to EN-K7 (Packs I-K): kits and frames', () => {
  it.todo('EN-K1: the frame passes checkGenerated over 50 seeds');
  it.todo('EN-K1: the fallback board passes checkGenerated and has a scripted solve');
  it.todo('EN-K1: the bot trial ends within its op budget');
  it.todo('EN-K2: the frame passes checkGenerated over 50 seeds');
  it.todo('EN-K2: the fallback board passes checkGenerated and has a scripted solve');
  it.todo('EN-K2: the bot trial ends within its op budget');
  it.todo('EN-K2: eel and moth are greyed without water and lamps');
  it.todo('EN-K3: the frame passes checkGenerated over 50 seeds');
  it.todo('EN-K3: the fallback board passes checkGenerated and has a scripted solve');
  it.todo('EN-K3: the bot trial ends within its op budget');
  it.todo('EN-K3: no term at the heart');
  it.todo('EN-K4: the frame passes checkGenerated over 50 seeds');
  it.todo('EN-K4: the fallback board passes checkGenerated and has a scripted solve');
  it.todo('EN-K4: the bot trial ends within its op budget');
  it.todo('EN-K4: heat reaches 4 at the heart for every length');
  it.todo('EN-K5: the frame passes checkGenerated over 50 seeds');
  it.todo('EN-K5: the fallback board passes checkGenerated and has a scripted solve');
  it.todo('EN-K5: the bot trial ends within its op budget');
  it.todo('EN-K5: never stranded on a span choice');
  it.todo('EN-K6: the frame passes checkGenerated over 50 seeds');
  it.todo('EN-K6: the fallback board passes checkGenerated and has a scripted solve');
  it.todo('EN-K6: the bot trial ends within its op budget');
  it.todo('EN-K6: bells hang only where rung');
  it.todo('EN-K7: the frame passes checkGenerated over 50 seeds');
  it.todo('EN-K7: the fallback board passes checkGenerated and has a scripted solve');
  it.todo('EN-K7: the bot trial ends within its op budget');
  it.todo('EN-K7: no return after the point and none needed at the heart');
});

describe('EN-10 and EN-11 (Pack L): handover and credits', () => {
  it.todo('EN-10: the handover is hidden before the door opens');
  it.todo('EN-10: the handover is idempotent');
  it.todo('EN-10: nothing is lost on joining');
  it.todo('EN-10: gifted pages are learned only when missing');
  it.todo('EN-11: creditsOf lists districts in opening order');
  it.todo('EN-11: creditsOf carries the ledger counts');
});
