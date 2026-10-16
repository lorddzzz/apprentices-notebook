import { type DistrictId, type InteractionId, MEMBER_IDS, type MemberId } from '$data';
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
  leaveDoorway,
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
import { editProfile, NO_TOOL, noteIdioms, type ShelfTool } from './study';
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
  /**
   * The rewired profile while a quiet doorway is open (plan S11): edits stay here, unsaved, until
   * Done. A reload in the doorway resumes it with the lattices as last banked.
   */
  private draft = $state.raw<Profile | null>(null);

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

  /** A quiet doorway is open: the Study is in field mode. */
  get inDoorway(): boolean {
    return this.save.trip?.status === 'doorway';
  }

  /** The profile the Study shows and edits: the doorway's draft while one is open, else the save's. */
  get studyProfile(): Profile {
    return this.inDoorway ? (this.draft ?? this.save.profile) : this.save.profile;
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
    if (this.inDoorway) {
      const r = editProfile(this.studyProfile, this.member, at, this.tool, longPress);
      if (r.changed) this.draft = r.profile;
      this.tool = r.tool;
      if (r.message) toast(r.message);
      return;
    }
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

  /**
   * Fair Copy: collapses `cluster` on the current page into a named Glyph, with `open` (a local cell)
   * left open for an argument (M22). Returns why not, or null.
   */
  fairCopy(cluster: Cluster, name: string, open: Coord | null = null): string | null {
    try {
      this.setProfile(compileGlyph(this.save.profile, this.member, cluster, name, open));
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

  /**
   * Applies a pure profile change to what the Study edits: the doorway's draft while one is open,
   * else the save (written at once). Returns the change's error message, or null. Glyph mastery
   * (revise, revert, open cells, extra exit, arguments) and the desk go through this.
   */
  updateProfile(change: (p: Profile) => Profile): string | null {
    let next: Profile;
    try {
      next = change(this.studyProfile);
    } catch (e) {
      return e instanceof Error ? e.message : 'That did not work';
    }
    if (this.inDoorway) this.draft = next;
    else this.setProfile(next);
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
    this.draft = null;
    this.commit(next);
    this.wipe = null;
    this.tool = NO_TOOL;
    return null;
  }

  // ── Trip ──

  /** Leaves for an open district: the loadout is checked by the engine. Returns why not, or null. */
  setOut(district: DistrictId = 'seam'): string | null {
    try {
      this.commit(setOut(this.save, district));
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
    const end = endBattle(this.save, session.state, session.log);
    this.dropBattle();
    this.wipe = end.wipe;
    this.commit(end.save);
  }

  take(index: number): void {
    this.commit(takeOffer(this.save, index));
  }

  /** Done in a quiet doorway: the draft becomes the lattices. Returns why not, or null. */
  finishDoorway(): string | null {
    try {
      this.commit(leaveDoorway(this.save, this.studyProfile));
    } catch (e) {
      return e instanceof Error ? e.message : 'The doorway would not close';
    }
    this.draft = null;
    this.tool = NO_TOOL;
    return null;
  }

  pushOn(): void {
    this.commit(pushOnward(this.save));
  }

  returnHome(): void {
    this.commit(goHome(this.save));
    this.toasted = [];
    // `replace` updates the router at once; otherwise the trip-less 'trip' route redirects to the Study first.
    go('trip-page', undefined, { replace: true });
  }

  /** Wiped → the trip page (the wipe stays pending until the player leaves it). */
  readTrip(): void {
    go('trip-page');
  }

  /** "Back to the desk" on the trip page. */
  leaveTripPage(): void {
    this.wipe = null;
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
