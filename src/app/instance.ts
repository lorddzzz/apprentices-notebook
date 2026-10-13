import { GameStore } from './game.svelte';
import { LabStore } from './lab.svelte';
import { localBackend } from './save';

/** App-wide stores. U7 grows `game` with the trip. */
export const game = new GameStore(localBackend(), () => Date.now());
export const lab = new LabStore(game);
