import type { Drawing } from '$data';
import { NEEDS } from '$data/drawing';
import type { Profile } from '../types';
import { costOf } from './cost';
import { GEN_KITS } from './kits';
import { paletteOf, penOf } from './palette';
import { FOES_MAX, NAME_MAX, PIECES_MAX } from './profile';
import type { DrawingElement, Issue } from './types';

/** The rule, the pieces it brings at no cost (P4) and the extra picks. */
function onDrawing(d: Drawing): Set<string> {
  const have = new Set<string>(d.pieces);
  if (d.rule !== null) {
    have.add(d.rule);
    const rule = GEN_KITS.flatMap((kit) => kit.rules).find((rule) => rule.id === d.rule);
    for (const piece of rule?.brings ?? []) have.add(piece);
  }
  return have;
}

/** The count limits' sentences: the table greys a full row with the same words. */
export const NO_FOE_SENTENCE = 'Draw at least one foe.';
export const FOE_LIMIT_SENTENCE = 'Three kinds at most.';
export const PIECE_LIMIT_SENTENCE = 'Two extra pieces at most.';

/** P5: every unmet need, element or limit, each with its sentence; empty when the drawing may be saved. */
export function checkDrawing(p: Profile, d: Drawing): Issue[] {
  const issues: Issue[] = [];
  const palette = paletteOf(p);
  const name = d.name.trim();
  if (name.length < 1 || name.length > NAME_MAX) {
    issues.push({ element: 'name', id: null, reason: `A name takes 1 to ${NAME_MAX} characters.` });
  }
  // What `readDrawing` keeps: a saved drawing outside these would read back as an empty page.
  if (d.foes.length < 1) issues.push({ element: 'foe', id: null, reason: NO_FOE_SENTENCE });
  if (d.foes.length > FOES_MAX) {
    issues.push({ element: 'foe', id: null, reason: FOE_LIMIT_SENTENCE });
  }
  if (d.pieces.length > PIECES_MAX) {
    issues.push({ element: 'piece', id: null, reason: PIECE_LIMIT_SENTENCE });
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
    for (const need of element === 'piece' ? [] : (NEEDS[id] ?? [])) {
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
