import { expect, it, vi } from 'vitest';
import { KIT } from '$engine/districts/kit';
import { checkDrawing } from '$engine/drawing';
import { GEN_KITS } from '$engine/drawing/kits';
import { fullHousehold, heartDrawing } from './fixtures';

const needs = vi.hoisted(() => [] as { anyOf: string[]; reason: string }[]);
vi.mock('$data/drawing', async (importOriginal) => {
  const data = await importOriginal<typeof import('$data/drawing')>();
  return { ...data, NEEDS: { ...data.NEEDS, rat: needs } };
});

it('R8.4: drawing validation and the generator agree on which pieces each rule brings', () => {
  const profile = fullHousehold();
  for (const rule of GEN_KITS.flatMap((kit) => kit.rules)) {
    const activation = KIT.rules[rule.id]?.activatedBy;
    const activators = activation?.kind === 'piece' ? activation.pieces : [];
    const pieces = [...new Set([...rule.brings, ...activators])];
    needs.splice(0, needs.length, ...pieces.map((piece) => ({ anyOf: [piece], reason: piece })));
    const drawing = { ...heartDrawing('marginalia'), rule: rule.id };
    const issues = checkDrawing(profile, drawing).filter((issue) => issue.element === 'foe');
    expect(
      issues.map((issue) => issue.reason),
      rule.id,
    ).toEqual(pieces.filter((piece) => !rule.brings.includes(piece)));
  }
});
