import { describe, expect, test } from 'vitest';
import { ENEMIES } from '$data';
import { applyAction, newProfile, type Profile } from '$engine';
import { createBattle } from '$engine/battle';
import { metIn } from '$engine/trip/finish';
import { EMPTY_DRAFT, sceneBattle, sceneEntries, sceneItems } from '../../../src/app/bench';

/** BR-16 (bridges P20): the Bench and the Lab through DK-14. */

const household = (foesMet: Profile['foesMet'] = []): Profile => ({
  ...newProfile(),
  methods: ['bind', 'lift'],
  foesMet,
  met: [],
});

const BRIDGE_FOES = ['warden', 'gargoyle', 'mason'] as const;

describe('the Bench offers the wardens’ staff only once met', () => {
  test.each(BRIDGE_FOES)('%s', (foe) => {
    const token = ENEMIES[foe].token;
    expect(sceneItems(household())).not.toContain(token);
    expect(sceneItems(household([foe]))).toContain(token);
    expect(sceneEntries(household([foe])).some((e) => e.item === token)).toBe(true);
  });

  test('meeting one warden does not offer the other two', () => {
    const items = sceneItems(household(['gargoyle']));
    expect(items).toContain(ENEMIES.gargoyle.token);
    expect(items).not.toContain(ENEMIES.warden.token);
    expect(items).not.toContain(ENEMIES.mason.token);
  });
});

describe('a Bench trial cuts a span and drops a dummy at dusk', () => {
  // A pier holds the left run; the gap cuts the right run off, so it cracks at dusk.
  const cut = () => {
    const text = ['D {pier} {span:1} {span:1} . d{span:1} {span:1}', '. . . . . . .'].join('\n');
    const scene = text.split('\n').map((r) => r.split(' '));
    return sceneBattle(scene as never, household(), EMPTY_DRAFT);
  };

  test('the trial brings the collapse rule and nothing else', () => {
    const s = cut();
    expect(Object.keys(s.rules ?? {})).toEqual(['bridges:collapse']);
  });

  test('ending the turn runs dusk: the cut span falls and the dummy on it drops', () => {
    const s = cut();
    const dummy = s.units.find((u) => u.def === 'dummy');
    if (!dummy) throw new Error('no dummy in the trial');
    const r = applyAction(s, { type: 'endTurn' });
    expect(r.events.some((e) => e.type === 'bridges:collapse')).toBe(true);
    expect(r.events.some((e) => e.type === 'dropped')).toBe(true);
    expect(r.state.units.find((u) => u.id === dummy.id)?.out).toBe('fell');
  });

  test('the run held up by the pier stays standing through dusk; the cut run is gone', () => {
    const s = cut();
    const r = applyAction(s, { type: 'endTurn' });
    const piece = (x: number) => r.state.tiles[x]?.piece?.id;
    expect(piece(1)).toBe('bridges:pier');
    expect(piece(2)).toBe('bridges:span');
    expect(piece(3)).toBe('bridges:span');
    expect(piece(5)).toBeUndefined();
    expect(piece(6)).toBeUndefined();
  });
});

describe('the Bench offers the span and the pier only once met', () => {
  test.each([
    ['{span}', 'span', 'Span'],
    ['{pier}', 'pier', 'Pier'],
  ] as const)('%s', (item, key, name) => {
    const b = createBattle({
      title: 't',
      board: `${item} . .\n. D .\n. . .`,
      seed: 1,
      intents: {},
    }).state;
    expect(metIn(b, []).met).toContain(key);
    expect(sceneItems(household())).not.toContain(item);
    const met = { ...household(), met: [key] };
    expect(sceneItems(met)).toContain(item);
    expect(sceneEntries(met).find((e) => e.item === item)?.name).toBe(name);
  });
});
