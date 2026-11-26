import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { DistrictId } from '$data';
import { DISTRICTS } from '$data';
import { applyAction, type GameEvent, newSave, tripParty } from '$engine';
import { drawingsOf } from '$engine/drawing';
// Pack D2 (UF-15a/b/f) imports
import { trialPage } from '../../src/app/bench';
import { mapNodes, underSeam } from '../../src/app/city';
import { startCheckpoint } from '../../src/app/crossroads';
import { deskRows, deskUnlocked } from '../../src/app/desk';
import {
  FIXTURES,
  type FixtureId,
  fixtureIds,
  lockProfile,
  lockSolveAction,
} from '../../src/app/dev/fixtures';
import {
  type FixtureDocument,
  fixtureRequest,
  settle,
  type Tappable,
} from '../../src/app/dev/loader';
import { isFirstEvening } from '../../src/app/firstEvening';
import type { Screen } from '../../src/app/flow';
import { resolveScreen } from '../../src/app/flow';
import type { GameStore } from '../../src/app/game.svelte';
import { SAVE_KEY, saveText } from '../../src/app/save';
import { benchUnlocked } from '../../src/app/study';
import { thresholdStart } from '../../src/app/threshold';
import { rumourLine } from '../../src/app/tripviews';

/**
 * UF-4 / C8: the dev fixture loader. The browser is faked with the few globals the app touches
 * (location, history, window events, localStorage, document); the fake document "mounts" a testid
 * when the app's own rules (`resolveScreen`, the Threshold screen's burnt condition) would show it.
 */

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

interface Browser {
  location: { hash: string; reload: () => void };
  window: EventTarget;
  storage: Map<string, string>;
  writes: string[];
  replaced: string[];
  root: FixtureDocument['documentElement'];
  setMounted(f: (testid: string) => boolean): void;
}

function fakeBrowser(hash: string, planted: string): Browser {
  const storage = new Map([[SAVE_KEY, planted]]);
  const writes: string[] = [];
  const replaced: string[] = [];
  const location = { hash, reload: vi.fn() };
  const window = new EventTarget();
  const root = { style: { filter: '' }, dataset: {} as Record<string, string | undefined> };
  let mounted: (testid: string) => boolean = () => false;
  const doc: FixtureDocument = {
    documentElement: root,
    querySelector(selector) {
      const id = /^\[data-testid="(.+)"\]$/.exec(selector)?.[1];
      return id !== undefined && mounted(id) ? { click: () => {} } : null;
    },
  };
  vi.stubGlobal('location', location);
  vi.stubGlobal('window', window);
  vi.stubGlobal('document', doc);
  vi.stubGlobal('history', {
    replaceState: (_s: unknown, _t: string, url: string) => {
      replaced.push(url);
      location.hash = url;
    },
  });
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => {
      writes.push(k);
      storage.set(k, v);
    },
    removeItem: (k: string) => {
      writes.push(k);
      storage.delete(k);
    },
  });
  return {
    location,
    window,
    storage,
    writes,
    replaced,
    root,
    setMounted: (f) => {
      mounted = f;
    },
  };
}

/** Loads the app's stores fresh, as a cold page load does, and wires the fake document to them. */
async function coldLoad(b: Browser) {
  vi.resetModules();
  const { game } = await import('../../src/app/instance');
  const { router } = await import('../../src/app/router.svelte');
  const { threshold } = await import('../../src/app/threshold.svelte');
  b.setMounted((id) => {
    const screen = resolveScreen(
      router.route,
      game.save.trip,
      game.wipe,
      game.save.lastTrip,
      game.profile,
    ).screen;
    if (id === 'study') return screen === 'study';
    if (id === 'threshold') return screen === 'threshold';
    // Threshold.svelte: `burnt = threshold.solved && threshold.district !== null`.
    if (id === 'threshold-solved') {
      return screen === 'threshold' && threshold.solved && threshold.district !== null;
    }
    // Footer.svelte: the End turn button shows when the party may act (no playback, player phase).
    // Combat.svelte builds the battle in an effect; the fake does the same, then skips the intro.
    if (id === 'end-turn') {
      if (screen !== 'battle') return false;
      game.ensureBattle();
      game.battle?.skip();
      return game.battle?.state.phase === 'player' && !game.battle.busy;
    }
    return false;
  });
  return { game, router, threshold };
}

async function ready(b: Browser, id: string): Promise<void> {
  await vi.waitFor(
    () => {
      expect(b.root.dataset.fixture).toBe(id);
      expect(b.root.dataset.fixtureError).toBeUndefined();
      expect(b.root.dataset.fixtureState).toBe('ready');
    },
    { timeout: 4000, interval: 10 },
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('fixture request', () => {
  test('fixtures: parses name, step and grey from the hash', () => {
    expect(fixtureRequest('#/fixture?name=study-fresh&step=3&grey=1')).toEqual({
      name: 'study-fresh',
      step: 3,
      grey: true,
    });
    expect(fixtureRequest('#/fixture?name=x&step=no')).toEqual({
      name: 'x',
      step: null,
      grey: false,
    });
    expect(fixtureRequest('#/study')).toBeNull();
    expect(fixtureRequest('')).toBeNull();
  });

  test('fixtures: the proven fixtures are listed', () => {
    expect(fixtureIds()).toEqual(expect.arrayContaining(['threshold-canals-burnt', 'study-fresh']));
    for (const id of fixtureIds()) expect(FIXTURES[id].id).toBe(id);
  });
});

describe('fixture recipes', () => {
  test('fixtures: the burnt-threshold replay is the repo lock-solve recording', () => {
    const gate = DISTRICTS.canals.gate;
    if (gate.kind !== 'threshold') throw new Error('the canals have a threshold');
    const start = thresholdStart(lockProfile(), gate.room);
    const r = applyAction(start.state, lockSolveAction(start.state));
    const recorded = JSON.parse(
      readFileSync(join(ROOT, 'tests/fixtures/district-kit/lock-solve.json'), 'utf8'),
    ) as { events: GameEvent[]; phase: string };
    expect(r.state.phase).toBe(recorded.phase);
    expect(JSON.parse(JSON.stringify([...start.events, ...r.events]))).toEqual(recorded.events);
  });
});

describe('fixture settle', () => {
  test('fixtures: expect is awaited before taps', async () => {
    const order: string[] = [];
    let polls = 0;
    const el = (id: string): Tappable => ({ click: () => order.push(`tap:${id}`) });
    const doc: FixtureDocument = {
      documentElement: { style: { filter: '' }, dataset: {} },
      querySelector(selector) {
        const id = /"(.+)"/.exec(selector)?.[1] ?? '';
        if (id === 'screen') {
          polls++;
          if (polls < 4) return null;
          if (!order.includes('mounted')) order.push('mounted');
          return el(id);
        }
        // Tap targets exist from the start: only the expect wait may hold them back.
        return el(id);
      },
    };
    expect(await settle(doc, 'screen', ['a', 'b'], 1000)).toBeNull();
    expect(order).toEqual(['mounted', 'tap:a', 'tap:b']);
    expect(polls).toBeGreaterThanOrEqual(4);
  });

  test('fixtures: a missing expect or tap target fails', async () => {
    const doc: FixtureDocument = {
      documentElement: { style: { filter: '' }, dataset: {} },
      querySelector: (s) => (s.includes('"here"') ? { click: () => {} } : null),
    };
    expect(await settle(doc, 'gone', [], 60)).toMatch(/never mounted/);
    expect(await settle(doc, 'here', ['gone'], 60)).toMatch(/tap target "gone" is missing/);
  });
});

describe('fixture loader (cold load)', () => {
  const planted = saveText({ ...newSave(424242), seedCounter: 424242 });

  test('fixtures: cold load lands on the burnt threshold, then a second fixture; the real save is untouched', async () => {
    const b = fakeBrowser('#/fixture?name=threshold-canals-burnt', planted);
    const { game, router, threshold } = await coldLoad(b);

    await ready(b, 'threshold-canals-burnt');
    // Entered through go(…, {replace:true}): the history entry and the router snapshot agree.
    expect(b.replaced).toEqual(['#/threshold?d=canals']);
    expect(router.route).toBe('threshold');
    expect(router.params.get('d')).toBe('canals');
    // The requested sub-state, not only the route: the lock was solved by the replay.
    expect(threshold.solved).toBe(true);
    expect(threshold.district).toBe('canals');
    expect(game.profile.city.open).toContain('canals');
    expect(b.root.style.filter).toBe('');

    // A second fixture in the same session, through the hash.
    b.location.hash = '#/fixture?name=study-fresh&grey=1';
    b.window.dispatchEvent(new Event('hashchange'));
    await ready(b, 'study-fresh');
    expect(b.replaced).toEqual(['#/threshold?d=canals', '#/study']);
    expect(router.route).toBe('study');
    expect(threshold.solved).toBe(false);
    expect(game.profile.city.open).not.toContain('canals');
    expect(game.save.seedCounter).toBe(1);
    expect(b.root.style.filter).toBe('grayscale(1)');

    // Local save sentinel: the planted save was never read into the game, written or removed.
    expect(b.storage.get(SAVE_KEY)).toBe(planted);
    expect(b.writes).toEqual([]);
    expect(b.location.reload).not.toHaveBeenCalled();
  });

  test('fixtures: an unknown name fails visibly and leaves the real save alone', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const b = fakeBrowser('#/fixture?name=nope', planted);
    await coldLoad(b);
    await vi.waitFor(() => expect(b.root.dataset.fixtureState).toBe('failed'), {
      timeout: 2000,
      interval: 10,
    });
    expect(b.root.dataset.fixtureError).toMatch(/no fixture named "nope"/);
    expect(errors).toHaveBeenCalledOnce();
    errors.mockRestore();
    expect(b.storage.get(SAVE_KEY)).toBe(planted);
    expect(b.writes).toEqual([]);
  });

  test('fixtures: a fixture hash in a session on the real save reloads the page', async () => {
    const b = fakeBrowser('#/study', planted);
    const { game } = await coldLoad(b);
    expect(game.save.seedCounter).toBe(424242);
    b.location.hash = '#/fixture?name=study-fresh';
    b.window.dispatchEvent(new Event('hashchange'));
    expect(b.location.reload).toHaveBeenCalledOnce();
    expect(b.root.dataset.fixture).toBeUndefined();
  });
});

describe('fight fixtures (UF-15c)', () => {
  const planted = saveText({ ...newSave(424242), seedCounter: 424242 });
  // The real board: the first room of each district, from the app's own setOut and startBattle.
  const BOARDS = [
    ['fight-seam', 'seam', 6, 6],
    ['fight-lampwater', 'canals', 5, 9],
    ['fight-wide-7x9', 'bridges', 7, 9],
  ] as const;

  test('fixtures: fight-seam, fight-lampwater and fight-wide-7x9 resolve to the fight screen with the real board dimensions and the idle expected testid', async () => {
    const b = fakeBrowser('#/fixture?name=fight-seam', planted);
    const { game, router } = await coldLoad(b);
    for (const [name, district, width, height] of BOARDS) {
      b.location.hash = `#/fixture?name=${name}`;
      b.window.dispatchEvent(new Event('hashchange'));
      await ready(b, name);
      expect(FIXTURES[name].expect).toBe('end-turn');
      expect(FIXTURES[name].route).toBe('trip');
      // The trip route is kept: no redirect rewrote it.
      expect(b.replaced.at(-1)).toBe('#/trip');
      expect(router.route).toBe('trip');
      const trip = game.save.trip;
      expect(trip?.district).toBe(district);
      expect(trip?.status).toBe('fight');
      expect(trip?.encounter).toBe(0);
      expect(
        resolveScreen(router.route, game.save.trip, game.wipe, game.save.lastTrip, game.profile),
      ).toEqual({ screen: 'battle', redirect: null });
      // The live battle is the one startBattle gives, at the district's real size, idle.
      const battle = game.battle;
      expect(battle?.state.phase).toBe('player');
      expect(battle?.busy).toBe(false);
      expect(battle?.state.width).toBe(width);
      expect(battle?.state.height).toBe(height);
      expect(battle?.view.width).toBe(width);
      expect(battle?.view.height).toBe(height);
    }
    // Only engine and app-flow calls: the player's save was never read, written or removed.
    expect(b.storage.get(SAVE_KEY)).toBe(planted);
    expect(b.writes).toEqual([]);
    expect(b.location.reload).not.toHaveBeenCalled();
  });
});

describe('fixture loader (production)', () => {
  test('fixtures: the production bundle has no loader and no fixtures', async () => {
    const { build } = await import('vite');
    const out = mkdtempSync(join(tmpdir(), 'uf4-build-'));
    // Vitest runs with NODE_ENV=test, which would make the build a dev one (import.meta.env.DEV).
    const env = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      await build({
        mode: 'production',
        root: ROOT,
        configFile: join(ROOT, 'vite.config.ts'),
        logLevel: 'silent',
        build: { outDir: out, emptyOutDir: true },
      });
      const js = readdirSync(join(out, 'assets'))
        .filter((f) => f.endsWith('.js'))
        .map((f) => readFileSync(join(out, 'assets', f), 'utf8'))
        .join('\n');
      expect(js.length).toBeGreaterThan(1000);
      for (const marker of [
        'threshold-canals-burnt',
        'fixtureState',
        'never mounted',
        '#\\/fixture',
      ]) {
        expect(js.includes(marker), marker).toBe(false);
      }
    } finally {
      process.env.NODE_ENV = env;
      rmSync(out, { recursive: true, force: true });
    }
  }, 180_000);
});

// ══ Pack D2 (UF-15a/b/f): study, home, map and glyph fixtures ══
//
// The fake document "mounts" a testid when the app's own predicates (`resolveScreen`, `benchUnlocked`,
// `deskRows`, ...) would show it, and records taps so a sheet a tap opens mounts afterwards. A fixture
// whose expect or tap target is not mounted fails `runFixture`; the phone run checks the real DOM.

interface UiProbe {
  game: GameStore;
  route: string;
  params: URLSearchParams;
  /** Testids tapped so far (a tap that opens a sheet mounts what the sheet shows). */
  tapped: Set<string>;
}

/** What the screen named by `resolveScreen` shows, by testid. Unknown ids are not mounted. */
function mountedModel(p: UiProbe, id: string): boolean {
  const { game } = p;
  const profile = game.profile;
  const screen = resolveScreen(
    p.route as Parameters<typeof resolveScreen>[0],
    game.save.trip,
    game.wipe,
    game.save.lastTrip,
    profile,
  ).screen;
  const field = game.inDoorway;
  if (screen === 'study') {
    switch (id) {
      case 'study':
      case 'codex-button':
      case 'household-open':
        return true;
      case 'field-header':
      case 'field-done':
        return field;
      case 'menu-button':
      case 'door':
        return !field;
      case 'bench-button':
        return !field && benchUnlocked(profile);
      case 'desk-button':
        return !field && deskUnlocked(profile);
      case 'rumour-line':
        return !field && rumourLine(game.save.lastTrip) !== null;
      case 'first-evening':
        return isFirstEvening(profile, game.save.trip !== null);
      case 'first-evening-page':
        return p.tapped.has('first-evening');
      case 'bench-open':
        return p.tapped.has('household-open');
      case 'shelf-lock':
        return p.tapped.has('household-open') && game.save.trip !== null;
    }
    return false;
  }
  // CodexEntry (the Runes tab, open by default) and the header count.
  if (screen === 'codex') return ['codex', 'codex-entry', 'codex-count'].includes(id);
  if (screen === 'bench') {
    const page = p.params.get('page');
    if (id === 'bench') return true;
    if (id === 'methods') return page === null;
    if (id === 'page-trial') return page !== null && trialPage(profile, page) !== null;
    return false;
  }
  if (screen === 'desk') {
    const rows = deskRows(profile);
    if (id === 'desk') return true;
    if (id === 'desk-empty') return rows.length === 0;
    const subject = /^desk-(?:subject|open)-(.+)$/.exec(id)?.[1];
    if (subject !== undefined) {
      const row = rows.find((r) => r.subject === subject);
      return id.startsWith('desk-open-') ? (row?.open ?? 0) > 0 : row !== undefined;
    }
    if (id === 'desk-margin') return [...p.tapped].some((t) => t.startsWith('desk-subject-'));
    return false;
  }
  if (screen === 'map') return mapMounted(p, id);
  return false;
}

/** The map (`Map.svelte`, `DistrictNode`, `StairSlot`, `PagesSlot`) and the Set-out sheet a node tap opens. */
function mapMounted(p: UiProbe, id: string): boolean {
  const profile = p.game.profile;
  const nodes = mapNodes(profile);
  const under = underSeam(profile);
  // The district the Set-out sheet is open for: the last node or page tapped.
  const last = [...p.tapped].reverse().find((t) => /^open-|^page-\d$/.test(t));
  const sheet = last === undefined ? null : last.startsWith('page-') ? 'inkedPage' : last.slice(5);
  const party = tripParty(profile).length;
  switch (id) {
    case 'map':
    case 'under-seam':
      return true;
    case 'stair-floors':
      return under.stair && under.canSetOut;
    case 'under-pages':
      return under.pages.length > 0 || under.blank;
    case 'carry':
      return sheet !== null && party > 0;
    case 'no-party':
      return sheet !== null && party === 0;
    case 'set-out':
    case 'not-yet':
      return sheet !== null;
    case 'starts':
    case 'start-checkpoint':
    case 'start-first':
      return sheet !== null && party > 0 && startCheckpoint(profile, sheet as DistrictId) !== null;
    case 'drawn-page':
      return sheet === 'inkedPage' && drawingsOf(profile)[0] !== undefined;
  }
  const node = /^node-(.+)$/.exec(id)?.[1];
  if (node !== undefined) return nodes.some((n) => n.id === node);
  const open = /^open-(.+)$/.exec(id)?.[1];
  if (open === 'lowerSeam') return under.stair && under.canSetOut;
  if (open !== undefined) return nodes.some((n) => n.id === open && n.state === 'open');
  const floor = /^floor-(.+)$/.exec(id)?.[1];
  if (floor !== undefined) return under.floors.some((f) => f.id === floor);
  const page = /^page-(\d)$/.exec(id)?.[1];
  if (page !== undefined) return under.pages.some((x) => x.slot === Number(page));
  return false;
}

/** Runs one fixture through the real loader on a fake browser; returns the loaded game and screen. */
async function loadAll(ids: readonly FixtureId[]) {
  const b = fakeBrowser('', saveText(newSave(1)));
  vi.resetModules();
  const { GameStore } = await import('../../src/app/game.svelte');
  const { memoryBackend } = await import('../../src/app/save');
  const { runFixture } = await import('../../src/app/dev/loader');
  const { FIXTURES } = await import('../../src/app/dev/fixtures');
  const { router } = await import('../../src/app/router.svelte');
  const { threshold } = await import('../../src/app/threshold.svelte');
  const game = new GameStore(memoryBackend(), () => 0);
  const tapped = new Set<string>();
  const probe = (): UiProbe => ({ game, route: router.route, params: router.params, tapped });
  b.setMounted((id) => mountedModel(probe(), id));
  const out: {
    id: FixtureId;
    screen: Screen;
    redirect: string | null;
    ok: boolean;
    why: string;
  }[] = [];
  const doc: FixtureDocument = {
    documentElement: b.root,
    querySelector(selector) {
      const id = /^\[data-testid="(.+)"\]$/.exec(selector)?.[1];
      if (id === undefined || !mountedModel(probe(), id)) return null;
      return { click: () => tapped.add(id) };
    },
  };
  for (const id of ids) {
    tapped.clear();
    const r = await runFixture(
      { name: id, step: null, grey: false },
      { game, threshold, doc, timeoutMs: 150 },
    );
    const at = resolveScreen(
      router.route,
      game.save.trip,
      game.wipe,
      game.save.lastTrip,
      game.profile,
    );
    out.push({
      id,
      screen: at.screen,
      redirect: at.redirect,
      ok: r.ok,
      why: r.ok ? '' : r.why,
    });
  }
  return { out, FIXTURES, game };
}

const HOME_SCREEN: Record<string, Screen> = {
  'study-mid': 'study',
  'study-three-seats': 'study',
  'study-unlocked': 'study',
  'study-doorway': 'study',
  'study-trip-out': 'study',
  'study-first-evening': 'study',
  'household-full': 'study',
  'codex-early': 'codex',
  'bench-mid': 'bench',
  'bench-trial': 'bench',
  'desk-empty': 'desk',
  'desk-open-row': 'desk',
  'desk-expanded': 'desk',
};

describe('UF-15a study and home fixtures', () => {
  test('fixtures: study and home states exist and show their expected state', async () => {
    const ids = Object.keys(HOME_SCREEN) as FixtureId[];
    for (const id of ids) expect(fixtureIds(), id).toContain(id);
    const { out, game } = await loadAll(ids);
    for (const r of out) {
      expect(r.why, r.id).toBe('');
      expect(r.ok, r.id).toBe(true);
      // The intended screen, with no redirect (a fixture never lands somewhere else).
      expect(r.screen, r.id).toBe(HOME_SCREEN[r.id]);
      expect(r.redirect, r.id).toBeNull();
    }
    expect(game).toBeDefined();
  });

  test('fixtures: home fixtures hold their own state, not only the route', async () => {
    const { threeSeats, midProfile, unlockedSave, fullHouseProfile, doorwaySave, deskProfile } =
      await import('../../src/app/dev/recipes');
    const { tripParty } = await import('$engine');
    expect(tripParty(threeSeats())).toHaveLength(3);
    expect(isFirstEvening(midProfile(), false)).toBe(false);
    const u = unlockedSave();
    expect(benchUnlocked(u.profile)).toBe(true);
    expect(deskUnlocked(u.profile)).toBe(true);
    expect(rumourLine(u.lastTrip)).toMatch(/^A rumour of /);
    expect(tripParty(u.profile)).toHaveLength(3);
    const full = fullHouseProfile();
    expect(full.household.members).not.toContain('owner');
    expect(full.household.members.length - tripParty(full).length).toBeGreaterThan(1);
    expect(doorwaySave().trip?.status).toBe('doorway');
    expect(deskRows(deskProfile(false))).toEqual([]);
    expect(deskRows(deskProfile(true)).map((r) => [r.subject, r.open > 0])).toEqual([
      ['shove', true],
    ]);
  });

  // Not stubbed as passing: their screens are built by later packs (new testids, new props).
  test.todo('fixtures: pocket-readonly (PENDING: the Study `readonly` prop, UH-3 / FT-25)');
  test.todo('fixtures: homecoming-first (PENDING: the homecoming scene page, UH-14)');
  test.todo('fixtures: homecoming-quiet (PENDING: the homecoming scene page, UH-14)');
});

const MAP_SCREEN: Record<string, Screen> = {
  'map-fresh': 'map',
  'map-frontier': 'map',
  'map-lower-seam': 'map',
  'map-inked-pages': 'map',
  'setout-seam': 'map',
  'setout-startpoint': 'map',
  'setout-empty-party': 'map',
  'setout-drawn-page': 'map',
};

describe('UF-15b map fixtures', () => {
  test('fixtures: map and set-out fixtures resolve to the map and show their expected state', async () => {
    const ids = Object.keys(MAP_SCREEN) as FixtureId[];
    for (const id of ids) expect(fixtureIds(), id).toContain(id);
    const { out } = await loadAll(ids);
    for (const r of out) {
      expect(r.why, r.id).toBe('');
      expect(r.screen, r.id).toBe('map');
      expect(r.redirect, r.id).toBeNull();
    }
  });

  test('fixtures: setout-startpoint uses the remembered-Cartographers-checkpoint recipe (the Seam has none)', async () => {
    const { rememberedCheckpoint, mapFreshProfile } = await import('../../src/app/dev/recipes');
    const { shapeOf } = await import('$engine/trip/shape');
    // The Seam has no checkpoint to remember; the Cartographers' quiet doorway is the first one.
    expect(shapeOf('seam').checkpoint).toBeUndefined();
    const plain = mapFreshProfile();
    expect(startCheckpoint(plain, 'seam')).toBeNull();
    expect(startCheckpoint(plain, 'cartographers')).toBeNull();
    const p = rememberedCheckpoint(plain);
    expect(p.city.checkpoints).toEqual({
      cartographers: shapeOf('cartographers').checkpoint?.after,
    });
    expect(p.city.open).toContain('cartographers');
    expect(startCheckpoint(p, 'cartographers')).toBe('the quiet doorway');
    expect(startCheckpoint(p, 'seam')).toBeNull();
    // The loader's save boundary accepts it (parseCheckpoints checks the room against the shape).
    const { loadSave, memoryBackend } = await import('../../src/app/save');
    const text = saveText({ ...newSave(1), profile: p });
    expect(loadSave(memoryBackend(text), 0).recovered).toBe(false);
  });

  test('fixtures: map fixtures hold their own state, not only the route', async () => {
    const r = await import('../../src/app/dev/recipes');
    expect(mapNodes(r.mapFreshProfile()).map((n) => n.id)).toEqual(['seam']);
    const frontier = mapNodes(r.mapFrontierProfile());
    expect(
      frontier
        .filter((n) => n.state === 'heard')
        .map((n) => n.id)
        .sort(),
    ).toEqual(['canals', 'inkQuarter']);
    const lower = underSeam(r.lowerSeamProfile());
    expect(lower.stair && lower.canSetOut).toBe(true);
    expect(lower.floors.length).toBeGreaterThan(0);
    const pages = underSeam(r.inkedPagesProfile());
    expect(pages.pages.map((x) => x.slot)).toEqual([0]);
    expect(tripParty(r.emptyPartyProfile())).toEqual([]);
  });
});
