import { type DistrictId, MEMBERS, type MemberId } from '$data';
import type { KitHearCondition } from '$data/districts/index';
import { SEAM_ROOMS } from '$data/districts/seam';
import {
  type Action,
  applyAction,
  type BattleState,
  createBattle,
  type EventLog,
  FOUNDERS,
  type GameEvent,
  label,
  legalMoves,
  memberById,
  newProfile,
  parseLabel,
  spellsFor,
  type Unit,
} from '$engine';
import { type Coord, DIRS, type Dir, opposite, step } from '$engine/grid';
import { conditionHolds, hearOf } from '$engine/hearing';
import { brassNet, cloudNet, oilNet } from '$engine/networks';
import {
  blocksShots,
  boltRange,
  inBoard,
  isAlive,
  isCloud,
  livingUnits,
  tileAt,
  travel,
  unitAt,
} from '$engine/queries';

/**
 * SM-4 (seam-grows P4, P5): the five hearing events in the base Seam, reached with the starting
 * seven runes and Shove. Each event has a loadout the pair could write from those runes; a seat
 * puts the pair on two of a room's start points; `search` plays a few rounds looking for the act
 * that makes the owner hear the event's district.
 *
 * The engine is the judge and it is slow to copy, so the bot reads the board to guess (a bolt's
 * flight, a slide, who stands in a cloud) and only plays the guesses that look like they hear,
 * plus a few setup moves per round. A guess counts only if the real log hears the district.
 */

export type SeamEvent = 'fire' | 'crossDebt' | 'storm' | 'conducted' | 'theWall';

/** The district each event makes the owner hear (DK-8's owner conditions, Seam-scoped). */
export const EVENT_DISTRICT: Readonly<Record<SeamEvent, DistrictId>> = {
  fire: 'canals',
  crossDebt: 'inkQuarter',
  storm: 'bathhouses',
  conducted: 'foundry',
  theWall: 'bridges',
};

/** P4: the events each base room (rooms 1-3, by index) is laid for. */
export const ROOM_EVENTS: readonly (readonly SeamEvent[])[] = [
  ['fire', 'theWall', 'crossDebt'],
  ['fire', 'storm', 'conducted', 'crossDebt'],
  ['storm', 'conducted', 'theWall'],
];

const D = 'draughtsman' as const;
const S = 'stoker' as const;

/**
 * Pages written only with Bolt, Strike, Guard, Ink, Oil and Spark (each apprentice also has her
 * Shove). The founders' own pages, except: the Draughtsman drops Strike to leave a mark standing
 * (a rat has 2 HP), and the Stoker drops Oil to spark a cloud or a plate bare (Oil on either makes
 * a compound, which bursts as something else).
 */
export const LOADOUTS: Readonly<
  Record<SeamEvent, Readonly<Record<'draughtsman' | 'stoker', string>>>
> = {
  fire: { draughtsman: 'Bolt> Ink Strike', stoker: 'Bolt> Oil Spark' },
  crossDebt: { draughtsman: 'Bolt> Ink', stoker: 'Bolt> Oil Spark' },
  storm: { draughtsman: 'Bolt> Ink Strike', stoker: 'Bolt> Spark' },
  conducted: { draughtsman: 'Bolt> Ink Strike', stoker: 'Bolt> Spark' },
  theWall: { draughtsman: 'Bolt> Ink Strike', stoker: 'Bolt> Oil Spark' },
};

/** The layout with the Draughtsman on start point `i`, the Stoker on `j` (reading order). */
export function seat(layout: string, i: number, j: number): string {
  let n = -1;
  return layout
    .split('\n')
    .map((row) =>
      row
        .split(' ')
        .map((tok) => {
          if (!tok.startsWith('P')) return tok;
          n++;
          const rest = tok.slice(1);
          if (n === i) return `${MEMBERS.draughtsman.token}${rest}`;
          if (n === j) return `${MEMBERS.stoker.token}${rest}`;
          return rest || '.';
        })
        .join(' '),
    )
    .join('\n');
}

/** Every ordered seating of the pair on `starts` start points. */
export function seatings(starts: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < starts; i++) for (let j = 0; j < starts; j++) if (i !== j) out.push([i, j]);
  return out;
}

export const startsIn = (layout: string): number => (layout.match(/P/g) ?? []).length;

export interface Fight {
  state: BattleState;
  log: EventLog;
  actions: Action[];
}

/** A base-Seam fight with the pair seated and carrying the event's loadout. */
export function fightFor(layout: string, event: SeamEvent, i: number, j: number, seed = 1): Fight {
  const pages = LOADOUTS[event];
  const party = Object.fromEntries(
    FOUNDERS.map((id) => [id, { spells: spellsFor(id, pages[id as 'draughtsman' | 'stoker']) }]),
  );
  const r = createBattle({ title: 'seam', board: seat(layout, i, j), seed, party, edge: 'wall' });
  return { state: r.state, log: r.events, actions: [] };
}

/** The event's owner condition, as the city reads it (no loosening). */
export function conditionOf(event: SeamEvent): KitHearCondition {
  const c = hearOf(EVENT_DISTRICT[event]).find((x) => x.voice === 'owner');
  if (!c) throw new Error(`${EVENT_DISTRICT[event]} has no owner hearing`);
  return c;
}

const PROFILE = newProfile();
/** Whether the Seam fight's log so far makes the owner hear the event's district. */
export function hears(event: SeamEvent, log: EventLog): boolean {
  return conditionHolds(conditionOf(event), {
    profile: PROFILE,
    district: 'seam',
    party: FOUNDERS,
    log,
  });
}

/** Applies one action to a fight (throws if illegal). */
export function play(f: Fight, action: Action): Fight {
  const r = applyAction(f.state, action);
  return { state: r.state, log: [...f.log, ...r.events], actions: [...f.actions, action] };
}

// ── Reading the board ───────────────────────────────────

const dist = (a: Coord, b: Coord): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const same = (a: Coord, b: Coord): boolean => a.x === b.x && a.y === b.y;
const key = (c: Coord): string => `${c.x},${c.y}`;
const coords = (s: BattleState): Coord[] =>
  s.tiles.map((_, i) => ({ x: i % s.width, y: Math.floor(i / s.width) }));
const foes = (s: BattleState): Unit[] => livingUnits(s).filter((u) => u.kind === 'enemy');
const party = (s: BattleState): Unit[] => livingUnits(s).filter((u) => u.kind === 'member');
const member = (s: BattleState, id: MemberId): Unit | undefined =>
  s.units.find((u) => u.id === id && isAlive(u));
const near = (net: readonly Coord[], c: Coord): number =>
  Math.min(99, ...net.map((t) => dist(t, c)));

/** The board with one unit standing elsewhere (a cheap guess, never played). */
const moved = (s: BattleState, id: string, to: Coord): BattleState => ({
  ...s,
  units: s.units.map((u) => (u.id === id ? { ...u, pos: { ...to } } : u)),
});

const oily = (s: BattleState, c: Coord): boolean =>
  inBoard(s, c) && ['slick', 'pool', 'stain'].includes(tileAt(s, c).state?.id ?? '');
const open = (s: BattleState, c: Coord): boolean =>
  inBoard(s, c) && !unitAt(s, c) && !blocksShots(tileAt(s, c));

/** Where a unit pushed one step `dir` from `at` ends, and whether it slid into a crush. */
function slide(s: BattleState, at: Coord, dir: Dir): { to: Coord; wall: boolean; crush: boolean } {
  let pos = step(at, dir);
  if (!open(s, pos)) return { to: at, wall: false, crush: true };
  let slid = 0;
  while (oily(s, pos)) {
    const next = step(pos, dir);
    if (!open(s, next)) return { to: pos, wall: slid > 0, crush: true };
    pos = next;
    slid++;
  }
  return { to: pos, wall: false, crush: false };
}

/** The stretch of connected tiles a finder reads at `at`, or [] (a vent counts as a cloud). */
function cloudish(s: BattleState): Coord[][] {
  const seen = new Set<string>();
  const out: Coord[][] = [];
  const is = (c: Coord) => inBoard(s, c) && (isCloud(tileAt(s, c)) || tileAt(s, c).terrain.vent);
  for (const c of coords(s)) {
    if (seen.has(key(c)) || !is(c)) continue;
    const net: Coord[] = [];
    const todo = [c];
    seen.add(key(c));
    while (todo.length) {
      const t = todo.pop() as Coord;
      net.push(t);
      for (const d of DIRS) {
        const n = step(t, d);
        if (is(n) && !seen.has(key(n))) {
          seen.add(key(n));
          todo.push(n);
        }
      }
    }
    out.push(net);
  }
  return out;
}

function brassNets(s: BattleState): Coord[][] {
  const seen = new Set<string>();
  const out: Coord[][] = [];
  for (const c of coords(s)) {
    if (seen.has(key(c))) continue;
    const net = brassNet(s, c);
    for (const t of net) seen.add(key(t));
    if (net.length) out.push(net);
  }
  return out;
}

/** The net a Spark landing on a bolt's stop bursts, and the units it reaches. */
function sparkReach(s: BattleState, event: 'storm' | 'conducted', stop: Coord): Coord[] {
  if (event === 'storm') return isCloud(tileAt(s, stop)) ? cloudNet(s, stop) : [];
  return brassNet(s, stop);
}
const reachOf = (event: 'storm' | 'conducted'): number => (event === 'storm' ? 0 : 1);
const unitsReached = (s: BattleState, net: readonly Coord[], reach: number): Unit[] =>
  livingUnits(s).filter((u) => near(net, u.pos) <= reach);

/** A Bolt from `from` toward `dir`: where it stops (ignoring the caster). */
const bolt = (s: BattleState, id: MemberId, from: Coord, dir: Dir) =>
  travel(s, from, dir, boltRange(memberById(s, id)), id);

/** Fire tiles an Oil-Spark bolt would light at its stop (0 if it makes a compound instead). */
function fireAt(s: BattleState, stop: Coord): number {
  const t = tileAt(s, stop);
  if (t.state && !oily(s, stop)) return 0;
  if (oily(s, stop)) return oilNet(s, stop).length;
  const seen = new Set<string>([key(stop)]);
  for (const d of DIRS) {
    const n = step(stop, d);
    if (oily(s, n)) for (const c of oilNet(s, n)) seen.add(key(c));
  }
  return seen.size;
}

// ── Plans ───────────────────────────────────────────────

const go = (s: BattleState, id: MemberId, to: Coord): Action[] => {
  const m = member(s, id);
  return m && !same(m.pos, to) ? [{ type: 'move', unit: id, to }] : [];
};
/** Each loadout is one chain, so a member's cast is always her first (only) spell. */
const castDir = (s: BattleState, id: MemberId, dir: Dir): Action => ({
  type: 'cast',
  unit: id,
  spell: memberById(s, id).spells[0]?.key ?? '',
  aim: { kind: 'dir', dir },
});
const shove = (id: MemberId, dir: Dir): Action => ({ type: 'shove', unit: id, dir });

// ── Scripts: a fight's actions in one line ──────────────
// `D>C3` moves the Draughtsman to C3, `S!right` casts the Stoker's spell right, `D^up` is the
// Draughtsman's Shove up, `/` ends the turn.

const WHO: Readonly<Record<string, MemberId>> = { D, S };
const LETTER: Readonly<Record<string, string>> = { draughtsman: 'D', stoker: 'S' };

/** A fight's actions as a script line. */
export function encode(actions: readonly Action[]): string {
  return actions
    .map((a) => {
      if (a.type === 'endTurn') return '/';
      const who = LETTER[a.unit] ?? '?';
      if (a.type === 'move') return `${who}>${label(a.to)}`;
      if (a.type === 'cast' && a.aim.kind === 'dir') return `${who}!${a.aim.dir}`;
      if (a.type === 'shove') return `${who}^${a.dir}`;
      throw new Error(`No script for ${a.type}`);
    })
    .join(' ');
}

/** Plays a script line from a fight (throws on an illegal step). */
export function playScript(start: Fight, script: string): Fight {
  let f = start;
  for (const tok of script.split(' ').filter(Boolean)) {
    if (tok === '/') {
      f = play(f, { type: 'endTurn' });
      continue;
    }
    const id = WHO[tok[0] ?? ''];
    const arg = tok.slice(2);
    if (!id) throw new Error(`Bad script step ${tok}`);
    if (tok[1] === '>') f = play(f, { type: 'move', unit: id, to: parseLabel(arg) });
    else if (tok[1] === '!') f = play(f, castDir(f.state, id, arg as Dir));
    else if (tok[1] === '^') f = play(f, shove(id, arg as Dir));
    else throw new Error(`Bad script step ${tok}`);
  }
  return f;
}

/** Where a member can stand this turn (staying put first), or [] if she has moved or fallen. */
function spots(s: BattleState, id: MemberId): Coord[] {
  const m = member(s, id);
  if (m?.kind !== 'member' || m.acted) return [];
  return [m.pos, ...legalMoves(s, id)];
}

interface Plan {
  actions: Action[];
  strength: number;
}

/** A foe that a member standing behind it could push one step `dir`. */
function shoves(s: BattleState, id: MemberId): { at: Coord; dir: Dir; target: Unit }[] {
  const reach = new Set(spots(s, id).map(key));
  const out: { at: Coord; dir: Dir; target: Unit }[] = [];
  for (const u of livingUnits(s)) {
    if (u.id === id) continue;
    for (const dir of DIRS) {
      const at = step(u.pos, opposite(dir));
      if (reach.has(key(at)) && (open(s, at) || same(at, member(s, id)?.pos ?? at)))
        out.push({ at, dir, target: u });
    }
  }
  return out;
}

/** Plans that should hear the event this turn, strongest first. */
function triggers(event: SeamEvent, s: BattleState): Plan[] {
  const plans: Plan[] = [];
  const sk = member(s, S);
  const dr = member(s, D);
  if (!sk || !dr) return plans;
  switch (event) {
    case 'fire':
      for (const at of spots(s, S)) {
        const v = moved(s, S, at);
        for (const dir of DIRS) {
          const t = bolt(v, S, at, dir);
          if (t.stop && fireAt(v, t.stop) >= 3)
            plans.push({
              actions: [...go(s, S, at), castDir(s, S, dir)],
              strength: fireAt(v, t.stop),
            });
        }
      }
      break;
    case 'storm':
    case 'conducted': {
      const reach = reachOf(event);
      for (const at of spots(s, S)) {
        const v = moved(s, S, at);
        for (const dir of DIRS) {
          const t = bolt(v, S, at, dir);
          if (!t.stop) continue;
          const net = sparkReach(v, event, t.stop);
          if (!net.length) continue;
          const fire = [...go(s, S, at), castDir(s, S, dir)];
          const count = unitsReached(v, net, reach).length;
          if (count >= 3) {
            plans.push({ actions: fire, strength: count });
            continue;
          }
          if (count < 2) continue;
          // One short: the Draughtsman walks in, or shoves a foe in.
          const drIn = unitsReached(v, net, reach).some((u) => u.id === D);
          if (!drIn) {
            for (const to of spots(s, D)) {
              if (same(to, at) || near(net, to) > reach) continue;
              if (event === 'storm' && !isCloud(tileAt(s, to))) continue;
              plans.push({ actions: [...go(s, D, to), ...fire], strength: 2.5 });
              plans.push({
                actions: [...go(s, S, at), ...go(s, D, to), castDir(s, S, dir)],
                strength: 2.4,
              });
            }
          }
          for (const sh of shoves(v, D)) {
            if (sh.target.kind !== 'enemy' || near(net, sh.target.pos) <= reach) continue;
            const end = slide(v, sh.target.pos, sh.dir).to;
            if (near(net, end) > reach) continue;
            plans.push({ actions: [...go(s, D, sh.at), shove(D, sh.dir), ...fire], strength: 2.2 });
          }
        }
      }
      break;
    }
    case 'theWall':
      for (const id of [D, S] as const) {
        for (const sh of shoves(s, id)) {
          if (slide(moved(s, id, sh.at), sh.target.pos, sh.dir).wall)
            plans.push({ actions: [...go(s, id, sh.at), shove(id, sh.dir)], strength: 3 });
        }
      }
      break;
    case 'crossDebt':
      for (const at of spots(s, D)) {
        const v = moved(s, D, at);
        for (const dir of DIRS) {
          const t = bolt(v, D, at, dir);
          if (t.reason !== 'unit' || t.unit.kind !== 'enemy') continue;
          const f = t.unit;
          const mark = [...go(s, D, at), castDir(s, D, dir)];
          // The Stoker's bolt stops on the marked foe, or her Shove crushes it.
          for (const sat of spots(v, S)) {
            if (same(sat, at)) continue;
            const w = moved(v, S, sat);
            for (const sdir of DIRS) {
              const st = bolt(w, S, sat, sdir);
              if (st.reason === 'unit' && st.unit.id === f.id)
                plans.push({
                  actions: [...mark, ...go(v, S, sat), castDir(s, S, sdir)],
                  strength: 3,
                });
              if (same(step(sat, sdir), f.pos) && slide(w, f.pos, sdir).crush)
                plans.push({ actions: [...mark, ...go(v, S, sat), shove(S, sdir)], strength: 2 });
            }
          }
        }
      }
      break;
  }
  return plans.sort((a, b) => b.strength - a.strength);
}

/** How close the board is to the event (setup only; bigger is closer). */
function progress(event: SeamEvent, s: BattleState): number {
  const pull = (net: readonly Coord[], reach: number) =>
    livingUnits(s).reduce((t, u) => {
      const d = near(net, u.pos) - reach;
      return t + (d <= 0 ? 10 : Math.max(0, 4 - d));
    }, 0);
  switch (event) {
    case 'fire': {
      const sk = member(s, S);
      const oil = coords(s).filter((c) => oily(s, c));
      return sk ? -near(oil, sk.pos) : -99;
    }
    case 'storm':
      return Math.max(0, ...cloudish(s).map((n) => pull(n, 0)));
    case 'conducted':
      return Math.max(0, ...brassNets(s).map((n) => pull(n, 1)));
    case 'theWall': {
      // A foe on a tile from which a push slides into a crush, an apprentice behind it.
      let best = -99;
      for (const c of coords(s)) {
        if (blocksShots(tileAt(s, c)) || oily(s, c)) continue;
        for (const dir of DIRS) {
          const behind = step(c, opposite(dir));
          if (!inBoard(s, behind) || !slide(s, c, dir).wall) continue;
          const foe = Math.min(99, ...foes(s).map((f) => dist(f.pos, c)));
          const ally = Math.min(99, ...party(s).map((m) => dist(m.pos, behind)));
          best = Math.max(best, 20 - 3 * foe - ally);
        }
      }
      return best;
    }
    case 'crossDebt':
      return -Math.min(
        99,
        ...foes(s).map((f) => party(s).reduce((t, m) => t + dist(m.pos, f.pos), 0)),
      );
  }
}

const score = (event: SeamEvent, s: BattleState): number =>
  progress(event, s) * 10 + party(s).reduce((t, m) => t + m.hp, 0);

/** Setup turns: the pair's best few pairs of spots by `progress`, as moves. */
function setups(event: SeamEvent, s: BattleState, n: number): Plan[] {
  const best = (id: MemberId) =>
    spots(s, id)
      .map((at) => ({ at, v: score(event, moved(s, id, at)) }))
      .sort((a, b) => b.v - a.v)
      .slice(0, 3)
      .map((x) => x.at);
  const plans: Plan[] = [];
  for (const a of best(D)) {
    for (const b of best(S)) {
      if (same(a, b)) continue;
      const v = moved(moved(s, D, a), S, b);
      plans.push({ actions: [...go(s, D, a), ...go(s, S, b)], strength: score(event, v) });
    }
  }
  return plans.sort((a, b) => b.strength - a.strength).slice(0, n);
}

/** Plays a plan's actions; null if one turns out illegal. */
function attempt(f: Fight, actions: readonly Action[]): Fight | null {
  let g = f;
  for (const a of actions) {
    try {
      g = play(g, a);
    } catch {
      return null;
    }
    if (g.state.phase !== 'player') return g;
  }
  return g;
}

const alive = (f: Fight) => f.state.phase === 'player' && party(f.state).length === FOUNDERS.length;

export interface SearchOpts {
  rounds?: number;
  /** Boards kept between rounds. */
  beam?: number;
  /** Guessed hearings played per board per round. */
  tries?: number;
}

/**
 * Round by round: play the guesses that should hear the event now; if none does, play the best
 * few setups, end the turn and keep the best `beam` boards. Returns the first fight whose log
 * hears the event's district, or null.
 */
export function search(event: SeamEvent, start: Fight, opts: SearchOpts = {}): Fight | null {
  const { rounds = 6, beam = 3, tries = 10 } = opts;
  if (hears(event, start.log)) return start;
  let frontier = [start];
  for (let r = 0; r < rounds && frontier.length; r++) {
    const next: Fight[] = [];
    for (const f of frontier) {
      const seen = new Set<string>();
      let tried = 0;
      for (const p of triggers(event, f.state)) {
        const k = JSON.stringify(p.actions);
        if (seen.has(k)) continue;
        seen.add(k);
        if (tried++ >= tries) break;
        const g = attempt(f, p.actions);
        if (g && hears(event, g.log)) return g;
      }
      for (const p of setups(event, f.state, beam)) {
        const g = attempt(f, p.actions);
        if (!g || !alive(g)) continue;
        const h = play(g, { type: 'endTurn' });
        if (hears(event, h.log)) return h;
        if (alive(h)) next.push(h);
      }
    }
    frontier = next
      .map((f) => ({ f, v: score(event, f.state) }))
      .sort((a, b) => b.v - a.v)
      .slice(0, beam)
      .map((x) => x.f);
  }
  return null;
}

// ── The sweep ───────────────────────────────────────────

export interface Reach {
  room: string;
  event: SeamEvent;
  reached: number;
  of: number;
  /** Seatings missed, as `variant i,j`. */
  missed: string[];
}

/** For each base room and each of its P4 events: the seatings (all variants) the bot hears it from. */
export function sweep(opts: SearchOpts = {}, only?: SeamEvent): Reach[] {
  const out: Reach[] = [];
  SEAM_ROOMS.slice(0, 3).forEach((room, depth) => {
    for (const event of ROOM_EVENTS[depth] ?? []) {
      if (only && event !== only) continue;
      const row: Reach = { room: room.id, event, reached: 0, of: 0, missed: [] };
      for (const v of room.variants) {
        for (const [i, j] of seatings(startsIn(v.layout))) {
          row.of++;
          if (search(event, fightFor(v.layout, event, i, j), opts)) row.reached++;
          else row.missed.push(`${v.name} ${i},${j}`);
        }
      }
      out.push(row);
    }
  });
  return out;
}

/** The bursts and idioms a fight's log holds, for a readable failure. */
export function notable(log: readonly GameEvent[]): string[] {
  return log.flatMap((e) =>
    e.type === 'burst'
      ? [`${e.burst}:${e.units.length}`]
      : e.type === 'named' && e.what === 'idiom'
        ? [`idiom:${e.id}`]
        : [],
  );
}
