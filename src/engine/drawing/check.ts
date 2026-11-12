import type { Drawing } from '$data';
import { NEEDS } from '$data/drawing';
import { KIT } from '../districts/kit';
import type { Profile } from '../types';
import { costOf } from './cost';
import { paletteOf, penOf } from './palette';
import { NAME_MAX } from './profile';
import type { DrawingElement, Issue } from './types';

/** The rule, the pieces it brings at no cost (P4) and the extra picks. */
function onDrawing(d: Drawing): Set<string> {
  const have = new Set<string>(d.pieces);
  if (d.rule !== null) {
    have.add(d.rule);
    const how = KIT.rules[d.rule]?.activatedBy;
    if (how?.kind === 'piece') for (const piece of how.pieces) have.add(piece);
  }
  return have;
}

/** P5: every unmet need, element or limit, each with its sentence; empty when the drawing may be saved. */
export function checkDrawing(p: Profile, d: Drawing): Issue[] {
  const issues: Issue[] = [];
  const palette = paletteOf(p);
  const name = d.name.trim();
  if (name.length < 1 || name.length > NAME_MAX) {
    issues.push({ element: 'name', id: null, reason: `A name takes 1 to ${NAME_MAX} characters.` });
  }
  if (d.rule !== null && !palette.rules.includes(d.rule)) {
    issues.push({
      element: 'rule',
      id: d.rule,
      reason: 'You have not fought under this rule yet.',
    });
  }
  const elements: [DrawingElement, string, readonly string[]][] = [
    ...d.foes.map((id): [DrawingElement, string, readonly string[]] => ['foe', id, palette.foes]),
    ...d.pieces.map((id): [DrawingElement, string, readonly string[]] => [
      'piece',
      id,
      palette.pieces,
    ]),
    ...(d.shape === 'plain'
      ? []
      : [['shape', d.shape, palette.shapes] as [DrawingElement, string, readonly string[]]]),
    ['heart', d.heart, palette.masters],
  ];
  const have = onDrawing(d);
  for (const [element, id, known] of elements) {
    if (!known.includes(id)) issues.push({ element, id, reason: 'You have not met this yet.' });
    for (const need of NEEDS[id] ?? []) {
      if (!need.anyOf.some((x) => have.has(x))) issues.push({ element, id, reason: need.reason });
    }
  }
  const cost = costOf(d);
  const pen = penOf(p).total;
  if (cost > pen) {
    issues.push({
      element: 'pen',
      id: null,
      reason: `This costs ${cost} but the pen holds ${pen}.`,
    });
  }
  return issues;
}
