import type { MemberId } from '$data';
import {
  type Aim,
  type BattleState,
  type Coord,
  type Dir,
  type Flow,
  type GameEvent,
  type Jar,
  label,
  type SpellKey,
  type Target,
  targetKey,
  unitAt,
} from '$engine';
import { type Ctx, emit } from '$engine/ctx';
import { dealDamage as damage } from '$engine/damage';
import { push } from '$engine/push';
import { type Handler, type Seams, whereIs, withSeams } from '$engine/resolve';
import { cast } from './harness';

/**
 * A fake rune table for the pipeline tests (E1). The real Action and Kind handlers belong to E2 and
 * E3; these do just enough to make the order of a spell visible: each call is noted as
 * `rune@C1` in `calls` (the target's tile *when the rune ran*, so a unit that moved shows
 * where it was found) and does one small real thing to the board.
 */

export interface Fakes {
  /** `rune@Cell` per call, in the order the pipeline made them (`:lay` when a Lay was upstream). */
  calls: string[];
  /** The flow each call received, parallel to `calls`. */
  flows: Flow[];
  /** What the Seals handed over, in order. */
  jars: { at: Coord; jar: Jar }[];
  /** Toll's network: by default just the tile itself. */
  net: (s: BattleState, at: Coord) => Coord[];
  seams: Seams;
}

const slate = (ctx: Ctx, at: Coord) => ctx.s.tiles[at.y * ctx.s.width + at.x];

export function fakes(): Fakes {
  const f: Fakes = {
    calls: [],
    flows: [],
    jars: [],
    net: (_s, at) => [at],
    seams: {},
  };
  const note = (ctx: Ctx, rune: string, t: Target, flow: Flow): Coord | null => {
    const at = whereIs(ctx.s, t);
    if (!at) return null;
    f.calls.push(`${rune}@${label(at)}${flow.lay ? ':lay' : ''}`);
    f.flows.push(flow);
    return at;
  };
  const table: Record<string, Handler> = {
    ink: (ctx, t, flow) => {
      const at = note(ctx, 'ink', t, flow);
      if (!at) return;
      const u = unitAt(ctx.s, at);
      if (u) {
        u.mark = { deep: false, lineage: 0, bound: null, origin: null };
        emit(ctx, {
          type: 'landed',
          kind: 'ink',
          at,
          unit: { id: u.id, name: u.name, at, member: u.kind === 'member' },
          makes: 'mark',
        });
      } else {
        const tile = slate(ctx, at);
        if (tile) tile.state = { id: 'blot', rounds: 0, origin: null };
        emit(ctx, { type: 'landed', kind: 'ink', at, makes: 'blot' });
      }
    },
    oil: (ctx, t, flow) => {
      const at = note(ctx, 'oil', t, flow);
      if (!at) return;
      const tile = slate(ctx, at);
      if (tile) tile.state = { id: 'slick', rounds: 0, origin: null };
      emit(ctx, { type: 'landed', kind: 'oil', at, makes: 'slick' });
    },
    spark: (ctx, t, flow) => {
      const at = note(ctx, 'spark', t, flow);
      if (!at) return;
      const u = unitAt(ctx.s, at);
      if (u) damage(ctx, u, 1, 'Spark');
      const tile = slate(ctx, at);
      if (tile?.state?.id === 'slick') {
        tile.state = { id: 'fire', rounds: 2, origin: null };
        emit(ctx, { type: 'landed', kind: 'spark', at, makes: 'fire' });
      }
    },
    strike: (ctx, t, flow) => {
      const at = note(ctx, 'strike', t, flow);
      const u = at ? unitAt(ctx.s, at) : null;
      if (u) damage(ctx, u, 2, 'Strike');
    },
    shove: (ctx, t, flow) => {
      const at = note(ctx, 'shove', t, flow);
      const u = at ? unitAt(ctx.s, at) : null;
      const dir: Dir | null = flow.headings.get(targetKey(t)) ?? null;
      if (u && dir) push(ctx, u, dir, 1, flow.origin);
    },
  };
  f.seams = {
    // Any other rune just notes the call.
    handlerFor: (rune) =>
      table[rune] ??
      ((ctx, t, flow) => {
        note(ctx, rune, t, flow);
      }),
    sealJar: (_ctx, at, jar) => {
      f.jars.push({ at: { ...at }, jar });
    },
    sameStateNet: (s, at) => f.net(s, at),
  };
  return f;
}

/** Casts with the fake table in place; returns the events. */
export function castWith(
  f: Fakes,
  state: BattleState,
  member: MemberId,
  aim: Dir | Aim,
  spell?: SpellKey,
): { state: BattleState; events: GameEvent[]; lines: string[] } {
  return withSeams(f.seams, () => cast(state, member, aim, spell));
}
