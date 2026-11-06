import { describe, expect, test } from 'vitest';
import type { HeatLevel } from '$data/districts/bathhouses/types';
import type { BattleState } from '$engine';
import { BOIL_OVER_RULE_ID, type BoilOverState } from '$engine/districts/bathhouses/types';
import { listRules, rulePreview } from '$engine/rules';
import { roundEnd } from '$engine/turn';
import { boilOverTiles, gaugeLine } from '../../src/app/describe';
import { fxFor } from '../../src/app/fx';
import { durationOf, STEP_MS } from '../../src/app/timing';
import { viewOf } from '../../src/app/view';
import { DISTRICT_UI } from '../../src/ui/districts';
import { board, draft } from '../scenarios/harness';

/** BH-12: what the gauge says in words, how its boil-over is played, and who is warned. */

const ID = BOIL_OVER_RULE_ID;

function bath(ascii: string, heat: HeatLevel = 1, pressure = 0): BattleState {
  const s = structuredClone(board(ascii));
  s.rules = listRules(s, [ID], { [ID]: { heat } });
  s.rules = { ...s.rules, [ID]: { ...(s.rules[ID] as BoilOverState), pressure } };
  for (const u of s.units) if (u.kind === 'enemy') u.intent = null;
  return s;
}

describe('gaugeLine', () => {
  test('null off a bathhouse board', () => {
    expect(gaugeLine(board('D . .'))).toBeNull();
  });

  test('quiet: whole pips now, and where it rises to', () => {
    const l = gaugeLine(bath('D ~ ~', 1, 9));
    expect(l).toMatchObject({ boils: false, harm: [] });
    expect(l?.text).toBe('Steam 2 of 12, rising to 3');
    expect(gaugeLine(bath('D . .', 1, 8))?.text).toBe('Steam 2 of 12');
  });

  test('boiling: names the party members it would storm', () => {
    const l = gaugeLine(bath('D~ r~ .', 1, 46));
    expect(l?.boils).toBe(true);
    expect(l?.harm).toHaveLength(1);
    expect(l?.text).toContain('will be stormed for 2');
    expect(l?.text).toContain(l?.harm[0] ?? 'missing');
  });

  test('boiling with nobody of yours in the steam says so', () => {
    const l = gaugeLine(bath('D . .\nr~ ~ .', 1, 46));
    expect(l?.boils).toBe(true);
    expect(l?.harm).toEqual([]);
    expect(l?.text).toContain('none of yours');
  });
});

describe('the meter shape feeds the strip', () => {
  test('forecast and danger ride one meter, with a pulse on each member in the steam', () => {
    const shapes = rulePreview(bath('D~ r~ .', 1, 46)).flatMap((r) => [...r.shapes]);
    expect(shapes.filter((s) => s.kind === 'meter')).toEqual([
      { kind: 'meter', label: 'Pressure', value: 11, max: 12, forecast: 12, danger: true },
    ]);
    expect(shapes.filter((s) => s.kind === 'pulse')).toHaveLength(1);
  });
});

describe('boil-over playback', () => {
  test('the round end that boils plays one boil fx over the stormed tiles, and takes a beat', () => {
    const s = bath('D~ r~ .', 1, 46);
    const events = draft(s, (ctx) => roundEnd(ctx)).events;
    const ev = events.find((e) => e.type === 'bathhouses:boilOver');
    expect(ev).toBeDefined();
    if (!ev) return;
    const cells = boilOverTiles(ev as { type: string; data?: unknown });
    expect(cells).toHaveLength(2);
    expect(fxFor(ev, viewOf(s))).toEqual([{ kind: 'boil', cells }]);
    expect(durationOf(ev)).toBe(STEP_MS.big);
  });

  test('the pressure event stays a short, silent step', () => {
    const s = bath('D ~ ~', 1, 9);
    const ev = draft(s, (ctx) => roundEnd(ctx)).events.find(
      (e) => e.type === 'bathhouses:pressure',
    );
    expect(ev).toBeDefined();
    if (!ev) return;
    expect(fxFor(ev, viewOf(s))).toEqual([]);
    expect(durationOf(ev)).toBe(STEP_MS.short);
  });

  test('a malformed boil-over event draws nothing', () => {
    expect(boilOverTiles({ type: 'bathhouses:boilOver', data: { tiles: 'x' } })).toEqual([]);
    expect(boilOverTiles({ type: 'other', data: { tiles: [{ x: 1, y: 1 }] } })).toEqual([]);
  });
});

test('the bathhouses register the warning banner', () => {
  expect(DISTRICT_UI.bathhouses?.banners).toHaveLength(1);
});
