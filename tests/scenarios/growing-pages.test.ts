import { expect, test } from 'vitest';
import { MEMBER_IDS, MEMBERS, RUNE_IDS, TUNING } from '$data';
import {
  clustersOf,
  compileGlyph,
  compileLattice,
  createBattle,
  describeLog,
  glyphLibrary,
  growingLattice,
  inkUsed,
  type Lattice,
  latticeOf,
  masksFrom,
  newProfile,
  newSave,
  type Profile,
  parseLattice,
  provenCount,
  recordProof,
  serializeLattice,
  setMemberLattice,
  tidyCollapse,
  toGlyphDef,
} from '$engine';
import { parseSaveText, saveText } from '../../src/app/save';
import { cast, expectLogIncludes } from './harness';

function play(page: Lattice, key: string, glyphs = {}) {
  const compiled = compileLattice(page, glyphs);
  return cast(
    createBattle({
      title: 'Paper identity',
      board: 'D . d .',
      seed: 23,
      lab: true,
      party: { draughtsman: { spells: compiled.spells } },
    }).state,
    'draughtsman',
    'right',
    key,
  );
}

test('fixed paper, growing margins and sparse reload produce identical Fork/Bend/aura casts', () => {
  const fixed = parseLattice(`. . Ink Coil . . . . .
. . Bend^ . . . . . .
Bolt> Ink Fork . . . . . .
. . Strike . . . . . .
. . . . . . . . .
Bolt> Oil Spark . . . Ink . .`);
  const growing = growingLattice(fixed.runes);
  const revealed: Lattice = {
    ...growing,
    shape: {
      kind: 'growing',
      origin: { x: -100000, y: -100000 },
      width: 200001,
      height: 200001,
      holes: [],
    },
  };
  const roundtrip = parseLattice(serializeLattice(revealed));
  expect(compileLattice(growing)).toEqual(compileLattice(fixed));
  expect(compileLattice(growing).auraTouches.length).toBeGreaterThan(0);
  expect(compileLattice(revealed)).toEqual(compileLattice(fixed));
  expect(inkUsed(revealed)).toBe(inkUsed(fixed));
  for (const key of ['0,2', '0,5']) {
    const original = play(fixed, key);
    expectLogIncludes(original.events, ['Draughtsman casts Bolt right', 'bolt aims at dummy-1']);
    for (const page of [growing, revealed, roundtrip]) {
      const replay = play(page, key);
      expect(replay.events).toEqual(original.events);
      expect(replay.state).toEqual(original.state);
    }
  }
  expect(compileLattice(growing).reached).not.toContain('6,5');
  const profile = setMemberLattice(newProfile(), 'draughtsman', growing);
  const snapshot = structuredClone(profile);
  play(revealed, '0,2');
  expect(profile.proof).toEqual(snapshot.proof);
  expect(profile.glyphRecords).toEqual(snapshot.glyphRecords);
  expect(profile.lattices).toEqual(snapshot.lattices);
});

for (const member of MEMBER_IDS) {
  const legacy = parseLattice(MEMBERS[member].shape).shape;
  const targets = [
    { x: -1, y: 0 },
    { x: legacy.width, y: 0 },
    { x: 0, y: -1 },
    { x: 0, y: legacy.height },
    ...legacy.holes,
  ];
  test(`${member}: every old edge and former hole keeps signed Source identities through save and text export`, () => {
    for (const at of targets) {
      const page = growingLattice([
        { at, rune: 'bolt', dir: 'right' },
        { at: { x: at.x + 1, y: at.y }, rune: 'strike' },
      ]);
      const save = newSave(7);
      save.profile = setMemberLattice(
        { ...save.profile, known: [...RUNE_IDS], inkCapacity: { draughtsman: 100, stoker: 100 } },
        member,
        page,
      );
      const reloaded = parseSaveText(saveText(save));
      const imported = parseLattice(serializeLattice(latticeOf(reloaded.profile, member)));
      expect(imported.runes).toEqual(page.runes);
      const compiled = compileLattice(imported);
      const key = `${at.x},${at.y}`;
      expect(compiled.spells.map((spell) => spell.key)).toEqual([key]);
      const battle = createBattle({
        title: 'New edge',
        board: `${MEMBERS[member].token} . d`,
        seed: 4,
        lab: true,
        party: { [member]: { spells: compiled.spells } },
      }).state;
      const result = cast(battle, member, 'right', key);
      expectLogIncludes(result.events, [
        `${MEMBERS[member].name} casts Bolt right`,
        'bolt aims at dummy-1',
      ]);
      expect(result.events.some((event) => event.type === 'damage')).toBe(true);
    }
  });
}

test('real casts prove a translated negative Fair Copy; reveal framing does not change eligibility or tidy behavior', () => {
  const fixed = parseLattice(`Bolt> Ink Bendv
. . Strike
. . Spark`);
  let profile: Profile = {
    ...newProfile(),
    known: [...RUNE_IDS],
    vellum: 2,
    inkCapacity: { draughtsman: 100, stoker: 100 },
  };
  for (let i = 0; i < TUNING.provenCasts; i++) {
    const result = play(fixed, '0,0');
    const masks = masksFrom(result.events, 'draughtsman');
    expect(masks).toHaveLength(1);
    profile = recordProof(profile, 'draughtsman', masks);
  }
  const negative = growingLattice(
    fixed.runes.map((rune) => ({ ...rune, at: { x: rune.at.x - 5, y: rune.at.y - 4 } })),
  );
  profile = setMemberLattice(profile, 'draughtsman', negative);
  const cluster = clustersOf(negative).find(
    (candidate) => candidate.kind === 'spell' && candidate.cells.length === 3,
  );
  if (!cluster) throw new Error('missing three-cell entry cluster');
  expect(provenCount(negative, cluster, profile.proof.draughtsman)).toBe(TUNING.provenCasts);
  const framed: Lattice = {
    ...negative,
    shape: { kind: 'growing', origin: { x: -500, y: -500 }, width: 1001, height: 1001, holes: [] },
  };
  expect(provenCount(framed, cluster, profile.proof.draughtsman)).toBe(TUNING.provenCasts);
  const def = toGlyphDef(negative, cluster, 'Negative turn', 'probe');
  const tidy = tidyCollapse(negative, cluster, def);
  expect(tidy.slid).toBeGreaterThan(0);
  expect(describeLog(play(tidy.lattice, '-5,-4', { probe: def }).events)).toEqual(
    describeLog(play(negative, '-5,-4').events),
  );
  const blocked = growingLattice([...negative.runes, { at: { x: -5, y: -3 }, rune: 'oil' }]);
  const collision = tidyCollapse(blocked, cluster, def);
  expect(collision.slid).toBe(0);
  expect(collision.lattice.runes).toContainEqual({ at: { x: -5, y: -3 }, rune: 'oil' });
  const copied = compileGlyph(profile, 'draughtsman', cluster, 'Negative turn');
  expect(
    copied.lattices.draughtsman.some(
      (placed) => 'glyph' in placed && placed.at.x === -5 && placed.at.y === -4,
    ),
  ).toBe(true);
  expect(copied.proof).toEqual(profile.proof);
  expect(
    describeLog(play(latticeOf(copied, 'draughtsman'), '-5,-4', glyphLibrary(copied)).events),
  ).toEqual(describeLog(play(negative, '-5,-4').events));
});

test('billion-cell gaps remain sparse through save, export, compile and an actual cast', () => {
  const page = growingLattice([
    { at: { x: -1000000000, y: -100 }, rune: 'bolt', dir: 'right' },
    { at: { x: -999999999, y: -100 }, rune: 'strike' },
    { at: { x: 1000000000, y: 100 }, rune: 'oil' },
  ]);
  const save = newSave(1);
  save.profile = setMemberLattice(save.profile, 'draughtsman', page);
  const imported = parseLattice(
    serializeLattice(latticeOf(parseSaveText(saveText(save)).profile, 'draughtsman')),
  );
  expect(serializeLattice(imported).length).toBeLessThan(256);
  expect(imported.runes).toEqual(page.runes);
  expect(compileLattice(imported).spells[0]?.path).toHaveLength(2);
  expectLogIncludes(play(imported, '-1000000000,-100').events, [
    'Draughtsman casts Bolt right',
    'bolt aims at dummy-1',
  ]);
});
