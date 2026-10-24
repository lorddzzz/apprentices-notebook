import { describe, expect, it } from 'vitest';
import { applyAction, createBattle } from '$engine/battle';
import { cloneData } from '$engine/clone';
import { parseLabel } from '$engine/notation';
import { tileAt } from '$engine/queries';
import { rivalPreview } from '$engine/rivals/preview';
import type { BattleState, EnemyUnit, Jar, RivalIntent } from '$engine/types';

/** The rival telegraph preview (rivals plan P6, P7; RV-6): a dry run from any state. */

const at = parseLabel;

const rivalOf = (s: BattleState): EnemyUnit => {
  const u = s.units.find((x): x is EnemyUnit => x.kind === 'enemy' && !!x.rival);
  if (!u) throw new Error('no rival');
  return u;
};

const make = (board: string, pins: Record<string, RivalIntent>): BattleState =>
  createBattle({ title: 't', board, seed: 1, pins }).state;

const herd = (fallback: string | null = null): RivalIntent => ({
  kind: 'cast',
  spell: 'herd',
  aim: { kind: 'dir', dir: 'right' },
  fallback: fallback ? at(fallback) : null,
  order: 1,
});

const wick = (id: number): RivalIntent => ({
  kind: 'trick',
  trick: 'canals:longWick',
  lock: { kind: 'jar', id },
  data: {},
  fallback: null,
  order: 1,
});

const jarFor = (owner: string, id: number): Jar => ({
  owner,
  event: 'step',
  rest: { role: 'action', rune: 'strike', at: { x: 0, y: 0 }, auras: [], next: null },
  heading: null,
  origin: { caster: owner, spell: 'lantern', cast: 0 },
  id,
  seq: id,
});

/** Puts the rival's jar `id` on a tile. */
function lay(s: BattleState, lbl: string, id = 1): BattleState {
  const c = cloneData(s);
  tileAt(c, at(lbl)).jar = jarFor(rivalOf(c).id, id);
  c.nextJar = id + 1;
  return c;
}

/** Moves the rival to a tile (a stand-in for "the board changed under his order"). */
function moveRival(s: BattleState, lbl: string): BattleState {
  const c = cloneData(s);
  rivalOf(c).pos = at(lbl);
  return c;
}

describe('RV-6 rivalPreview: the shown cast', () => {
  const state = make('L . . D .\n. . . . .\n. . . . .', { A1: herd() });
  const id = rivalOf(state).id;

  it('shows path, landing, targets and events from where he stands', () => {
    const p = rivalPreview(state, id);
    expect(p?.landing).toEqual(at('D1'));
    expect(p?.path.at(-1)).toEqual(at('D1'));
    expect(p?.targets).toEqual(['draughtsman']);
    expect(p?.events.some((e) => e.type === 'push')).toBe(true);
    expect(p?.starved).toBe(false);
    expect(p?.opens).toEqual([]);
  });

  it('moving the caster changes the preview and never the aim', () => {
    const moved = moveRival(state, 'A2');
    expect(rivalOf(moved).intent).toEqual(rivalOf(state).intent);
    const p = rivalPreview(moved, id);
    expect(p?.landing).toEqual(at('E2'));
    expect(p?.targets).toEqual([]);
    expect(p?.starved).toBe(false); // the oil still lands somewhere: a mix, not a miss of effect
  });

  it('blocking the line changes the preview and never the aim', () => {
    const blocked = make('L # . . D\n. . . . .', { A1: herd() });
    const p = rivalPreview(blocked, rivalOf(blocked).id);
    expect(rivalOf(blocked).intent).toMatchObject({ aim: { kind: 'dir', dir: 'right' } });
    expect(p?.targets).toEqual([]);
    expect(p?.events.some((e) => e.type === 'stopped')).toBe(true);
  });

  it('follows a moved apprentice only as far as his line goes: out of the line is no target', () => {
    const p = rivalPreview(
      applyAction(state, { type: 'move', unit: 'draughtsman', to: at('D3') }).state,
      id,
    );
    expect(p?.targets).toEqual([]);
  });

  it('recomputes from the result state of a confirm preview', () => {
    const next = applyAction(state, { type: 'move', unit: 'draughtsman', to: at('C1') }).state;
    expect(rivalPreview(next, id)?.targets).toEqual(['draughtsman']);
    expect(rivalPreview(next, id)?.landing).toEqual(at('C1'));
  });
});

describe('RV-6 rivalPreview: purity', () => {
  it('never mutates the state or the rng, whatever it previews', () => {
    const states = [
      make('L . . . D', { A1: herd('B1') }),
      lay(make('. . . .\n. . . L\nD . . .', { D2: wick(1) }), 'A3'),
      make('L . . . D', { A1: { kind: 'rivalStrike', dir: 'right', order: 1 } }),
    ];
    for (const s of states) {
      const before = JSON.stringify(s);
      const e = rivalOf(s);
      rivalPreview(s, e.id);
      rivalPreview(s, e.id);
      expect(JSON.stringify(s)).toBe(before);
    }
  });

  it('is deterministic: the same state previews the same twice', () => {
    const s = make('L . . . D', { A1: herd() });
    const a = rivalPreview(s, rivalOf(s).id);
    expect(rivalPreview(s, rivalOf(s).id)).toEqual(a);
  });

  it('is null for a unit that is not a rival with a shown action', () => {
    const s = make('L . . . D', { A1: herd() });
    expect(rivalPreview(s, 'draughtsman')).toBeNull();
    expect(rivalPreview(s, 'nobody')).toBeNull();
    const idle = cloneData(s);
    rivalOf(idle).intent = null;
    expect(rivalPreview(idle, rivalOf(idle).id)).toBeNull();
  });
});

describe('RV-6 rivalPreview: the long wick', () => {
  const BOARD = '. . . .\n. . . L\nD . . .';
  const base = () => lay(make(BOARD, { D2: wick(1) }), 'A3');

  it('highlights the named jar, its target and what it opens (P7)', () => {
    const s = base();
    const p = rivalPreview(s, rivalOf(s).id);
    expect(p?.landing).toEqual(at('A3'));
    expect(p?.opens).toEqual([{ kind: 'jar', id: 1 }]);
    expect(p?.targets).toEqual(['draughtsman']);
    expect(p?.events.some((e) => e.type === 'jarOpened')).toBe(true);
    expect(p?.starved).toBe(false);
  });

  it('a jar’s drift moves the wick highlight, not the order', () => {
    const s = base();
    const drifted = cloneData(s);
    const jar = tileAt(drifted, at('A3')).jar;
    tileAt(drifted, at('A3')).jar = null;
    tileAt(drifted, at('B2')).jar = jar ?? null;
    expect(rivalOf(drifted).intent).toEqual(rivalOf(s).intent);
    const p = rivalPreview(drifted, rivalOf(drifted).id);
    expect(p?.landing).toEqual(at('B2'));
    expect(p?.opens).toEqual([{ kind: 'jar', id: 1 }]);
    expect(p?.targets).toEqual([]);
  });

  it('a lost jar has no landing, opens nothing and is starved', () => {
    const s = base();
    const gone = cloneData(s);
    tileAt(gone, at('A3')).jar = null;
    const p = rivalPreview(gone, rivalOf(gone).id);
    expect(p?.landing).toBeNull();
    expect(p?.opens).toEqual([]);
    expect(p?.events.some((e) => e.type === 'orderFails')).toBe(true);
    expect(p?.starved).toBe(true);
  });
});

describe('RV-6 rivalPreview: the fallback and the dry strike', () => {
  it('the fallback is live only while its tile is adjacent and holds an apprentice', () => {
    const s = make('L D . . .\n. . . . .', { A1: herd('B1') });
    const id = rivalOf(s).id;
    expect(rivalPreview(s, id)?.fallbackLive).toBe(true);
    const away = applyAction(s, { type: 'move', unit: 'draughtsman', to: at('B2') }).state;
    expect(rivalPreview(away, id)?.fallbackLive).toBe(false);
    const shoved = moveRival(s, 'A2');
    expect(rivalPreview(shoved, id)?.fallbackLive).toBe(false); // B1 no longer adjacent to A2... diagonal
  });

  it('a stunned rival’s action is skipped, with no fallback', () => {
    const s = cloneData(make('L D . . .', { A1: herd('B1') }));
    rivalOf(s).stunned = true;
    const p = rivalPreview(s, rivalOf(s).id);
    expect(p).toMatchObject({ landing: null, targets: [], events: [], fallbackLive: false });
  });

  it('the dry strike previews its adjacent target', () => {
    const s = make('L D . . .', { A1: { kind: 'rivalStrike', dir: 'right', order: 1 } });
    const p = rivalPreview(s, rivalOf(s).id);
    expect(p?.landing).toEqual(at('B1'));
    expect(p?.targets).toEqual(['draughtsman']);
    expect(p?.events.some((e) => e.type === 'damage')).toBe(true);
  });
});
