import { describe, expect, it } from 'vitest';
import { type Action, type BattleState, memberById } from '$engine';
import { basicDirs } from '$engine/basicActions';
import { applyAction } from '$engine/battle';
import { tileAt } from '$engine/queries';
import { roundEnd } from '$engine/turn';
import { act, board, cast, draft, withLattices } from '../../scenarios/harness';
import {
  bellsOf,
  damageTo,
  dataOf,
  ev,
  hums,
  ringBells,
  ringTones,
  struckAt,
  unit,
} from './helpers';

/**
 * BF-3 acceptance (foundry-plan §2 P2, P3, P5; BF-T2). One test per settled rule; each is
 * `it.fails` until BF-3 builds the strike, the ring queue, the hum and the pulses, and the marker
 * comes off with it. Bell notation: `{bell:low|mid|high}`; a muffled bell is `~{bell:…}` (a cloud
 * on its tile). Rats have 2 HP, sentries `b` 5, the Draughtsman and the Stoker 6.
 */

const BOLT = { draughtsman: 'Bolt> Strike' } as const;
const TWO = { draughtsman: 'Bolt> Strike', stoker: 'Bolt> Strike' } as const;
const SHOVER = { kits: { draughtsman: { action: 'shove' as const } } };

describe('BF-3 strike sources (P2)', () => {
  it.fails('BF-3: a Bolt stopped by a bell strikes it and every bell of its tone rings', () => {
    const s = withLattices('D . {bell:mid} . {bell:mid}', BOLT);
    const r = cast(s, 'draughtsman', 'right');
    expect(struckAt(r.events, 2, 0)).toHaveLength(1);
    expect(dataOf(struckAt(r.events, 2, 0)[0])).toMatchObject({ tone: 'mid' });
    const rings = ev(r.events, 'foundry:ring');
    expect(rings).toHaveLength(1);
    expect(dataOf(rings[0])).toMatchObject({ tone: 'mid', cause: 'strike' });
    expect(ringBells(rings[0])).toEqual(['2,0', '4,0']);
  });

  it.fails('BF-3: a basic Shove at a bell is legal, strikes it and moves nothing', () => {
    const s = board('D {bell:low} . {bell:low}', SHOVER);
    expect(basicDirs(s, 'draughtsman')).toContain('right');
    const r = act(s, { type: 'shove', unit: 'draughtsman', dir: 'right' });
    expect(dataOf(struckAt(r.events, 1, 0)[0])).toMatchObject({ by: 'shove', tone: 'low' });
    expect(ringTones(r.events)).toEqual(['low']);
    expect(tileAt(r.state, { x: 1, y: 0 }).piece?.id).toBe('foundry:bell');
  });

  it.fails('BF-3: a unit pushed into a bell strikes it', () => {
    const s = withLattices('D r {bell:high} . .', { draughtsman: 'Bolt> Shove' });
    const r = cast(s, 'draughtsman', 'right');
    expect(dataOf(struckAt(r.events, 2, 0)[0])).toMatchObject({ by: 'push', tone: 'high' });
    expect(ringTones(r.events)).toEqual(['high']);
  });

  it.fails('BF-3: a Spark landing on a bell strikes it', () => {
    const s = withLattices('D . {bell:low} r', { draughtsman: 'Splash> Spark' });
    const r = cast(s, 'draughtsman', { kind: 'tile', at: { x: 2, y: 0 } });
    expect(dataOf(struckAt(r.events, 2, 0)[0])).toMatchObject({ by: 'spark', tone: 'low' });
    expect(ringTones(r.events)).toEqual(['low']);
  });

  it.fails('BF-3: a foe projectile that stops at a bell strikes it', () => {
    const s = board('b . {bell:low} D', { intents: { A1: 'right' } });
    const r = act(s, { type: 'endTurn' });
    expect(struckAt(r.events, 2, 0)).toHaveLength(1);
    expect(ringTones(r.events)).toEqual(['low']);
  });

  it.fails('BF-3: kinds, Pull, Hop and Swap are not strikes', () => {
    const at = { kind: 'tile', at: { x: 2, y: 0 } } as const;
    const ascii = 'D . {bell:low} r';
    // Control: a Spark does strike this bell.
    const spark = cast(withLattices(ascii, { draughtsman: 'Splash> Spark' }), 'draughtsman', at);
    expect(struckAt(spark.events, 2, 0)).toHaveLength(1);
    for (const kind of ['Oil', 'Ink', 'Steam']) {
      const r = cast(withLattices(ascii, { draughtsman: `Splash> ${kind}` }), 'draughtsman', at);
      expect(ev(r.events, 'foundry:bellStruck'), kind).toHaveLength(0);
    }
    for (const action of ['pull', 'hop', 'swap'] as const) {
      const s = board(ascii, { kits: { draughtsman: { action } } });
      expect(basicDirs(s, 'draughtsman'), action).not.toContain('right');
    }
  });

  it.todo('BF-3: the preview shows the tiles a tone would pulse');
});

describe('BF-3 the ring and the hum (P3)', () => {
  it.fails('BF-3: a tone rings once per round, hums, and the hum clears at round end', () => {
    const s = withLattices('D . {bell:low} . {bell:low} . S', TWO);
    const a = cast(s, 'draughtsman', 'right');
    expect(ringTones(a.events)).toEqual(['low']);
    expect(hums(a.state)).toEqual(['low']);
    expect(bellsOf(a.state).struck['2,0']).toEqual(['draughtsman']);
    const b = cast(a.state, 'stoker', 'left');
    expect(struckAt(b.events, 4, 0)).toHaveLength(1); // struck, but the tone has rung
    expect(ev(b.events, 'foundry:ring')).toHaveLength(0);
    const dusk = draft(b.state, (ctx) => roundEnd(ctx));
    expect(hums(dusk.state)).toEqual([]);
    expect(bellsOf(dusk.state).struck).toEqual({});
    expect(ev(dusk.events, 'foundry:hum').map((e) => dataOf(e))).toContainEqual({
      tone: 'low',
      on: false,
    });
  });

  it.fails('BF-3: a unit beside two bells of the ringing tone is hit once', () => {
    const s = withLattices('D . {bell:low} r .\n. . . {bell:low} .', BOLT);
    const r = cast(s, 'draughtsman', 'right');
    const rat = unit(s, 'rat-1');
    expect(damageTo(r.events, rat.id)).toHaveLength(1);
    const after = unit(r.state, rat.id);
    expect(after.hp).toBe(rat.hp - 1);
    expect(after.pos).toEqual({ x: 4, y: 0 }); // pushed away from the first bell in reading order
  });

  it.fails('BF-3: a chain low to mid to high rings each tone once and ends', () => {
    const s = withLattices('D . {bell:low} r {bell:mid} r {bell:high} .', BOLT);
    const r = cast(s, 'draughtsman', 'right');
    expect(ringTones(r.events)).toEqual(['low', 'mid', 'high']);
    expect(ev(r.events, 'foundry:hum').filter((e) => dataOf(e).on === true)).toHaveLength(3);
    expect(hums(r.state)).toEqual(['low', 'mid', 'high']);
  });

  it.fails('BF-3: a pulse that strikes a bell of a humming tone does not ring it again', () => {
    const s = withLattices('D . {bell:low} b {bell:mid} b {bell:low}', BOLT);
    const r = cast(s, 'draughtsman', 'right');
    expect(ringTones(r.events)).toEqual(['low', 'mid']);
    const lowStrikes = ev(r.events, 'foundry:bellStruck').filter((e) => dataOf(e).tone === 'low');
    expect(lowStrikes.length).toBeGreaterThan(1); // the mid pulse pushed foes into low bells
  });

  it.fails('BF-3: a muffled bell is struck but silent, and joins no ring', () => {
    const s = withLattices('D . ~{bell:low} . {bell:low} . S', {
      draughtsman: 'Bolt> Spark',
      stoker: 'Bolt> Strike',
    });
    const a = cast(s, 'draughtsman', 'right');
    expect(struckAt(a.events, 2, 0)).toHaveLength(1);
    expect(ev(a.events, 'foundry:muffled')).toHaveLength(1);
    expect(ev(a.events, 'foundry:ring')).toHaveLength(0);
    const b = cast(a.state, 'stoker', 'left');
    expect(ringBells(ev(b.events, 'foundry:ring')[0])).toEqual(['4,0']);
  });
});

describe('BF-3 pulses (P1, P5)', () => {
  const ASCII = ['. . . . .', '. . r . .', 'D . {bell:low} r .', '. . S . .', '. . . . .'].join(
    '\n',
  );

  it.fails('BF-3: a pulse hurts every unit beside the bell, damage then push, credited to the striker', () => {
    const s = withLattices(ASCII, BOLT);
    const r = cast(s, 'draughtsman', 'right');
    const moved = [
      ['rat-1', { x: 2, y: 0 }],
      ['rat-2', { x: 4, y: 2 }],
      ['stoker', { x: 2, y: 4 }],
    ] as const;
    for (const [id, to] of moved) {
      const before = unit(s, id);
      const after = unit(r.state, id);
      expect(after.hp, id).toBe(before.hp - 1);
      expect(after.pos, id).toEqual(to);
      const hit = damageTo(r.events, id);
      expect(hit, id).toHaveLength(1);
      expect(hit[0]?.origin, id).toMatchObject({ caster: 'draughtsman' });
      const iDamage = r.events.indexOf(hit[0] as never);
      const iPush = r.events.findIndex((e) => e.type === 'push' && e.unit.id === id);
      expect(iPush, id).toBeGreaterThan(iDamage);
    }
    expect(unit(r.state, 'draughtsman').hp).toBe(unit(s, 'draughtsman').hp); // not beside it
  });
});

describe('BF-3 event cap', () => {
  it.fails('BF-3: applyAction passes eventCap to the draft', () => {
    const run = applyAction as unknown as (
      s: BattleState,
      a: Action,
      footnotes: object,
      eventCap: number,
    ) => { events: { type: string; reason?: string }[] };
    const s = withLattices('D . {bell:low} r . {bell:low}', BOLT);
    const spell = memberById(s, 'draughtsman').spells[0]?.key ?? '';
    const action: Action = {
      type: 'cast',
      unit: 'draughtsman',
      spell,
      aim: { kind: 'dir', dir: 'right' },
    };
    expect(run(s, action, {}, 3).events.at(-1)).toMatchObject({ type: 'fizzles', reason: 'cap' });
    expect(run(s, action, {}, 10_000).events.some((e) => e.type === 'fizzles')).toBe(false);
  });
});
