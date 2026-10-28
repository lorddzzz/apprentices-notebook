import { describe, expect, test } from 'vitest';
import type { InventionDef, LineId } from '$data';
import { type BattleState, type GameEvent, libraryOf, parseLabel, tileAt } from '$engine';
import { act, cast, unitAtLabel, withLattices } from './harness';

/**
 * FN-10: the audited lines for the methods and the leftovers FN-9 skipped (footnotes audit FN-1A):
 * Bolt's blockers, Shove (plate, noHeading), plain Ink's spread, Repeat and Margin lapses
 * and limit, and Bind's two lost actions. Each test plays the row's firing case.
 */

const at = parseLabel;
const tileAim = (label: string) => ({ kind: 'tile' as const, at: at(label) });
const withType = (events: readonly GameEvent[], type: GameEvent['type']) =>
  events.filter((e) => e.type === type);
const linesOf = (events: readonly GameEvent[], type: GameEvent['type']): (LineId | undefined)[] =>
  withType(events, type).map((e) => e.line);
const inv = (
  id: string,
  method: InventionDef['method'],
  parts: InventionDef['parts'],
  extra: Partial<InventionDef> = {},
): InventionDef => ({ id: `inv:${id}`, name: id, method, parts, solvent: null, ...extra });

const lib = libraryOf([
  inv('afterimage', 'repeat', ['strike']),
  inv('echo', 'margin', ['inv:afterimage']),
  inv('recoil', 'bind', ['ink', 'shove'], { event: 'hit' }),
  inv('pinprick', 'bind', ['ink', 'strike'], { event: 'hit' }),
  inv('impulse', 'conduct', ['shove']),
]);
const opts = { inventions: lib };
const endTurn = (s: BattleState) => act(s, { type: 'endTurn' });

describe('Bolt (leftover Bo1)', () => {
  test.each(['{kettle}', '{wall}', '{skid}', '='])(
    'bolt-plate: a %s stops Bolt on its tile',
    (layer) => {
      const s = withLattices(`D . ${layer} . .`, { draughtsman: 'Bolt> Strike' });
      const r = cast(s, 'draughtsman', 'right');
      const stopped = r.events.find((e) => e.type === 'stopped');
      expect(stopped?.line).toBe('bolt:plate');
      expect(stopped?.type === 'stopped' && stopped.at).toEqual(at('C1'));
    },
  );
});

describe('Shove (leftovers Sh1, noHeading)', () => {
  test('shove-plate-layout: a plate set into the floor takes the crush and stays', () => {
    const s = withLattices('D r = . .', { draughtsman: 'Bolt> Shove' });
    const r = cast(s, 'draughtsman', 'right');
    expect(linesOf(r.events, 'crush')).toEqual(['shove:plate']);
    expect(tileAt(r.state, at('C1')).state?.id).toBe('plate');
  });

  test('shove-plate-cast: a plate you cast breaks under the crush', () => {
    const s = withLattices('D r # . .', { draughtsman: 'Bolt> Shove' });
    const r = cast(s, 'draughtsman', 'right');
    expect(linesOf(r.events, 'crush')).toEqual(['shove:plate']);
    expect(tileAt(r.state, at('C1')).state).toBeNull();
  });

  test('shove-noHeading-splash: Splash on your own tile gives its centre no way to point', () => {
    const s = withLattices('. . .\n. D .\n. r .', { draughtsman: 'Splash> Shove' });
    const r = cast(s, 'draughtsman', tileAim('B2'));
    expect(withType(r.events, 'miss').some((e) => e.line === 'shove:noHeading')).toBe(true);
  });
});

describe('Ink spread (leftover In2)', () => {
  const CLOUD = '. . . .\nD r~ r~ S\n. . . .';

  test('ink-spread: plain Ink in a cloud spreads under Ink, not Bind', () => {
    const s = withLattices(CLOUD, { draughtsman: 'Touch> Ink' });
    const r = cast(s, 'draughtsman', tileAim('B2'));
    expect(linesOf(r.events, 'markSpread')).toEqual(['ink:spread']);
    expect(unitAtLabel(r.state, 'C2').mark).not.toBeNull();
  });

  test('ink-spread-bind: the mark a Bind makes spreads under Bind', () => {
    const s = withLattices(CLOUD, { draughtsman: 'Touch> inv:recoil' }, opts);
    const r = cast(s, 'draughtsman', tileAim('B2'));
    expect(linesOf(r.events, 'markSpread')).toEqual(['bind:cloud']);
  });
});

describe('Repeat and Margin', () => {
  const downed = (s: BattleState): BattleState => {
    const copy = structuredClone(s);
    const d = copy.units.find((u) => u.id === 'draughtsman');
    if (d) d.hp = 0;
    return copy;
  };

  test("repeat-member: a downed caster's repeat lapses and says so", () => {
    const s = withLattices(
      'D d . .\nS . . .',
      { draughtsman: 'Bolt> inv:afterimage' },
      { ...opts, hp: { B1: 9 } },
    );
    const now = cast(s, 'draughtsman', 'right');
    const next = endTurn(downed(now.state));
    expect(withType(next.events, 'miss').map((e) => e.line)).toContain('repeat:member');
    expect(withType(next.events, 'repeated')).toHaveLength(0);
  });

  test('repeat-member-quiet: a caster still standing repeats without a lapse', () => {
    const s = withLattices(
      'D d . .\nS . . .',
      { draughtsman: 'Bolt> inv:afterimage' },
      { ...opts, hp: { B1: 9 } },
    );
    const next = endTurn(cast(s, 'draughtsman', 'right').state);
    expect(next.events.some((e) => e.line === 'repeat:member')).toBe(false);
    expect(withType(next.events, 'repeated')).toHaveLength(1);
  });

  test("margin-member: a downed caster's echo lapses and says so", () => {
    const s = withLattices(
      'D d . .\nS . . .',
      { draughtsman: '. inv:echo\nBolt> Strike' },
      { ...opts, hp: { B1: 9 } },
    );
    const now = cast(s, 'draughtsman', 'right');
    expect(withType(now.events, 'scheduled')).toHaveLength(1);
    const next = endTurn(downed(now.state));
    expect(withType(next.events, 'miss').map((e) => e.line)).toContain('margin:member');
    expect(withType(next.events, 'repeated')).toHaveLength(0);
  });

  test('margin-limit: a Margin does not echo a Repeat, and says so once', () => {
    const s = withLattices(
      'D d . .',
      { draughtsman: '. inv:echo\nBolt> inv:afterimage' },
      { ...opts, hp: { B1: 9 } },
    );
    const now = cast(s, 'draughtsman', 'right');
    expect(withType(now.events, 'miss').filter((e) => e.line === 'margin:limit')).toHaveLength(1);
    expect(withType(now.events, 'scheduled')).toHaveLength(1);
  });

  test('margin-limit-quiet: an ordinary Action under a Margin is echoed with no refusal', () => {
    const s = withLattices(
      'D d . .',
      { draughtsman: '. inv:echo\nBolt> Strike' },
      { ...opts, hp: { B1: 9 } },
    );
    const now = cast(s, 'draughtsman', 'right');
    expect(now.events.some((e) => e.line === 'margin:limit')).toBe(false);
    // and the echo coming due is not refused either
    const next = endTurn(now.state);
    expect(next.events.some((e) => e.line === 'margin:limit')).toBe(false);
  });
});

describe('Bind', () => {
  test('bind-deepMark: a second Bind on a mark that holds an action loses its action', () => {
    const s = withLattices(
      'D r S .',
      { draughtsman: 'Touch> inv:recoil', stoker: 'Touch> inv:pinprick' },
      { ...opts, hp: { B1: 9 } },
    );
    const first = cast(s, 'draughtsman', tileAim('B1'));
    expect(first.events.some((e) => e.line === 'bind:deepMark')).toBe(false);
    expect(unitAtLabel(first.state, 'B1').mark?.bound?.action).toBe('shove');
    const second = cast(first.state, 'stoker', tileAim('B1'));
    expect(withType(second.events, 'miss').map((e) => e.line)).toContain('bind:deepMark');
    expect(unitAtLabel(second.state, 'B1').mark?.bound?.action).toBe('shove'); // the old one stays
  });

  test('bind-collar: Bind on a collared unit makes a shackle that holds nothing', () => {
    const s = withLattices('D b .', { draughtsman: 'Touch> inv:recoil' }, opts);
    const r = cast(s, 'draughtsman', tileAim('B1'));
    expect(withType(r.events, 'miss').map((e) => e.line)).toContain('bind:collar');
    const sentry = unitAtLabel(r.state, 'B1');
    expect(sentry.shackle).toBeGreaterThan(0);
    expect(sentry.mark).toBeNull();
  });

  test('bind-collar-quiet: Bind on a bare unit binds and loses nothing', () => {
    const s = withLattices('D r .', { draughtsman: 'Touch> inv:recoil' }, opts);
    const r = cast(s, 'draughtsman', tileAim('B1'));
    expect(r.events.some((e) => e.line === 'bind:collar' || e.line === 'bind:deepMark')).toBe(
      false,
    );
    expect(unitAtLabel(r.state, 'B1').mark?.bound?.action).toBe('shove');
  });
});

describe('Conduct (text rows Co1 to Co3)', () => {
  test('conduct-separate-pieces: a target beside two separate plates reaches both', () => {
    const s = withLattices('D r = r\nr = . .', { draughtsman: 'Bolt> inv:impulse' }, opts);
    const r = cast(s, 'draughtsman', 'right');
    const conducted = r.events.find((e) => e.type === 'conducted');
    const spots =
      conducted?.type === 'conducted' ? conducted.units.map((u) => `${u.at.x},${u.at.y}`) : [];
    expect(spots).toEqual(expect.arrayContaining(['1,0', '3,0', '0,1']));
    expect(conducted?.line).toBe('conduct:network');
  });
});
