import type { Ctx, DraftOptions } from './ctx';
import { hasFootnote } from './footnotes';
import type { Coord, Dir } from './grid';
import { isCloud, tileAt, unitAt } from './queries';
import { axisToward, targetOn } from './targets';
import type { BattleState, Target, Unit } from './types';
import { targetKey } from './types';
import { vatLost, vatOrigin, vatRing, vatTiles } from './vat';

/** What a Vat cast adds around its steps (bathhouses margins, BH-F3). */
type Notes = NonNullable<DraftOptions['footnotes']>;

export interface VatPlan {
  /** Negative: `vat-edge-press` makes the rest stronger by the tiles the edge cost (at most 2). */
  weaker: number;
  /** `vat-cap-room`: the ring, with its outward headings; empty unless every tile holds a cloud. */
  ring: { targets: Target[]; headings: Map<string, Dir | null> } | null;
  /** `vat-unit-fill`: the tiles that were empty when the Vat was aimed. */
  fill: Coord[];
  /** `vat-cap-crowd`: the foes in the Vat when there are two or more of them. */
  crowd: Unit[];
}

/** What the cast adds around its steps, decided from the board as the Vat is aimed. */
export function vatPlan(s: BattleState, caster: Unit, aimAt: Coord, footnotes: Notes): VatPlan {
  const fn = (id: Parameters<typeof hasFootnote>[1]) => hasFootnote({ footnotes }, id);
  const o = vatOrigin(s, aimAt, footnotes);
  const tiles = vatTiles(s, o);
  const lost = vatLost(s, aimAt);
  const plan: VatPlan = {
    weaker: fn('vat-edge-press') && lost > 0 ? -Math.min(2, lost) : 0,
    ring: null,
    fill: [],
    crowd: [],
  };
  if (fn('vat-unit-fill')) {
    plan.fill = tiles;
  }
  if (fn('vat-cap-crowd')) {
    const foes = new Map<string, Unit>();
    for (const c of tiles) {
      const u = unitAt(s, c);
      if (u && u.kind !== caster.kind) foes.set(u.id, u);
    }
    if (foes.size >= 2) plan.crowd = [...foes.values()];
  }
  if (fn('vat-cap-room') && tiles.length === 4 && tiles.every((c) => isCloud(tileAt(s, c)))) {
    const centre = { x: o.x + 0.5, y: o.y + 0.5 };
    const inward = axisToward(caster.pos, { x: o.x + 1, y: o.y + 1 });
    const ringTargets: Target[] = [];
    const ringHeadings = new Map<string, Dir | null>();
    for (const c of vatRing(s, o)) {
      const t = targetOn(s, c);
      const dx = c.x - centre.x;
      const dy = c.y - centre.y;
      const way: Dir | null =
        Math.abs(dx) === Math.abs(dy)
          ? inward
          : Math.abs(dx) > Math.abs(dy)
            ? dx < 0
              ? 'left'
              : 'right'
            : dy < 0
              ? 'up'
              : 'down';
      ringTargets.push(t);
      ringHeadings.set(targetKey(t), way);
    }
    plan.ring = { targets: ringTargets, headings: ringHeadings };
  }
  return plan;
}

/** A lone thin cloud helper for the plan's fill step: true when `at` still takes one. */
export function takesCloud(ctx: Ctx, at: Coord): boolean {
  const t = tileAt(ctx.s, at);
  return t.state === null && !unitAt(ctx.s, at);
}
