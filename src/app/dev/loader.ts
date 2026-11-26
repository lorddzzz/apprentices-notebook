import type { GameStore } from '../game.svelte';
import { go } from '../router.svelte';
import { saveText } from '../save';
import { type ThresholdStore, threshold as thresholdStore } from '../threshold.svelte';
import { FIXTURES, type Fixture, type FixtureId, isFixtureId } from './fixtures';

/**
 * UF-4 / C8: the dev fixture loader. `instance.ts` sees a `#/fixture?…` hash before the game is
 * built, gives it a memory save backend (the player's localStorage save is never read or written)
 * and imports this module only in dev builds. A fixture is entered through `go(…, {replace:true})`,
 * so the router's snapshot follows; bare `history.replaceState` would leave it on the Study.
 *
 * Progress is written on `<html>` for screenshot tools: `data-fixture` (the id) and
 * `data-fixture-state` (`loading` | `ready` | `failed`, with `data-fixture-error`).
 */

export interface FixtureRequest {
  name: string | null;
  step: number | null;
  grey: boolean;
}

/** `#/fixture?name=<id>[&step=n][&grey=1]` → the request, or null when the hash is not a fixture's. */
export function fixtureRequest(hash: string): FixtureRequest | null {
  const [path = '', query = ''] = hash.replace(/^#\/?/, '').split('?');
  if (path !== 'fixture') return null;
  const q = new URLSearchParams(query);
  const raw = q.get('step');
  const step = raw !== null && /^\d+$/.test(raw) ? Number(raw) : null;
  return { name: q.get('name'), step, grey: q.get('grey') === '1' };
}

/** A clickable element; the DOM's elements are one. */
export interface Tappable {
  click(): void;
}

/** The little of `document` the loader touches (tests pass a fake). */
export interface FixtureDocument {
  querySelector(selector: string): Tappable | null;
  documentElement: { style: { filter: string }; dataset: Record<string, string | undefined> };
}

export interface LoaderDeps {
  game: GameStore;
  threshold: ThresholdStore;
  doc: FixtureDocument;
  /** How long a testid may take to mount (ms). */
  timeoutMs?: number;
}

export type FixtureResult = { ok: true; id: FixtureId } | { ok: false; why: string };

const POLL_MS = 25;
const TIMEOUT_MS = 5000;

/** Resolves with the element once `[data-testid=id]` is there, or null after `timeoutMs`. */
export async function waitForTestid(
  doc: FixtureDocument,
  id: string,
  timeoutMs = TIMEOUT_MS,
): Promise<Tappable | null> {
  const selector = `[data-testid="${cssString(id)}"]`;
  const until = Date.now() + timeoutMs;
  for (;;) {
    const el = doc.querySelector(selector);
    if (el) return el;
    if (Date.now() >= until) return null;
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

function cssString(id: string): string {
  return id.replace(/["\\]/g, '\\$&');
}

/** Waits for `expect`, then clicks each of `taps` in order (each awaited too). Returns why it failed, or null. */
export async function settle(
  doc: FixtureDocument,
  expect: string,
  taps: readonly string[],
  timeoutMs = TIMEOUT_MS,
): Promise<string | null> {
  if (!(await waitForTestid(doc, expect, timeoutMs))) return `"${expect}" never mounted`;
  for (const tap of taps) {
    const el = await waitForTestid(doc, tap, timeoutMs);
    if (!el) return `tap target "${tap}" is missing`;
    el.click();
  }
  return null;
}

/** Fresh transient state, the fixture's save and setup; throws when the recipe cannot be reached. */
function enter(f: Fixture, req: FixtureRequest, deps: LoaderDeps): void {
  const { game, threshold } = deps;
  threshold.leave();
  const refused = game.importText(saveText(f.save()));
  if (refused !== null) throw new Error(refused);
  game.found = null;
  game.joined = [];
  game.wipe = f.wipe?.() ?? null;
  f.setup?.(game, { threshold, step: req.step });
}

/** Loads one fixture: save, setup, route via `go(…, {replace:true})`, then `expect` and `taps`. */
export async function runFixture(req: FixtureRequest, deps: LoaderDeps): Promise<FixtureResult> {
  const root = deps.doc.documentElement;
  root.style.filter = req.grey ? 'grayscale(1)' : '';
  root.dataset.fixture = req.name ?? '';
  root.dataset.fixtureState = 'loading';
  delete root.dataset.fixtureError;
  const fail = (why: string): FixtureResult => {
    root.dataset.fixtureState = 'failed';
    root.dataset.fixtureError = why;
    console.error(`fixture ${req.name}: ${why}`);
    return { ok: false, why };
  };
  if (!isFixtureId(req.name)) return fail(`no fixture named "${req.name}"`);
  const f = FIXTURES[req.name];
  try {
    enter(f, req, deps);
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
  const params = { ...f.params, ...(req.step === null ? {} : { step: String(req.step) }) };
  go(f.route, Object.keys(params).length ? params : undefined, { replace: true });
  const why = await settle(deps.doc, f.expect, f.taps ?? [], deps.timeoutMs);
  if (why !== null) return fail(why);
  root.dataset.fixtureState = 'ready';
  return { ok: true, id: f.id };
}

/**
 * Runs the fixture the page was opened on, and every fixture hash after it in the same session.
 * Called by `instance.ts` only when the game was built on the memory backend.
 */
export function startFixtures(game: GameStore): void {
  const deps: LoaderDeps = { game, threshold: thresholdStore, doc: document as FixtureDocument };
  const run = (): void => {
    const req = fixtureRequest(location.hash);
    if (req) void runFixture(req, deps);
  };
  window.addEventListener('hashchange', run);
  run();
}
