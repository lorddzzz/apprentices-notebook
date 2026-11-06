import { describe, expect, test } from 'vitest';
import { ENEMIES } from '$data';
import { applyAction, newProfile, type Profile, scenarioBattle } from '$engine';
import { boilOverState } from '$engine/districts/bathhouses/boilOver';
import {
  EMPTY_DRAFT,
  emptyScene,
  paintScene,
  type Scene,
  sceneBattle,
  sceneEntries,
  sceneItems,
  subjectsIn,
} from '../../src/app/bench';
import { intentPhrase } from '../../src/app/describe';
import { type BoardView, viewOf } from '../../src/app/view';
import { BATHHOUSES_UI } from '../../src/ui/districts/bathhouses';
import { labHeatOf } from '../../src/ui/districts/bathhouses/foes/lab';
import { BATH_ART_DEFS, dissolvedOn, isBathDef } from '../../src/ui/districts/bathhouses/foes/view';
import { board } from '../scenarios/harness';

/** BH-14: the steam's people on the Bench, in the board view and in the intent line. */

const household = (over: { met?: string[]; foesMet?: Profile['foesMet'] } = {}): Profile => ({
  ...newProfile(),
  methods: ['bind', 'lift'],
  foesMet: over.foesMet ?? [],
  met: (over.met ?? []) as unknown as Profile['met'],
});

const FOES: [Profile['foesMet'][number], string][] = [
  ['dissolvedBather', 's'],
  ['attendant', 't'],
  ['boilerman', 'c'],
];

describe('the Bench offers the steam’s people only after they are met', () => {
  test.each(FOES)('%s (%s)', (foe, token) => {
    expect(sceneItems(household())).not.toContain(token);
    expect(sceneItems(household({ foesMet: [foe] }))).toContain(token);
    expect(sceneEntries(household({ foesMet: [foe] })).some((e) => e.item === token)).toBe(true);
  });

  test('meeting a bather gives the bather and nothing else of the three', () => {
    const items = sceneItems(household({ foesMet: ['dissolvedBather'] }));
    expect(items).toContain('s');
    expect(items).not.toContain('t');
    expect(items).not.toContain('c');
  });

  test('the Steward (a stand-in heart, not a rival shell) is offered once met, never before', () => {
    expect(sceneItems(household())).not.toContain('H');
    expect(sceneItems(household({ foesMet: ['bathSteward'] }))).toContain('H');
  });

  test('the vent and the cloud come once their kinds are met, so the steam can be built', () => {
    expect(sceneItems(household({ foesMet: ['dissolvedBather'] }))).not.toContain('@');
    const items = sceneItems(household({ foesMet: ['dissolvedBather'], met: ['cloud'] }));
    expect(items).toEqual(expect.arrayContaining(['~', '@', 's']));
  });
});

describe('the gauge rule is off in the Bench', () => {
  const met = household({ foesMet: ['dissolvedBather', 'boilerman'], met: ['cloud', 'vent'] });
  const painted = (items: [number, number, string][]): Scene => {
    let scene: Scene = emptyScene();
    for (const [x, y, item] of items) {
      const r = paintScene(scene, { x, y }, item);
      if (!('scene' in r)) throw new Error(r.why);
      scene = r.scene;
    }
    return scene;
  };
  const scene = painted([
    [2, 2, '@'],
    [3, 2, '~'],
    [4, 2, '~'],
    [3, 3, '~'],
    [3, 4, 'c'],
    [5, 2, 's'],
  ]);

  test('a bather and a boilerman on a vent and cloud: no gauge is listed', () => {
    const s = sceneBattle(scene, met, EMPTY_DRAFT);
    expect(s.rules).toBeUndefined();
    expect(boilOverState(s)).toBeNull();
    expect(subjectsIn(scene)).toBe(2);
  });

  test('rounds pass with steam everywhere and nothing boils or builds', () => {
    let s = sceneBattle(scene, met, EMPTY_DRAFT);
    const types = new Set<string>();
    for (let n = 0; n < 8 && s.phase === 'player'; n++) {
      const r = applyAction(s, { type: 'endTurn' });
      s = r.state;
      for (const e of r.events) types.add(e.type);
    }
    expect(types.has('bathhouses:boilOver')).toBe(false);
    expect(types.has('bathhouses:pressure')).toBe(false);
  });
});

describe('the dissolved visual', () => {
  const viewIn = (ascii: string): BoardView => viewOf(board(ascii));

  test('a bather on a cloud tile is dissolved; off it, it is solid', () => {
    const inCloud = viewIn('. s~ .');
    const bather = inCloud.units.find((u) => u.def === 'dissolvedBather');
    if (!bather) throw new Error('no bather');
    expect(dissolvedOn(inCloud, bather)).toBe(true);
    const out = viewIn('. s .');
    const solid = out.units.find((u) => u.def === 'dissolvedBather');
    if (!solid) throw new Error('no bather');
    expect(dissolvedOn(out, solid)).toBe(false);
  });

  test('every cloud kind dissolves it; a slick does not', () => {
    for (const cell of ['s{brand}', 's{fog}', 's{bank}', 's~']) {
      const v = viewIn(`. ${cell} .`);
      const u = v.units.find((x) => x.def === 'dissolvedBather');
      if (!u) throw new Error(`no bather on ${cell}`);
      expect(dissolvedOn(v, u), cell).toBe(true);
    }
    const slick = viewIn('. so .');
    const u = slick.units.find((x) => x.def === 'dissolvedBather');
    if (!u) throw new Error('no bather');
    expect(dissolvedOn(slick, u)).toBe(false);
  });

  test('only a foe with the dissolves trait dissolves: an attendant in a cloud is solid', () => {
    const v = viewIn('. t~ . c~ . D~');
    for (const unit of v.units) expect(dissolvedOn(v, unit), unit.def).toBe(false);
  });

  test('the module draws the four foes and says which', () => {
    for (const def of BATH_ART_DEFS) {
      expect(isBathDef(def)).toBe(true);
      expect(def in ENEMIES).toBe(true);
    }
    expect(isBathDef('rat')).toBe(false);
    expect(BATHHOUSES_UI.labPanel).toBeDefined();
  });
});

describe('intent text for the steam’s people', () => {
  test('the attendant, the boilerman and the bather each read a plain line', () => {
    const s = board('. . . . .\n= S t . .\n. . . . .\nD c@ . . .\n. . . . .');
    const lines = s.units
      .filter((u) => u.kind === 'enemy')
      .map((u) => (u.kind === 'enemy' ? intentPhrase(s, u) : ''));
    expect(lines.some((l) => /^will shove .* left \(1st\)$/.test(l))).toBe(true);
    expect(lines.some((l) => /^will (bite|feed the vent at) /.test(l))).toBe(true);
  });

  test('a bather on open ground telegraphs a bite', () => {
    const s0 = board('D s . .\n. . . .');
    const s = applyAction(s0, { type: 'endTurn' }).state;
    const bather = s.units.find((u) => u.kind === 'enemy');
    if (bather?.kind !== 'enemy') throw new Error('no bather');
    expect(intentPhrase(s, bather)).toMatch(/^will bite/);
  });
});

describe('the Lab heat reader', () => {
  test('reads the gauge’s heat off a battle, null when none is listed', () => {
    const s = scenarioBattle(
      { title: 'x', board: 'D', demo: [], expected: [], id: 'x', note: '' },
      { lab: true },
    );
    expect(labHeatOf(s)).toBeNull();
  });
});
