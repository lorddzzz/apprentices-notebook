import { describe, expect, test } from 'vitest';
import { newSave, type Profile } from '$engine';
import { afterClear, blankDrawing, saveDraft } from '../../src/app/drawing';
import { handoverProfile } from '../drawing/fixtures';

describe('R9: Clear on the drawing table', () => {
  test('a refused clear leaves the editor as it was; a stored one resets it to a blank page', () => {
    const p = handoverProfile();
    const edited = { ...blankDrawing(p), name: 'Half-written' };
    expect(afterClear(false, edited, p)).toBe(edited);
    expect(afterClear(false, null, p)).toBeNull();
    expect(afterClear(true, edited, p)).toEqual(blankDrawing(p));
  });

  test('the store really does refuse (the table before the handover), so the refusal path exists', () => {
    const early: Profile = {
      ...handoverProfile(),
      ending: { handover: false, creditsSeen: false },
    };
    expect(() => saveDraft({ ...newSave(1), profile: early }, 0, null)).toThrow(/handover/);
  });
});
