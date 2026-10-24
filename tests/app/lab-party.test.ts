import { afterEach, describe, expect, test } from 'vitest';
import { APPRENTICE_IDS, APPRENTICES, type ApprenticeId } from '$data';
import {
  castableSpells,
  createBattle,
  FOUNDERS,
  joinHousehold,
  livingUnits,
  members,
  parseBoard,
  parseLabel,
  serializeLattice,
} from '$engine';
import { checkRoom } from '$engine/rooms';
import { GameStore } from '../../src/app/game.svelte';
import {
  boardWithStarts,
  defaultLineup,
  exportedMembers,
  fallbackLattices,
  LAB_ROOMS,
  LAB_SCENARIOS,
  labSpec,
  membersOn,
  PALETTE,
  profileLattices,
  resolveScenario,
  toggleLineup,
  toggleStart,
} from '../../src/app/lab';
import { LabStore } from '../../src/app/lab.svelte';
import { memoryBackend } from '../../src/app/save';

/** The first registry apprentice who is not a founder: a recruit (the stub for "someone new"). */
const RECRUIT: ApprenticeId = APPRENTICE_IDS.find((id) => !FOUNDERS.includes(id)) ?? 'stoker';
const at = parseLabel;

describe('Lab rooms (P5, P16)', () => {
  test('the two sized rooms pass the room format check at both ends of the format', () => {
    for (const room of LAB_ROOMS) expect(checkRoom(room.board), room.id).toEqual([]);
    expect(parseBoard(LAB_ROOMS[0]?.board ?? '').width).toBe(7);
    expect(parseBoard(LAB_ROOMS[0]?.board ?? '').height).toBe(9);
    expect(parseBoard(LAB_ROOMS[1]?.board ?? '').width).toBe(5);
    expect(parseBoard(LAB_ROOMS[1]?.board ?? '').height).toBe(6);
  });

  test('the picker offers the lessons and the rooms, and resolves both', () => {
    expect(LAB_SCENARIOS.map((s) => s.id)).toEqual(expect.arrayContaining(['sandbox', 'room-7x9']));
    expect(resolveScenario('room-5x6').unknown).toBeNull();
    expect(resolveScenario('no-such-room').unknown).toBe('no-such-room');
  });
});

describe('the Lab palette paints anyone (P16)', () => {
  test('every registry apprentice has a swatch under their own token, and P has one', () => {
    const items = PALETTE.map((p) => p.item);
    for (const id of APPRENTICE_IDS) expect(items, id).toContain(APPRENTICES[id].token);
    expect(items).toContain('P');
    expect(new Set(items).size).toBe(items.length);
  });
});

describe('the lineup', () => {
  test('holds one to three, in the order picked', () => {
    let l: ApprenticeId[] = ['draughtsman'];
    expect(toggleLineup(l, 'draughtsman').why).toMatch(/at least one/);
    l = toggleLineup(l, 'stoker').lineup;
    l = toggleLineup(l, RECRUIT).lineup;
    expect(l).toEqual(['draughtsman', 'stoker', RECRUIT]);
    const full = toggleLineup(l, 'towelBearer');
    expect(full.why).toMatch(/3 at most/);
    expect(full.lineup).toEqual(l);
    expect(toggleLineup(l, 'stoker').lineup).toEqual(['draughtsman', RECRUIT]);
  });

  test('starts from the trip slots, else the founding pair', () => {
    const game = new GameStore(memoryBackend(), () => 0);
    expect(defaultLineup(game.profile)).toEqual(['draughtsman', 'stoker']);
    game.updateProfile((p) => joinHousehold(p, RECRUIT));
    game.bring(RECRUIT);
    expect(defaultLineup(game.profile)).toContain(RECRUIT);
  });

  test('pages: the notebook for the household, the starter page for everyone else', () => {
    const game = new GameStore(memoryBackend(), () => 0);
    const mine = profileLattices(game.profile);
    expect(Object.keys(mine).sort()).toEqual([...APPRENTICE_IDS].sort());
    const starter = fallbackLattices();
    expect(serializeLattice(mine[RECRUIT])).toBe(serializeLattice(starter[RECRUIT]));
    expect(serializeLattice(starter[RECRUIT]).length).toBeGreaterThan(0);
  });
});

describe('fielding a lineup on start points', () => {
  const room = (id: string) => resolveScenario(id).def;
  const field = (id: string, lineup: ApprenticeId[], spotSeed?: number) => {
    const { spec } = labSpec(room(id), {
      lattices: fallbackLattices(),
      inventions: {},
      lineup,
      ...(spotSeed === undefined ? {} : { spotSeed }),
    });
    return createBattle(spec).state;
  };
  const spots = (s: ReturnType<typeof field>) =>
    members(s)
      .map((m) => `${m.def}@${m.pos.x},${m.pos.y}`)
      .sort();

  test('three apprentices take three distinct start points of the 7×9 room', () => {
    const s = field('room-7x9', ['draughtsman', 'stoker', RECRUIT]);
    expect(s.width).toBe(7);
    expect(s.height).toBe(9);
    const board = parseBoard(room('room-7x9').board);
    const where = members(s).map((m) => m.pos);
    expect(where).toHaveLength(3);
    for (const p of where) expect(board.starts.some((c) => c.x === p.x && c.y === p.y)).toBe(true);
    expect(new Set(where.map((p) => `${p.x},${p.y}`)).size).toBe(3);
  });

  test('one apprentice fits the 5×6 room', () => {
    const s = field('room-5x6', [RECRUIT]);
    expect(s.width).toBe(5);
    expect(s.height).toBe(6);
    expect(members(s).map((m) => m.def)).toEqual([RECRUIT]);
  });

  test('the same lab seed gives the same spots; another spots seed can move them', () => {
    const a = spots(field('room-7x9', ['draughtsman', 'stoker', RECRUIT]));
    expect(spots(field('room-7x9', ['draughtsman', 'stoker', RECRUIT]))).toEqual(a);
    const others = [2, 3, 4, 5, 6].map((n) =>
      spots(field('room-7x9', ['draughtsman', 'stoker', RECRUIT], n)),
    );
    expect(others.some((o) => o.join() !== a.join())).toBe(true);
  });

  test('a recruit arrives with a compiled page and can cast', () => {
    const s = field('room-5x6', [RECRUIT]);
    const unit = members(s)[0];
    if (!unit) throw new Error('no recruit');
    expect(unit.spells.length).toBeGreaterThan(0);
    expect(castableSpells(s, unit.id).length).toBeGreaterThan(0);
  });

  test('a board that places apprentices itself keeps them (no lineup)', () => {
    const { spec } = labSpec(room('sandbox'), {
      lattices: fallbackLattices(),
      inventions: {},
      lineup: [RECRUIT],
    });
    expect(spec.lineup).toBeUndefined();
    expect(members(createBattle(spec).state).map((m) => m.def)).toEqual(['draughtsman', 'stoker']);
  });

  test('a lineup bigger than the points is cut to the points', () => {
    const def = {
      ...room('room-5x6'),
      board: 'P . . . .\n. . . . .\n. . . . .\n. . . . .\n. . . . .\n. . . . P',
    };
    const { spec } = labSpec(def, {
      lattices: fallbackLattices(),
      inventions: {},
      lineup: ['draughtsman', 'stoker', RECRUIT],
    });
    expect(spec.lineup).toEqual(['draughtsman', 'stoker']);
  });
});

describe('LabStore with a lineup', () => {
  let lab: LabStore | null = null;
  afterEach(() => {
    lab?.session?.dispose();
    lab = null;
  });
  const fresh = (id: string): LabStore => {
    lab = new LabStore(new GameStore(memoryBackend(), () => 0));
    lab.load(id);
    return lab;
  };
  const who = (l: LabStore): string[] =>
    l.session?.state.units
      .filter((u) => u.kind === 'member')
      .map((u) => u.def)
      .sort() ?? [];

  test('a P room fields the default lineup; the sandbox keeps its own D and S', () => {
    expect(who(fresh('room-7x9'))).toEqual(['draughtsman', 'stoker']);
    expect(fresh('room-7x9').starts).toHaveLength(6);
    expect(fresh('sandbox').starts).toHaveLength(0);
  });

  test('picking a recruit refields the lineup, and undo brings the old one back', () => {
    const l = fresh('room-7x9');
    const before = who(l);
    l.toggleLineupMember(RECRUIT);
    expect(l.lineup).toContain(RECRUIT);
    expect(who(l)).toContain(RECRUIT);
    expect(who(l)).toHaveLength(3);
    l.undo();
    expect(who(l)).toEqual(before);
  });

  test('the fielded recruit has their page; Redraw keeps the lineup on the points', () => {
    const l = fresh('room-7x9');
    l.toggleLineupMember(RECRUIT);
    const unit = l.session?.state.units.find((u) => u.def === RECRUIT);
    expect(unit?.kind === 'member' && unit.spells.length > 0).toBe(true);
    l.redraw();
    const at7 = l.session?.state.units.filter((u) => u.kind === 'member') ?? [];
    expect(at7).toHaveLength(3);
    const starts = l.starts.map((c) => `${c.x},${c.y}`);
    for (const u of at7) expect(starts).toContain(`${u.pos.x},${u.pos.y}`);
  });

  test('painting P marks and clears a start point; a unit or plate refuses it', () => {
    const l = fresh('sandbox');
    l.palette = 'P';
    l.paint(at('A1'));
    expect(l.starts.map((c) => `${c.x},${c.y}`)).toEqual(['0,0']);
    l.paint(at('A1'));
    expect(l.starts).toHaveLength(0);
    l.paint(at('B7')); // the Draughtsman stands there
    expect(l.starts).toHaveLength(0);
    l.paint(at('E5')); // the brass plate
    expect(l.starts).toHaveLength(0);
    l.paint(at('A1'));
    l.undo();
    expect(l.starts).toHaveLength(0);
  });

  test('painted start points field a lineup of one on a bare board', () => {
    const l = fresh('sandbox');
    l.palette = 'P';
    l.paint(at('A1'));
    l.paint(at('F1'));
    l.toggleLineupMember(RECRUIT);
    expect(l.lineup).toHaveLength(3);
    expect(l.canField).toBe(false);
    l.toggleLineupMember('draughtsman');
    l.toggleLineupMember('stoker');
    expect(l.lineup).toEqual([RECRUIT]);
    expect(who(l)).toEqual([RECRUIT]);
    const spot = l.session?.state.units.find((u) => u.def === RECRUIT)?.pos;
    expect(l.starts.some((c) => c.x === spot?.x && c.y === spot?.y)).toBe(true);
  });

  test('anyone in the registry can be painted onto the board, page and all', () => {
    const l = fresh('sandbox');
    l.palette = APPRENTICES[RECRUIT].token;
    l.paint(at('A1'));
    const unit = l.session?.state.units.find((u) => u.def === RECRUIT);
    expect(unit?.pos).toEqual(at('A1'));
    expect(unit?.kind === 'member' && unit.spells.length > 0).toBe(true);
    l.paint(at('C1')); // moves them, one place each
    expect(membersOn(l.session?.state ?? ({} as never)).filter((m) => m === RECRUIT)).toHaveLength(
      1,
    );
    l.paint(at('C1')); // the same token again removes
    expect(who(l)).not.toContain(RECRUIT);
  });

  test('the board copies out with its start points, and parses back', () => {
    const l = fresh('room-7x9');
    const s = l.session?.state;
    if (!s) throw new Error('no session');
    const text = boardWithStarts(s, l.starts);
    const back = parseBoard(text);
    const free = l.starts.filter(
      (c) => !livingUnits(s).some((u) => u.pos.x === c.x && u.pos.y === c.y),
    );
    expect(back.starts).toEqual(free);
    expect(
      back.units
        .filter((u) => u.kind === 'member')
        .map((u) => u.def)
        .sort(),
    ).toEqual(['draughtsman', 'stoker']);
    expect(livingUnits(s).length).toBe(back.units.length);
  });

  test('copied lattices and scenarios name everyone on the board, recruits included', () => {
    const l = fresh('room-5x6');
    l.toggleLineupMember(RECRUIT);
    expect(exportedMembers(membersOn(l.session?.state ?? ({} as never)))).toContain(RECRUIT);
    expect(exportedMembers([])).toEqual(['draughtsman', 'stoker']);
  });

  test('toggleStart leaves a drop-in board alone when refused', () => {
    const l = fresh('sandbox');
    const s = l.session?.state;
    if (!s) throw new Error('no session');
    const r = toggleStart(s, [], at('B7'));
    expect(r.starts).toEqual([]);
    expect(r.why).toMatch(/under a unit/);
  });
});

describe('Gallery room fixtures', () => {
  test('each sample room stands its party on distinct start points', async () => {
    const { ROOM_SAMPLES, roomView, roomOverlay } = await import(
      '../../src/ui/screens/galleryFixtures'
    );
    for (const r of ROOM_SAMPLES) {
      const v = roomView(r.layout, r.lineup);
      const who = v.units.filter((u) => u.kind === 'member');
      expect(who).toHaveLength(r.lineup.length);
      expect(new Set(who.map((u) => `${u.pos.x},${u.pos.y}`)).size).toBe(r.lineup.length);
      expect(roomOverlay(r.layout).highlights.length).toBeGreaterThanOrEqual(4);
    }
    expect(ROOM_SAMPLES.map((r) => r.lineup.length)).toEqual([3, 1]);
  });
});
