import { describe, expect, test } from 'vitest';
import { applyAction, newProfile, type Profile, writeInvention } from '$engine';
import {
  choicesFor,
  type Draft,
  defaultName,
  EMPTY_DRAFT,
  emptyScene,
  eventsKnown,
  inventionToWrite,
  newLines,
  paintScene,
  pickMethod,
  sceneBattle,
  sceneItems,
  sceneText,
  setEvent,
  setPart,
  setSolvent,
  statusOf,
  subjectsIn,
  trialActions,
} from '../../src/app/bench';

/** The Bench reducer (design §6.1; plan P37): fits, headline, trials, writing. */

const household = (over: Partial<Profile> = {}): Profile => ({
  ...newProfile(),
  methods: ['conduct'],
  known: [...newProfile().known, 'brass', 'steam'],
  met: ['plate', 'slick'],
  foesMet: ['rat'],
  ...over,
});

const impulse = (): Draft => setPart(pickMethod(EMPTY_DRAFT, 'conduct'), 0, 'shove');

describe('methods and parts', () => {
  test('a method clears the parts and offers only its own slots', () => {
    const d = pickMethod(EMPTY_DRAFT, 'conduct');
    expect(d.parts).toEqual([null]);
    const bind = pickMethod(d, 'bind');
    expect(bind.parts).toEqual(['ink', null]);
  });

  test('conduct takes an Action that resolves at once; the others are greyed with a reason', () => {
    const p = household();
    const choices = choicesFor(p, pickMethod(EMPTY_DRAFT, 'conduct'), 0);
    const by = Object.fromEntries(choices.map((c) => [c.ref, c.reason]));
    expect(by.shove).toBeNull();
    expect(by.guard).toBeNull();
    expect(by.bolt).toBe('a Source has nothing to conduct');
    expect(by.ink).toBe('a Kind has nothing to conduct');
  });

  test('an unknown rune is not on offer as usable, and a nested invention fits as an Action', () => {
    const p = household();
    const made = writeInvention(p, inventionToWrite(p, impulse(), 'Impulse') ?? fail());
    const by = Object.fromEntries(
      choicesFor(made, pickMethod(EMPTY_DRAFT, 'conduct'), 0).map((c) => [c.ref, c.reason]),
    );
    expect(by['inv:impulse']).toBeNull();
    expect(by.fork).toBeUndefined();
    const lift = choicesFor(made, pickMethod(EMPTY_DRAFT, 'conduct'), 0);
    expect(lift.every((c) => c.ref !== 'fork')).toBe(true);
  });

  test('bind offers only known events', () => {
    expect(eventsKnown(household())).toEqual([]);
    const p = household({ methods: ['bind'] });
    expect(eventsKnown(p)).toEqual(['hit', 'enters']);
    const far = household({ methods: ['bind'], city: { ...newProfile().city, open: ['bridges'] } });
    expect(eventsKnown(far)).toEqual(['hit', 'enters', 'pushed']);
  });
});

describe('the headline and the invalid message', () => {
  test('before a method there is nothing to read', () => {
    expect(statusOf(household(), EMPTY_DRAFT)).toMatchObject({
      headline: null,
      issue: 'Pick a method.',
      valid: false,
    });
  });

  test('the headline is live from the first part, with its ink', () => {
    const s = statusOf(household(), impulse());
    expect(s.valid).toBe(true);
    expect(s.headline).toBe(
      'Shove travels the connected brass the target touches, reaching each unit on it once.',
    );
    expect(s.ink).toBe(4);
  });

  test('an unfinished draft says what to add, in the method words', () => {
    const s = statusOf(household(), pickMethod(EMPTY_DRAFT, 'conduct'));
    expect(s.valid).toBe(false);
    expect(s.issue).toBe('Add an Action that resolves at once.');
    expect(s.headline).toContain('…');
  });

  test('a Shape in a Bind explains what does not fit', () => {
    const p = household({ methods: ['bind'], known: [...household().known, 'fork'] });
    const d = setEvent(setPart(pickMethod(EMPTY_DRAFT, 'bind'), 1, 'bolt'), 'hit');
    expect(statusOf(p, d)).toMatchObject({ valid: false, issue: 'a Source has nothing to store' });
  });

  test('a solvent adds its flavour to the headline', () => {
    const d = setSolvent(impulse(), 'gallnut');
    expect(statusOf(household(), d).headline).toContain('With Gallnut, ');
  });
});

describe('the test scene', () => {
  test('the palette offers what the household has met', () => {
    const items = sceneItems(household());
    expect(items).toEqual(['D', 'r', 'd', 'o', '=', '.']);
    expect(sceneItems({ met: [], foesMet: [] })).toEqual(['D', 'd', '.']);
  });

  test('painting places subjects, up to three, and the caster stays', () => {
    let scene = emptyScene();
    for (const x of [1, 2, 3]) {
      const r = paintScene(scene, { x, y: 2 }, 'r');
      expect('scene' in r).toBe(true);
      if ('scene' in r) scene = r.scene;
    }
    expect(subjectsIn(scene)).toBe(3);
    expect(paintScene(scene, { x: 4, y: 2 }, 'r')).toEqual({ why: 'Up to 3 subjects' });
    expect(paintScene(scene, { x: 0, y: 2 }, 'r')).toEqual({
      why: 'The caster is standing there',
    });
    expect(paintScene(scene, { x: 0, y: 2 }, '.')).toEqual({ why: 'The caster stays' });
  });

  test('the caster can be moved', () => {
    const r = paintScene(emptyScene(), { x: 2, y: 0 }, 'D');
    expect('scene' in r && sceneText(r.scene).split('\n')[0]).toBe('. . D . . .');
    expect('scene' in r && sceneText(r.scene).split('\n')[2]).toBe('. . . . . .');
  });

  test('Impulse on a brass plate pushes one subject into another', () => {
    const p = household();
    let scene = emptyScene();
    for (const [x, item] of [
      [1, 'r'],
      [2, 'r'],
    ] as const) {
      const r = paintScene(scene, { x, y: 2 }, item);
      if ('scene' in r) scene = r.scene;
    }
    for (const x of [1, 2]) {
      const r = paintScene(scene, { x, y: 3 }, '=');
      if ('scene' in r) scene = r.scene;
    }
    const d = impulse();
    const state = sceneBattle(scene, p, d);
    const actions = trialActions(state, d, { x: 4, y: 2 });
    expect(actions).toHaveLength(1);
    let s = state;
    const log = [];
    for (const a of actions ?? []) {
      const r = applyAction(s, a);
      s = r.state;
      log.push(...r.events);
    }
    expect(log.some((e) => e.type === 'crush')).toBe(true);
    expect(newLines(log, [])).toContain('conduct:network');
    expect(newLines(log, ['conduct:network'])).not.toContain('conduct:network');
    const hit = log.find((e) => e.type === 'conducted');
    expect(hit?.type === 'conducted' && hit.units).toHaveLength(2);
    expect(s.units.filter((u) => u.kind === 'enemy' && u.hp > 0).length).toBeGreaterThan(0);
  });

  test('a Repeat trial waits out a turn to show the echo', () => {
    const p = household({ methods: ['repeat'] });
    const d = setPart(pickMethod(EMPTY_DRAFT, 'repeat'), 0, 'shove');
    const state = sceneBattle(emptyScene(), p, d);
    expect(trialActions(state, d, { x: 3, y: 2 })?.map((a) => a.type)).toEqual(['cast', 'endTurn']);
    expect(trialActions(state, d, { x: 0, y: 2 })).toBeNull();
  });
});

describe('naming and writing', () => {
  test('the default name is the method and its parts', () => {
    expect(defaultName(impulse())).toBe('Conduct Shove');
    const bind = setEvent(setPart(pickMethod(EMPTY_DRAFT, 'bind'), 1, 'shove'), 'hit');
    expect(defaultName(bind)).toBe('Bind Shove');
  });

  test('a blank name takes the default, and ids are unique', () => {
    const p = household();
    const first = inventionToWrite(p, impulse(), '  ');
    expect(first).toMatchObject({ name: 'Conduct Shove', id: 'inv:conduct-shove' });
    const written = writeInvention(p, first ?? fail());
    expect(inventionToWrite(written, impulse(), '')?.id).toBe('inv:conduct-shove-2');
  });

  test('a plain invention is free and joins the household, banking the trial lines', () => {
    const p = household({ solvents: { ...newProfile().solvents, gallnut: 2 } });
    const def = inventionToWrite(p, impulse(), 'Impulse') ?? fail();
    const next = writeInvention(p, def, ['conduct:network']);
    expect(next.inventions.map((i) => i.id)).toEqual(['inv:impulse']);
    expect(next.solvents).toEqual(p.solvents);
    expect(next.witnessed).toContain('conduct:network');
    expect(p.inventions).toEqual([]);
  });

  test('a flavoured invention spends one solvent, once', () => {
    const p = household({ solvents: { ...newProfile().solvents, gallnut: 2 } });
    const d = setSolvent(impulse(), 'gallnut');
    const def = inventionToWrite(p, d, 'Marking pulse') ?? fail();
    const next = writeInvention(p, def);
    expect(next.solvents.gallnut).toBe(1);
    expect(() => writeInvention(next, def)).toThrow('already written');
    expect(next.inventions).toHaveLength(1);
  });

  test('a flavoured invention without the solvent is refused', () => {
    const p = household();
    const def = inventionToWrite(p, setSolvent(impulse(), 'gallnut'), 'X') ?? fail();
    expect(() => writeInvention(p, def)).toThrow('none of that solvent');
  });

  test('an invalid combination is refused with its message', () => {
    const p = household();
    const bad = { ...(inventionToWrite(p, impulse(), 'Bad') ?? fail()), parts: ['bolt' as const] };
    expect(() => writeInvention(p, bad)).toThrow('a Source has nothing to conduct');
  });
});

function fail(): never {
  throw new Error('expected a value');
}
