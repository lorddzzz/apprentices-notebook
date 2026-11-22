import { describe, expect, it } from 'vitest';
import type { Drawing } from '$data';
import { COSTS, DRAWN_CHIEF_WARDEN_HP, DRAWN_STEWARD_HP, NEEDS } from '$data/drawing';
import {
  type BattleState,
  beginEncounter,
  closeBattle,
  type Profile,
  pickLoot,
  startTrip,
  type Trip,
  takeChoice,
} from '$engine';
import {
  checkDrawing,
  checkGenerated,
  GEN_KITS,
  generateRoom,
  HEART_FRAMES,
  inkRoom,
  parseInkedState,
  roomInput,
  specFor,
} from '$engine/drawing';
import { heatAt, heatSetup } from '$engine/drawing/kits/bathhouses';
import { adjustSpan, strandedBy, unsupportedSpans } from '$engine/drawing/kits/bridges';
import { parseBoard } from '$engine/notation';
import { fullHousehold, heartDrawing, heartRoom, heartSpec, inputFor } from './fixtures';
import { SCRIPTS_B } from './kits-b.scripts';

/**
 * Pack J's kits and frames beyond the shared acceptance tests (EN-K4, EN-K5): what each frame
 * declares, which master stands on which ground, the heat and the span choice at every length.
 */

const MASTERS = ['bathSteward', 'chiefWarden'] as const;
const kitOf = (district: string) => {
  const kit = GEN_KITS.find((k) => k.district === district);
  if (!kit) throw new RangeError(`No kit for ${district}`);
  return kit;
};
const NEIGHBOURS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

describe('Pack J frames (EN-K4, EN-K5)', () => {
  it('EN-K4: every frame takes its needs and cost from the drawing table', () => {
    for (const master of MASTERS) {
      const frame = HEART_FRAMES[master];
      expect(frame?.master).toBe(master);
      expect(frame?.cost).toBe(COSTS.hearts[master]);
      expect(frame?.needs.map((n) => n.reason)).toEqual((NEEDS[master] ?? []).map((n) => n.reason));
      expect(frame?.setup.foe).toBe(master);
      expect(frame?.escorts).toEqual([]);
      expect(SCRIPTS_B[master]?.length).toBeGreaterThan(0);
    }
  });

  // Generator over many seeds: slow under full parallel load, so it gets its own limit.
  it('EN-K4: the Steward stands on a connected cloud of four or more tiles', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const { room, masterOnBoard } = heartRoom('bathSteward', seed);
      expect(masterOnBoard).toBe(true);
      const { width: w, height: h, tiles } = room.layout;
      const cloud = (x: number, y: number): boolean =>
        x >= 0 && y >= 0 && x < w && y < h && tiles[y * w + x]?.state?.id === 'cloud';
      const steward = room.layout.units.find((u) => u.def === 'bathSteward');
      expect(cloud(steward?.at.x ?? -1, steward?.at.y ?? -1)).toBe(true);
      const seen = new Set<string>([`${steward?.at.x},${steward?.at.y}`]);
      const queue = [steward?.at as { x: number; y: number }];
      for (let c = queue.pop(); c; c = queue.pop()) {
        for (const [dx, dy] of NEIGHBOURS) {
          const n = { x: c.x + dx, y: c.y + dy };
          if (cloud(n.x, n.y) && !seen.has(`${n.x},${n.y}`)) {
            seen.add(`${n.x},${n.y}`);
            queue.push(n);
          }
        }
      }
      expect(seen.size).toBeGreaterThanOrEqual(4);
    }
  }, 300_000);

  // Generator over many seeds: slow under full parallel load, so it gets its own limit.
  it('EN-K5: the Chief Warden stands on the keystone, with piers and spans and none cracked', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const { room, masterOnBoard } = heartRoom('chiefWarden', seed);
      expect(masterOnBoard).toBe(true);
      const { width: w, tiles } = room.layout;
      const chief = room.layout.units.find((u) => u.def === 'chiefWarden');
      expect(tiles[(chief?.at.y ?? 0) * w + (chief?.at.x ?? 0)]?.piece?.id).toBe(
        'bridges:keystone',
      );
      const ids = tiles.map((t) => t.piece?.id);
      expect(ids).toContain('bridges:pier');
      expect(ids).toContain('bridges:span');
      expect(unsupportedSpans(room.layout)).toEqual([]);
      expect(strandedBy(room.layout)).toBeNull();
    }
  }, 300_000);

  it('CAL-F1: the drawn Chief Warden keeps DRAWN_CHIEF_WARDEN_HP', () => {
    expect(HEART_FRAMES.chiefWarden?.enemyHp).toEqual({ chiefWarden: DRAWN_CHIEF_WARDEN_HP });

    const page = heartDrawing('chiefWarden');
    const owner: Profile = { ...fullHousehold(), drawings: [page, null, null] };
    const trip = {
      ...startTrip(owner, 1, 'inkedPage', { page: 0 }),
      encounter: page.length - 1,
    };
    const battle = beginEncounter(owner, inkRoom(owner, trip)).state;
    expect(battle.units).toContainEqual(
      expect.objectContaining({
        def: 'chiefWarden',
        hp: DRAWN_CHIEF_WARDEN_HP,
        maxHp: DRAWN_CHIEF_WARDEN_HP,
      }),
    );
  });

  it('CAL-5H: the drawn Steward keeps DRAWN_STEWARD_HP', () => {
    expect(HEART_FRAMES.bathSteward?.enemyHp).toEqual({ bathSteward: DRAWN_STEWARD_HP });

    const page = heartDrawing('bathSteward');
    const owner: Profile = { ...fullHousehold(), drawings: [page, null, null] };
    const trip = {
      ...startTrip(owner, 1, 'inkedPage', { page: 0 }),
      encounter: page.length - 1,
    };
    const battle = beginEncounter(owner, inkRoom(owner, trip)).state;
    expect(battle.units).toContainEqual(
      expect.objectContaining({
        def: 'bathSteward',
        hp: DRAWN_STEWARD_HP,
        maxHp: DRAWN_STEWARD_HP,
      }),
    );
  });

  it('EN-K5: the authored fallback keeps its footing and its party on their feet', () => {
    const fallback = HEART_FRAMES.chiefWarden?.fallback;
    expect(fallback && unsupportedSpans(fallback)).toEqual([]);
    expect(fallback && strandedBy(fallback)).toBeNull();
  });
});

describe('Pack J kits (EN-K4, EN-K5)', () => {
  it('EN-K4: the boil-over brings its vents, and heat 1 to 4 is written out for every length', () => {
    const baths = kitOf('bathhouses');
    expect(baths.rules.map((r) => r.id)).toEqual(['bathhouses:boilOver']);
    expect(baths.shapes.map((s) => s.id)).toEqual(['bathhouses:heat']);
    expect(heatAt(0, 3)).toBe(1);
    const table = [3, 4, 5, 6].map((length) =>
      Array.from({ length }, (_, room) => heatAt(room, length)),
    );
    expect(table).toEqual([
      [1, 2, 4],
      [1, 2, 3, 4],
      [1, 1, 2, 3, 4],
      [1, 1, 2, 2, 3, 4],
    ]);
    const drawing: Drawing = { ...heartDrawing('bathSteward'), length: 4 };
    for (const seed of [1, 2, 3]) {
      for (let room = 0; room < 3; room++) {
        const input = inputFor(drawing, seed, room);
        const made = generateRoom(input);
        expect(checkGenerated(made.layout, specFor(input, seed))).toEqual([]);
        expect(made.layout.tiles.some((t) => t.terrain.vent)).toBe(true);
      }
    }
  }, 120_000);

  it('EN-K4: a cooled room runs one lower and never below 1, the heart never cooled', () => {
    const at = (room: number, length: number, pendingCool: number) =>
      heatSetup({ room, length, state: { pendingCool } }).rulesConfig?.['bathhouses:boilOver'];
    expect(at(1, 5, 1)).toEqual({ heat: 1 });
    expect(at(0, 5, 1)).toEqual({ heat: 1 });
    expect(at(3, 5, 1)).toEqual({ heat: 2 });
    expect(at(4, 5, 1)).toEqual({ heat: 4 });
  });

  it('EN-K5: the collapse brings its spans and piers, none starts cracked, fuller means one stone', () => {
    const bridges = kitOf('bridges');
    expect(bridges.rules.map((r) => r.id)).toEqual(['bridges:collapse']);
    expect(bridges.rules[0]?.brings).toEqual(['bridges:span', 'bridges:pier']);
    expect(bridges.shapes.map((s) => s.id)).toEqual(['bridges:span']);
    const drawing: Drawing = { ...heartDrawing('chiefWarden'), shape: 'bridges:span', length: 4 };
    for (const seed of [1, 2, 3]) {
      for (const choice of ['sound', 'crumbling']) {
        const input = { ...inputFor(drawing, seed, 1), choice };
        const made = generateRoom(input);
        expect(checkGenerated(made.layout, specFor(input, seed))).toEqual([]);
        expect(unsupportedSpans(made.layout)).toEqual([]);
        const stones = made.layout.tiles.flatMap((t) =>
          t.piece?.id === 'bridges:span' ? [(t.piece.data as { stone: number }).stone] : [],
        );
        expect(stones.length).toBeGreaterThan(0);
        expect(new Set(stones)).toEqual(new Set([choice === 'crumbling' ? 1 : 2]));
      }
    }
  }, 120_000);

  it('EN-K5: the sound span is a bigger board with more foes, the crumbling one the fuller stamp', () => {
    const drawing: Drawing = { ...heartDrawing('chiefWarden'), shape: 'bridges:span', length: 5 };
    const plain = specFor(inputFor(drawing, 1, 2), 1);
    const sound = specFor({ ...inputFor(drawing, 1, 2), choice: 'sound' }, 1);
    const crumbling = specFor({ ...inputFor(drawing, 1, 2), choice: 'crumbling' }, 1);
    expect(sound.size.width).toBeGreaterThanOrEqual(plain.size.width);
    expect(sound.size.height).toBeGreaterThanOrEqual(plain.size.height);
    expect(sound.size.width + sound.size.height).toBeGreaterThan(
      plain.size.width + plain.size.height - 1,
    );
    expect(sound.budget).toBe(plain.budget + 1);
    expect(crumbling.fuller).toBe(true);
    expect(crumbling.size).toEqual(plain.size);
    expect(crumbling.budget).toBe(plain.budget);
    // The heart's spec is its frame's and never moves; no other choice changes a room.
    const heart = specFor({ ...inputFor(drawing, 1), choice: 'sound' }, 1);
    expect(heart.size).toEqual(HEART_FRAMES.chiefWarden?.size);
    expect(adjustSpan(plain, 'other')).toEqual(plain);
    expect(adjustSpan({ ...plain, heart: true }, 'sound')).toEqual({ ...plain, heart: true });
  });

  it('EN-K5: a span with no pier is cracked, and a start point on it is stranded', () => {
    const board = parseBoard(
      [
        '{pier} . . . {pier}',
        '. {span} {span} {span} .',
        '. {span} {span} {span} .',
        '. {span} {span} {span} .',
        '. {span} {span} {span} .',
        '. P P P P',
      ].join('\n'),
    );
    expect(unsupportedSpans(board).length).toBe(12);
    // The first dusk drops the whole bridge, but every start point is on the ground: they stand.
    expect(strandedBy(board)).toBeNull();
    const onSpan = { ...board, starts: [{ x: 2, y: 2 }, ...board.starts] };
    expect(strandedBy(onSpan)).toBe('A start point falls at the first dusk');
    const apart = parseBoard(
      ['{pier} {pier} .', '. {span} .', 'P . .'].join('\n').replace('{span}', '='),
    );
    expect(
      strandedBy({
        ...apart,
        starts: [
          { x: 0, y: 2 },
          { x: 2, y: 0 },
        ],
      }),
    ).toBeNull();
  });

  it('EN-K5: the span and pier pieces keep a layout together or are not offered', () => {
    const bridges = kitOf('bridges');
    const drawing: Drawing = {
      ...heartDrawing('chiefWarden'),
      pieces: ['bridges:span', 'bridges:pier'],
    };
    const input = inputFor(drawing, 2, 0);
    const made = generateRoom(input);
    expect(checkGenerated(made.layout, specFor(input, 2))).toEqual([]);
    for (const piece of bridges.pieces) {
      expect(piece.valid(made.layout)).toBe(true);
      expect(piece.cost).toBe(COSTS.piece);
    }
  }, 60_000);

  it('EN-K5: the choice taken on a trip reaches the generator', () => {
    const p: Profile = fullHousehold();
    const page: Drawing = {
      ...heartDrawing('chiefWarden'),
      name: 'Span page',
      shape: 'bridges:span',
      length: 4,
    };
    const owner: Profile = {
      ...p,
      drawings: [page, null, null],
      city: { ...p.city, open: [...new Set([...p.city.open, 'inkedPage' as const])] },
    };
    expect(checkDrawing(owner, page)).toEqual([]);
    const won = (b: BattleState): BattleState => {
      const s = structuredClone(b);
      s.phase = 'won';
      for (const u of s.units) if (u.kind === 'enemy') u.hp = 0;
      return s;
    };
    let t: Trip = inkRoom(owner, startTrip(owner, 5, 'inkedPage', { page: 0 }));
    t = closeBattle(owner, t, won(beginEncounter(owner, t).state)).trip ?? t;
    while (t.status === 'looting') t = pickLoot(t, 0);
    expect(roomInput(owner, t, 1).choice).toBeUndefined();
    t = takeChoice(t, 'crumbling');
    expect(roomInput(owner, t, 1).choice).toBe('crumbling');
    expect(roomInput(owner, t, 2).choice).toBeUndefined();
    const inked = parseInkedState(inkRoom(owner, t).kit?.state);
    const layout = parseBoard(inked.rooms[1] as string);
    const stones = layout.tiles.flatMap((x) =>
      x.piece?.id === 'bridges:span' ? [(x.piece.data as { stone: number }).stone] : [],
    );
    expect(new Set(stones)).toEqual(new Set([1]));
    expect(heartSpec(inputFor(page, 1)).heart).toBe(true);
  }, 60_000);
});
