import { describe, expect, test } from 'vitest';
import {
  applyAction,
  type BattleState,
  beginEncounter,
  closeBattle,
  finishEncounter,
  firedLines,
  footnoteLevel,
  type GameEvent,
  memberById,
  newProfile,
  type Profile,
  startTrip,
  type Trip,
  witnessedIn,
} from '$engine';

const SEED = 12345;
const unit = { id: 'rat-1', name: 'rat', at: { x: 0, y: 0 }, member: false };

/** An event stamped with a fine-print line, as the engine does. */
const stamped = (line: GameEvent['line']): GameEvent => ({ type: 'held', unit, line });

const over = (b: BattleState, phase: 'won' | 'lost'): BattleState => ({
  ...b,
  phase,
  units: b.units.map((u) => {
    if (phase === 'won' && u.kind === 'enemy') return { ...u, hp: 0 };
    if (phase === 'lost' && u.kind === 'member') return { ...u, hp: 0 };
    return u;
  }),
});

/** The Stoker's real first cast (Bolt, Oil, Spark up an empty column) and the log it leaves. */
function realFight(p: Profile, t: Trip) {
  const start = beginEncounter(p, t);
  const spell = memberById(start.state, 'stoker').spells[0];
  if (!spell) throw new Error('the Stoker has no spell');
  const r = applyAction(start.state, {
    type: 'cast',
    unit: 'stoker',
    spell: spell.key,
    aim: { kind: 'dir', dir: 'up' },
  });
  return { state: r.state, log: [...start.events, ...r.events] };
}

describe('what a fight banks (D4, D7, P37, P39)', () => {
  test('a won fight banks its witnessed lines, what it met, and a point per known rune', () => {
    const p = newProfile();
    const t = startTrip(p, SEED);
    const { state, log } = realFight(p, t);
    const r = finishEncounter(p, t, over(state, 'won'), log);
    expect(r.profile.witnessed).toEqual(witnessedIn(log));
    expect(r.profile.witnessed).toContain('spark:slick');
    expect(r.profile.footnotes.spark?.points).toBe(1);
    expect(r.profile.foesMet).toEqual(['rat']);
    expect(r.profile.met).toEqual(expect.arrayContaining(['minion', 'slick']));
    expect(p.witnessed).toEqual([]); // the input is untouched
  });

  test('a wipe banks all of it too (loot is lost, knowledge is not)', () => {
    const p = newProfile();
    const t = startTrip(p, SEED);
    const { state, log } = realFight(p, t);
    const r = finishEncounter(p, t, over(state, 'lost'), log);
    expect(r.outcome).toBe('wiped');
    expect(r.trip).toBeNull();
    expect(r.profile.witnessed).toContain('spark:slick');
    expect(r.profile.footnotes.spark?.points).toBe(1);
    expect(r.profile.foesMet).toEqual(['rat']);
  });

  test('closeBattle (the trip path) banks them as well', () => {
    const p = newProfile();
    const t = startTrip(p, SEED);
    const { state, log } = realFight(p, t);
    const r = closeBattle(p, t, over(state, 'won'), log);
    expect(r.profile.witnessed).toContain('spark:slick');
    expect(r.profile.footnotes.spark?.points).toBe(1);
  });

  test('witnessed lines and met things stay unique across fights, in first-seen order', () => {
    const p = newProfile();
    const t = startTrip(p, SEED);
    const { state, log } = realFight(p, t);
    const once = finishEncounter(p, t, over(state, 'won'), log).profile;
    const twice = finishEncounter(once, t, over(state, 'won'), log).profile;
    expect(twice.witnessed).toEqual(once.witnessed);
    expect(twice.met).toEqual(once.met);
    expect(twice.foesMet).toEqual(once.foesMet);
    expect(twice.footnotes.spark?.points).toBe(2); // points do add up
  });
});

describe('footnote points on a trip (P39)', () => {
  test('a run of events with one line is one firing; the line again later is another', () => {
    const log = [
      stamped('shove:wall'),
      stamped('shove:wall'),
      stamped('spark:slick'),
      stamped('shove:wall'),
    ];
    expect(firedLines(log)).toEqual(['shove:wall', 'spark:slick', 'shove:wall']);
    expect(witnessedIn(log)).toEqual(['shove:wall', 'spark:slick']);
  });

  test('only known runes earn points, and levels follow 5 / 15 / 40', () => {
    const p = newProfile();
    const t = startTrip(p, SEED);
    const b = over(beginEncounter(p, t).state, 'won');
    const log: GameEvent[] = [];
    for (let i = 0; i < 5; i++) log.push(stamped('shove:wall'), stamped('spark:slick'));
    log.push(stamped('splash:unit')); // Splash is not known yet
    const r = finishEncounter(p, t, b, log);
    expect(r.profile.footnotes.shove?.points).toBe(5);
    expect(r.profile.footnotes.spark?.points).toBe(5);
    expect(r.profile.footnotes.splash).toBeUndefined();
    expect(r.profile.witnessed).toContain('splash:unit'); // seen, even if not yet earning
    expect(footnoteLevel(r.profile, 'shove')).toBe(1);
    expect(footnoteLevel(r.profile, 'bolt')).toBe(0);
  });
});
