import type {
  BoardRule,
  DistrictModule,
  HearKind,
  OfferKind,
  PieceDef,
  ScriptStep,
  TilePiece,
  TripShapeDef,
} from '$engine/districts/types';
import type { removeFromRoom } from '$engine/outOfRoom';
import type { hitPiece } from '$engine/pieces';
import type { BattleState } from '$engine/types';

/**
 * The fixture district's engine module: the file a district build adds as
 * `src/engine/districts/<id>.ts` and lists in `DISTRICT_MODULES` (`kit.ts`). Test only: it is
 * registered by `tests/run/kit.test.ts` through a mocked kit, never in the shipped registry.
 * Every hook is named in the comment above it. State is plain JSON (saved and cloned as is), so
 * each value has a type alias and a forgiving reader.
 */

/**
 * The kit operations this module calls. A real module imports them (`removeFromRoom` from
 * `$engine/districts/api`, `hitPiece` from `$engine/pieces`). The fixture is loaded inside the
 * test's kit mock, where those imports would bind the engine to the unmocked kit, so the test
 * hands them in once with `useKitOps`.
 */
export interface KitOps {
  removeFromRoom: typeof removeFromRoom;
  hitPiece: typeof hitPiece;
}
let ops: KitOps | null = null;
export const useKitOps = (o: KitOps): void => {
  ops = o;
};
const kit = (): KitOps => {
  if (!ops) throw new Error('Fixture district: call useKitOps first');
  return ops;
};

const num = (v: unknown, d = 0): number => (typeof v === 'number' ? v : d);
const rec = (v: unknown): Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

// ── Rules, one per round-end slot (P8, P9) ──────────────
export type Wind = { runs: number };
export type Sway = { runs: number; windRuns: number };
export type Toll = { runs: number; won: number; span: string | null };

/** `carry` slot (where drift runs): counts round ends; its preview is a meter. */
const wind: BoardRule<Wind> = {
  id: 'bridges:wind',
  slot: 'carry',
  order: 0,
  scope: 'district',
  activatedBy: { kind: 'district' },
  init: () => ({ runs: 0 }),
  step: (_ctx, own) => ({ runs: own.runs + 1 }),
  preview: (_s, own) => [{ kind: 'meter', label: 'Wind', value: own.runs, max: 9 }],
};

/** `afterChemistry` slot: reads the carry rule's state, so it shows the slots' order. */
const sway: BoardRule<Sway> = {
  id: 'bridges:sway',
  slot: 'afterChemistry',
  order: 0,
  scope: 'district',
  activatedBy: { kind: 'district' },
  init: () => ({ runs: 0, windRuns: 0 }),
  step: (ctx, own) => ({
    runs: own.runs + 1,
    windRuns: num(rec(ctx.s.rules?.['bridges:wind']).runs),
  }),
};

/** `late` slot: its config comes from trip state through the heart's `roomSetup` (P7). */
const toll: BoardRule<Toll> = {
  id: 'bridges:toll',
  slot: 'late',
  order: 0,
  scope: 'district',
  activatedBy: { kind: 'district' },
  init: (_s, config) => {
    const c = rec(config);
    return { runs: 0, won: num(c.won), span: typeof c.span === 'string' ? c.span : null };
  },
  step: (_ctx, own) => ({ ...own, runs: own.runs + 1 }),
};

// ── Pieces (P10, P11) ───────────────────────────────────
export type Plank = { arrived: number; turns: number; struck: string[]; hits: number };
const plankOf = (p: TilePiece): Plank => p.data as unknown as Plank;
const tileOf = (s: BattleState, at: { x: number; y: number }) => s.tiles[at.y * s.width + at.x];

/** A piece with every trigger: each one bumps a counter in the piece's own data. */
const plank: PieceDef<Plank> = {
  id: 'bridges:plank',
  token: 'plank',
  solid: 'none',
  data: { init: { arrived: 0, turns: 0, struck: [], hits: 0 } },
  triggers: {
    // onArrive: a unit comes to rest on it (FD's arrival pipeline, `dk:bridges:plank`).
    onArrive: {
      answers: 'landing',
      subjects: ['unit'],
      run: (ctx, a) => {
        const p = tileOf(ctx.s, a.at)?.piece;
        if (p) p.data = { ...plankOf(p), arrived: plankOf(p).arrived + 1 };
        return 'go';
      },
    },
    // onTurnEnd: after the round-end rules, every turn.
    onTurnEnd: (_ctx, _at, p) => {
      p.data = { ...plankOf(p), turns: plankOf(p).turns + 1 };
    },
    // onStruck: damage, a push, a Spark, a basic Shove, Erase or Draw (a Shove makes it strikable).
    onStruck: (_ctx, _at, p, by) => {
      p.data = { ...plankOf(p), struck: [...plankOf(p).struck, by] };
    },
    // onHit: a projectile or area lands on its tile.
    onHit: (_ctx, _at, p) => {
      p.data = { ...plankOf(p), hits: plankOf(p).hits + 1 };
    },
  },
  palette: { label: 'Plank', lab: true },
  art: 'plank',
};

/** Out of the room (P11): a unit landing on the gap falls (`removeFromRoom`, cause `fell`). */
const gap: PieceDef = {
  id: 'bridges:gap',
  token: 'gap',
  solid: 'none',
  exempt: ['flies'],
  triggers: {
    onArrive: {
      answers: 'landing',
      subjects: ['unit'],
      run: (ctx, a) => {
        if (a.subject.kind !== 'unit') return 'go';
        kit().removeFromRoom(ctx, a.subject.unit, 'fell');
        return 'stop';
      },
    },
  },
  aiAvoid: true,
  art: 'gap',
};

// ── Trip state and the trip shape (P3–P7) ───────────────
/** What the trip carries room to room: the span taken, rooms won, the room a term was signed in. */
export type SpanState = { span: string | null; won: number; signedAt: number | null };
const readState = (raw: unknown): SpanState => {
  const r = rec(raw);
  return {
    span: typeof r.span === 'string' ? r.span : null,
    won: num(r.won),
    signedAt: typeof r.signedAt === 'number' ? r.signedAt : null,
  };
};

export const SPANS = { high: [0], low: [1] } as const;

const shape: TripShapeDef<SpanState> = {
  id: 'bridges:span',
  parseState: readState,
  initState: () => ({ span: null, won: 0, signedAt: null }),
  // Terms-like block (P3): a term signed in this room shuts the way home from its Crossroads.
  returnBlocks: ({ state, room }) =>
    state.signedAt === room ? [{ why: 'A signed term holds you here.' }] : [],
  // Span choice (P4): two ways on after room 0, each fixing the next room's variant pool.
  choices: ({ room }) =>
    room === 0
      ? [
          { id: 'high', label: 'The high span', kind: 'push', variantPool: SPANS.high },
          { id: 'low', label: 'The low span', kind: 'push', variantPool: SPANS.low },
        ]
      : [],
  // Trip state into the heart (P7): the heart's late rule is configured from it, and a board edit
  // lays a gap there (edits land after the opening telegraph).
  roomSetup: ({ state, room, length }) =>
    room === length - 1
      ? {
          rulesConfig: { 'bridges:toll': { won: state.won, span: state.span } },
          boardEdits: [{ at: { x: 5, y: 2 }, piece: { id: 'bridges:gap', data: null } }],
        }
      : {},
  // After a won room: count it and note the span taken at the Crossroads before it.
  afterRoom: ({ state, kit, room }) => {
    const before = kit.choices.find((c) => c.after === room - 1)?.id;
    const span = before === 'high' || before === 'low' ? before : state.span;
    return { ...state, won: state.won + 1, span };
  },
};

// ── An offer kind (P6) ──────────────────────────────────
export type TermItem = { kind: 'bridges:term'; data: { room: number } };
const isTerm = (raw: unknown): raw is TermItem =>
  rec(raw).kind === 'bridges:term' && typeof rec(rec(raw).data).room === 'number';

/** A term card after room 0's normal offers: taking it signs the term (trip state). */
const term: OfferKind<TermItem> = {
  id: 'bridges:term',
  roll: (ctx) =>
    ctx.trip.district === 'bridges' && ctx.room === 0
      ? [{ kind: 'bridges:term', data: { room: ctx.room } }]
      : [],
  onPick: (trip, item) => ({
    ...trip,
    loot: [...trip.loot, item],
    ...(trip.kit
      ? {
          kit: {
            ...trip.kit,
            state: { ...readState(trip.kit.state), signedAt: item.data.room },
          },
        }
      : {}),
  }),
  // Banked at home: the term's fee comes back as a vellum.
  onBank: (p) => ({ ...p, vellum: p.vellum + 1 }),
  limitPerTrip: 1,
  parse: (raw) => (isTerm(raw) ? { kind: 'bridges:term', data: { room: raw.data.room } } : null),
  card: 'bridges:term',
};

// ── A hearing kind (P12) ────────────────────────────────
/** Heard when an apprentice fell out of the room in this district (not read by hearing yet). */
const fellHere: HearKind<{ kind: 'bridges:fell' }> = {
  id: 'bridges:fell',
  when: 'battle',
  test: (_c, input) => input.log.some((e) => e.type === 'outOfRoom' && e.unit.member),
};

// ── A stand-in heart (P14) ──────────────────────────────
/** The heart's only step: names the plank's tile, then drops a stone there (`hitPiece`). */
const stone: ScriptStep = {
  id: 'bridges:stone',
  plan: (s) => {
    const i = s.tiles.findIndex((t) => t.piece?.id === 'bridges:plank');
    if (i < 0) return null;
    return { label: 'stone', tiles: [{ x: i % s.width, y: Math.floor(i / s.width) }], units: [] };
  },
  act: (ctx, _unit, tg) => {
    for (const at of tg.tiles) kit().hitPiece(ctx, at);
  },
  describe: () => 'drop a stone',
};

// ── The module (P1) ─────────────────────────────────────
export const FIXTURE_MODULE: DistrictModule = {
  id: 'bridges',
  rules: [wind, sway, toll],
  pieces: [plank, gap],
  offerKinds: [term],
  hearKinds: [fellHere],
  steps: [stone],
  trip: shape,
};
