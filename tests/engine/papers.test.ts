import { describe, expect, test } from 'vitest';
import { DISTRICTS } from '$data';
import { INK_LETTERS } from '$data/districts/inkQuarter/papers';
import { newProfile, newSave, type Profile, parseSaveData } from '$engine';
import { findPaper, type PapersKit, paperIn, papersView } from '$engine/papers';
import { heardHighlights } from '../../src/app/tripviews';

// The quarter's rooms are not all built yet: wire each letter to its room index as the rooms will.
const kit: PapersKit = {
  inkQuarter: { rooms: INK_LETTERS.map((l) => ({ lore: l.id })), papers: INK_LETTERS },
};
const roundTrip = (p: Profile): Profile =>
  parseSaveData(JSON.parse(JSON.stringify({ ...newSave(1), profile: p }))).profile;

describe('the dead letters (IQ-14)', () => {
  test('five letters in the Cartographers hand, namespaced, one per room, the last the notice', () => {
    expect(INK_LETTERS).toHaveLength(5);
    expect(new Set(INK_LETTERS.map((l) => l.id)).size).toBe(5);
    for (const [i, l] of INK_LETTERS.entries()) {
      expect(l.id).toBe(`inkQuarter:letter-${i + 1}`);
      expect(l.group).toBe('Dead letters');
      expect(l.found).toEqual({ kind: 'room', room: i });
      expect(l.text.split(/[.?!]\s/).length).toBeLessThanOrEqual(6);
    }
    expect(INK_LETTERS[4]?.text).toMatch(/no longer of the Cartographers/);
    expect(DISTRICTS.inkQuarter.papers).toBe(INK_LETTERS);
  });

  test('each letter is found once, in found order, kept through a save', () => {
    let p = newProfile();
    expect(paperIn('inkQuarter', 2, kit)?.id).toBe('inkQuarter:letter-3');
    p = findPaper(p, 'inkQuarter', 2, kit);
    expect(findPaper(p, 'inkQuarter', 2, kit)).toBe(p);
    p = findPaper(p, 'inkQuarter', 0, kit);
    expect(p.papers).toEqual(['inkQuarter:letter-3', 'inkQuarter:letter-1']);
    expect(roundTrip(p).papers).toEqual(p.papers);
  });

  test('the Codex view groups them as Dead letters', () => {
    const p = findPaper(findPaper(newProfile(), 'inkQuarter', 4, kit), 'inkQuarter', 1, kit);
    const view = papersView(p, kit);
    expect(view.map((g) => g.group)).toEqual(['Dead letters']);
    expect(view[0]?.papers.map((l) => l.title)).toEqual(['The notice', 'A second courtesy']);
  });

  test('the hearing home note is shown with the district line (D6)', () => {
    const recap = { stats: { heard: ['inkQuarter'] } } as Parameters<typeof heardHighlights>[0];
    expect(heardHighlights(recap)[0]?.text).toContain(
      'A letter, returned to sender, lies in the attic.',
    );
  });
});
