import { describe, expect, it } from 'vitest';
import { RECRUIT_HABITS, RECRUITS } from '$data/recruits';
import type { KitLootItem } from '$engine/districts/types';
import { EMPTY_RECRUITS, isReady, type RecruitLootItem } from '$engine/recruits';

describe('recruitment contracts (RC-W0)', () => {
  it('fills the seven recruits and starts with an empty note list', () => {
    expect(Object.keys(RECRUITS)).toHaveLength(7);
    expect(EMPTY_RECRUITS.notes).toEqual([]);
  });

  it('hands AH seven distinct habit ids (P10)', () => {
    expect(new Set(Object.values(RECRUIT_HABITS)).size).toBe(7);
  });

  it('keeps the recruit loot item assignable to the district kit item', () => {
    const item: RecruitLootItem = { kind: 'recruit', apprentice: 'stoker' };
    const kit: KitLootItem = item;
    expect(kit.kind).toBe('recruit');
  });

  it('stubs throw until RC-2', () => {
    expect(() => isReady({} as never, 'stoker')).toThrow(/RC-W0/);
  });
});
