import { expect, test } from 'vitest';
import { newSave, startTrip } from '$engine';
import { resolveScreen, type WipeSummary } from '../../src/app/flow';
import { href, parseHash } from '../../src/app/routes';

test('parses trip, gallery and lab params', () => {
  expect(parseHash('#/trip').route).toBe('trip');
  const g = parseHash('#/gallery?part=glyphs');
  expect(g.route).toBe('gallery');
  expect(g.params.get('part')).toBe('glyphs');
  const l = parseHash('#/lab?scenario=oil-chain&demo=1');
  expect(l.route).toBe('lab');
  expect(l.params.get('scenario')).toBe('oil-chain');
  expect(l.params.get('demo')).toBe('1');
});

test('unknown routes fall back to study', () => {
  expect(parseHash('').route).toBe('study');
  expect(parseHash('#/combat').route).toBe('study');
  expect(parseHash('#/nope?x=1').route).toBe('study');
});

test('href builds query strings', () => {
  expect(href('study')).toBe('#/study');
  expect(href('lab', { scenario: 'a b', demo: '1' })).toBe('#/lab?scenario=a+b&demo=1');
});

test('bench is a route', () => {
  expect(parseHash('#/bench').route).toBe('bench');
  expect(href('bench')).toBe('#/bench');
});

test('the bench screen opens at home and is closed out on a trip or with a wipe unread', () => {
  expect(resolveScreen('bench', null, null)).toEqual({ screen: 'bench', redirect: null });
  const trip = startTrip(newSave(1).profile, 1);
  expect(resolveScreen('bench', trip, null)).toEqual({ screen: 'battle', redirect: 'trip' });
  const wipe: WipeSummary = { encounter: 'Three rats', lost: [], learned: [] };
  expect(resolveScreen('bench', null, wipe)).toEqual({ screen: 'wiped', redirect: 'trip' });
});
