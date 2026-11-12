import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import type { DistrictId } from '$data';
import type { SaveData } from '$engine';
import { takeOffer } from '../../src/app/flow';
import {
  CURRENT_VERSION,
  loadSave,
  memoryBackend,
  OLDEST_READABLE,
  parseSaveText,
  saveText,
} from '../../src/app/save';

/**
 * SAVE-1: every district the build plays has a recorded save (a trip that returned home) and a
 * mid-trip save (looting, offers pending). The files in tests/fixtures/saves were written once by
 * the build named in each test title and are never regenerated; see tests/fixtures/saves/README.md.
 */
/** The five districts with rooms this build (`PLAYABLE_DISTRICTS`). */
const DISTRICTS: readonly DistrictId[] = ['seam', 'canals', 'inkQuarter', 'bathhouses', 'bridges'];

function fixture(name: string): { text: string; version: number; data: SaveData } {
  const text = readFileSync(new URL(`../fixtures/saves/${name}.json`, import.meta.url), 'utf8');
  const envelope = JSON.parse(text) as { version: number; data: SaveData };
  return { text, version: envelope.version, data: envelope.data };
}

describe('SAVE-1: saves recorded by the build parse and load', () => {
  test.each(DISTRICTS)('SAVE-1: %s save written by 89f498b parses and loads', (district) => {
    const { text, version, data } = fixture(`${district}-returned`);
    expect(version).toBeLessThanOrEqual(CURRENT_VERSION);
    expect(version).toBeGreaterThanOrEqual(OLDEST_READABLE);
    const save = parseSaveText(text);
    // The save boundary drops an empty ink-terms list from the last trip; nothing else changes.
    const recorded = {
      ...data,
      lastTrip: data.lastTrip && {
        ...data.lastTrip,
        terms: data.lastTrip.terms?.length ? data.lastTrip.terms : undefined,
      },
    };
    expect(save).toEqual(recorded);
    expect(save.trip).toBeNull();
    expect(save.lastTrip?.district).toBe(district);
    expect(save.lastTrip?.outcome).toBe('returned');
    expect(save.profile.city.open).toContain(district);
    const loaded = loadSave(memoryBackend(text), 1);
    expect(loaded.recovered).toBe(false);
    expect(loaded.refused).toBeUndefined();
    expect(loaded.save).toEqual(save);
    expect(parseSaveText(saveText(save))).toEqual(save);
  });

  test.each(DISTRICTS)('SAVE-1: %s mid-trip save resumes to its next offer', (district) => {
    const { text, data } = fixture(`${district}-mid-trip`);
    const save = loadSave(memoryBackend(text), 1).save;
    expect(save.trip?.district).toBe(district);
    expect(save.trip?.status).toBe('looting');
    const offers = save.trip?.offers ?? [];
    expect(offers.length).toBeGreaterThan(0);
    expect(offers).toEqual(data.trip?.offers);
    const first = offers[0];
    if (!first) throw new Error('expected an offer');
    const picked = takeOffer(save, 0);
    expect(picked.trip?.loot).toContainEqual(first);
    expect(parseSaveText(saveText(save))).toEqual(save);
  });
});

describe("SAVE-1: the foundry's saves", () => {
  test('SAVE-1: foundry save written by 7113ee9 parses and loads', () => {
    const { text, data } = fixture('foundry-returned');
    const save = parseSaveText(text);
    expect(save.trip).toBeNull();
    expect(save.lastTrip?.district).toBe('foundry');
    expect(save.lastTrip?.outcome).toBe('returned');
    expect(save.profile.city.open).toContain('foundry');
    expect(save.profile).toEqual(data.profile);
    expect(loadSave(memoryBackend(text), 1).recovered).toBe(false);
    expect(parseSaveText(saveText(save))).toEqual(save);
  });

  test('SAVE-1: foundry mid-trip save resumes to its next offer', () => {
    const { text, data } = fixture('foundry-mid-trip');
    const save = loadSave(memoryBackend(text), 1).save;
    expect(save.trip?.district).toBe('foundry');
    expect(save.trip?.status).toBe('looting');
    const offers = save.trip?.offers ?? [];
    expect(offers.length).toBeGreaterThan(0);
    expect(offers).toEqual(data.trip?.offers);
    expect(takeOffer(save, 0).trip?.loot).toContainEqual(offers[0]);
  });
});
