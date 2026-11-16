import { DEFAULT_PENCIL, type PencilConfig } from '$data/districts/cartographers/types';
import { type Ctx, checkEnd, emit, ref, withLine } from '../../ctx';
import { hasFootnote } from '../../footnotes';
import { type Coord, neighbors4, sameCoord } from '../../grid';
import { sameSide } from '../../habits';
import { guardCancels } from '../../harm';
import { removeFromRoom } from '../../outOfRoom';
import { blocksUnits, coordOf, findUnit, inBoard, isAlive, members, tileAt } from '../../queries';
import { trickResists } from '../../rivals/tricks';
import { createRng, deriveSeed, type Rng } from '../../rng';
import type { BattleState, Tile } from '../../types';
import type { BoardRule, Json, PreviewShape, SwapMeet } from '../types';
import { carryPaper, inkOutlines, outlineBlocked, outlineTiles } from './paper';
import {
  BLANK_PIECE,
  type CircledEvent,
  type Fate,
  GUILD_HAND_RULE_ID,
  type GuildHandState,
  HAND_SALT,
  type InkedEvent,
  isFate,
  type NoteCircle,
  OUTLINE_PIECE,
  PENCIL_PIECE,
  PENCIL_RULE_ID,
  type PencilData,
  type RubbedOutEvent,
  type StruckEvent,
} from './types';

/**
 * The guild's hand (cartographers-plan P3, P4; CG-2): a `late` round-end rule that resolves the
 * pencil due this round (`ink` makes the tile real paper, `rub` turns it blank and erases whoever
 * stands there), leaves the outlines to CG-4, then plans the next round: which unplanned pencil
 * falls due and with what fate. The plan is written onto the pencil pieces (`fate`, `due`), so
 * what the preview reads is what the next step does: no roll happens while resolving.
 *
 * The stream is `deriveSeed(own.seed, HAND_SALT + due - 1)`, one draw sequence per planned round.
 * A battle has no stable seed of its own, so `init` keeps the config's `seed` or else the battle's
 * `rngState` at listing. The first plan (due round 1) cannot be made at `init` (a room's board
 * edits land after the rules are listed), so it is made at the first settle point or round end,
 * and the preview computes it ahead until then. That first plan draws no `redraw`: new pencil
 * is only ever added by a round end's plan, so it never appears mid-turn.
 */

// ── Reading the board ───────────────────────────────────
const keyOf = (c: Coord): string => `${c.x},${c.y}`;

/** A pencil piece's data, read forgivingly (a hand-built Lab state). */
function pencilData(raw: Json | undefined): PencilData {
  const r = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const fate = 'fate' in r && isFate(r.fate) ? r.fate : null;
  const due =
    'due' in r && typeof r.due === 'number' && Number.isSafeInteger(r.due) && r.due > 0
      ? r.due
      : null;
  return { fate, due };
}

interface Pencil {
  at: Coord;
  data: PencilData;
}

/** Every pencil tile in reading order. */
function pencilTiles(s: BattleState): Pencil[] {
  const out: Pencil[] = [];
  s.tiles.forEach((t, i) => {
    if (t.piece?.id === PENCIL_PIECE)
      out.push({ at: coordOf(s, i), data: pencilData(t.piece.data) });
  });
  return out;
}

/** A tile a unit can be set on: not a plate, gate, grate, solid piece, drop or water. */
const standable = (t: Tile): boolean => !blocksUnits(t) && !t.terrain.drop && !t.terrain.water;

// ── The rule's state ────────────────────────────────────
const fraction = (v: unknown, d: number): number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1 ? v : d;

/** A room's pencil config; anything out of range or missing reads as `DEFAULT_PENCIL`'s field. */
export function readPencilConfig(config: unknown): PencilConfig {
  const c = config && typeof config === 'object' && !Array.isArray(config) ? config : {};
  const get = (k: string): unknown => (k in c ? (c as Record<string, unknown>)[k] : undefined);
  const redraw = get('redraw');
  return {
    share: fraction(get('share'), DEFAULT_PENCIL.share),
    perRound: fraction(get('perRound'), DEFAULT_PENCIL.perRound),
    inkBias: fraction(get('inkBias'), DEFAULT_PENCIL.inkBias),
    redraw:
      typeof redraw === 'number' && Number.isSafeInteger(redraw) && redraw >= 0
        ? redraw
        : DEFAULT_PENCIL.redraw,
  };
}

const safeInt = (v: unknown): number | null =>
  typeof v === 'number' && Number.isSafeInteger(v) ? v : null;

export function initGuildHandState(s: BattleState, config: Json | undefined): GuildHandState {
  const seed = safeInt(
    config && typeof config === 'object' ? (config as Json & { seed?: unknown }).seed : null,
  );
  return { ...readPencilConfig(config), planned: 0, seed: seed ?? s.rngState };
}

/** A saved state read forgivingly. */
export function parseGuildHand(raw: unknown): GuildHandState {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const planned = safeInt(r.planned);
  const seed = safeInt(r.seed);
  const circles = readCircles(r.circles);
  return {
    ...readPencilConfig(raw),
    planned: planned !== null && planned > 0 ? planned : 0,
    ...(seed !== null ? { seed } : {}),
    ...(circles.length > 0 ? { circles } : {}),
  };
}

const isCoord = (v: unknown): v is Coord =>
  !!v &&
  typeof v === 'object' &&
  safeInt((v as Record<string, unknown>).x) !== null &&
  safeInt((v as Record<string, unknown>).y) !== null;

/** The note's circles, read forgivingly (anything malformed is dropped). */
function readCircles(raw: unknown): NoteCircle[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((c: unknown): NoteCircle[] => {
    const r = c && typeof c === 'object' ? (c as Record<string, unknown>) : {};
    return isCoord(r.at) && typeof r.unit === 'string' && typeof r.holder === 'string'
      ? [{ at: { x: r.at.x, y: r.at.y }, unit: r.unit, holder: r.holder }]
      : [];
  });
}

const handListed = (s: BattleState): boolean =>
  !!s.rules && Object.hasOwn(s.rules, GUILD_HAND_RULE_ID);

// ── Planning (P3, P4) ───────────────────────────────────
interface Assigned {
  at: Coord;
  fate: Fate;
  due: number;
}
interface Plan {
  fates: Assigned[];
  outlines: { at: Coord; foe: string; due: number }[];
  redraw: Coord[];
}

function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    const a = out[i] as T;
    out[i] = out[j] as T;
    out[j] = a;
  }
  return out;
}

/**
 * P4's strand guard: would rubbing `rubbed` out leave a living member (one with a standable
 * 4-neighbour now) with none? Positions are those on the board at planning time.
 */
function strands(s: BattleState, rubbed: ReadonlySet<string>): boolean {
  return members(s)
    .filter(isAlive)
    .some((m) => {
      const open = (gone: ReadonlySet<string>): boolean =>
        neighbors4(m.pos).some(
          (n) => inBoard(s, n) && standable(tileAt(s, n)) && !gone.has(keyOf(n)),
        );
      return open(new Set()) && !open(rubbed);
    });
}

/**
 * The plan for the round end `due` (pure: nothing on the board changes). Pencil with a fixed fate
 * and no due falls due now; of the unplanned pencil `ceil(perRound × count)` tiles (a seeded draw
 * over reading order) fall due, each ink with chance `inkBias`, a rub turned to ink where it would
 * strand a member; `redraw` new pencil tiles are added on plain floor beside pencil or blank.
 */
export function planDue(s: BattleState, own: GuildHandState, due: number, withRedraw = true): Plan {
  const rng = createRng(deriveSeed(own.seed ?? 0, HAND_SALT + due - 1));
  const pencil = pencilTiles(s);
  const fates: Assigned[] = [];
  const rubbing = new Set<string>();
  for (const p of pencil) {
    if (p.data.fate === 'rub' && p.data.due === due) rubbing.add(keyOf(p.at));
    if (p.data.fate !== null && p.data.due === null) {
      fates.push({ at: p.at, fate: p.data.fate, due });
      if (p.data.fate === 'rub') rubbing.add(keyOf(p.at));
    }
  }
  const unplanned = pencil.filter((p) => p.data.fate === null);
  const take = Math.min(unplanned.length, Math.ceil(own.perRound * unplanned.length - 1e-9));
  const picked = new Set(
    shuffle(rng, unplanned)
      .slice(0, take)
      .map((p) => keyOf(p.at)),
  );
  for (const p of unplanned) {
    if (!picked.has(keyOf(p.at))) continue;
    let fate: Fate = rng.next() < own.inkBias ? 'ink' : 'rub';
    if (fate === 'rub') {
      const next = new Set(rubbing).add(keyOf(p.at));
      if (strands(s, next)) fate = 'ink';
      else rubbing.add(keyOf(p.at));
    }
    fates.push({ at: p.at, fate, due });
  }

  const redraw: Coord[] = [];
  if (withRedraw && own.redraw > 0) {
    const paper = new Set(
      s.tiles.flatMap((t, i) =>
        t.piece?.id === PENCIL_PIECE || t.piece?.id === BLANK_PIECE ? [keyOf(coordOf(s, i))] : [],
      ),
    );
    const beside: Coord[] = [];
    s.tiles.forEach((t, i) => {
      const at = coordOf(s, i);
      if (t.piece || !standable(t)) return;
      if (neighbors4(at).some((n) => paper.has(keyOf(n)))) beside.push(at);
    });
    redraw.push(...shuffle(rng, beside).slice(0, own.redraw));
  }
  // Outlines still unplanned fall due this plan's round (an authored `@n` keeps its own).
  const outlines = outlineTiles(s)
    .filter((o) => o.data.due === null)
    .map((o) => ({ at: o.at, foe: o.data.foe, due }));
  return { fates, outlines, redraw };
}

/** Writes a plan onto the board: the pencil's fates and dues, and any new unplanned pencil. */
function applyPlan(s: BattleState, plan: Plan): void {
  for (const f of plan.fates) {
    tileAt(s, f.at).piece = { id: PENCIL_PIECE, data: { fate: f.fate, due: f.due } };
  }
  for (const o of plan.outlines) {
    tileAt(s, o.at).piece = { id: OUTLINE_PIECE, data: { foe: o.foe, due: o.due } };
  }
  for (const at of plan.redraw) {
    tileAt(s, at).piece = { id: PENCIL_PIECE, data: { fate: null, due: null } };
  }
}

// ── Resolving (P3) ──────────────────────────────────────
/** Rubs a pencil tile out: it turns blank, what it held is gone and whoever stood on it is erased. */
function rubOut(ctx: Ctx, at: Coord, round: number): void {
  const s = ctx.s;
  const tile = tileAt(s, at);
  tile.piece = { id: BLANK_PIECE, data: {} };
  const units = s.units.filter((u) => isAlive(u) && sameCoord(u.pos, at));
  const ev: RubbedOutEvent = {
    type: 'cartographers:rubbedOut',
    at: { ...at },
    data: { round, units: units.map((u) => u.id) },
  };
  emit(ctx, ev);
  if (tile.state) {
    tile.state = null;
    emit(ctx, { type: 'stateFades', tiles: [{ ...at }] });
  }
  if (tile.jar) {
    tile.jar = null;
    emit(ctx, { type: 'jarCrumbles', at: { ...at } });
  }
  for (const u of units) removeFromRoom(ctx, u, 'erased');
}

/** Inks a pencil tile in: it is real paper from now on. */
export function inkPencil(ctx: Ctx, at: Coord, round: number): void {
  tileAt(ctx.s, at).piece = null;
  const ev: InkedEvent = { type: 'cartographers:inked', at: { ...at }, data: { round } };
  emit(ctx, ev);
}

/** Resolves every pencil tile due `round`, in reading order; true when a tile was rubbed out. */
export function resolveDue(ctx: Ctx, round: number): boolean {
  let rubbed = false;
  for (const p of pencilTiles(ctx.s)) {
    if (p.data.fate === null || p.data.due !== round) continue;
    if (p.data.fate === 'ink') {
      inkPencil(ctx, p.at, round);
    } else {
      rubOut(ctx, p.at, round);
      rubbed = true;
    }
  }
  if (rubbed) checkEnd(ctx);
  return rubbed;
}

/** The first plan, when none was drawn yet for this round (see the file note). */
function planNow(s: BattleState, own: GuildHandState): GuildHandState {
  if (s.phase !== 'player' || own.planned >= s.round) return own;
  applyPlan(s, planDue(s, own, s.round, false));
  return { ...own, planned: s.round };
}

// ── The Registrar's note (`registrar:swap`, CG-J) ───────
const isPencilAt = (s: BattleState, at: Coord): boolean =>
  inBoard(s, at) && tileAt(s, at).piece?.id === PENCIL_PIECE;

/**
 * A Swap traded places (`DistrictModule.swapAt`): the `swap:unit` footnotes, when either tile of
 * the pair holds pencil. Only a member's Swap is read; the foe is whichever of the pair stands on
 * the other side.
 */
export function swapPaper(ctx: Ctx, m: SwapMeet): void {
  const caster = findUnit(ctx.s, m.caster);
  const other = findUnit(ctx.s, m.other);
  if (!caster || !other || caster.kind !== 'member') return;
  if (!isPencilAt(ctx.s, m.a) && !isPencilAt(ctx.s, m.b)) return;
  const fn = (id: Parameters<typeof hasFootnote>[1]): boolean => hasFootnote(ctx, id);
  withLine(ctx, 'swap:unit', () => {
    if (fn('swap-unit-carry')) carryPaper(ctx.s, m.a, m.b);
    const foe = !sameSide(caster, other) && isAlive(other) ? other : null;
    const foeOnPencil = foe !== null && isPencilAt(ctx.s, foe.pos);
    if (foe && foeOnPencil && fn('swap-unit-strand')) {
      const hold = { kind: 'hold', unit: foe.id, harm: null } as const;
      if (!trickResists(ctx, foe, 'hold') && !guardCancels(ctx, foe, hold, 'Swap')) {
        foe.held = Math.max(foe.held, 1);
        emit(ctx, { type: 'held', unit: ref(foe), rounds: foe.held });
      }
    }
    if (fn('swap-unit-ink') && isAlive(caster) && isPencilAt(ctx.s, caster.pos)) {
      inkPencil(ctx, caster.pos, ctx.s.round);
    }
    if (fn('swap-unit-due')) {
      for (const at of [m.a, m.b]) {
        const piece = isPencilAt(ctx.s, at) ? tileAt(ctx.s, at).piece : null;
        const d = piece ? pencilData(piece.data) : null;
        if (piece && d && d.fate !== null && d.due !== null) {
          piece.data = { fate: d.fate, due: d.due + 1 };
        }
      }
    }
    if (foe && foeOnPencil && isPencilAt(ctx.s, foe.pos) && fn('registrar:swap')) {
      circle(ctx, { at: { ...foe.pos }, unit: foe.id, holder: caster.id });
    }
  });
}

/** Adds a circle to the hand's state (one per foe) and says so; nothing outside the hall (no hand listed). */
function circle(ctx: Ctx, c: NoteCircle): void {
  if (!handListed(ctx.s)) return;
  const own = parseGuildHand(ctx.s.rules?.[GUILD_HAND_RULE_ID]);
  const circles = [...(own.circles ?? []).filter((x) => x.unit !== c.unit), c];
  const next: GuildHandState = { ...own, circles };
  ctx.s.rules = { ...ctx.s.rules, [GUILD_HAND_RULE_ID]: next as unknown as Json };
  const foe = findUnit(ctx.s, c.unit);
  const ev: CircledEvent = {
    type: 'cartographers:circled',
    at: { ...c.at },
    ...(foe ? { unit: ref(foe) } : {}),
    data: { holder: c.holder, units: [c.unit] },
  };
  emit(ctx, ev);
}

/**
 * The round end's first step: each circled foe still on its tile is erased from the fight, unless
 * its holder has fallen. Whoever stepped off is let go.
 */
function closeCircles(ctx: Ctx, circles: readonly NoteCircle[]): void {
  const hit = circles.flatMap((c) => {
    const foe = findUnit(ctx.s, c.unit);
    const holder = findUnit(ctx.s, c.holder);
    return foe && isAlive(foe) && sameCoord(foe.pos, c.at) && holder && isAlive(holder)
      ? [foe]
      : [];
  });
  const first = hit[0];
  if (!first) return;
  const ev: StruckEvent = {
    type: 'cartographers:struck',
    at: { ...first.pos },
    data: { units: hit.map((u) => u.id), tiles: hit.map((u) => ({ ...u.pos })) },
  };
  emit(ctx, ev);
  for (const u of hit) removeFromRoom(ctx, u, 'erased');
  checkEnd(ctx);
}

/** One round end: the note's circles, resolve, outlines, plan the next round. */
export function guildHandStep(ctx: Ctx, raw: unknown): GuildHandState {
  const round = ctx.s.round;
  const { circles, ...held } = parseGuildHand(raw);
  const own = planNow(ctx.s, held);
  closeCircles(ctx, circles ?? []);
  resolveDue(ctx, round);
  inkOutlines(ctx, round);
  if (ctx.s.phase !== 'player') return own;
  const next = { ...own, planned: round + 1 };
  applyPlan(ctx.s, planDue(ctx.s, next, round + 1));
  return next;
}

/** What the next round end does to each pencil tile: the planned fate, or the one still to be drawn. */
export function guildHandPreview(s: BattleState, raw: unknown): PreviewShape[] {
  const own = parseGuildHand(raw);
  const ahead = own.planned < s.round ? planDue(s, own, s.round, false).fates : [];
  const drawn = new Map(ahead.map((f) => [keyOf(f.at), f]));
  const out: PreviewShape[] = [];
  for (const p of pencilTiles(s)) {
    const f = drawn.get(keyOf(p.at));
    const fate = f ? f.fate : p.data.fate;
    const due = f ? f.due : p.data.due;
    if (fate === null || due !== s.round) continue;
    out.push({ kind: 'tile', at: { ...p.at }, tone: fate === 'rub' ? 'erased' : 'drawn' });
  }
  const planned = new Map(
    (own.planned < s.round ? planDue(s, own, s.round, false).outlines : []).map((o) => [
      keyOf(o.at),
      o.due,
    ]),
  );
  for (const o of outlineTiles(s)) {
    const due = planned.get(keyOf(o.at)) ?? o.data.due;
    if (due !== s.round) continue;
    // A unit standing on it holds the inking back a round.
    out.push({
      kind: 'tile',
      at: { ...o.at },
      tone: outlineBlocked(s, o.at) ? 'warn' : 'drawn',
    });
  }
  return out;
}

export const GUILD_HAND_RULE: BoardRule<GuildHandState> = {
  id: GUILD_HAND_RULE_ID,
  slot: 'late',
  order: 60,
  scope: 'district',
  activatedBy: { kind: 'district' },
  init: (s, config) => initGuildHandState(s, config),
  step: guildHandStep,
  settle: (ctx, own) => {
    const g = parseGuildHand(own);
    const next = planNow(ctx.s, g);
    return next === g ? own : next;
  },
  preview: guildHandPreview,
};

/**
 * The pencil piece's own rule: any board with a pencil brings it, so a Lab or Bench pencil with a
 * fixed fate resolves at its due round. Where the guild's hand is listed this does nothing (the
 * hand resolves and plans), and it never plans.
 */
export const PENCIL_RULE: BoardRule = {
  id: PENCIL_RULE_ID,
  slot: 'late',
  order: 60,
  scope: 'piece',
  activatedBy: { kind: 'piece', pieces: [PENCIL_PIECE, OUTLINE_PIECE] },
  init: () => ({}),
  step: (ctx, own) => {
    if (!handListed(ctx.s)) {
      resolveDue(ctx, ctx.s.round);
      inkOutlines(ctx, ctx.s.round);
    }
    return own;
  },
  preview: (s, own) =>
    handListed(s) ? [] : guildHandPreview(s, { ...(own as object), planned: s.round }),
};
