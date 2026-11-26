import { GameStore } from './game.svelte';
import { LabStore } from './lab.svelte';
import { localBackend, memoryBackend } from './save';

/** Dev only (UF-4): `#/fixture?name=…` plays a fixture on a memory save; the real save is untouched. */
const FIXTURE_HASH = /^#\/fixture(?:\?|$)/;
const fixtureSession =
  import.meta.env.DEV && typeof location !== 'undefined' && FIXTURE_HASH.test(location.hash);

/** App-wide stores. U7 grows `game` with the trip. */
export const game = new GameStore(fixtureSession ? memoryBackend() : localBackend(), () =>
  Date.now(),
);
export const lab = new LabStore(game);

if (import.meta.env.DEV && typeof window !== 'undefined') {
  if (fixtureSession) {
    void import('./dev/loader').then((m) => m.startFixtures(game));
  } else {
    // A fixture opened later in a session on the real save reloads, so it gets a memory backend.
    window.addEventListener('hashchange', () => {
      if (FIXTURE_HASH.test(location.hash)) location.reload();
    });
  }
}
