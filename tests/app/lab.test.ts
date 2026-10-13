import { afterEach, describe, expect, test } from 'vitest';
import { SCENARIOS } from '$data';
import {
  applyAction,
  boardOf,
  createBattle,
  describeLog,
  type GameEvent,
  memberById,
  parseLabel,
  parseLattice,
  runScenario,
  scenarioSpec,
} from '$engine';
import { GameStore } from '../../src/app/game.svelte';
import {
  applyEdits,
  baseOf,
  cellTokens,
  fallbackLattices,
  formatScenario,
  labLocation,
  type PaletteItem,
  paletteEdits,
  toggleToken,
  toScenarioDef,
} from '../../src/app/lab';
import { LabStore } from '../../src/app/lab.svelte';
import { memoryBackend } from '../../src/app/save';
import { scenario } from './battleFixtures';

const at = parseLabel;

describe('toggleToken', () => {
  const table: [string, PaletteItem, string][] = [
    ['.', 'r', 'r'],
    ['r', 'r', '.'],
    ['r', 'b', 'b'],
    ['r!', 'f', 'f'],
    ['ro', '!', 'r!o'],
    ['r!o', '!', 'ro'],
    ['o', '*', '*'],
    ['*', '*', 'o'],
    ['ro', '.', '.'],
    ['.', 'o', 'o'],
    ['o', 'o', '.'],
    ['o', '~', 'o~'],
    ['~o', 'i', 'oi~'],
    ['=', 'o', 'o'],
    ['=', '=', '.'],
    ['.', '=', '='],
    ['=', 'D', 'D'],
    ['*', 'o', '*'],
    ['r', '&', 'r&'],
  ];
  for (const [token, item, want] of table) {
    test(`${token} + ${item} → ${want}`, () => {
      expect(toggleToken(token, item)).toBe(want);
    });
  }

  test('a modifier without a unit is ignored, and a plate refuses a unit', () => {
    expect(toggleToken('.', '!')).toBe('.');
    expect(toggleToken('o', '&')).toBe('o');
    expect(toggleToken('r', '=')).toBe('r');
  });

  test('every result parses as a board cell', () => {
    for (const [token, item] of table) {
      expect(() =>
        applyEdits(scenarioState('sandbox'), [{ at: at('A1'), token: toggleToken(token, item) }]),
      ).not.toThrow();
    }
  });
});

function scenarioState(id: string) {
  return createBattle(scenarioSpec(scenario(id), { lab: true, lattices: fallbackLattices() }))
    .state;
}

describe('painting', () => {
  test('paletteEdits moves an existing member', () => {
    const s = scenarioState('sandbox');
    const edits = paletteEdits(s, at('A3'), 'D');
    expect(edits).toEqual([{ at: at('A3'), token: 'D' }]);
    const next = applyEdits(s, edits);
    expect(memberById(next, 'draughtsman').pos).toEqual(at('A3'));
    expect(cellTokens(next)[6]?.[1]).toBe('.'); // B7 is empty now
    expect(next.units.filter((u) => u.def === 'draughtsman')).toHaveLength(1);
    // the spells travel with the member
    expect(memberById(next, 'draughtsman').spells).toEqual(memberById(s, 'draughtsman').spells);
  });

  test('a tile-only change keeps the unit (hp stays)', () => {
    const s = scenarioState('sandbox');
    const dummy = s.units.find((u) => u.def === 'dummy');
    if (!dummy) throw new Error('no dummy');
    const hurt = { ...s, units: s.units.map((u) => (u === dummy ? { ...u, hp: 5 } : u)) };
    const edits = paletteEdits(hurt, dummy.pos, 'o');
    const next = applyEdits(hurt, edits);
    const same = next.units.find((u) => u.id === dummy.id);
    expect(same?.hp).toBe(5);
    expect(next.tiles[dummy.pos.y * next.width + dummy.pos.x]?.oil).toBe(true);
  });

  test('paletteEdits is empty when nothing would change', () => {
    const s = scenarioState('sandbox');
    expect(paletteEdits(s, at('A1'), '!')).toEqual([]);
    expect(paletteEdits(s, at('A1'), '.')).toEqual([]);
  });
});

describe('baseOf', () => {
  test('records hp and intents by label', () => {
    const def = scenario('sentry-steam-block');
    const init = createBattle(scenarioSpec(def, { lab: true, lattices: fallbackLattices() })).state;
    const hurt = {
      ...init,
      units: init.units.map((u) => (u.def === 'sentry' ? { ...u, hp: 1 } : u)),
    };
    const base = baseOf(hurt, fallbackLattices());
    expect(base.intents).toEqual({ A1: 'right' });
    expect(base.hp).toEqual({ A1: 1 });
    expect(base.board).toBe(boardOf(hurt));
  });
});

describe('toScenarioDef round-trips', () => {
  function exportAfterDemo(id: string) {
    const def = scenario(id);
    const lattices = Object.fromEntries(
      Object.entries(fallbackLattices()).map(([m, l]) => {
        const own = def.lattices?.[m as keyof typeof def.lattices];
        return [m, own !== undefined ? parseLattice(own) : l];
      }),
    ) as ReturnType<typeof fallbackLattices>;
    const init = createBattle(scenarioSpec(def, { lab: true, lattices }));
    const base = baseOf(init.state, lattices);
    let state = init.state;
    const events: GameEvent[] = [];
    for (const action of def.demo) {
      const r = applyAction(state, action);
      state = r.state;
      events.push(...r.events);
    }
    return { def, exported: toScenarioDef(`lab-${id}`, base, def.demo, events), final: state };
  }

  test('oil-chain: the export replays to its own expected lines', () => {
    const { def, exported } = exportAfterDemo('oil-chain');
    expect(exported.expected).toEqual(def.expected);
    expect(runScenario(exported).lines).toEqual(exported.expected);
  });

  for (const def of SCENARIOS) {
    test(`${def.id}: replay of the export matches`, () => {
      const { exported, final } = exportAfterDemo(def.id);
      const again = runScenario(exported);
      expect(again.lines).toEqual(exported.expected);
      expect(boardOf(again.state)).toBe(boardOf(final));
    });
  }

  test('formatScenario output contains board and lattices as template strings', () => {
    const { exported } = exportAfterDemo('oil-chain');
    const text = formatScenario(exported);
    expect(text).toMatch(/board: `\n/);
    expect(text).toMatch(/lattices: \{\n\s+draughtsman: `/);
    expect(text).toContain("id: 'lab-oil-chain'");
    expect(text).toMatch(/expected: \[\n/);
    expect(text).toContain("type: 'cast'");
    expect(describeLog([])).toEqual([]);
  });
});

describe('labLocation', () => {
  test('defaults to the sandbox, reads demo', () => {
    expect(labLocation(new URLSearchParams(''))).toEqual({ scenario: 'sandbox', demo: false });
    expect(labLocation(new URLSearchParams('scenario=self-combo&demo=1'))).toEqual({
      scenario: 'self-combo',
      demo: true,
    });
  });
});

describe('LabStore', () => {
  let lab: LabStore | null = null;
  afterEach(() => {
    lab?.session?.dispose();
    lab = null;
  });
  function fresh(id = 'sandbox'): LabStore {
    lab = new LabStore(new GameStore(memoryBackend(), () => 0));
    lab.load(id);
    lab.session?.skip();
    return lab;
  }

  test('paint changes the board and undo takes it back', () => {
    const l = fresh();
    l.palette = 'r';
    l.paint(at('A1'));
    expect(cellTokens(l.session?.state ?? failNoSession())[0]?.[0]).toBe('r');
    expect(l.canUndo).toBe(true);
    l.undo();
    expect(cellTokens(l.session?.state ?? failNoSession())[0]?.[0]).toBe('.');
    expect(l.canUndo).toBe(false);
  });

  test('a painted board is exported as the new base', async () => {
    const l = fresh();
    l.palette = 'r';
    l.paint(at('A1'));
    let copied = '';
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        clipboard: {
          writeText: async (t: string) => {
            copied = t;
          },
        },
      },
      configurable: true,
    });
    await l.copy('scenario');
    expect(copied).toMatch(/board: `\n\s+r /);
    expect(copied).toContain('expected: [');
  });

  test('editing a lattice recompiles spells without limits and can be undone', () => {
    const l = fresh();
    const before = memberById(l.session?.state ?? failNoSession(), 'draughtsman').spells.length;
    l.member = 'draughtsman';
    l.setTool({ kind: 'rune', rune: 'bolt' });
    // an empty socket on the page: scan for one
    const lattice = l.lattices.draughtsman;
    const free = [...Array(lattice.shape.width * lattice.shape.height).keys()]
      .map((i) => ({ x: i % lattice.shape.width, y: Math.floor(i / lattice.shape.width) }))
      .find(
        (c) =>
          !lattice.runes.some((r) => r.at.x === c.x && r.at.y === c.y) &&
          !lattice.shape.holes.some((h) => h.x === c.x && h.y === c.y),
      );
    if (!free) throw new Error('no free socket');
    l.editLattice(free);
    const after = memberById(l.session?.state ?? failNoSession(), 'draughtsman').spells.length;
    expect(after).toBe(before + 1);
    l.undo();
    expect(memberById(l.session?.state ?? failNoSession(), 'draughtsman').spells.length).toBe(
      before,
    );
  });

  test('demo=1 plays the scenario actions into the log', async () => {
    lab = new LabStore(new GameStore(memoryBackend(), () => 0));
    lab.load('self-combo', { demo: true });
    const session = lab.session;
    for (let i = 0; i < 40 && session?.state.round === 1 && session.log.length < 20; i++) {
      session?.skip();
      await new Promise((r) => setTimeout(r, 0));
    }
    const lines = describeLog(session?.log ?? []);
    expect(lines.at(-1)).toMatch(/Detonation hits dummy at C1 for 2/);
  });
});

function failNoSession(): never {
  throw new Error('no session');
}
