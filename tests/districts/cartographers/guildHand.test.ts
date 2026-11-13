import { describe, expect, it } from 'vitest';
import { DEFAULT_PENCIL, type PencilConfig } from '$data/districts/cartographers/types';
import { type BattleState, type GameEvent, tileAt } from '$engine';
import { KIT } from '$engine/districts';
import {
  GUILD_HAND_RULE,
  PENCIL_RULE,
  parseGuildHand,
  readPencilConfig,
} from '$engine/districts/cartographers/guildHand';
import {
  BLANK_PIECE,
  GUILD_HAND_RULE_ID,
  type GuildHandState,
  PENCIL_PIECE,
  PENCIL_RULE_ID,
  type PencilData,
} from '$engine/districts/cartographers/types';
import { neighbors4 } from '$engine/grid';
import { blocksUnits, inBoard, isAlive, members } from '$engine/queries';
import { listRules, rulePreview } from '$engine/rules';
import { act, board, parseLabel } from '../../scenarios/harness';

/**
 * CG-2: the guild's hand (cartographers-plan P3, P4). Each board lists the rule as a room would
 * (`listRules`, a config with a `seed`); a dummy far away keeps the room from being won. One
 * `endTurn` is one round: the round end resolves the pencil due, then plans the next round.
 */

const at = parseLabel;
const ID = GUILD_HAND_RULE_ID;
const GRID = [
  'D {pencil} {pencil} {pencil}',
  '{pencil} {pencil} {pencil} {pencil}',
  '{pencil} {pencil} {pencil} d',
].join('\n');

function room(ascii: string, config: Partial<PencilConfig> & { seed?: number } = {}): BattleState {
  const s = structuredClone(board(ascii));
  s.rules = listRules(s, [ID], { [ID]: { seed: 1, ...config } });
  return s;
}
const dusk = (s: BattleState) => act(s, { type: 'endTurn' });
const hand = (s: BattleState): GuildHandState => parseGuildHand(s.rules?.[ID]);

interface Paper {
  at: string;
  kind: 'pencil' | 'blank' | 'paper';
  fate: PencilData['fate'];
  due: number | null;
}
/** Every tile as paper: its piece, and a pencil's fate and due. */
function paper(s: BattleState): Paper[] {
  return s.tiles.map((t, i) => {
    const id = t.piece?.id;
    const d = t.piece?.data as PencilData | undefined;
    return {
      at: `${i % s.width},${Math.floor(i / s.width)}`,
      kind: id === PENCIL_PIECE ? 'pencil' : id === BLANK_PIECE ? 'blank' : 'paper',
      fate: id === PENCIL_PIECE ? (d?.fate ?? null) : null,
      due: id === PENCIL_PIECE ? (d?.due ?? null) : null,
    };
  });
}
const planned = (s: BattleState) => paper(s).filter((p) => p.kind === 'pencil' && p.fate !== null);
const evAt = (events: readonly GameEvent[], type: string): string[] =>
  events
    .filter((e) => e.type === type)
    .map((e) => {
      const a = (e as { at?: { x: number; y: number } }).at;
      return a ? `${a.x},${a.y}` : '';
    })
    .sort();
const shapesAt = (s: BattleState, tone: 'erased' | 'drawn'): string[] =>
  rulePreview(s)
    .filter((p) => p.rule === ID)
    .flatMap((p) => p.shapes)
    .flatMap((sh) => (sh.kind === 'tile' && sh.tone === tone ? [`${sh.at.x},${sh.at.y}`] : []))
    .sort();

describe('registration and config', () => {
  it('registers the hand (district-scoped, late) and the pencil rule (piece-scoped)', () => {
    expect(KIT.rules[ID]).toBe(GUILD_HAND_RULE);
    expect(GUILD_HAND_RULE).toMatchObject({
      slot: 'late',
      scope: 'district',
      activatedBy: { kind: 'district' },
    });
    expect(KIT.rules[PENCIL_RULE_ID]).toBe(PENCIL_RULE);
    expect(PENCIL_RULE.scope).toBe('piece');
    expect(KIT.pieces['cartographers:pencil']?.rules).toEqual([PENCIL_RULE_ID]);
  });

  it('a room config out of range or missing reads as the defaults', () => {
    expect(readPencilConfig(undefined)).toEqual(DEFAULT_PENCIL);
    expect(readPencilConfig({ share: 2, perRound: -1, inkBias: 'x', redraw: 1.5 })).toEqual(
      DEFAULT_PENCIL,
    );
    expect(readPencilConfig({ share: 0.5, perRound: 1, inkBias: 0, redraw: 2 })).toEqual({
      share: 0.5,
      perRound: 1,
      inkBias: 0,
      redraw: 2,
    });
    const own = room(GRID, { perRound: 0.5, seed: 9 }).rules?.[ID];
    expect(own).toMatchObject({ ...DEFAULT_PENCIL, perRound: 0.5, planned: 0, seed: 9 });
  });
});

describe('CG-2 the guild hand', () => {
  it('CG-2: same seed gives the same plan', () => {
    const run = (seed: number) => {
      const r = dusk(room(GRID, { seed }));
      return { plan: planned(r.state), state: r.state };
    };
    const a = run(3);
    expect(a.plan.length).toBe(2); // 10 pencil: 4 fell due in round 1, a third of the other 6 is next
    expect(run(3).plan).toEqual(a.plan);
    // A saved battle replays the same plan, round after round.
    const saved: BattleState = JSON.parse(JSON.stringify(a.state));
    expect(paper(dusk(saved).state)).toEqual(paper(dusk(a.state).state));
    // The stream is the seed's: some other seed plans differently.
    const others = [1, 2, 4, 5, 6, 7, 8].map((seed) => JSON.stringify(run(seed).plan));
    expect(others.some((o) => o !== JSON.stringify(a.plan))).toBe(true);
  });

  it('CG-2: preview equals the next round end', () => {
    let s = room(GRID, { seed: 7, perRound: 0.5, inkBias: 0.5 });
    for (let round = 1; round <= 4; round++) {
      const rub = shapesAt(s, 'erased');
      const ink = shapesAt(s, 'drawn');
      const r = dusk(s);
      expect(evAt(r.events, 'cartographers:rubbedOut'), `round ${round} rubs`).toEqual(rub);
      expect(evAt(r.events, 'cartographers:inked'), `round ${round} inks`).toEqual(ink);
      for (const a of rub) expect(paper(r.state).find((p) => p.at === a)?.kind).toBe('blank');
      for (const a of ink) expect(paper(r.state).find((p) => p.at === a)?.kind).toBe('paper');
      s = r.state;
    }
    // Round 1's plan is the same whether the player moves first or not.
    const fresh = room(GRID, { seed: 7, perRound: 0.5 });
    const before = [shapesAt(fresh, 'erased'), shapesAt(fresh, 'drawn')];
    const moved = act(fresh, { type: 'move', unit: 'draughtsman', to: at('B1') }).state;
    expect([shapesAt(moved, 'erased'), shapesAt(moved, 'drawn')]).toEqual(before);
    expect(hand(fresh).planned).toBe(0); // nothing was drawn by looking
  });

  it('CG-2: a unit on a rub-due tile is erased at round end', () => {
    const s = room('D S{pencil:rub@1} r{pencil:rub@1} .\n. . . d', { perRound: 0 });
    expect(shapesAt(s, 'erased')).toEqual(['1,0', '2,0']);
    const r = dusk(s);
    const ids = (
      r.events.find((e) => e.type === 'cartographers:rubbedOut') as GameEvent & {
        data: { units: string[] };
      }
    ).data.units;
    expect(ids).toContain('stoker');
    expect(r.state.units.find((u) => u.id === 'stoker')).toMatchObject({ out: 'erased' });
    expect(r.state.units.find((u) => u.id === 'rat-1')).toMatchObject({ hp: 0, out: 'erased' });
    expect(['1,0', '2,0'].map((a) => paper(r.state).find((p) => p.at === a)?.kind)).toEqual([
      'blank',
      'blank',
    ]);
    expect(r.state.phase).toBe('player');
    expect(r.events.filter((e) => e.type === 'outOfRoom')).toHaveLength(2);
  });

  it('CG-2: a rub that erases the whole party loses the room, an elite takes 4 and stays', () => {
    const lone = dusk(room('S{pencil:rub@1} . . b\n. . . d', { perRound: 0 }));
    expect(lone.state.phase).toBe('lost');
    const elite = dusk(room('D b{pencil:rub@1} . .\n. . . d', { perRound: 0 }));
    expect(elite.state.units.find((u) => u.id === 'sentry-1')).toMatchObject({ hp: 1 });
    expect(elite.state.phase).toBe('player');
  });

  it('CG-2: the strand guard never leaves a member without a standable neighbour', () => {
    // Everything is rubbed (inkBias 0, perRound 1): only the guard keeps the corner reachable.
    const corner = dusk(
      room('D {pencil} . d\n{pencil} {pencil} . .', { perRound: 1, inkBias: 0, seed: 4 }),
    );
    const kinds = paper(corner.state);
    expect(kinds.find((p) => p.at === '1,0')?.kind).toBe('blank'); // reading order: first is rubbed
    expect(kinds.find((p) => p.at === '0,1')?.kind).toBe('paper'); // the second would strand her
    // And over seeds, rounds and boards: a member with a way out keeps one.
    const standable = (s: BattleState, x: number, y: number): boolean =>
      neighbors4({ x, y }).some((n) => inBoard(s, n) && !blocksUnits(tileAt(s, n)));
    for (let seed = 1; seed <= 25; seed++) {
      let s = room(
        '. {pencil} {pencil} {pencil} .\n{pencil} {pencil} {pencil} {pencil} {pencil}\n{pencil} {pencil} D {pencil} {pencil}\n{pencil} {pencil} {pencil} {pencil} d',
        { perRound: 0.6, inkBias: 0.1, seed },
      );
      for (let round = 1; round <= 5; round++) {
        s = dusk(s).state;
        for (const m of members(s).filter(isAlive)) {
          expect(standable(s, m.pos.x, m.pos.y), `seed ${seed} round ${round}`).toBe(true);
        }
      }
    }
  });

  it('CG-2: redraw pencils new tiles beside inked paper', () => {
    const ascii = '. . . .\n. {pencil:rub@1} . .\n. . D d';
    const r = dusk(room(ascii, { redraw: 2, perRound: 1, seed: 2 }));
    const fresh = paper(r.state).filter((p) => p.kind === 'pencil');
    expect(fresh).toHaveLength(2);
    for (const p of fresh) {
      expect(p).toMatchObject({ fate: null, due: null }); // unplanned until the next plan
      const [x, y] = p.at.split(',').map(Number) as [number, number];
      expect(Math.abs(x - 1) + Math.abs(y - 1)).toBe(1); // beside the rubbed tile
    }
    expect(paper(r.state).find((p) => p.at === '1,1')?.kind).toBe('blank');
    // The next plan takes them up.
    const next = dusk(r.state);
    const later = paper(next.state).filter((p) => p.kind === 'pencil');
    expect(later.filter((p) => p.fate !== null).map((p) => p.due)).toEqual([3, 3]);
    expect(later).toHaveLength(4); // and two more drawn beside the paper
    // No redraw configured: nothing is added.
    const none = dusk(room(ascii, { redraw: 0, perRound: 1, seed: 2 }));
    expect(paper(none.state).filter((p) => p.kind === 'pencil')).toHaveLength(0);
  });

  it('plans a third of what is unplanned each round and resolves it the round after', () => {
    let s = room(GRID, { seed: 5, perRound: 1 / 3 });
    let left = 10;
    for (let round = 1; round <= 3; round++) {
      const r = dusk(s);
      const unplanned = paper(r.state).filter((p) => p.kind === 'pencil' && p.fate === null).length;
      const due = planned(r.state);
      expect(due.every((p) => p.due === round + 1)).toBe(true);
      expect(due).toHaveLength(Math.ceil((unplanned + due.length) / 3));
      expect(unplanned + due.length).toBeLessThanOrEqual(left);
      left = unplanned + due.length;
      s = r.state;
    }
    expect(hand(s).planned).toBe(4);
  });
});

describe('CG-2 the pencil piece alone', () => {
  it('CG-2: a fixed-fate pencil resolves on a Lab board without the district', () => {
    const lab = board('D S{pencil:rub@1} . {pencil:ink@2}\n. {pencil} . d');
    expect(lab.rules?.[ID]).toBeUndefined();
    expect(rulePreview(lab).find((p) => p.rule === PENCIL_RULE_ID)?.shapes).toEqual([
      { kind: 'tile', at: at('B1'), tone: 'erased' },
    ]);
    const one = dusk(lab);
    expect(one.state.units.find((u) => u.id === 'stoker')).toMatchObject({ out: 'erased' });
    expect(paper(one.state).find((p) => p.at === '1,0')?.kind).toBe('blank');
    expect(paper(one.state).find((p) => p.at === '3,0')?.kind).toBe('pencil'); // not yet due
    const two = dusk(one.state);
    expect(paper(two.state).find((p) => p.at === '3,0')?.kind).toBe('paper'); // inked at round 2
    // An unplanned pencil is left alone: nothing plans without the district.
    expect(paper(two.state).find((p) => p.at === '1,1')).toMatchObject({
      kind: 'pencil',
      fate: null,
      due: null,
    });
    expect(hand(two.state).planned).toBe(0);
    expect(two.state.rules?.[ID]).toBeUndefined();
  });

  it('where the district lists the hand, a fixed fate resolves once, not twice', () => {
    const r = dusk(room('D S{pencil:rub@1} . .\n. . . d', { perRound: 0 }));
    expect(r.events.filter((e) => e.type === 'cartographers:rubbedOut')).toHaveLength(1);
    expect(r.events.filter((e) => e.type === 'outOfRoom')).toHaveLength(1);
  });
});
