import { type InteractionId, MEMBER_IDS, type MemberId } from '$data';
import {
  type ActionResult,
  type Cluster,
  type Coord,
  compileGlyph,
  type GameEvent,
  type Profile,
  renameGlyph,
  type SaveData,
} from '$engine';
import { BattleSession } from './battle.svelte';
import { interactionTitle } from './describe';
import {
  editAndPersist,
  endBattle,
  goHome,
  importSave,
  newDiscoveries,
  pushOnward,
  recordBattleAction,
  setOut,
  startBattle,
  takeOffer,
  type WipeSummary,
} from './flow';
import { go } from './router.svelte';
import { loadSave, type SaveBackend, saveText, writeSave } from './save';
import { NO_TOOL, noteIdioms, type ShelfTool } from './study';
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
  /** The trip's live battle. Its actions are saved in the trip, so a reload replays the fight. */
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
    if (r.changed) this.recogniseIdioms();
  }

  /** A fresh idiom on either page goes into the codex, with a toast (design §4.6). */
  private recogniseIdioms(): void {
    const { profile, toasts } = noteIdioms(this.save.profile);
    if (toasts.length === 0) return;
    this.setProfile(profile);
    for (const line of toasts) toast(line);
  }

  /** Fair Copy: collapses `cluster` on the current page into a named Glyph. Returns why not, or null. */
  fairCopy(cluster: Cluster, name: string): string | null {
    try {
      this.setProfile(compileGlyph(this.save.profile, this.member, cluster, name));
    } catch (e) {
      return e instanceof Error ? e.message : 'The Fair copy failed';
    }
    this.tool = NO_TOOL;
    toast(`Fair copy: ${name.trim()}`);
    return null;
  }

  renameGlyph(id: string, name: string): string | null {
    try {
      this.setProfile(renameGlyph(this.save.profile, id, name));
    } catch (e) {
      return e instanceof Error ? e.message : 'Could not rename';
    }
    return null;
  }

  /** Replaces the profile (the Bench writes recipes through this) and saves. */
  setProfile(profile: Profile): void {
    this.commit({ ...this.save, profile });
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
    const trip = this.save.trip;
    if (this.battle || trip?.status !== 'fight') return;
    let init: ActionResult;
    try {
      init = startBattle(this.save);
    } catch {
      // The recorded fight no longer replays (rules changed in an update): start it over.
      this.commit({ ...this.save, trip: { ...trip, actions: [] } });
      init = startBattle(this.save);
      toast('This fight could not be resumed and starts over.', 'warn');
    }
    this.battle = new BattleSession(init, 'trip', {
      known: () => this.save.profile.interactions,
      onEvents: (events) => this.announce(events),
      onAction: (_, action) => this.commit(recordBattleAction(this.save, action)),
      intro: trip.actions.length === 0,
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
