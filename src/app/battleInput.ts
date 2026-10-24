import type { BasicActionId, LineId } from '$data';
import {
  type Action,
  type ActionResult,
  type Aim,
  actionOf,
  aimPreview,
  applyAction,
  type BattleState,
  basicDirs,
  type Coord,
  castableSpells,
  type Dir,
  findUnit,
  type GameEvent,
  isAlive,
  label,
  legalAims,
  legalMoves,
  type MemberUnit,
  maskPreview,
  members,
  type SpellKey,
  sameAim,
  sameCoord,
  spellOf,
  step,
  type UnitId,
  unitAt,
  witnessedIn,
} from '$engine';
import { type Outcome, outcomeOf, previewSummary } from './describe';

/** The footnote variants the household wrote, by line: the engine reads them (F1). */
export type Footnotes = import('$engine/ctx').FootnoteIds;

/**
 * The battle input state machine: taps in, a new mode (and maybe an action) out. Pure; the
 * expensive engine calls (legal moves, previews) run here, on the tap, never in templates.
 */

/** What the engine calls need besides the state: the footnotes written, and the lines witnessed. */
export interface PreviewCtx {
  footnotes?: Footnotes;
  /** The lines the player has seen fire (D2). Null or left out: nothing is masked. */
  witnessed?: ReadonlySet<LineId> | null;
}

export interface Preview extends Outcome {
  action: Action;
  /** `applyAction` on the current state, discarded unless confirmed. */
  result: ActionResult;
  /** Projectile line (cast), the moved unit's travel (shove, pull). Hop and swap leave it empty: the overlay draws their arcs. */
  path: Coord[];
  /** Tiles the action hits (a Vat's whole 2×2). */
  targets: Coord[];
  /** The events the preview may describe: unwitnessed lines are left out (P41). */
  shown: GameEvent[];
  /** Landing tiles of masked events: drawn blank, with no text (D2). */
  blanks: Coord[];
  /** Party members hurt by the action, masked or not (D3). */
  hurt: UnitId[];
  /** Something unwitnessed would happen: the resulting state must not be drawn from. */
  masked: boolean;
  /** "Stoker will be hurt", or null when the party is safe (D3, P42). */
  warning: string | null;
  summary: string;
}

export type InputMode =
  | { kind: 'idle'; note?: string }
  | { kind: 'member'; unit: UnitId; moves: Coord[]; note?: string }
  | { kind: 'aim'; unit: UnitId; spell: SpellKey; aims: Aim[]; note?: string }
  /** The member's own basic action (Shove, Pull, Hop or Swap): `dirs` are its legal directions. */
  | { kind: 'basic'; unit: UnitId; action: BasicActionId; dirs: Dir[]; note?: string }
  /** spell null = the basic action. `at` is the tile that was tapped to get here (tap it again to confirm). */
  | { kind: 'confirm'; unit: UnitId; spell: SpellKey | null; at: Coord; preview: Preview }
  /** Reading an enemy or a tile; a selected member keeps its reach dots. */
  | { kind: 'inspect'; at: Coord; member: UnitId | null; moves: Coord[] };

export interface InputResult {
  mode: InputMode;
  action?: Action;
}

export const IDLE: InputMode = { kind: 'idle' };

const stay = (mode: InputMode): InputResult => ({ mode });

/** The member a mode is acting for, if any. */
export function selectedOf(mode: InputMode): UnitId | null {
  switch (mode.kind) {
    case 'idle':
      return null;
    case 'inspect':
      return mode.member;
    default:
      return mode.unit;
  }
}

/** Which action button is lit: exactly one spell, or the basic action, or nothing. */
export function activeAction(mode: InputMode): { spell: SpellKey | null; basic: boolean } {
  switch (mode.kind) {
    case 'aim':
      return { spell: mode.spell, basic: false };
    case 'basic':
      return { spell: null, basic: true };
    case 'confirm':
      return { spell: mode.spell, basic: mode.spell === null };
    default:
      return { spell: null, basic: false };
  }
}

/**
 * The member's own basic action and where it can be taken now: nothing once she has acted, off
 * her turn, or out of the room. The engine's `basicDirs` answers for the board alone.
 */
export function basicOf(s: BattleState, id: UnitId): { action: BasicActionId; dirs: Dir[] } | null {
  const m = findUnit(s, id);
  if (m?.kind !== 'member' || !isAlive(m) || s.phase !== 'player' || m.acted) return null;
  const action = actionOf(m);
  if (!action) return null;
  return { action, dirs: basicDirs(s, id) };
}

/** The tile a direction picks out for an action: Pull and Hop reach 2 away, the rest adjacent. */
const reachOf = (action: BasicActionId): number => (action === 'pull' || action === 'hop' ? 2 : 1);

/** Steps `n` tiles from `from` toward `dir`. */
function stepN(from: Coord, dir: Dir, n: number): Coord {
  let c = from;
  for (let i = 0; i < n; i++) c = step(c, dir);
  return c;
}

/**
 * The direction a tapped tile means for an action. Pull and Hop take the tile 2 away (the unit
 * to hook, the landing); the tile between works too, since a thumb aims at the near side.
 */
export function basicDirAt(
  from: Coord,
  action: BasicActionId,
  dirs: readonly Dir[],
  at: Coord,
): Dir | undefined {
  const far = dirs.find((d) => sameCoord(stepN(from, d, reachOf(action)), at));
  if (far || reachOf(action) === 1) return far;
  return dirs.find((d) => sameCoord(step(from, d), at));
}

function livingMember(s: BattleState, id: UnitId): MemberUnit | null {
  const u = findUnit(s, id);
  return u?.kind === 'member' && isAlive(u) ? u : null;
}

export function memberMode(s: BattleState, id: UnitId, note?: string): InputMode {
  if (s.phase !== 'player' || !livingMember(s, id)) return IDLE;
  const mode: InputMode = { kind: 'member', unit: id, moves: legalMoves(s, id) };
  return note ? { ...mode, note } : mode;
}

/** Can this member still do anything this turn? */
export function isReady(s: BattleState, m: MemberUnit): boolean {
  if (!isAlive(m) || s.phase !== 'player') return false;
  if (legalMoves(s, m.id).length > 0) return true;
  if (m.acted) return false;
  return castableSpells(s, m.id).some((c) => c.usable) || (basicOf(s, m.id)?.dirs.length ?? 0) > 0;
}

/** After an action: keep the member if it can still act, else the next ready one, else idle. */
export function afterAction(s: BattleState, prev: InputMode): InputMode {
  if (s.phase !== 'player') return IDLE;
  const cur = selectedOf(prev);
  const m = cur ? livingMember(s, cur) : null;
  if (m && isReady(s, m)) return memberMode(s, m.id);
  const next = members(s).find((x) => x.id !== cur && isReady(s, x));
  return next ? memberMode(s, next.id) : IDLE;
}

/** The aim a tapped tile stands for, if it is legal. */
export function aimAt(s: BattleState, unit: UnitId, spell: SpellKey, at: Coord): Aim | null {
  const m = livingMember(s, unit);
  const sp = m ? spellOf(m, spell) : null;
  if (!m || !sp) return null;
  const legal = legalAims(s, unit, spell);
  let aim: Aim | null = null;
  switch (sp.source) {
    case 'bolt': {
      if (sameCoord(m.pos, at)) return null;
      if (at.x === m.pos.x) aim = { kind: 'dir', dir: at.y < m.pos.y ? 'up' : 'down' };
      else if (at.y === m.pos.y) aim = { kind: 'dir', dir: at.x < m.pos.x ? 'left' : 'right' };
      break;
    }
    case 'splash':
    case 'vat':
      aim = { kind: 'tile', at: { ...at } };
      break;
    case 'touch':
      aim = sameCoord(m.pos, at) ? { kind: 'self' } : { kind: 'tile', at: { ...at } };
      break;
  }
  return aim && legal.some((a) => sameAim(a, aim)) ? aim : null;
}

function travelOf(before: BattleState, after: BattleState, id: UnitId): Coord[] {
  const a = findUnit(before, id)?.pos;
  const b = findUnit(after, id)?.pos;
  if (!a || !b || sameCoord(a, b)) return [];
  if (a.x !== b.x && a.y !== b.y) return [{ ...a }, { ...b }];
  const sx = Math.sign(b.x - a.x);
  const sy = Math.sign(b.y - a.y);
  const path: Coord[] = [{ ...a }];
  for (let c = a; !sameCoord(c, b); ) {
    c = { x: c.x + sx, y: c.y + sy };
    path.push(c);
  }
  return path;
}

/** The 2×2 a Vat aimed at `at` covers (top-left anchor), clipped to the board. */
function vatFootprint(s: BattleState, at: Coord): Coord[] {
  return [at, { x: at.x + 1, y: at.y }, { x: at.x, y: at.y + 1 }, { x: at.x + 1, y: at.y + 1 }]
    .filter((c) => c.x >= 0 && c.y >= 0 && c.x < s.width && c.y < s.height)
    .map((c) => ({ ...c }));
}

/** "Stoker will be hurt", "Stoker and Draughtsman will be hurt". The amount and cause stay unsaid. */
export function hurtWarning(s: BattleState, hurt: readonly UnitId[]): string | null {
  const names = hurt.flatMap((id) => findUnit(s, id)?.name ?? []);
  if (names.length === 0) return null;
  return `${names.join(' and ')} will be hurt`;
}

/**
 * Applies the action to a copy and reads off what would happen. The engine runs in full, but
 * only the witnessed part is described (D2/P41); party harm always shows (D3/P42).
 */
export function previewOf(s: BattleState, action: Action, ctx: PreviewCtx = {}): Preview {
  const result = applyAction(s, action, ctx.footnotes ?? {});
  const party = members(s).map((m) => m.id);
  const seen = ctx.witnessed ?? new Set(witnessedIn(result.events));
  const { shown, blanks, hurt } = maskPreview(result.events, seen, party);
  const masked = shown.length < result.events.length;
  let path: Coord[] = [];
  let targets: Coord[] = [];
  if (action.type === 'cast') {
    const p = aimPreview(s, action.unit, action.spell, action.aim, ctx.footnotes);
    const caster = findUnit(s, action.unit);
    const spell = caster?.kind === 'member' ? spellOf(caster, action.spell) : null;
    path = p.path.length && caster ? [{ ...caster.pos }, ...p.path] : [];
    targets =
      spell?.source === 'vat' && action.aim.kind === 'tile'
        ? vatFootprint(s, action.aim.at)
        : p.targets;
  } else if (action.type === 'shove' || action.type === 'pull' || action.type === 'swap') {
    const m = findUnit(s, action.unit);
    const reach = reachOf(action.type);
    const at = m ? stepN(m.pos, action.dir, reach) : null;
    const target = at ? unitAt(s, at) : null;
    if (at && !target) {
      // A shoved piece answers where it stands (DK-4): the tile is the target, nothing travels.
      targets = [{ ...at }];
    } else if (target) {
      targets = [{ ...target.pos }];
      const pushed = shown.find((e) => e.type === 'push' && e.unit.id === target.id);
      path =
        action.type === 'swap'
          ? []
          : !masked
            ? travelOf(s, result.state, target.id)
            : pushed?.type === 'push' && pushed.path.length
              ? [{ ...target.pos }, ...pushed.path.map((c) => ({ ...c }))]
              : [];
    }
  }
  const warning = hurtWarning(s, hurt);
  const base = previewSummary(s, action, shown, masked);
  return {
    action,
    result,
    path,
    targets,
    shown,
    blanks,
    hurt,
    masked,
    warning,
    ...outcomeOf(shown),
    summary: warning ? `${base}. ${warning}` : base,
  };
}

function toConfirm(
  s: BattleState,
  unit: UnitId,
  spell: SpellKey | null,
  at: Coord,
  action: Action,
  ctx: PreviewCtx,
): InputMode {
  return {
    kind: 'confirm',
    unit,
    spell,
    at: { ...at },
    preview: previewOf(s, action, ctx),
  };
}

/** Tapping a living member always selects it (except as a legal aim, handled first). */
function selectIfMember(s: BattleState, at: Coord): InputResult | null {
  const u = unitAt(s, at);
  return u?.kind === 'member' ? stay(memberMode(s, u.id)) : null;
}

function inspect(s: BattleState, at: Coord, member: UnitId | null): InputMode {
  return {
    kind: 'inspect',
    at: { ...at },
    member,
    moves: member ? legalMoves(s, member) : [],
  };
}

function tapAim(
  s: BattleState,
  unit: UnitId,
  spell: SpellKey,
  at: Coord,
  aims: Aim[],
  ctx: PreviewCtx,
): InputResult {
  const aim = aimAt(s, unit, spell, at);
  if (aim) return stay(toConfirm(s, unit, spell, at, { type: 'cast', unit, spell, aim }, ctx));
  const caster = livingMember(s, unit);
  if (caster && sameCoord(caster.pos, at)) return stay(memberMode(s, unit));
  const other = selectIfMember(s, at);
  if (other) return other;
  const sp = caster ? spellOf(caster, spell) : null;
  const why =
    sp?.source === 'bolt'
      ? `${label(at)} is not in a straight line.`
      : sp?.source === 'touch'
        ? `${label(at)} is not next to you.`
        : `${label(at)} is out of range.`;
  return stay({ kind: 'aim', unit, spell, aims, note: why });
}

const BASIC_NOUN: Record<BasicActionId, string> = {
  shove: 'an adjacent unit can be shoved',
  pull: 'a unit exactly 2 tiles away in a straight line can be pulled',
  hop: 'a free tile exactly 2 tiles away in a straight line can be hopped to',
  swap: 'an adjacent unit can be swapped with',
};

function tapBasic(
  s: BattleState,
  unit: UnitId,
  action: BasicActionId,
  at: Coord,
  dirs: Dir[],
  ctx: PreviewCtx,
): InputResult {
  const m = livingMember(s, unit);
  const dir = m ? basicDirAt(m.pos, action, dirs, at) : undefined;
  if (m && dir) {
    const act: Action = { type: action, unit, dir };
    return stay(toConfirm(s, unit, null, at, act, ctx));
  }
  if (m && sameCoord(m.pos, at)) return stay(memberMode(s, unit));
  const other = selectIfMember(s, at);
  if (other) return other;
  const why = `Only ${BASIC_NOUN[action]}.`;
  return stay({ kind: 'basic', unit, action, dirs, note: why });
}

export function onCell(
  s: BattleState,
  mode: InputMode,
  at: Coord,
  ctx: PreviewCtx = {},
): InputResult {
  if (s.phase !== 'player') return stay(IDLE);
  switch (mode.kind) {
    case 'idle':
      return selectIfMember(s, at) ?? stay(inspect(s, at, null));
    case 'inspect':
    case 'member': {
      const unit = mode.kind === 'member' ? mode.unit : mode.member;
      if (unit && mode.moves.some((c) => sameCoord(c, at))) {
        return { mode: memberMode(s, unit), action: { type: 'move', unit, to: { ...at } } };
      }
      const u = unitAt(s, at);
      if (u?.kind === 'member') {
        // Tapping the selected member again puts it down.
        if (mode.kind === 'member' && u.id === mode.unit) return stay(IDLE);
        return stay(memberMode(s, u.id));
      }
      // Tapping the inspected tile again closes the readout.
      if (mode.kind === 'inspect' && sameCoord(mode.at, at)) {
        return stay(unit ? memberMode(s, unit) : IDLE);
      }
      return stay(inspect(s, at, unit));
    }
    case 'aim':
      return tapAim(s, mode.unit, mode.spell, at, mode.aims, ctx);
    case 'basic':
      return tapBasic(s, mode.unit, mode.action, at, mode.dirs, ctx);
    case 'confirm': {
      if (mode.spell !== null) {
        // Only the tapped tile confirms: tapping further along a Bolt's line re-reads it instead.
        if (sameCoord(mode.at, at)) return { mode, action: mode.preview.action };
        return tapAim(s, mode.unit, mode.spell, at, legalAims(s, mode.unit, mode.spell), ctx);
      }
      if (sameCoord(mode.at, at)) return { mode, action: mode.preview.action };
      const own = basicOf(s, mode.unit);
      if (!own) return stay(memberMode(s, mode.unit));
      return tapBasic(s, mode.unit, own.action, at, own.dirs, ctx);
    }
  }
}

export function onMember(s: BattleState, mode: InputMode, id: UnitId): InputResult {
  if (s.phase !== 'player') return stay(IDLE);
  if (selectedOf(mode) === id && mode.kind === 'member') return stay(mode);
  return stay(memberMode(s, id));
}

/** Spell button. Pressing the active spell again steps back to the member. */
export function onSpell(
  s: BattleState,
  mode: InputMode,
  key: SpellKey,
  ctx: PreviewCtx = {},
): InputResult {
  const unit = selectedOf(mode);
  if (!unit || s.phase !== 'player') return stay(mode);
  if ((mode.kind === 'aim' || mode.kind === 'confirm') && mode.spell === key) {
    return stay(memberMode(s, unit));
  }
  const entry = castableSpells(s, unit).find((c) => c.spell.key === key);
  const m = livingMember(s, unit);
  if (!entry || !m) return stay(mode);
  if (!entry.usable) {
    const why = m.acted ? `${m.name} has already acted.` : 'No charges left.';
    return stay(memberMode(s, unit, why));
  }
  const aims = legalAims(s, unit, key);
  const only = aims.length === 1 ? aims[0] : undefined;
  if (only) {
    const at =
      only.kind === 'tile' ? only.at : only.kind === 'self' ? m.pos : step(m.pos, only.dir);
    return stay(toConfirm(s, unit, key, at, { type: 'cast', unit, spell: key, aim: only }, ctx));
  }
  return stay({ kind: 'aim', unit, spell: key, aims });
}

/** The member's basic-action button. Pressing it again steps back to the member. */
export function onBasic(s: BattleState, mode: InputMode): InputResult {
  const unit = selectedOf(mode);
  const m = unit ? livingMember(s, unit) : null;
  if (!unit || !m || s.phase !== 'player') return stay(mode);
  if (mode.kind === 'basic' || (mode.kind === 'confirm' && mode.spell === null)) {
    return stay(memberMode(s, unit));
  }
  const action = actionOf(m);
  if (!action) return stay(memberMode(s, unit, `${m.name} has no action but her spells.`));
  if (m.acted) return stay(memberMode(s, unit, `${m.name} has already acted.`));
  const dirs = basicDirs(s, unit);
  if (dirs.length === 0) {
    return stay(memberMode(s, unit, `Nothing in reach to ${action}.`));
  }
  return stay({ kind: 'basic', unit, action, dirs });
}

export function onConfirm(_s: BattleState, mode: InputMode): InputResult {
  return mode.kind === 'confirm' ? { mode, action: mode.preview.action } : stay(mode);
}

/** One step back: confirm → aim/basic → member → idle. */
export function onCancel(s: BattleState, mode: InputMode): InputResult {
  switch (mode.kind) {
    case 'confirm': {
      if (mode.spell === null) {
        const own = basicOf(s, mode.unit);
        if (!own) return stay(memberMode(s, mode.unit));
        return stay({ kind: 'basic', unit: mode.unit, action: own.action, dirs: own.dirs });
      }
      const aims = legalAims(s, mode.unit, mode.spell);
      if (aims.length <= 1) return stay(memberMode(s, mode.unit));
      return stay({ kind: 'aim', unit: mode.unit, spell: mode.spell, aims });
    }
    case 'aim':
    case 'basic':
      return stay(memberMode(s, mode.unit));
    case 'inspect':
      return stay(mode.member ? memberMode(s, mode.member) : IDLE);
    default:
      return stay(IDLE);
  }
}

/** End turn needs a second tap while someone could still act. */
export function endTurnNeedsConfirm(s: BattleState): boolean {
  return unspentCasters(s).length > 0;
}

/** Names of members who could still cast this turn: a usable spell with a legal aim. */
export function unspentCasters(s: BattleState): string[] {
  return members(s)
    .filter(
      (m) =>
        isAlive(m) &&
        !m.acted &&
        castableSpells(s, m.id).some((c) => c.usable && legalAims(s, m.id, c.spell.key).length > 0),
    )
    .map((m) => m.name);
}
