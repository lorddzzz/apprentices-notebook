import {
  type Action,
  type Aim,
  applyAction,
  type BattleState,
  type GameEvent,
  label,
  parseLabel,
} from '$engine';
import type { FootnoteIds } from '$engine/ctx';

/** Footnote scenario helpers for casts: the draughtsman's first spell, and unit positions by id. */
export const tileAim = (l: string): Aim => ({ kind: 'tile', at: parseLabel(l) });

export function castWith(
  s: BattleState,
  aim: Aim,
  footnotes: FootnoteIds,
  member = 'draughtsman',
): { state: BattleState; events: GameEvent[] } {
  return applyAction(
    s,
    { type: 'cast', unit: member, spell: firstSpell(s, member), aim },
    footnotes,
  );
}

export const step = (
  s: BattleState,
  action: Action,
  footnotes: FootnoteIds = {},
): { state: BattleState; events: GameEvent[] } => applyAction(s, action, footnotes);

export const where = (s: BattleState, id: string): string => {
  const u = s.units.find((x) => x.id === id);
  return u ? label(u.pos) : '?';
};

export const hpOf = (s: BattleState, id: string): number | undefined =>
  s.units.find((x) => x.id === id)?.hp;

export function firstSpell(s: BattleState, member = 'draughtsman'): string {
  const u = s.units.find((x) => x.id === member);
  const key = u?.kind === 'member' ? u.spells[0]?.key : undefined;
  if (!key) throw new Error(`${member} has no spell`);
  return key;
}
