import { describe, expect, test } from 'vitest';
import { type InventionDef, type RuneId, TUNING } from '$data';
import {
  inHousehold,
  joinHousehold,
  newProfile,
  newSave,
  type Profile,
  type SaveData,
  startTrip,
  type Trip,
} from '$engine';
import { preconditionsOf } from '$engine/recruits';
import { goHome } from '../../src/app/flow';
import { GameStore } from '../../src/app/game.svelte';
import { joinedHighlights, newcomers, notesUnderDoor, noteText } from '../../src/app/recruitNotes';
import { memoryBackend, saveText } from '../../src/app/save';

/** RC-7: the note under the door, its words and welcome, and the trip page's "joined" line. */

const INV: InventionDef = {
  id: 'inv:lantern',
  name: 'Lantern',
  method: 'repeat',
  parts: ['spark'],
  solvent: null,
};

const learn = (p: Profile, runes: readonly RuneId[]): Profile => ({
  ...p,
  known: [...new Set([...p.known, ...runes])],
});
/** The Copyist's beats: the runaway home, her runes, a named idiom. */
const copyistReady = (named: string[] = ['idiom:bonfire']): Profile => ({
  ...learn(joinHousehold(newProfile(), 'runaway'), preconditionsOf('copyist').runes.all),
  named,
});
/** The exile's beats: her runes and a proven invention. */
const exileReady = (): Profile => ({
  ...learn(newProfile(), preconditionsOf('exile').runes.all),
  inventions: [INV],
  proof: {
    draughtsman: Array.from({ length: TUNING.provenCasts }, () => [
      { at: { x: 1, y: 1 }, rune: INV.id },
    ]),
  },
});
const store = (profile: Profile): GameStore =>
  new GameStore(memoryBackend(saveText({ ...newSave(1), profile })), () => 1);

describe('the words of a note (P12)', () => {
  test('the Copyist names the idiom you lit', () => {
    expect(noteText(copyistReady(), 'copyist')).toBe(
      'I read about the Bonfire you lit. May I come in?',
    );
  });

  test('the exile names the invention you proved', () => {
    expect(noteText(exileReady(), 'exile')).toBe('I read about your Lantern. May I come in?');
  });

  test('without a milestone the note is fixed text', () => {
    expect(noteText(newProfile(), 'copyist')).toBe('I have read your notebook. May I come in?');
  });
});

describe('notes under the door', () => {
  test('a fresh notebook has none', () => {
    expect(notesUnderDoor(newProfile())).toEqual([]);
  });

  test('a ready Copyist leaves a note with her card, off the bench until welcomed', () => {
    const g = store(copyistReady());
    const [note, ...rest] = notesUnderDoor(g.profile);
    expect(rest).toEqual([]);
    expect(note?.id).toBe('copyist');
    expect(note?.name).toBe('The Copyist');
    expect(note?.card.slot).toBeNull();
    expect(note?.card.habit?.line).toBeTruthy();
    expect(inHousehold(g.profile, 'copyist')).toBe(false);
  });
});

describe('welcome (store)', () => {
  test('takes the note off the door and puts her on the bench with her page, and saves it', () => {
    const backend = memoryBackend(saveText({ ...newSave(1), profile: copyistReady() }));
    const g = new GameStore(backend, () => 1);
    expect(g.welcome('copyist')).toBeNull();
    expect(inHousehold(g.profile, 'copyist')).toBe(true);
    expect(g.profile.household.slots).not.toContain('copyist');
    expect(notesUnderDoor(g.profile)).toEqual([]);
    expect(inHousehold(new GameStore(backend, () => 1).profile, 'copyist')).toBe(true);
  });

  test('is idempotent and refuses someone who left no note', () => {
    const g = store(copyistReady());
    expect(g.welcome('copyist')).toBeNull();
    expect(g.welcome('copyist')).toBeNull();
    expect(g.welcome('notary')).toMatch(/No note/);
    expect(inHousehold(g.profile, 'notary')).toBe(false);
  });
});

describe('the trip page line', () => {
  test('newcomers are those in the household after and not before', () => {
    const before = newProfile();
    const after = joinHousehold(before, 'runaway');
    expect(newcomers(before, after)).toEqual(['runaway']);
    expect(newcomers(after, after)).toEqual([]);
  });

  test('a recruit banked on the way home is named; a plain return says nothing', () => {
    const profile = newProfile();
    const out = (loot: Trip['loot']): SaveData => ({
      ...newSave(7),
      profile,
      trip: { ...startTrip(profile, 1), status: 'crossroads', loot },
    });
    const plain = goHome(out([]));
    expect(newcomers(profile, plain.profile)).toEqual([]);
    const withHer = goHome(out([{ kind: 'recruit', apprentice: 'runaway' }]));
    const joined = newcomers(profile, withHer.profile);
    expect(joined).toEqual(['runaway']);
    const [line, ...rest] = joinedHighlights(joined);
    expect(rest).toEqual([]);
    expect(line?.kind).toBe('joined');
    expect(line?.text).toContain('Lamp-pole runaway');
    expect(joinedHighlights([])).toEqual([]);
  });
});
