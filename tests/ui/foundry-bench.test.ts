import { describe, expect, test } from 'vitest';
import { LOCKS } from '$data/districts/foundry';
import { newProfile, type Profile, parseCell, scenarioBattle } from '$engine';
import { tileAt } from '$engine/queries';
import { sceneEntries, sceneItems } from '../../src/app/bench';
import { PALETTE, resolveScenario, withLabRules } from '../../src/app/lab';

/** BF-19: the Bench and the Lab know the foundry's pieces, foes and one board per lock. */

const household = (over: { met?: string[]; foesMet?: Profile['foesMet'] } = {}): Profile => ({
  ...newProfile(),
  foesMet: over.foesMet ?? [],
  met: (over.met ?? []) as unknown as Profile['met'],
});

describe('the Bench offers the bell-ringers’ things only after they are met', () => {
  test('bells, in all three tones, come with the bell met', () => {
    expect(sceneItems(household())).not.toContain('{bell:mid}');
    const items = sceneItems(household({ met: ['bell'] }));
    expect(items).toEqual(expect.arrayContaining(['{bell:low}', '{bell:mid}', '{bell:high}']));
    expect(items).not.toContain('{rope:low}');
  });
  test('ropes come with the rope met, and not the bells', () => {
    const items = sceneItems(household({ met: ['rope'] }));
    expect(items).toEqual(expect.arrayContaining(['{rope:low}', '{rope:mid}', '{rope:high}']));
    expect(items).not.toContain('{bell:low}');
  });
  test('the great bell and the hook are Lab-only', () => {
    const items = sceneItems(household({ met: ['bell', 'rope'] }));
    expect(items.some((i) => i.startsWith('{greatBell') || i === '{hook}')).toBe(false);
  });
  test.each([
    ['ringer', 'Z'],
    ['detuner', 'X'],
    ['clapper', 'Q'],
  ] as const)('%s (%s) only after it is met', (foe, token) => {
    expect(sceneItems(household())).not.toContain(token);
    expect(sceneItems(household({ foesMet: [foe] }))).toContain(token);
    expect(sceneEntries(household({ foesMet: [foe] })).some((e) => e.item === token)).toBe(true);
  });
});

describe('the Lab places every foundry piece and foe', () => {
  const items = PALETTE.map((p) => p.item);
  test('the staff', () => {
    expect(items).toEqual(expect.arrayContaining(['Z', 'X', 'Q']));
  });
  test('bells and ropes in each tone, the hook, the great bells plain and hung', () => {
    expect(items).toEqual(
      expect.arrayContaining([
        '{bell:low}',
        '{bell:mid}',
        '{bell:high}',
        '{rope:low}',
        '{rope:mid}',
        '{rope:high}',
        '{hook}',
        '{greatBell:1}',
        '{greatBell:4:allied:rung}',
      ]),
    );
  });
  test('every foundry palette item is a cell the board can read', () => {
    const own = PALETTE.filter((p) => /^\{(bell|rope|hook|greatBell)/.test(p.item));
    expect(own.length).toBe(3 + 3 + 1 + 8);
    for (const p of own) {
      expect(parseCell(p.item, { x: 0, y: 0 }).tile.piece, p.item).toBeTruthy();
    }
  });
});

describe('a preset per lock loads in the Lab', () => {
  test.each(LOCKS)('%s', (lock) => {
    const { def, unknown } = resolveScenario(`foundry-${lock}`);
    expect(unknown).toBeNull();
    const s = scenarioBattle(def, { lab: true });
    const great = s.tiles.filter((t) => t.piece?.id === 'foundry:greatBell');
    expect(great).toHaveLength(1);
  });
  test('the tones board has all three tones, a rope, a muffled bell and a Ringer', () => {
    const s = scenarioBattle(resolveScenario('foundry-tones').def, { lab: true });
    const tones = new Set(
      s.tiles.flatMap((t) =>
        t.piece?.id === 'foundry:bell' ? [(t.piece.data as { tone: string }).tone] : [],
      ),
    );
    expect([...tones].sort()).toEqual(['high', 'low', 'mid']);
    expect(s.units.some((u) => u.kind === 'enemy' && u.def === 'ringer')).toBe(true);
    expect(s.tiles.some((t) => t.piece?.id === 'foundry:bell' && t.state?.id === 'cloud')).toBe(
      true,
    );
  });
  test('the heart fixture is 7x9 with four hung bells and the tune listed', () => {
    const def = resolveScenario('foundry-heart').def;
    const s = withLabRules(scenarioBattle(def, { lab: true }), def.rules);
    expect([s.width, s.height]).toEqual([7, 9]);
    const hung = s.tiles.filter(
      (t) => t.piece?.id === 'foundry:greatBell' && (t.piece.data as { allied: boolean }).allied,
    );
    expect(hung).toHaveLength(4);
    expect(s.rules?.['foundry:tune']).toBeDefined();
    expect(s.units.some((u) => u.def === 'carillonneur')).toBe(true);
    expect(tileAt(s, { x: 0, y: 0 }).piece?.id).toBe('foundry:greatBell');
  });
  test('the tune-alone fixture has the Carillonneur and none of the staff', () => {
    const s = scenarioBattle(resolveScenario('foundry-peal').def, { lab: true });
    const defs = s.units.filter((u) => u.kind === 'enemy').map((u) => u.def);
    expect(defs).toEqual(['carillonneur']);
  });
});
