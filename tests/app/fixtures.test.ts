import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { DISTRICTS } from '$data';
import { applyAction, type GameEvent, newSave } from '$engine';
import { FIXTURES, fixtureIds, lockProfile, lockSolveAction } from '../../src/app/dev/fixtures';
import {
  type FixtureDocument,
  fixtureRequest,
  settle,
  type Tappable,
} from '../../src/app/dev/loader';
import { resolveScreen } from '../../src/app/flow';
import { SAVE_KEY, saveText } from '../../src/app/save';
import { thresholdStart } from '../../src/app/threshold';

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

  test('fixtures: the two proven fixtures are listed', () => {
    expect(fixtureIds()).toEqual(['threshold-canals-burnt', 'study-fresh']);
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
