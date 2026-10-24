import { describe, expect, test } from 'vitest';
import type { BattleState, EventLog, GameEvent, RivalIntent } from '$engine';
import { pointLines, rivalCasters } from '$engine/footnotes';
import { idiomPre, idiomsIn } from '$engine/idioms';
import { masksFrom } from '$engine/proof';
import { householdLog, isRivalEvent, rivalIds } from '$engine/rivals/credit';
import { act, board, cast, withLattices } from '../scenarios/harness';

/**
 * Rival cast credit (rivals §3, RV-16): what a rival's cast earns the household. Credit follows
 * the originating cast, so the same Bolt, Jar, Oil, Spark chain earns an idiom, proof and points
 * from an apprentice and nothing from the Lamplighter.
 */

const endTurn = { type: 'endTurn' } as const;
const CHAIN = 'Bolt> Jar Oil Spark';
const lantern: RivalIntent = {
  kind: 'cast',
  spell: 'lantern',
  aim: { kind: 'dir', dir: 'right' },
  fallback: null,
  order: 1,
};
// He lays the lantern on the current at C1; it drifts back to him and opens under him.
const RIVAL_BOARD = 'Lw< w< w<\n. . .\n. . D';
const rivalScene = () => board(RIVAL_BOARD, { pins: { A1: lantern } });

const idioms = (events: EventLog): string[] =>
  events.flatMap((e) => (e.type === 'named' && e.what === 'idiom' ? [e.id] : []));

/** Plays endTurns, letting the rival's pinned cast run once (afterwards he idles). */
function fight(
  s: BattleState,
  turns: number,
  keepPin = false,
): { events: GameEvent[]; state: BattleState } {
  const events: GameEvent[] = [];
  let state = s;
  for (let i = 0; i < turns; i++) {
    const r = act(state, endTurn);
    events.push(...r.events);
    state = structuredClone(r.state);
    for (const u of state.units) {
      if (keepPin || u.kind !== 'enemy' || !u.rival) continue;
      delete u.rival.pinned;
      u.intent = null;
    }
  }
  return { events, state };
}

describe('the Lamplighter’s Bolt, Jar, Oil, Spark chain', () => {
  test('earns the household no idiom, no proof and no points', () => {
    const r = fight(rivalScene(), 2);
    expect(r.events.some((e) => e.type === 'jarOpened')).toBe(true);
    expect(idioms(r.events)).toEqual([]);
    expect(r.state.named.filter((n) => n.startsWith('idiom:'))).toEqual([]);
    expect(masksFrom(r.events, 'draughtsman')).toEqual([]);
    expect(masksFrom(r.events, 'stoker')).toEqual([]);
    expect(pointLines(r.events, rivalCasters(r.state))).toEqual([]);
  });

  test('still reveals: the burst it sets off is named and its lines fire', () => {
    const r = fight(rivalScene(), 2);
    expect(r.events.some((e) => e.type === 'named' && e.what === 'burst')).toBe(true);
    expect(r.events.some((e) => e.line)).toBe(true);
  });

  test('the same chain by an apprentice earns the idiom, proof and points', () => {
    const s = withLattices('dw< w< w<\n. . .\n. . D', { draughtsman: CHAIN });
    const first = cast(s, 'draughtsman', 'up');
    const rest = fight(first.state, 2);
    const events = [...first.events, ...rest.events];
    expect(idioms(events)).toContain('lanternWalk');
    expect(rest.state.named).toContain('idiom:lanternWalk');
    expect(masksFrom(events, 'draughtsman').length).toBeGreaterThan(0);
    expect(pointLines(events, rivalCasters(rest.state)).length).toBeGreaterThan(0);
  });
});

describe('credit by origin', () => {
  test('a rival’s events are told apart from the household’s', () => {
    const s = rivalScene();
    const ids = rivalIds(s);
    expect([...ids]).toHaveLength(1);
    const r = fight(s, 1);
    const sealed = r.events.find((e) => e.type === 'jarSealed');
    expect(sealed && isRivalEvent(sealed, ids)).toBe(true);
    expect(householdLog(r.events, ids).some((e) => e.type === 'jarSealed')).toBe(false);
  });

  test('a rival’s events in the same log do not shadow an apprentice’s idiom', () => {
    const s = withLattices('dw< w< w<\n. . .\n. . D', { draughtsman: CHAIN });
    const first = cast(s, 'draughtsman', 'up');
    const rival = fight(rivalScene(), 2);
    const pre = idiomPre(first.state);
    const mixed = [...rival.events, ...first.events, ...fight(first.state, 2).events];
    expect(idiomsIn(mixed, pre, first.state).map((h) => h.id)).toContain('lanternWalk');
    // Only his events: nothing, even though the pattern is all there.
    expect(idiomsIn(rival.events, idiomPre(rivalScene()), rival.state)).toEqual([]);
  });

  test('a jar an apprentice laid that opens under the rival is the apprentice’s idiom', () => {
    // He only swings at the wall; the current brings her lantern to him.
    const idle: RivalIntent = { kind: 'rivalStrike', dir: 'up', order: 1 };
    const s = withLattices(
      'Lw< w< w<\n. . .\n. . D',
      { draughtsman: CHAIN },
      { pins: { A1: idle } },
    );
    const first = cast(s, 'draughtsman', 'up');
    const events = [...first.events, ...fight(first.state, 2, true).events];
    expect(events.find((e) => e.type === 'jarOpened')?.origin?.caster).toBe('draughtsman');
    expect(idioms(events)).toContain('lanternWalk');
  });
});
