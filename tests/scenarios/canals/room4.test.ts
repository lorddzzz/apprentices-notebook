import { describe, expect, test } from 'vitest';
import { encountersOf } from '$data';
import { layRival } from '$data/districts/canals';
import {
  type BattleState,
  beginEncounter,
  type EnemyUnit,
  finishEncounter,
  type GameEvent,
  newProfile,
  type Profile,
  parseBoard,
  parseLabel,
  startTrip,
  type Trip,
  tileAt,
} from '$engine';
import { pagesHeld } from '$engine/rivals/pages';
import { act, cast, expectLogIncludes, withLattices } from '../harness';

/**
 * CN-7 (canals-revisit P6): room 4's elite is the Lamplighter, live since `RIVALS_LIVE`. The real
 * "lamp market" layout with its canal foes (eel, moth, rat) and the barge: his desired scene plays
 * (lantern laid, you herded onto it, a second lantern, the long wick), the crate is none the worse,
 * and winning the room banks his page (RV-15). The Snuffer fallback is data (`layRival(.., false)`).
 */

const endTurn = { type: 'endTurn' } as const;
const at = parseLabel;
const FOUR = encountersOf('canals')[3];
if (!FOUR) throw new Error('no room 4');
const MARKET = FOUR.variants.find((v) => v.name === 'The lamp market');
if (!MARKET) throw new Error('no lamp market');

/** The room's board with the start points swapped for the party at chosen cells. */
function seat(layout: string, cells: Record<string, string>): string {
  const rows = layout.split('\n').map((r) => r.split(' '));
  for (const r of rows) for (let i = 0; i < r.length; i++) if (r[i] === 'P') r[i] = '.';
  for (const [lbl, token] of Object.entries(cells)) {
    const c = at(lbl);
    const row = rows[c.y];
    if (row) row[c.x] = token + (row[c.x] ?? '.').replace(/^\./, '');
  }
  return rows.map((r) => r.join(' ')).join('\n');
}

const lamplighterOf = (s: BattleState): EnemyUnit => {
  const u = s.units.find((x): x is EnemyUnit => x.kind === 'enemy' && x.def === 'lamplighter');
  if (!u) throw new Error('no lamplighter');
  return u;
};
const hp = (s: BattleState, id: string) => s.units.find((u) => u.id === id)?.hp ?? 0;
const has = (events: readonly GameEvent[], type: GameEvent['type']) =>
  events.some((e) => e.type === type);

describe('room 4 with the Lamplighter live (P6)', () => {
  test('every layout spawns him, and no Snuffer; the barge and canal foes stay', () => {
    for (const v of FOUR.variants) {
      const defs = parseBoard(v.layout).units.map((u) => u.def);
      expect(
        defs.filter((d) => d === 'lamplighter'),
        v.name,
      ).toHaveLength(1);
      expect(defs, v.name).not.toContain('snuffer');
      expect(defs.sort(), v.name).toEqual(['barge', 'eel', 'lamplighter', 'moth', 'rat']);
    }
  });

  test('fallback: with the flag off the same layouts spawn the Snuffer in his slot', () => {
    for (const v of FOUR.variants) {
      const defs = parseBoard(layRival(v.layout, false)).units.map((u) => u.def);
      expect(defs, v.name).not.toContain('lamplighter');
      expect(defs.sort(), v.name).toEqual(['barge', 'eel', 'moth', 'rat', 'snuffer']);
    }
  });
});

describe('his desired scene on the lamp market', () => {
  // The party clears the moth and the rat in turn one (Strike up their columns); the eel stays.
  const ascii = seat(MARKET.layout, { F5: 'S', C5: 'D' });
  const start = () =>
    withLattices(
      ascii,
      { draughtsman: 'Bolt> Strike', stoker: 'Bolt> Strike' },
      { hp: { C5: 20, F5: 20 } },
    );

  test('lays a lantern, herds you onto it, lays another and opens it with the long wick', () => {
    let s = start();
    const events: GameEvent[] = [];
    const play = (r: { state: BattleState; events: GameEvent[] }) => {
      events.push(...r.events);
      s = r.state;
      return r;
    };
    expect(lamplighterOf(s).intent).toMatchObject({ kind: 'cast', spell: 'lantern' });

    // Turn 1: the moth and the rat fall; he lays his lantern at D6, clear of everyone.
    play(cast(s, 'stoker', 'up'));
    play(cast(s, 'draughtsman', 'up'));
    expect(s.units.filter((u) => u.kind === 'enemy' && u.hp > 0).map((u) => u.def)).toEqual([
      'lamplighter',
      'eel',
      'barge',
    ]);
    let r = play(act(s, endTurn));
    expectLogIncludes(r.events, ['lamplighter at D2 seals a jar at D6 (opens on a step)']);
    expect(tileAt(s, at('D6')).jar?.owner).toBe(lamplighterOf(s).id);

    // Turn 2: you step beside it, in his column; he lines up to herd you in.
    play(act(s, { type: 'move', unit: 'draughtsman', to: at('D5') }));
    r = play(act(s, endTurn));
    r = play(act(s, endTurn));
    expectLogIncludes(r.events, [
      'Draughtsman is pushed down to D6',
      'the jar at D6 opens under Draughtsman',
    ]);

    // The jar is spent, so he lays another under you, then shows and uses the long wick.
    expect(lamplighterOf(s).intent).toMatchObject({ kind: 'cast', spell: 'lantern' });
    r = play(act(s, endTurn));
    expectLogIncludes(r.events, ['lamplighter at D2 seals a jar at D6 (opens on a step)']);
    expect(lamplighterOf(s).intent).toMatchObject({ kind: 'trick', trick: 'canals:longWick' });
    const before = hp(s, 'draughtsman');
    r = play(act(s, endTurn));
    expectLogIncludes(r.events, ['lamplighter at D2 uses the long wick']);
    expect(has(r.events, 'jarOpened')).toBe(true);
    expect(hp(s, 'draughtsman')).toBeLessThan(before);

    // The crate floated through all of it and was never ruined.
    expect(has(events, 'cargoLost')).toBe(false);
    expect(hp(s, 'barge-1')).toBe(1);
  });
});

describe('winning the room banks his page (RV-15)', () => {
  const profile = (): Profile => {
    const p = newProfile();
    return { ...p, city: { ...p.city, heard: ['seam', 'canals'], open: ['seam', 'canals'] } };
  };
  /** A trip standing in room 4 (index 3), fight pending. */
  const roomFour = (p: Profile): Trip => ({
    ...startTrip(p, 7, 'canals'),
    encounter: 3,
  });
  const over = (b: BattleState, phase: 'won' | 'lost'): BattleState => {
    const s = structuredClone(b);
    s.phase = phase;
    for (const u of s.units) {
      if (phase === 'won' && u.kind === 'enemy') u.hp = 0;
      if (phase === 'lost' && u.kind === 'member') u.hp = 0;
    }
    return s;
  };

  test('the room as shipped spawns him; a win banks the page once, a wipe nothing', () => {
    const p = profile();
    const t = roomFour(p);
    const fight = beginEncounter(p, t).state;
    expect(lamplighterOf(fight).rival).toBeDefined();
    expect(fight.units.some((u) => u.kind === 'enemy' && u.def === 'snuffer')).toBe(false);

    const won = finishEncounter(p, t, over(fight, 'won'));
    expect(won.outcome).toBe('won');
    expect(pagesHeld(won.profile)).toEqual(['lamplighter:lantern']);

    const lost = finishEncounter(p, t, over(fight, 'lost'));
    expect(lost.outcome).toBe('wiped');
    expect(pagesHeld(lost.profile)).toEqual([]);
  });
});
