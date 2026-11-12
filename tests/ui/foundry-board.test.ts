import { render } from 'svelte/server';
import { describe, expect, test } from 'vitest';
import type { BattleState } from '$engine';
import { IDLE } from '../../src/app/battleInput';
import { fxFor as fxOfEvent } from '../../src/app/fx';
import { viewOf } from '../../src/app/view';
import { fxFor, pieceArtFor, unitArtFor } from '../../src/ui/districts';
import { FOUNDRY_UI } from '../../src/ui/districts/foundry';
import { foundryFx } from '../../src/ui/districts/foundry/fx';
import {
  foundryHighlights,
  HALO,
  HUNG,
  MUFFLED,
  STRUCK,
} from '../../src/ui/districts/foundry/highlights';
import RingArt from '../../src/ui/districts/foundry/RingArt.svelte';
import { clapperToneOfId } from '../../src/ui/districts/foundry/state';
import { act, board, cast, withLattices } from '../scenarios/harness';

/** BF-17: what the board draws of the bells, from the battle (no browser). */

const ctx = (
  state: BattleState,
  shown: BattleState extends never ? never : null | readonly never[] = null,
) => ({
  state,
  intentState: state,
  mode: IDLE,
  shown: shown as null,
});
const keys = (state: BattleState): string[] => foundryHighlights(ctx(state)).map((h) => h.key);

describe('the registry holds the foundry’s art', () => {
  test.each(['foundry:bell', 'foundry:rope', 'foundry:hook', 'foundry:greatBell'])(
    '%s has a piece renderer',
    (art) => {
      expect(pieceArtFor(art)).toBeDefined();
    },
  );
  test.each(['ringer', 'detuner', 'clapper'])('%s has a token', (def) => {
    expect(unitArtFor(def)).toBeDefined();
  });
  test('the ring has an effect', () => {
    expect(fxFor('ring')).toBe(FOUNDRY_UI.fx?.ring);
  });
});

describe('a bell that has rung is drawn humming', () => {
  test('a struck tone hums on every bell of it and on none other', () => {
    const s = withLattices('D . {bell:mid} . {bell:mid} {bell:low}', {
      draughtsman: 'Bolt> Strike',
    });
    const r = cast(s, 'draughtsman', 'right');
    const tiles = viewOf(r.state).tiles;
    const hum = (i: number) => (tiles[i]?.piece?.data as { hum?: boolean } | undefined)?.hum;
    expect(hum(2)).toBe(true);
    expect(hum(4)).toBe(true);
    expect(hum(5)).toBeUndefined();
  });
});

describe('a ring plays as an effect from each of its bells', () => {
  test('the ring event becomes one ring fx with the bells and the tone', () => {
    const s = withLattices('D . {bell:mid} . {bell:mid}', { draughtsman: 'Bolt> Strike' });
    const r = cast(s, 'draughtsman', 'right');
    const ring = r.events.flatMap((e) => fxOfEvent(e, viewOf(s))).find((f) => f.kind === 'ring');
    expect(ring).toEqual({
      kind: 'ring',
      cells: [
        { x: 2, y: 0 },
        { x: 4, y: 0 },
      ],
      bell: 'mid',
    });
  });
  test('a muffled strike floats a word and the Great Peal is a banner', () => {
    expect(
      foundryFx({ type: 'foundry:muffled', at: { x: 1, y: 1 }, data: { tone: 'low' } }),
    ).toEqual([{ kind: 'float', at: { x: 1, y: 1 }, text: 'muffled', tone: 'steam' }]);
    expect(foundryFx({ type: 'foundry:greatPeal', data: { tones: ['low'] } })).toEqual([
      { kind: 'banner', text: 'The Great Peal' },
    ]);
    expect(foundryFx({ type: 'bridges:collapse' })).toBeNull();
  });
  test('the effect draws a wave per bell in the tone’s colour', () => {
    const { body } = render(RingArt, {
      props: {
        fx: {
          kind: 'ring',
          cells: [
            { x: 0, y: 0 },
            { x: 2, y: 1 },
          ],
          bell: 'high',
        },
      },
    });
    expect(body).toContain('data-fx="ring"');
    expect(body.match(/class="[^"]*wave w1/g)).toHaveLength(2);
  });
});

describe('the marks drawn over the bells', () => {
  test('a cloud on a bell is drawn as muffled', () => {
    expect(keys(board('D . ~{bell:mid} . .'))).toContain(MUFFLED);
    expect(keys(board('D . {bell:mid} . .'))).not.toContain(MUFFLED);
  });
  test('a board with no bell has no foundry marks', () => {
    expect(keys(board('D . . . .'))).toEqual([]);
  });
  test('a previewed strike marks the struck bell and the ring it would make', () => {
    const s = withLattices('D . {bell:mid} . {bell:mid}', { draughtsman: 'Bolt> Strike' });
    const r = cast(s, 'draughtsman', 'right');
    const hs = foundryHighlights({ ...ctx(s), shown: r.events });
    expect(hs.filter((h) => h.key === STRUCK).map((h) => h.at)).toEqual([{ x: 2, y: 0 }]);
    const halos = hs.filter((h) => h.key === HALO);
    expect(halos.map((h) => h.at)).toEqual([
      { x: 2, y: 0 },
      { x: 4, y: 0 },
    ]);
    expect(halos[0]?.data).toMatchObject({ tone: 'mid', why: 'ring' });
  });
  test('a Ringer’s pull haloes the bells of its rope’s tone', () => {
    const s = board('D . . . . .\n. . Z{rope:mid} . . .\n{bell:mid} . . . {bell:mid} {bell:low}');
    const s2 = act(s, { type: 'endTurn' }).state;
    const halos = foundryHighlights(ctx(s2)).filter((h) => h.key === HALO);
    expect(halos.every((h) => (h.data as { why: string }).why === 'ringer')).toBe(true);
    expect(halos.map((h) => (h.data as { tone: string }).tone)).toEqual(['mid', 'mid']);
  });
  test('a hung great bell wears the strike mark on the player’s turn', () => {
    const s = board('D . {greatBell:2:allied:rung} . .');
    expect(keys(s)).toContain(HUNG);
  });
});

describe('a Clapper’s tone follows its number', () => {
  test('1 low, 2 mid, 3 high, then around', () => {
    expect(['clapper-1', 'clapper-2', 'clapper-3', 'clapper-4'].map(clapperToneOfId)).toEqual([
      'low',
      'mid',
      'high',
      'low',
    ]);
  });
});
