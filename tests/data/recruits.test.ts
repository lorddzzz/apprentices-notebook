import { expect, test } from 'vitest';
import {
  APPRENTICE_IDS,
  APPRENTICES,
  ENEMIES,
  HABITS,
  isInvention,
  leanOf,
  MEMBER_IDS,
  RECRUIT_HABITS,
  RECRUITS,
  type RecruitDef,
  RUNES,
  type RuneId,
  START_KNOWN,
  TUNING,
} from '$data';
import { DISTRICT_TOKENS } from '$data/districts/index';
import { compileLattice, inkUsed, parseLattice, validateLattice } from '$engine';
import { preconditionsOf } from '$engine/recruits';

const IDS = Object.keys(RECRUITS) as (keyof typeof RECRUITS)[];

/** party.md §2 (revised by §0d for the runaway), field by field. */
const TABLE = {
  runaway: ['R', 'amber', 'triangle', 6, 3, 'pull', 'timing', 'seam', 'fuseOnStep'],
  notary: ['N', 'moss', 'diamond', 6, 3, 'swap', 'contracts', 'seam', 'markTwice'],
  towelBearer: ['B', 'teal', 'hexagon', 9, 2, 'pull', 'areas', 'seam', 'steamproof'],
  warden: ['W', 'plum', 'pentagon', 7, 3, 'shove', 'structure', 'seam', 'holdTwo'],
  tuner: ['T', 'rose', 'star', 6, 3, 'swap', 'resonance', 'seam', 'nearUnison'],
  copyist: ['C', 'ochre', 'cross', 6, 3, 'hop', 'seam', 'seam', 'longTouch'],
  exile: ['E', 'indigo', 'drop', 6, 3, 'hop', 'board', 'board', 'restoreErase'],
} as const;

/** The chain each page spells (party.md §2 "Starter page"). */
const CHAIN = {
  runaway: ['touch', 'oil', 'spark'],
  notary: ['splash', 'ink', 'steam'],
  towelBearer: ['splash', 'steam'],
  warden: ['bolt', 'shove', 'strike'],
  tuner: ['bolt', 'brass', 'strike'],
  copyist: ['touch', 'ink', 'strike'],
  exile: ['bolt', 'oil', 'draw'],
} as const;

const FOUND = {
  runaway: { district: 'canals' },
  notary: { district: 'inkQuarter' },
  towelBearer: { district: 'bathhouses' },
  warden: { district: 'bridges' },
  tuner: { district: 'foundry' },
  copyist: { door: 'A' },
  exile: { door: 'B' },
} as const;

const BEAT = {
  runaway: [{ kind: 'landmark' }],
  notary: [{ kind: 'landmark' }],
  towelBearer: [{ kind: 'landmark' }],
  warden: [{ kind: 'landmark' }],
  tuner: [{ kind: 'landmark' }],
  copyist: [{ kind: 'joined', who: 'runaway' }, { kind: 'idiomNamed' }],
  exile: [{ kind: 'provenInvention' }],
} as const;

const NEEDS = {
  runaway: { all: ['fuse'] },
  notary: { all: ['tally'] },
  towelBearer: { all: [], any: ['vat', 'seep', 'steep'] },
  warden: { all: ['hold'] },
  tuner: { all: ['unison'] },
  copyist: { all: ['touch'] },
  exile: { all: ['swap', 'draw', 'erase'] },
} as const;

const pageRunes = (id: keyof typeof RECRUITS): RuneId[] =>
  parseLattice(RECRUITS[id].starterPage).runes.flatMap((r) =>
    'rune' in r && !isInvention(r.rune) ? [r.rune] : [],
  );

test('the seven recruits reproduce party.md §2 field by field', () => {
  expect(IDS).toEqual(Object.keys(TABLE));
  for (const id of IDS) {
    const [token, hue, shape, hp, move, action, trained, gifted, habit] = TABLE[id];
    const r = RECRUITS[id];
    expect(r.id, id).toBe(id);
    expect([r.token, r.look.hue, r.look.shape, r.hp, r.move, r.action], id).toEqual([
      token,
      hue,
      shape,
      hp,
      move,
      action,
    ]);
    expect([r.lean.trained, r.lean.gifted, r.habit], id).toEqual([trained, gifted, habit]);
    expect(r.found, id).toEqual(FOUND[id]);
    expect(r.beat, id).toEqual(BEAT[id]);
    expect(r.runes, id).toEqual(NEEDS[id]);
    expect(pageRunes(id), id).toEqual(CHAIN[id]);
    expect(r.name.length, id).toBeGreaterThan(0);
    expect(r.blurb.length, id).toBeGreaterThan(0);
  }
  expect(Object.values(RECRUIT_HABITS).sort()).toEqual(TABLE_HABITS());
});

function TABLE_HABITS(): string[] {
  return Object.values(TABLE)
    .map((t) => t[8] as string)
    .sort();
}

test('the registry is the pair then the recruits, and the old loops still see only the pair', () => {
  expect(APPRENTICE_IDS).toEqual(['draughtsman', 'stoker', ...IDS]);
  expect(MEMBER_IDS).toEqual(['draughtsman', 'stoker']);
  for (const id of IDS) expect(APPRENTICES[id]).toBe(RECRUITS[id]);
});

test('every starter page parses, fits its habit lean within the starting ink, and has a habit row', () => {
  for (const id of IDS) {
    const r = RECRUITS[id];
    const lean = leanOf(id);
    const lattice = parseLattice(r.starterPage);
    expect(validateLattice(lattice, TUNING.startInk, {}, {}, lean), id).toEqual([]);
    expect(inkUsed(lattice, {}, {}, lean), id).toBeLessThanOrEqual(TUNING.startInk);
    expect(compileLattice(lattice, {}, {}, lean).spells.length, id).toBeGreaterThan(0);
    expect(r.habit && HABITS[r.habit], id).toBeTruthy();
  }
});

test('preconditions (typed plus derived from the page) name real runes; only the exile holds a Board rune', () => {
  for (const id of IDS) {
    const r: RecruitDef<string> = RECRUITS[id];
    const derived = pageRunes(id).filter((x) => !START_KNOWN.includes(x));
    const pre = preconditionsOf(id);
    // runes.all plus the derived page runes, each once; the typed `any` passes through.
    expect(pre.runes.all, id).toEqual([...new Set([...r.runes.all, ...derived])]);
    expect(pre.runes.any, id).toEqual(r.runes.any);
    for (const x of [...derived, ...r.runes.all]) expect(pre.runes.all, `${id} ${x}`).toContain(x);
    for (const x of [...pre.runes.all, ...(pre.runes.any ?? [])]) {
      expect(RUNES[x], `${id} ${x}`).toBeDefined();
    }
  }
  const board = new Set<RuneId>(['swap', 'draw', 'erase']);
  for (const id of IDS) {
    const hasBoard = pageRunes(id).some((x) => board.has(x));
    expect(hasBoard, id).toBe(id === 'exile');
  }
});

test('door arrivals are the only recruits without a district; district ones are all landmark-met', () => {
  for (const id of IDS) {
    const r = RECRUITS[id];
    if ('district' in r.found) expect(r.beat, id).toEqual([{ kind: 'landmark' }]);
    else
      expect(
        r.beat.some((b) => b.kind === 'landmark'),
        id,
      ).toBe(false);
  }
});

test('tokens are unique across the registry and clear of foe and district tokens', () => {
  const tokens = APPRENTICE_IDS.map((id) => APPRENTICES[id].token);
  expect(new Set(tokens).size).toBe(tokens.length);
  const others = [
    ...Object.values(ENEMIES).map((e) => e.token),
    ...DISTRICT_TOKENS.map((t) => t.token),
  ];
  for (const t of tokens) expect(others, t).not.toContain(t);
});
