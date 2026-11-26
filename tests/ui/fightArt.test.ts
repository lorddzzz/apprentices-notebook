import { render } from 'svelte/server';
import { expect, test } from 'vitest';
import { ENEMIES } from '$data/enemies';
import BeatCard from '$ui/components/battle/BeatCard.svelte';
import Readout from '$ui/components/battle/Readout.svelte';
import { enemyArtId, fightArtIds, figureSize, foeHeaderKind } from '$ui/components/board/fightArt';
import StepMarkerLayer from '$ui/components/board/StepMarkerLayer.svelte';

test('fightArtIds builds convention ids', () => {
  expect(fightArtIds('inkedPage', { kind: 'scene' })).toEqual(['scenes/inkedPage/fight']);
  expect(fightArtIds('canals', { kind: 'scene' }, true)).toEqual([
    'scenes/canals/arena',
    'scenes/canals/fight',
  ]);
  expect(fightArtIds('seam', { kind: 'tile', material: 'brandCloud', state: 'fading' })).toEqual([
    'tiles/seam/brand-cloud-fading',
    'tiles/shared/brand-cloud-fading',
  ]);
  expect(fightArtIds('inkedPage', { kind: 'tile', material: 'floor', owner: 'lowerSeam' })).toEqual(
    ['tiles/lowerSeam/floor', 'tiles/shared/floor'],
  );
  expect(
    fightArtIds('inkedPage', { kind: 'prop', def: 'span', owner: 'bridges', state: 'cracked' }),
  ).toEqual(['props/bridges/span-cracked', 'props/shared/span-cracked']);
  expect(fightArtIds('seam', { kind: 'member', def: 'draughtsman' })).toEqual([
    'units/shared/draughtsman',
  ]);
});

test('borrowed foe resolves its owning district', () => {
  expect(fightArtIds('inkedPage', { kind: 'foe', def: 'deadLetter' })).toEqual([
    'foes/inkQuarter/dead-letter',
  ]);
  expect(fightArtIds('canals', { kind: 'foe', def: 'rat' })).toEqual(['foes/seam/rat']);
  expect(enemyArtId('barge')).toBeNull();
});

test('fightArtIds uses shared tiles and vector figures without a district', () => {
  expect(fightArtIds(undefined, { kind: 'scene' }, true)).toEqual([]);
  expect(fightArtIds(undefined, { kind: 'tile', material: 'floor' })).toEqual([
    'tiles/shared/floor',
  ]);
  expect(fightArtIds(undefined, { kind: 'foe', def: 'deadLetter' })).toEqual([]);
  expect(fightArtIds(undefined, { kind: 'member', def: 'draughtsman' })).toEqual([]);
});

test('figureSize by asset id', () => {
  const large = { w: 192, h: 256, feetY: 232 };
  const normal = { w: 128, h: 176, feetY: 160 };
  expect(figureSize('foes/canals/mother')).toEqual(large);
  expect(figureSize('foes/seam/marginalia')).toEqual(large);
  expect(figureSize('foes/inkQuarter/postmaster')).toEqual(normal);
  expect(figureSize('foes/canals/lamplighter')).toEqual(normal);
  expect(figureSize('units/shared/draughtsman')).toEqual(normal);
});

test('rival kind from RIVALS not boss flag', () => {
  expect(ENEMIES.postmaster.boss).toBe(true);
  expect(ENEMIES.lamplighter.boss).toBe(false);
  expect(foeHeaderKind('postmaster')).toBe('rival');
  expect(foeHeaderKind('lamplighter')).toBe('rival');
  expect(foeHeaderKind('mother')).toBe('boss');
  expect(foeHeaderKind('rat')).toBeUndefined();
});

test('fight stubs accept the playback props and render nothing', () => {
  const noop = () => {};
  const markers = render(StepMarkerLayer, {
    props: { markers: [{ n: 1, at: { x: 0, y: 0 }, first: true }] },
  });
  const readout = render(Readout, {
    props: { readout: { n: 1, total: 2, text: 'Spark' }, onspeedup: noop },
  });
  const beat = render(BeatCard, {
    props: { beat: { kind: 'burst', name: 'Storm', first: false }, onspeedup: noop, onskip: noop },
  });
  for (const { body } of [markers, readout, beat]) {
    expect(body.replace(/<!--.*?-->/g, '').trim()).toBe('');
  }
});
