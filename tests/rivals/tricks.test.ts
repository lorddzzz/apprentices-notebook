import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { RIVALS, type RivalDef } from '$data/rivals';
import {
  type BattleState,
  type Coord,
  type EnemyUnit,
  type GameEvent,
  describeLog,
  parseLabel,
  tileAt,
} from '$engine';
import { cloneData } from '$engine/clone';
import type { Ctx } from '$engine/ctx';
import { dealDamage, kill } from '$engine/damage';
import { KIT } from '$engine/districts/kit';
import type { Json } from '$engine/districts/types';
import type { Harm } from '$engine/harm';
import { applyMark } from '$engine/marks';
import { push } from '$engine/push';
import { resolveRivalIntent } from '$engine/rivals/resolve';
import {
  coreTricks,
  isTrickEvent,
  makeTrickObject,
  objectLock,
  planTrickMark,
  removeTrickObject,
  runTrickMarks,
  trickOf,
  trickTable,
} from '$engine/rivals/tricks';
import type {
  MarkTiming,
  Resistance,
  TrickDef,
  TrickHarmReaction,
  TrickMark,
} from '$engine/rivals/types';
import { LONG_WICK } from '$engine/rivals/wick';
import { endTurnAction, roundEnd } from '$engine/turn';
import type { RivalIntent } from '$engine/types';
import { board, cast, draft, withLattices } from '../scenarios/harness';

/** RV-11: the trick hook points (rivals plan P10), each driven by a fixture trick. */

const at = (lbl: string): Coord => parseLabel(lbl);
const FIX = 'canals:fixtureTrick' as const;
const FIX_RIVAL = 'fixtureRival';

/** What the fixture trick does; each test sets the parts it needs. */
interface Cfg {
  timing: MarkTiming;
  mark: TrickMark | null;
  reaction: TrickHarmReaction;
  resists: readonly Resistance[];
  slot: 'carry' | 'afterChemistry' | 'late';
}
const cfg: Cfg = {
  timing: 'beforeActions',
  mark: null,
  reaction: { kind: 'pass' },
  resists: [],
  slot: 'late',
};
const seen: { harm: Harm[] } = { harm: [] };
const count = (own: Json, key: string): Json => {
  const o = own && typeof own === 'object' && !Array.isArray(own) ? own : {};
  const n = (o as Record<string, Json>)[key];
  return { ...o, [key]: (typeof n === 'number' ? n : 0) + 1 };
};

const FIXTURE: TrickDef = {
  id: FIX,
  name: 'the fixture trick',
  init: () => ({}),
  action: {
    plan: () => [],
    resolve: (ctx, unit, _intent, own) => {
      dealDamage(ctx, unit, 0, 'fixture'); // a gameplay effect, so the action is not starved
      return count(own, 'resolved');
    },
  },
  mark: {
    get timing() {
      return cfg.timing;
    },
    plan: () => cfg.mark,
    resolve: (ctx, unit, _mark, own) => {
      ctx.log.push({
        type: 'idle',
        unit: { id: unit.id, name: 'mark', at: unit.pos, member: false },
      });
      return count(own, 'marks');
    },
  },
  beforeHarm(_ctx, _unit, harm) {
    seen.harm.push(harm);
    return cfg.reaction;
  },
  resists: (_s, _u, what) => cfg.resists.includes(what),
  roundEnd: {
    get slot() {
      return cfg.slot;
    },
    step: (_ctx, _unit, own) => count(own, 'roundEnds'),
  },
  onDeath: (_ctx, _unit, own) => count(own, 'died'),
  draw: () => ({ label: 'fixture', tiles: [], units: [] }),
  describe: () => 'does the fixture thing',
};

const rivals = RIVALS as Record<string, RivalDef>;
const LAMPLIGHTER = ((): RivalDef => {
  const def = RIVALS.lamplighter;
  if (!def) throw new Error('no Lamplighter');
  return def;
})();
beforeAll(() => {
  trickTable()[FIX] = FIXTURE;
  rivals[FIX_RIVAL] = { ...LAMPLIGHTER, id: FIX_RIVAL as RivalDef['id'], trick: FIX };
});
afterAll(() => {
  delete trickTable()[FIX];
  delete rivals[FIX_RIVAL];
});
beforeEach(() => {
  cfg.timing = 'beforeActions';
  cfg.mark = null;
  cfg.reaction = { kind: 'pass' };
  cfg.resists = [];
  cfg.slot = 'late';
  seen.harm = [];
});

const rivalOf = (s: BattleState): EnemyUnit => {
  const u = s.units.find((x): x is EnemyUnit => x.kind === 'enemy' && !!x.rival);
  if (!u?.rival) throw new Error('no rival');
  return u;
};
/** The board's rival, switched to the fixture trick (state `{}`). */
function fixture(s: BattleState): BattleState {
  const c = cloneData(s);
  const r = rivalOf(c).rival;
  if (!r) throw new Error('no rival');
  r.rival = FIX_RIVAL as RivalDef['id'];
  r.trick = {};
  return c;
}
const own = (s: BattleState): Record<string, Json> =>
  rivalOf(s).rival?.trick as Record<string, Json>;
const ofType = (events: readonly GameEvent[], type: string) =>
  events.filter((e) => e.type === type);
type TrickIntent = Extract<RivalIntent, { kind: 'trick' }>;
const trickIntent = (lock: TrickIntent['lock']): TrickIntent => ({
  kind: 'trick',
  trick: FIX,
  lock,
  data: {},
  fallback: null,
  order: 1,
});

describe('registry', () => {
  test('the long wick is registered through the canals module (RV-14)', () => {
    expect(coreTricks()).toEqual([]);
    expect(KIT.modules.canals?.tricks).toContain(LONG_WICK);
    expect(LONG_WICK.action).toBeDefined();
    expect(trickOf('canals:longWick')).toBe(LONG_WICK);
    expect(trickOf('canals:nothing')).toBeNull();
  });
});

describe('action trick and trick-owned objects', () => {
  const start = () => fixture(board('. . .\n. L .\n. . .'));

  test('a live locked object lets the trick resolve and keeps its returned state', () => {
    const r = draft(start(), (ctx) => {
      const e = rivalOf(ctx.s);
      const id = makeTrickObject(ctx, e, at('A1'), { note: 'C' });
      ctx.log.push({ type: 'phase', phase: 'resolve' }); // made in an earlier phase
      resolveRivalIntent(ctx, e, trickIntent({ kind: 'trick', id }));
    });
    expect(ofType(r.events, 'trickUsed')).toHaveLength(1);
    expect(ofType(r.events, 'orderFails')).toHaveLength(0);
    expect(own(r.state).resolved).toBe(1);
    expect(rivalOf(r.state).rival?.objects).toEqual([
      { id: 1, trick: FIX, owner: rivalOf(r.state).id, at: at('A1'), data: { note: 'C' } },
    ]);
  });

  test('ids are battle-unique and never reused', () => {
    draft(start(), (ctx) => {
      const e = rivalOf(ctx.s);
      const a = makeTrickObject(ctx, e, null, null);
      removeTrickObject(ctx, a, 'erased');
      const b = makeTrickObject(ctx, e, null, null);
      expect(b).toBeGreaterThan(a);
      expect(objectLock(ctx.s, e.id, { kind: 'trick', id: a })).toEqual({ ok: false, why: 'gone' });
      expect(objectLock(ctx.s, e.id, { kind: 'trick', id: b })).toEqual({ ok: true, at: null });
      expect(objectLock(ctx.s, 'someone', { kind: 'trick', id: b })).toEqual({
        ok: false,
        why: 'ownerChanged',
      });
    });
  });

  test('FU-2: a lock fails as spent when its charge is gone and met when its goal is reached', () => {
    const r = draft(start(), (ctx) => {
      const e = rivalOf(ctx.s);
      const a = makeTrickObject(ctx, e, at('A1'), null);
      const b = makeTrickObject(ctx, e, at('B1'), null);
      removeTrickObject(ctx, a, 'spent');
      removeTrickObject(ctx, b, 'met');
      expect(objectLock(ctx.s, e.id, { kind: 'trick', id: a })).toEqual({ ok: false, why: 'spent' });
      expect(objectLock(ctx.s, e.id, { kind: 'trick', id: b })).toEqual({ ok: false, why: 'met' });
      ctx.log.push({ type: 'phase', phase: 'resolve' });
      resolveRivalIntent(ctx, e, trickIntent({ kind: 'trick', id: a }));
      resolveRivalIntent(ctx, e, trickIntent({ kind: 'trick', id: b }));
    });
    const fails = ofType(r.events, 'orderFails');
    expect(fails).toMatchObject([{ why: 'spent' }, { why: 'met' }]);
    expect(describeLog(r.events).join('\n')).toMatch(/object is spent[\s\S]*object is already met/);
  });

  test('a lost object fails the order with no resolve (starved: the fallback strike)', () => {
    const s = fixture(board('. . .\n. L D\n. . .'));
    const r = draft(s, (ctx) => {
      const e = rivalOf(ctx.s);
      const id = makeTrickObject(ctx, e, at('A1'), null);
      removeTrickObject(ctx, id, 'erased');
      ctx.log.push({ type: 'phase', phase: 'resolve' });
      resolveRivalIntent(ctx, e, { ...trickIntent({ kind: 'trick', id }), fallback: at('C2') });
    });
    expect(ofType(r.events, 'orderFails')).toMatchObject([{ why: 'gone' }]);
    expect(ofType(r.events, 'fallbackStrike')).toHaveLength(1);
    expect(own(r.state).resolved).toBeUndefined();
  });

  test('an object made this resolve phase cannot be used until next turn', () => {
    const r = draft(start(), (ctx) => {
      const e = rivalOf(ctx.s);
      ctx.log.push({ type: 'phase', phase: 'resolve' });
      const id = makeTrickObject(ctx, e, at('A1'), null);
      resolveRivalIntent(ctx, e, trickIntent({ kind: 'trick', id }));
    });
    expect(ofType(r.events, 'orderFails')).toMatchObject([{ why: 'gone' }]);
    expect(r.events.some((e) => isTrickEvent(e, 'trickObject'))).toBe(true);
  });

  test('trick state, objects and the shown mark are plain serialisable data', () => {
    cfg.mark = { data: { note: 2 }, tiles: [at('A1')] };
    const r = draft(start(), (ctx) => {
      const e = rivalOf(ctx.s);
      makeTrickObject(ctx, e, at('C3'), { n: 1 });
      planTrickMark(ctx, e);
    });
    const r0 = rivalOf(r.state).rival;
    expect(JSON.parse(JSON.stringify(r0))).toEqual(r0);
    expect(cloneData(r0)).toEqual(r0);
  });
});

describe('per-round mark with its timing slot', () => {
  const start = () => fixture(board('. . .\n. L .\n. . D'));

  test('it is shown when planned and spent when it resolves', () => {
    cfg.mark = { data: { note: 1 }, tiles: [at('A1')] };
    const r = draft(start(), (ctx) => {
      planTrickMark(ctx, rivalOf(ctx.s));
      expect(rivalOf(ctx.s).rival?.mark).toEqual(cfg.mark);
      runTrickMarks(ctx, 'afterActions'); // not its slot
      expect(rivalOf(ctx.s).rival?.mark).not.toBeNull();
      runTrickMarks(ctx, 'beforeActions');
    });
    expect(r.events.filter((e) => isTrickEvent(e, 'trickMark'))).toMatchObject([
      {
        type: 'canals:trickMark',
        data: { trick: FIX, timing: 'beforeActions', mark: { note: 1 } },
      },
    ]);
    expect(r.events.filter((e) => isTrickEvent(e, 'trickMarkUsed'))).toHaveLength(1);
    expect(own(r.state).marks).toBe(1);
    expect(rivalOf(r.state).rival?.mark).toBeNull();
  });

  test.each(['beforeActions', 'afterActions'] as const)(
    'at end of turn it resolves %s, around the enemy actions',
    (timing) => {
      cfg.timing = timing;
      cfg.mark = { data: null, tiles: [] };
      const s = start();
      const pin: RivalIntent = { kind: 'rivalStrike', dir: 'down', order: 1 };
      const r = draft(s, (ctx) => {
        const e = rivalOf(ctx.s);
        e.intent = pin;
        planTrickMark(ctx, e);
        endTurnAction(ctx);
      });
      const used = r.events.findIndex((e) => isTrickEvent(e, 'trickMarkUsed'));
      const attack = r.events.findIndex((e) => e.type === 'attack');
      expect(used).toBeGreaterThan(-1);
      expect(attack).toBeGreaterThan(-1);
      expect(timing === 'beforeActions' ? used < attack : used > attack).toBe(true);
      // It is planned again for the next round in the enemy phase, and shown.
      expect(r.events.filter((e) => isTrickEvent(e, 'trickMark')).length).toBe(2);
    },
  );

  test('a dead rival’s mark lapses with him', () => {
    cfg.mark = { data: null, tiles: [] };
    const r = draft(start(), (ctx) => {
      const e = rivalOf(ctx.s);
      planTrickMark(ctx, e);
      e.hp = 0;
      kill(ctx, e);
      runTrickMarks(ctx, 'beforeActions');
    });
    expect(r.events.filter((e) => isTrickEvent(e, 'trickMarkUsed'))).toHaveLength(0);
    expect(own(r.state).died).toBe(1); // onDeath ran
  });
});

describe('beforeHarm reaction', () => {
  const start = () => fixture(board('. . .\n. L .\n. . .'));

  test('relocates through the arrival pipeline and the hit does not land', () => {
    cfg.reaction = { kind: 'relocate', to: at('A1'), cause: 'hop' };
    const r = draft(start(), (ctx) => {
      dealDamage(ctx, rivalOf(ctx.s), 3, 'Spark');
    });
    const e = rivalOf(r.state);
    expect(e.hp).toBe(LAMPLIGHTER.hp);
    expect(e.pos).toEqual(at('A1'));
    expect(r.events.map((x) => x.type)).toEqual(['unharmed', 'moved']);
    expect(r.events[1]).toMatchObject({ from: at('B2'), to: at('A1'), cause: 'hop' });
    expect(seen.harm).toMatchObject([{ kind: 'hit', amount: 3, source: 'Spark' }]);
  });

  test('a hit while relocating (fire where he lands) is not answered again', () => {
    cfg.reaction = { kind: 'relocate', to: at('A1'), cause: 'hop' };
    const s = start();
    tileAt(s, at('A1')).state = { id: 'fire', rounds: 2, origin: null };
    const r = draft(s, (ctx) => {
      dealDamage(ctx, rivalOf(ctx.s), 3, 'Spark');
    });
    expect(rivalOf(r.state).pos).toEqual(at('A1'));
    expect(seen.harm).toHaveLength(1);
  });

  test('to a tile he cannot stand on, the hit lands', () => {
    cfg.reaction = { kind: 'relocate', to: at('A1'), cause: 'hop' };
    const s = fixture(board('D . .\n. L .\n. . .'));
    const r = draft(s, (ctx) => {
      dealDamage(ctx, rivalOf(ctx.s), 2, 'Spark');
    });
    expect(rivalOf(r.state).pos).toEqual(at('B2'));
    expect(rivalOf(r.state).hp).toBe(LAMPLIGHTER.hp - 2);
  });

  test('it also answers a push and a mark (RV-14)', () => {
    cfg.reaction = { kind: 'relocate', to: at('A1'), cause: 'hop' };
    const pushed = draft(start(), (ctx) => {
      push(ctx, rivalOf(ctx.s), 'right', 1, null);
    });
    expect(rivalOf(pushed.state).pos).toEqual(at('A1'));
    expect(ofType(pushed.events, 'push')).toHaveLength(0);
    expect(seen.harm).toMatchObject([{ kind: 'push', dir: 'right' }]);

    cfg.reaction = { kind: 'cancel' };
    const shoved = draft(start(), (ctx) => {
      push(ctx, rivalOf(ctx.s), 'right', 1, null);
    });
    expect(rivalOf(shoved.state).pos).toEqual(at('B2'));
    expect(ofType(shoved.events, 'unharmed')).toMatchObject([{ source: 'Push' }]);
    const marked = draft(start(), (ctx) => {
      applyMark(ctx, rivalOf(ctx.s), { deep: false, bound: null, origin: null });
    });
    expect(rivalOf(marked.state).mark).toBeNull();
    expect(ofType(marked.events, 'unharmed')).toMatchObject([{ source: 'Mark' }]);
  });

  test('a cancel verdict logs `unharmed`; pass lets the harm guards decide', () => {
    cfg.reaction = { kind: 'cancel' };
    const r = draft(start(), (ctx) => {
      dealDamage(ctx, rivalOf(ctx.s), 2, 'Spark');
    });
    expect(r.events.map((x) => x.type)).toEqual(['unharmed']);
    cfg.reaction = { kind: 'pass' };
    const p = draft(start(), (ctx) => {
      dealDamage(ctx, rivalOf(ctx.s), 2, 'Spark');
    });
    expect(rivalOf(p.state).hp).toBe(LAMPLIGHTER.hp - 2);
  });
});

describe('resists: push, hold and fall', () => {
  test('a resisted push leaves him in place and is logged', () => {
    cfg.resists = ['push'];
    const r = draft(fixture(board('. . .\n. L .\n. . .')), (ctx) => {
      push(ctx, rivalOf(ctx.s), 'right', 1, null);
    });
    expect(rivalOf(r.state).pos).toEqual(at('B2'));
    expect(ofType(r.events, 'push')).toHaveLength(0);
    expect(r.events.filter((e) => isTrickEvent(e, 'trickResists'))).toMatchObject([
      { data: { what: 'push' } },
    ]);
  });

  test('a resisted fall stops him on the brink, unharmed', () => {
    cfg.resists = ['fall'];
    const r = draft(fixture(board('. . .\n. L _\n. . .')), (ctx) => {
      push(ctx, rivalOf(ctx.s), 'right', 1, null);
    });
    expect(ofType(r.events, 'dropped')).toHaveLength(0);
    expect(rivalOf(r.state).hp).toBe(LAMPLIGHTER.hp);
    expect(rivalOf(r.state).stunned).toBe(false);
    cfg.resists = [];
    const fell = draft(fixture(board('. . .\n. L _\n. . .')), (ctx) => {
      push(ctx, rivalOf(ctx.s), 'right', 1, null);
    });
    expect(ofType(fell.events, 'dropped')).toHaveLength(1);
  });

  test('a resisted Hold does not hold him', () => {
    cfg.resists = ['hold'];
    const s = fixture(withLattices('D . L', { draughtsman: 'Bolt> Hold' }));
    const r = cast(s, 'draughtsman', 'right');
    expect(rivalOf(r.state).held).toBe(0);
    expect(r.events.filter((e) => isTrickEvent(e, 'trickResists'))).toMatchObject([
      { data: { what: 'hold' } },
    ]);
    cfg.resists = [];
    expect(rivalOf(cast(s, 'draughtsman', 'right').state).held).toBeGreaterThan(0);
  });
});

describe('round end through DK’s slots', () => {
  test.each(['carry', 'afterChemistry', 'late'] as const)(
    'runs its step in the %s slot',
    (slot) => {
      cfg.slot = slot;
      const r = draft(fixture(board('. L .')), (ctx: Ctx) => roundEnd(ctx, []));
      expect(own(r.state).roundEnds).toBe(1);
    },
  );

  test('a dead rival’s step does not run', () => {
    const r = draft(fixture(board('. L .')), (ctx: Ctx) => {
      const e = rivalOf(ctx.s);
      e.hp = 0;
      kill(ctx, e);
      roundEnd(ctx, []);
    });
    expect(own(r.state).roundEnds).toBeUndefined();
  });
});
