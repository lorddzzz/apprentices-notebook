import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import {
  BATCHES,
  capstoneKey,
  FOOTNOTES,
  footnoteKeyOf,
  type InventionDef,
  MEMBERS,
  SOLVENT_IDS,
  VARIANTS,
} from '$data';
import {
  type BattleState,
  compiledFor,
  compileLattice,
  describeLog,
  libraryOf,
  newProfile,
  type Profile,
  parseLabel,
  parseLattice,
  setMemberLattice,
  writeFootnote,
} from '$engine';
import { type FootnoteIds, runDraft } from '$engine/ctx';
import { landKind } from '$engine/mix';
import { push } from '$engine/push';
import { runScheduled } from '$engine/schedule';
import { flowFor, tile } from '../chemHarness';
import { fourCombos, withFootnotes } from '../footnoteHarness';
import { unitAtLabel, withLattices } from '../harness';
import { castWith, hpOf, step, where } from './castHelper';

/**
 * FN-C8: Conduct, Repeat and Margin (levels I, II, capstones). Every variant runs through an
 * invention, once plain and once written; each method line has a `fourCombos` scenario.
 */
const at = parseLabel;
const inv = (id: string, method: InventionDef['method'], parts: InventionDef['parts']) =>
  ({ id: `inv:${id}`, name: id, method, parts, solvent: null }) as InventionDef;
const library = libraryOf([
  inv('impulse', 'conduct', ['shove']),
  inv('zap', 'conduct', ['strike']),
  inv('afterimage', 'repeat', ['strike']),
  inv('shoveback', 'repeat', ['shove']),
  inv('echo', 'margin', ['inv:afterimage']),
]);
const inventions = { inventions: library };
const right = { kind: 'dir', dir: 'right' } as const;
const endTurn = (s: BattleState, ids: FootnoteIds) => step(s, { type: 'endTurn' }, ids);
const collared = (s: BattleState, id: string) => s.units.find((u) => u.id === id)?.collar !== false;
const marked = (s: BattleState, id: string) => !!s.units.find((u) => u.id === id)?.mark;

// ── Conduct ─────────────────────────────────────────────

/** D beside a plate, a rat beyond it and one under it: a Shove conducted along the brass. */
const CONDUCT = '. D = r .\n. . r . .\n. . . . .';
function conductRun(
  ids: string[],
  board = CONDUCT,
  lattice = 'Bolt> inv:impulse',
  hp: Record<string, number> = { D1: 9, C2: 9 },
) {
  const s = withLattices(board, { draughtsman: lattice }, { ...inventions, hp });
  return castWith(s, right, withFootnotes(ids));
}

describe('Conduct', () => {
  test('conduct:network fourCombos: scatter or spare, then collar or hum', () => {
    const facts = fourCombos(
      'conduct:network',
      ['conduct-network-scatter', 'conduct-network-spare'],
      ['conduct-network-collar', 'conduct-network-hum'],
      ({ l1, l2 }) => {
        const { state } = conductRun([l1, l2]);
        return {
          d: where(state, 'draughtsman'),
          below: where(state, 'rat-2'),
          dCollar: collared(state, 'draughtsman'),
          ratCollar: collared(state, 'rat-2'),
          hum: state.hum?.length ?? 0,
        };
      },
    ).map((r) => r.result);
    expect(facts).toEqual([
      { d: 'A1', below: 'C3', dCollar: true, ratCollar: true, hum: 0 }, // scatter + collar
      { d: 'A1', below: 'C3', dCollar: false, ratCollar: false, hum: 1 }, // scatter + hum
      { d: 'B1', below: 'D2', dCollar: false, ratCollar: true, hum: 0 }, // spare + collar: the ally was skipped
      { d: 'B1', below: 'D2', dCollar: false, ratCollar: false, hum: 1 }, // spare + hum
    ]);
  });

  test("conduct-network-scatter: each unit goes away from the brass, not the target's way", () => {
    expect(where(conductRun([]).state, 'rat-2')).toBe('D2'); // pushed right with the target
    expect(where(conductRun(['conduct-network-scatter']).state, 'rat-2')).toBe('C3'); // pushed down, away
  });

  test('conduct-network-spare: your apprentice on the brass is passed over', () => {
    const zap = (ids: string[]) =>
      hpOf(conductRun(ids, '. D = r .', 'Bolt> inv:zap', { D1: 9 }).state, 'draughtsman');
    expect(zap([])).toBe(4);
    expect(zap(['conduct-network-spare'])).toBe(6);
  });

  test('conduct-network-collar: everyone reached joins the brass', () => {
    expect(collared(conductRun([]).state, 'rat-2')).toBe(false);
    expect(collared(conductRun(['conduct-network-collar']).state, 'rat-2')).toBe(true);
  });

  test('conduct-network-hum: Spark on the humming brass deals 1 more, until round end', () => {
    const board = 'D . = r .';
    const hp = (ids: string[]) => {
      const after = conductRun(ids, board, 'Bolt> inv:zap', { D1: 9 }).state;
      const spark = runDraft(after, (ctx) => landKind(ctx, 'spark', tile('C1'), flowFor(after)), {
        footnotes: withFootnotes(ids),
      });
      return hpOf(spark.state, 'rat-1') ?? 0;
    };
    expect(hp(['conduct-network-hum'])).toBe(hp([]) - 1);
    const hummed = conductRun(['conduct-network-hum'], board, 'Bolt> inv:zap', { D1: 9 }).state;
    expect(hummed.hum).toEqual([at('C1')]);
    expect(endTurn(hummed, {}).state.hum).toBeUndefined();
  });

  test('conduct-cap-mark: a marked target marks everyone the conduct reaches', () => {
    const run = (ids: string[], board: string) =>
      conductRun(ids, board, 'Bolt> inv:zap', { D1: 9, B1: 9 }).state;
    expect(marked(run([], 'D r! = r .'), 'rat-2')).toBe(false);
    expect(marked(run(['conduct-cap-mark'], 'D r! = r .'), 'rat-2')).toBe(true);
    expect(marked(run(['conduct-cap-mark'], 'D r = r .'), 'rat-2')).toBe(false); // unmarked target
  });

  test('conduct-cap-cloud: with no brass, the action travels the connected cloud', () => {
    const run = (ids: string[]) => conductRun(ids, 'D r~ ~ r .', 'Bolt> inv:zap', { B1: 9, D1: 9 });
    const none = run([]).events;
    expect(none.some((e) => e.type === 'miss' && e.line === 'conduct:noTarget')).toBe(true);
    const reached = run(['conduct-cap-cloud']);
    expect(reached.events.some((e) => e.type === 'conducted')).toBe(true);
    expect(hpOf(reached.state, 'rat-2')).toBeLessThan(hpOf(run([]).state, 'rat-2') ?? 0);
  });
});

// ── Repeat ──────────────────────────────────────────────

/** A rat pushed off its tile: the repeat waits on an empty tile the rat does not return to. */
const REPEAT = '. . . . . .\nD . r . . .\n. . . . . .';
const repeatBoard = () =>
  withLattices(REPEAT, { draughtsman: 'Bolt> inv:shoveback' }, { ...inventions, hp: { C2: 9 } });

/** When the repeat went off during the end of turn, and what it pushed. */
function whenItFell(ids: string[]) {
  const f = withFootnotes(ids);
  const lines = describeLog(endTurn(castWith(repeatBoard(), right, f).state, f).events);
  const again = lines.indexOf('shove happens again');
  const round2 = lines.indexOf('Round 2');
  const turn = lines.indexOf('Your turn');
  return {
    when: again < 0 ? 'never' : again < round2 ? 'dusk' : again < turn ? 'step' : 'turn',
    pushes: lines.filter((l, i) => /is pushed/.test(l) && again >= 0 && i > again),
  };
}

describe('Repeat', () => {
  test('repeat:empty fourCombos: follow or reaim, then dusk or step', () => {
    const facts = fourCombos(
      'repeat:empty',
      ['repeat-empty-follow', 'repeat-empty-reaim'],
      ['repeat-empty-dusk', 'repeat-empty-step'],
      ({ l1, l2 }) => whenItFell([l1, l2]),
    ).map((r) => r.result);
    expect(facts).toEqual([
      { when: 'dusk', pushes: ['rat at D2 is pushed right to E2'] }, // follow the rat at dusk
      { when: 'step', pushes: [expect.stringContaining('is pushed right')] }, // the followed rat moved
      { when: 'dusk', pushes: [] }, // reaim: the tile is empty at dusk
      { when: 'turn', pushes: [] }, // reaim + step: nobody steps on it, it waits for the turn
    ]);
  });

  test('repeat-empty-follow: the repeat finds the unit where it went', () => {
    expect(whenItFell([])).toEqual({ when: 'turn', pushes: [] });
    expect(whenItFell(['repeat-empty-follow']).pushes).toEqual([
      'rat at B2 is pushed right to E2 (slides 2)',
    ]);
  });

  test('repeat-empty-reaim: a repeat points from where the caster stands when it falls due', () => {
    // D at A3, a rat at B2 and a repeat on B2 pointing right: reaimed, it points up the page.
    const run = (ids: string[]) => {
      const s = withLattices('. . . .\n. r . .\nD . . .', {}, { hp: { B2: 9 } });
      const queued = runDraft(
        s,
        (ctx) => {
          ctx.s.scheduled.push({
            when: 'ownerTurn',
            owner: 'draughtsman',
            step: 'shove',
            target: { kind: 'tile', at: at('B2') },
            heading: 'right',
            origin: { caster: 'draughtsman', spell: '0,0', cast: 1 },
            kind: 'repeat',
          });
        },
        { footnotes: withFootnotes(ids) },
      ).state;
      const due = runDraft(queued, (ctx) => runScheduled(ctx, 'ownerTurn'), {
        footnotes: withFootnotes(ids),
      });
      return where(due.state, 'rat-1');
    };
    expect(run(['repeat-empty-reaim'])).not.toBe(run([]));
  });

  test('repeat-empty-dusk: a repeat falls due at round end, before the foes move on', () => {
    expect(whenItFell(['repeat-empty-dusk']).when).toBe('dusk');
  });

  test('repeat-empty-step: a unit stepping onto the waiting tile sets it off early', () => {
    const stepOnto = (ids: string[]) => {
      const f = withFootnotes(ids);
      const cast = castWith(repeatBoard(), right, f);
      return step(cast.state, { type: 'move', unit: 'draughtsman', to: at('C2') }, f);
    };
    const stepping = stepOnto(['repeat-empty-step']);
    expect(stepping.events.some((e) => e.type === 'repeated')).toBe(true);
    expect(stepping.state.scheduled).toHaveLength(0); // spent
    expect(stepOnto([]).events.some((e) => e.type === 'repeated')).toBe(false);
  });

  test('repeat-cap-pushed: pushing the target in your cast makes the repeat act at once, once', () => {
    const run = (ids: string[]) => {
      const f = withFootnotes(ids);
      const s = withLattices(
        'D r . . .',
        { draughtsman: 'Bolt> inv:afterimage' },
        { ...inventions, hp: { B1: 9 } },
      );
      const cast = castWith(s, right, f).state;
      const origin = { caster: 'draughtsman', spell: '0,0', cast: 2 };
      const d = runDraft(cast, (ctx) => push(ctx, unitAtLabel(ctx.s, 'B1'), 'right', 1, origin), {
        footnotes: f,
      });
      return { hp: hpOf(d.state, 'rat-1'), waiting: d.state.scheduled.length };
    };
    expect(run([])).toEqual({ hp: 7, waiting: 1 });
    expect(run(['repeat-cap-pushed'])).toEqual({ hp: 5, waiting: 0 });
  });

  test('repeat-cap-patient: a repeat due on an empty tile waits one more turn, then lapses', () => {
    const waiting = (ids: string[]) => {
      const f = withFootnotes(ids);
      const first = endTurn(castWith(repeatBoard(), right, f).state, f);
      const second = endTurn(first.state, f);
      return [first.state.scheduled.length, second.state.scheduled.length];
    };
    expect(waiting([])).toEqual([0, 0]);
    expect(waiting(['repeat-cap-patient'])).toEqual([1, 0]);
  });
});

// ── Margin ──────────────────────────────────────────────

/** An echo over a Shove: the same board as the repeat, the rat pushed off its tile. */
const ECHO = '. inv:echo\nBolt> Shove';
const echoBoard = (board = REPEAT) =>
  withLattices(board, { draughtsman: ECHO }, { ...inventions, hp: { C2: 9 } });

describe('Margin', () => {
  test('margin:empty fourCombos: follow or wait, then mirror or relay', () => {
    const facts = fourCombos(
      'margin:empty',
      ['margin-empty-follow', 'margin-empty-wait'],
      ['margin-empty-mirror', 'margin-empty-relay'],
      ({ l1, l2 }) => {
        const f = withFootnotes([l1, l2]);
        const cast = castWith(echoBoard(), right, f);
        const entry = cast.state.scheduled[0];
        const lines = describeLog(endTurn(cast.state, f).events);
        const hit = lines.find((l) => /crushed|is pushed/.test(l));
        return {
          follow: entry?.follow === true,
          wait: entry?.wait ?? 0,
          heading: entry?.heading,
          hit: hit?.includes('crushed') ? 'crush' : hit ? 'push' : null,
        };
      },
    ).map((r) => r.result);
    expect(facts).toEqual([
      { follow: true, wait: 0, heading: 'left', hit: 'crush' }, // follow + mirror: the rat is shoved back onto the caster
      { follow: true, wait: 0, heading: 'right', hit: 'push' }, // follow + relay (alone, back to D)
      { follow: false, wait: 2, heading: 'left', hit: null }, // wait + mirror: nobody on the tile yet
      { follow: false, wait: 2, heading: 'right', hit: null }, // wait + relay
    ]);
  });

  test('margin-empty-follow: the echo finds the unit where it went', () => {
    const echoes = (ids: string[]) => {
      const f = withFootnotes(ids);
      const cast = castWith(echoBoard(), right, f);
      return describeLog(endTurn(cast.state, f).events).filter((l) => /is pushed/.test(l)).length;
    };
    expect(echoes([])).toBe(0);
    expect(echoes(['margin-empty-follow'])).toBe(1);
  });

  test('margin-empty-wait: an echo on an empty tile waits up to two turns', () => {
    const f = withFootnotes(['margin-empty-wait']);
    let s = castWith(echoBoard(), right, f).state;
    const left: number[] = [];
    const fired: boolean[] = [];
    for (let i = 0; i < 3; i++) {
      const r = endTurn(s, f);
      s = r.state;
      left.push(s.scheduled.length);
      fired.push(r.events.some((e) => e.type === 'repeated'));
    }
    expect(left).toEqual([1, 1, 0]);
    expect(fired).toEqual([false, false, true]);
  });

  test('margin-empty-mirror: the echo points the opposite way', () => {
    const heading = (ids: string[]) =>
      castWith(echoBoard(), right, withFootnotes(ids)).state.scheduled[0]?.heading;
    expect(heading([])).toBe('right');
    expect(heading(['margin-empty-mirror'])).toBe('left');
  });

  test('margin-empty-relay: the next apprentice sets the echo off, and it lapses if he is down', () => {
    const board = '. . . . . .\nD . r . . .\nS . . . . .';
    const run = (ids: string[]) => {
      const s = withLattices(board, { draughtsman: ECHO }, { ...inventions, hp: { C2: 9 } });
      return castWith(s, right, withFootnotes(ids));
    };
    expect(run([]).state.scheduled[0]?.owner).toBe('draughtsman');
    const relayed = run(['margin-empty-relay']);
    expect(relayed.state.scheduled[0]?.owner).toBe('stoker');
    const down = structuredClone(relayed.state);
    for (const u of down.units) if (u.id === 'stoker') u.hp = 0;
    const next = endTurn(down, withFootnotes(['margin-empty-relay']));
    expect(next.events.some((e) => e.type === 'miss' && e.line === 'margin:member')).toBe(true);
  });

  test('margin-cap-kinds: a Kind under a Margin is echoed too', () => {
    const run = (ids: string[]) => {
      const f = withFootnotes(ids);
      const s = withLattices(
        'D . . . r',
        { draughtsman: '. inv:echo\nBolt> Oil' },
        { ...inventions, hp: { E1: 9 } },
      );
      const cast = castWith(s, right, f);
      return {
        queued: cast.state.scheduled.length,
        again: endTurn(cast.state, f).events.some((e) => e.type === 'repeated'),
      };
    };
    expect(run([])).toEqual({ queued: 0, again: false });
    expect(run(['margin-cap-kinds'])).toEqual({ queued: 1, again: true });
  });

  test('margin-cap-diagonal: a Margin also touches the Action diagonal to it', () => {
    const queued = (diagonalMargin: boolean) => {
      const spells = compileLattice(
        parseLattice('inv:echo .\nBolt> Strike'),
        {},
        library,
        MEMBERS.draughtsman.lean,
        { diagonalMargin },
      ).spells;
      const s = withLattices(
        'D r . .',
        {},
        { ...inventions, party: { draughtsman: { spells } }, hp: { B1: 9 } },
      );
      return castWith(s, right, {}).state.scheduled.length;
    };
    expect(queued(false)).toBe(0);
    expect(queued(true)).toBe(1);
  });

  test('margin-cap-diagonal: compiledFor reads the written capstone from the profile', () => {
    const solvents = Object.fromEntries(SOLVENT_IDS.map((s) => [s, 2])) as Profile['solvents'];
    let p: Profile = {
      ...newProfile(),
      vellum: 3,
      solvents,
      methods: [...newProfile().methods, 'repeat', 'margin'],
      inventions: [
        inv('afterimage', 'repeat', ['strike']),
        inv('echo', 'margin', ['inv:afterimage']),
      ],
      footnotes: { margin: { points: FOOTNOTES.levels.method[2], slots: {} } },
    };
    p = setMemberLattice(p, 'draughtsman', parseLattice('inv:echo .\nBolt> Strike'));
    const auras = (q: Profile) => {
      const first = compiledFor(q, 'draughtsman').spells[0]?.first;
      return first && 'auras' in first ? first.auras : [];
    };
    expect(auras(p)).toEqual([]);
    const r = writeFootnote(p, 'margin', capstoneKey('margin'), 'margin-cap-diagonal');
    if ('error' in r) throw new Error(r.error);
    expect(auras(r.profile)).toEqual(['inv:echo']);
  });
});

describe('the seam-methods batch', () => {
  const IDS: [string, string][] = [
    ['conduct-network-scatter', 'conduct:network@1'],
    ['conduct-network-spare', 'conduct:network@1'],
    ['conduct-network-collar', 'conduct:network@2'],
    ['conduct-network-hum', 'conduct:network@2'],
    ['conduct-cap-mark', 'conduct@cap'],
    ['conduct-cap-cloud', 'conduct@cap'],
    ['repeat-empty-follow', 'repeat:empty@1'],
    ['repeat-empty-reaim', 'repeat:empty@1'],
    ['repeat-empty-dusk', 'repeat:empty@2'],
    ['repeat-empty-step', 'repeat:empty@2'],
    ['repeat-cap-pushed', 'repeat@cap'],
    ['repeat-cap-patient', 'repeat@cap'],
    ['margin-empty-follow', 'margin:empty@1'],
    ['margin-empty-wait', 'margin:empty@1'],
    ['margin-empty-mirror', 'margin:empty@2'],
    ['margin-empty-relay', 'margin:empty@2'],
    ['margin-cap-diagonal', 'margin@cap'],
    ['margin-cap-kinds', 'margin@cap'],
  ];

  test('the ids and their slots', () => {
    expect((BATCHES['seam-methods'] ?? []).map((v) => [v.id, footnoteKeyOf(v)])).toEqual(IDS);
  });

  test('every hook site reads a registered id', () => {
    const ids = new Set(VARIANTS.map((v) => v.id));
    for (const f of ['inventions', 'schedule', 'resolve']) {
      const src = readFileSync(`src/engine/${f}.ts`, 'utf8');
      for (const m of src.matchAll(/hasFootnote\(ctx,\s*'([^']+)'\)/g)) {
        expect(ids.has(m[1] as string), `${f}: ${m[1]}`).toBe(true);
      }
    }
  });
});
