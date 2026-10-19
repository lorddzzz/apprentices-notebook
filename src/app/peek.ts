import { RUNES, type RuneId, type RuneRef } from '$data';
import { type BattleState, type Coord, findUnit, label, type Step, tileAt, unitAt } from '$engine';
import { tileLine, unitLine } from './describe';

/** J3: what a long-press on a jar or a marked unit reads out: whose it is, and what is in it. */

const runeName = (r: RuneRef): string =>
  r.startsWith('inv:') ? r.slice(4) : (RUNES[r as RuneId]?.name ?? r);

/** The runes wired after a Seal, in walking order (forks and splits list their branches in turn). */
export function runesOf(step: Step | null, depth = 0): RuneRef[] {
  if (!step || depth > 24) return [];
  switch (step.role) {
    case 'action':
    case 'kind':
    case 'trigger':
    case 'shape':
      return [step.rune, ...runesOf(step.next, depth + 1)];
    case 'seal':
      return [step.rune, ...runesOf(step.rest, depth + 1)];
    case 'fork':
      return [...runesOf(step.left, depth + 1), ...runesOf(step.right, depth + 1)];
    case 'split':
      return step.branches.flatMap((b) => runesOf(b, depth + 1));
  }
}

const EVENTS = { step: 'on a step', dusk: 'at dusk' } as const;

/**
 * The hint-line text for a held tile: a jar (owner, trigger, contents), a marked unit (who marked
 * it, what it holds), else the usual inspect line.
 */
export function holdLine(s: BattleState, at: Coord): string {
  const tile = tileAt(s, at);
  const unit = unitAt(s, at);
  const bits: string[] = [];
  if (tile.jar) {
    const owner = findUnit(s, tile.jar.owner)?.name ?? tile.jar.owner;
    const inside = runesOf(tile.jar.rest).map(runeName);
    bits.push(
      `${label(at)}: ${owner}'s jar, opens ${EVENTS[tile.jar.event]}, holds ${inside.length ? inside.join(', ') : 'nothing'}`,
    );
  }
  if (unit?.mark) {
    const by = unit.mark.origin ? findUnit(s, unit.mark.origin.caster)?.name : null;
    const held = unit.mark.bound
      ? `, holding ${runeName(unit.mark.bound.action)} until ${unit.mark.bound.event}`
      : '';
    bits.push(`${unit.name} ${label(at)} is marked${by ? ` by ${by}` : ''}${held}`);
  }
  if (bits.length) return bits.join('. ');
  return unit ? unitLine(s, unit) : tileLine(tile, at);
}
