import { expect, test } from 'vitest';
import { DISTRICTS } from '$data';
import { CARTOGRAPHERS_PAPERS } from '$data/districts/cartographers/lore';
import { newProfile } from '$engine';
import { findPaper, paperIn } from '$engine/papers';

/** CG-18: the hall's papers, each filed by exactly one room (the bad join by room 4). */

const rooms = DISTRICTS.cartographers.rooms;

test('CG-18: winning room 4 files the bad join', () => {
  expect(paperIn('cartographers', 3)?.id).toBe('cartographers:badJoin');
  const p = findPaper(newProfile(), 'cartographers', 3);
  expect(p.papers).toEqual(['cartographers:badJoin']);
  const badJoin = CARTOGRAPHERS_PAPERS.find((x) => x.id === 'cartographers:badJoin');
  expect(badJoin?.found).toEqual({ kind: 'room', room: 3 });
});

test('CG-18: every cartographers paper is filed by exactly one room', () => {
  for (const paper of CARTOGRAPHERS_PAPERS) {
    const filing = rooms.map((r, i) => (r.lore === paper.id ? i : -1)).filter((i) => i >= 0);
    expect(filing, paper.id).toHaveLength(1);
    if (paper.found.kind === 'room') expect(filing[0], paper.id).toBe(paper.found.room);
    else expect(filing[0], paper.id).toBe(rooms.length - 1); // the heart
  }
  let p = newProfile();
  rooms.forEach((_, i) => {
    p = findPaper(p, 'cartographers', i);
  });
  expect(p.papers).toEqual([
    'cartographers:registry',
    'cartographers:badJoin',
    'cartographers:ownersDesk',
    'cartographers:struckName',
  ]);
});
