import { type InteractionId, MEMBER_IDS, type MemberId } from '$data';
import type { Coord, GameEvent, Profile, SaveData } from '$engine';
import { BattleSession } from './battle.svelte';
import { interactionTitle } from './describe';
import {
  editAndPersist,
  endBattle,
  goHome,
  importSave,
  newDiscoveries,
  pushOnward,
  setOut,
  startBattle,
  takeOffer,
  type WipeSummary,
} from './flow';
import { go } from './router.svelte';
import { loadSave, type SaveBackend, saveText, writeSave } from './save';
import { NO_TOOL, type ShelfTool } from './study';
import { toast } from './toasts.svelte';

/**
 * The player's game: the save (profile, trip), the Study's page state and persistence.
 * Every change to `save` is written at once; the engine objects stay in `$state.raw`.
 * The trip lifecycle (set out, battle, loot, return) runs through the pure reducers in `flow.ts`.
 */
export class GameStore {
  save = $state.raw<SaveData>() as SaveData;
  /** A wipe waiting to be read (set by the trip flow, cleared by `dismissWipe`). */
  wipe = $state.raw<WipeSummary | null>(null);
  /** The save could not be read and was replaced by a new game (the old text is kept). App toasts it once. */
  recovered = $state(false);
  /** The trip's live battle. Never saved: a reload recreates the encounter from the trip's seed. */
  battle = $state.raw<BattleSession | null>(null);
  /** Interactions already announced this trip (the toast shows once per discovery). */
  private toasted: InteractionId[] = [];
  /** Which member's notebook page the Study shows, and what the player holds. */
  member = $state<MemberId>(MEMBER_IDS[0] ?? 'draughtsman');
  tool = $state.raw<ShelfTool>(NO_TOOL);

  constructor(
    private readonly backend: SaveBackend,
    now: () => number,
  ) {
    const loaded = loadSave(backend, now());
    this.save = loaded.save;
    this.recovered = loaded.recovered;
  }

  get profile(): Profile {
    return this.save.profile;
  }

  selectMember(m: MemberId): void {
    this.member = m;
    this.tool = NO_TOOL;
  }

  setTool(tool: ShelfTool): void {
    this.tool = tool;
  }

  /** A tap (or long-press) on the current member's socket. Saves when the page changed. */
  tapSocket(at: Coord, longPress = false): void {
    const r = editAndPersist(this.backend, this.save, this.member, at, this.tool, longPress);
    this.save = r.save;
    this.tool = r.tool;
    if (r.message) toast(r.message);
  }

  exportText(): string {
    return saveText(this.save);
  }

  /** Replaces the save with pasted text. Returns null on success, else why it was refused (save unchanged). */
  importText(text: string): string | null {
    let next: SaveData;
    try {
      next = importSave(text);
    } catch (e) {
      return e instanceof Error ? e.message : 'Not a valid save';
    }
    this.dropBattle();
    this.commit(next);
    this.wipe = null;
    this.tool = NO_TOOL;
    return null;
  }

  // ── Trip ──

  /** Leaves the study: the loadout is checked by the engine. Returns why not, or null. */
  setOut(): string | null {
    try {
      this.commit(setOut(this.save));
    } catch (e) {
      return e instanceof Error ? e.message : 'The party cannot set out';
    }
    this.wipe = null;
    this.toasted = [];
    this.dropBattle();
    go('trip');
    return null;
  }

  /** Status `fight` with no live battle (fresh trip, push on, or a reload) → the encounter starts. */
  ensureBattle(): void {
    if (this.battle || this.save.trip?.status !== 'fight') return;
    this.battle = new BattleSession(startBattle(this.save), 'trip', {
      known: () => this.save.profile.interactions,
      onEvents: (events) => this.announce(events),
      intro: true,
    });
  }

  /** After the won/lost overlay: closes the encounter into the save (loot offers, or a wipe). */
  finishBattle(): void {
    const session = this.battle;
    if (!session || session.state.phase === 'player') return;
    const end = endBattle(this.save, session.state);
    this.dropBattle();
    this.wipe = end.wipe;
    this.commit(end.save);
  }

  take(index: number): void {
    this.commit(takeOffer(this.save, index));
  }

  pushOn(): void {
    this.commit(pushOnward(this.save));
  }

  returnHome(): void {
    this.commit(goHome(this.save));
    this.toasted = [];
    go('study');
  }

  dismissWipe(): void {
    this.wipe = null;
    go('study');
  }

  /** Dev verification handle (`window.__game.debug`): ends the live fight at once. */
  readonly debug = {
    forceWin: (): void => this.battle?.forceEnd('won'),
    forceLose: (): void => this.battle?.forceEnd('lost'),
  };

  private announce(events: GameEvent[]): void {
    const fresh = newDiscoveries(events, this.save.profile.interactions, this.toasted);
    for (const id of fresh) {
      this.toasted.push(id);
      toast(`New in the notebook: ${interactionTitle(id)}`);
    }
  }

  private dropBattle(): void {
    this.battle?.dispose();
    this.battle = null;
  }

  private commit(save: SaveData): void {
    this.save = save;
    try {
      writeSave(this.backend, save);
    } catch {
      toast('Could not write the save', 'warn');
    }
  }
}
