import type { Ctx } from './ctx';
import { KIT } from './districts';
import type {
  BoardRule,
  Json,
  PreviewShape,
  RoundEndSlot,
  RuleId,
  RuleStates,
  TilePiece,
} from './districts/types';
import type { BattleState, Tile } from './types';

/**
 * Round-end board rules (district-kit P8, P9; DK-3). `turn.ts` runs each slot where its built-in
 * steps sit; inside a slot rules run by `order`, then id. A rule is active when the fight lists it
 * (its state is in `BattleState.rules`) or, if piece-scoped, when the board brings it.
 */

/**
 * Every kit rule, read from `KIT` on first use (as the arrival hooks and offer kinds are), so a
 * test that mocks the kit with a district module gets its rules whatever loaded first.
 */
export const boardRules = (): readonly BoardRule[] => Object.values(KIT.rules);

/** The rules of one slot in run order: `order` ascending, ties by id. */
export function slotRules(slot: RoundEndSlot, rules: readonly BoardRule[]): BoardRule[] {
  return rules
    .filter((r) => r.slot === slot)
    .sort((a, b) => a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** Tiles before DK-4 adds `Tile.piece`. */
const pieceOf = (t: Tile): TilePiece | null =>
  (t as Tile & { piece?: TilePiece | null }).piece ?? null;

/** P9: the board itself switches the rule on (its terrain, its piece, or a piece listing it). */
function brought(rule: BoardRule, s: BattleState): boolean {
  const by = rule.activatedBy;
  return s.tiles.some((t) => {
    if (by.kind === 'terrain' && t.terrain[by.flag]) return true;
    const p = pieceOf(t);
    if (!p) return false;
    if (by.kind === 'piece' && by.pieces.includes(p.id)) return true;
    return !!KIT.pieces[p.id]?.rules?.includes(rule.id);
  });
}

/** Listed for the fight, or (piece scope only) brought by the board. */
export function isRuleActive(rule: BoardRule, s: BattleState): boolean {
  if (s.rules && Object.hasOwn(s.rules, rule.id)) return true;
  return rule.scope === 'piece' && brought(rule, s);
}

/**
 * The fight's rule states with `ids` listed (a district's rules, a room setup's `activate`),
 * each initialised with its config. Pure: returns the new `BattleState.rules`.
 */
export function listRules(
  s: BattleState,
  ids: readonly RuleId[],
  config: Readonly<Record<RuleId, Json>> = {},
  rules: readonly BoardRule[] = boardRules(),
): RuleStates {
  const out: Record<RuleId, Json> = { ...s.rules };
  for (const id of ids) {
    const rule = rules.find((r) => r.id === id);
    if (!rule) throw new Error(`Unknown board rule '${id}'`);
    out[id] = rule.init(s, Object.hasOwn(config, id) ? config[id] : undefined);
  }
  return out;
}

/**
 * DK-IQ D8: the piece-scoped rules the board brings, not yet in `s.rules`, initialised on the
 * board as it stands (battle creation, after a room's board edits), so a rule that snapshots
 * positions sees the battle-start board in round 1. Mutates `s`; adds nothing when none is brought.
 */
export function initBroughtRules(s: BattleState, rules: readonly BoardRule[] = boardRules()): void {
  for (const rule of rules) {
    if (rule.scope !== 'piece' || (s.rules && Object.hasOwn(s.rules, rule.id))) continue;
    if (!brought(rule, s)) continue;
    s.rules = { ...s.rules, [rule.id]: rule.init(s, undefined) };
  }
}

/** Runs one slot's active rules; each rule's returned state replaces its own. */
export function runRuleSlot(
  ctx: Ctx,
  slot: RoundEndSlot,
  rules: readonly BoardRule[] = boardRules(),
): void {
  for (const rule of slotRules(slot, rules)) {
    if (!isRuleActive(rule, ctx.s)) continue;
    const states = ctx.s.rules ?? {};
    const own = Object.hasOwn(states, rule.id)
      ? (states[rule.id] as Json)
      : rule.init(ctx.s, undefined);
    const next = rule.step(ctx, own);
    ctx.s.rules = { ...ctx.s.rules, [rule.id]: next };
  }
}

/** One active rule's "Next round" shapes. */
export interface RulePreview {
  rule: RuleId;
  shapes: readonly PreviewShape[];
}

/** P8: what every active rule will do at the next round end, in run order; never mutates. */
export function rulePreview(
  s: BattleState,
  rules: readonly BoardRule[] = boardRules(),
): RulePreview[] {
  const order: RoundEndSlot[] = ['carry', 'afterChemistry', 'late'];
  return order.flatMap((slot) =>
    slotRules(slot, rules).flatMap((rule) => {
      if (!rule.preview || !isRuleActive(rule, s)) return [];
      const own =
        s.rules && Object.hasOwn(s.rules, rule.id)
          ? (s.rules[rule.id] as Json)
          : rule.init(s, undefined);
      const shapes = rule.preview(s, own);
      return shapes.length ? [{ rule: rule.id, shapes }] : [];
    }),
  );
}
