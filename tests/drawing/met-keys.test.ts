import { describe, expect, it } from 'vitest';
import type { Meets } from '$data';
import { newProfile } from '$engine';
import { createBattle } from '$engine/battle';
import { KIT } from '$engine/districts/kit';
import { paletteOf } from '$engine/drawing';
import { learnFromFight, metIn } from '$engine/trip/finish';

const KEYS: Record<string, string> = {
  'bridges:collapse': 'span',
  'canals:current': 'current',
  'inkQuarter:writs': 'return',
  'bathhouses:boilOver': 'boilOver',
  'foundry:bells': 'bell',
  'cartographers:pencil': 'pencil',
};

const fight = (board: string, rules: Record<string, null> = {}) => {
  const s = createBattle({ title: 't', board, seed: 1, intents: {} }).state;
  return { ...s, rules: { ...s.rules, ...rules } };
};
const plain = '. . .\n. D .\n. . .';

describe('MET-1: rule met keys', () => {
  it('MET-1: each of the six drawable rules declares a met key', () => {
    const declared = Object.fromEntries(Object.values(KIT.rules).map((r) => [r.id, r.met]));
    for (const [id, key] of Object.entries(KEYS)) expect(declared[id], id).toBe(key);
  });

  it("MET-1: a fight in the rule's district records its key", () => {
    expect(metIn(fight(plain, { 'canals:current': null }), [], 'canals').met).toContain('current');
    expect(metIn(fight(plain, { 'bathhouses:boilOver': null }), [], 'bathhouses').met).toContain(
      'boilOver',
    );
    expect(metIn(fight('{bell} . .\n. D .\n. . .'), []).met).toContain('bell');
  });

  it('MET-1: a lower-Seam floor records the piece but not the rule', () => {
    const b = fight('{moor} . .\n. D .\n. . .', { 'canals:current': null });
    const met = metIn(b, [], 'lowerSeam').met;
    expect(met).toContain('moor');
    expect(met).not.toContain('current');
  });

  it('MET-1: the palette offers a rule only after a fight under it', () => {
    const p = newProfile();
    expect(paletteOf(p).rules).not.toContain('canals:current');
    const learned = learnFromFight(p, fight(plain, { 'canals:current': null }), [], 'canals');
    expect(paletteOf(learned).rules).toContain('canals:current');
    expect(paletteOf({ ...p, met: ['bell'] as Meets[] }).rules).toContain('foundry:bells');
  });
});
