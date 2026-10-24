import type { ApprenticeId, DistrictId, MemberId } from '$data';
import {
  type ActionResult,
  type Cluster,
  type Coord,
  compileGlyph,
  footnoteIds,
  type GameEvent,
  newSave,
  type Profile,
  placeOf,
  renameGlyph,
  type SaveData,
  type SlotIndex,
} from '$engine';
import type { StartAt } from '$engine/districts/types';
import { BattleSession } from './battle.svelte';
import { chooseWay, setOutAt } from './crossroads';
import { namedTitle } from './describe';
import {
  editAndPersist,
  endBattle,
  goHome,
  importSave,
  leaveDoorway,
  newDiscoveries,
  pushOnward,
  recordBattleAction,
  startBattle,
  takeOffer,
  type WipeSummary,
} from './flow';
import { forgetView } from './latticeViewport';
import { go } from './router.svelte';
import { loadSave, type SaveBackend, saveText, writeSave } from './save';
import {
  editProfile,
  leaveHome,
  NO_TOOL,
  openMemberFor,
  pageSessionKey,
  placeInSlot,
  type ShelfTool,
  type SlotMove,
} from './study';
import { toast } from './toasts.svelte';

let nextEditorSession = 0;

/**
 * The player's game: the save (profile, trip), the Study's page state and persistence.
 * Every change to `save` is written at once; the engine objects stay in `$state.raw`.
 * The trip lifecycle (set out, battle, loot, return) runs through the pure reducers in `flow.ts`.
 */
export class GameStore {
  save = $state.raw<SaveData>() as SaveData;
  /** A wipe waiting to be read (set by the trip flow, cleared by `dismissWipe`). */
  wipe = $state.raw<WipeSummary | null>(null);
  /** The save could not be used and was replaced by a new game (the old text is kept). App toasts it once. */
  recovered = $state(false);
  /** ...because the notebook is from before this edition (P1). */
  older = $state(false);
  /** A resource refusal keeps the original save in place until an explicit replacement. */
  refusal = $state<string | null>(null);
  private retainedText: string | null = null;
  /** The trip's live battle. Its actions are saved in the trip, so a reload replays the fight. */
  battle = $state.raw<BattleSession | null>(null);
  /** Named results already announced this trip (the toast shows once per discovery). */
  private toasted: string[] = [];
  /** Which member's notebook page the Study shows, and what the player holds. */
  member = $state<MemberId>('draughtsman');
  tool = $state.raw<ShelfTool>(NO_TOOL);
  /**
   * The rewired profile while a quiet doorway is open (plan S11): edits stay here, unsaved, until
   * Done. A reload in the doorway resumes it with the lattices as last banked.
   */
  private draft = $state.raw<Profile | null>(null);
  private editorSession = $state(++nextEditorSession);
  private readonly latticeViews = new Set<string>();

  /** Home and each doorway have separate cameras; edits and member switches keep their keys. */
  latticeSessionKey(member: MemberId = this.member): string {
    const trip = this.save.trip;
    const session =
      this.inDoorway && trip
        ? `${this.editorSession}:${trip.seed}:${trip.encounter}`
        : this.editorSession;
    const key = pageSessionKey(this.inDoorway ? 'doorway' : 'study', member, session);
    this.latticeViews.add(key);
    return key;
  }

  private resetLatticeSession(): void {
    for (const key of this.latticeViews) forgetView(key);
    this.latticeViews.clear();
    this.editorSession = ++nextEditorSession;
  }

  constructor(
    private readonly backend: SaveBackend,
    private readonly now: () => number,
  ) {
    const loaded = loadSave(backend, now());
    this.save = loaded.save;
    this.recovered = loaded.recovered;
    this.older = loaded.older;
    this.refusal = loaded.refused?.message ?? null;
    this.retainedText = loaded.refused?.text ?? null;
    this.member = openMemberFor(this.save.profile, this.member);
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
    this.member = openMemberFor(this.studyProfile, m);
    this.tool = NO_TOOL;
  }

  /**
   * The household shelf (HC-7): fills a seat, the first empty one unless `slot` is given. Refused
   * during a trip. Returns why not, or null.
   */
  bring(id: ApprenticeId, slot?: SlotIndex): string | null {
    return this.moveSlots(placeInSlot(this.save.profile, this.save.trip, id, slot));
  }

  /** Empties the apprentice's seat; their page stays as it was. Returns why not, or null. */
  sendHome(id: ApprenticeId): string | null {
    return this.moveSlots(leaveHome(this.save.profile, this.save.trip, id));
  }

  private moveSlots(r: SlotMove): string | null {
    if (this.refusal) return this.refusal;
    if ('why' in r) return r.why;
    this.setProfile(r.profile);
    return null;
  }

  setTool(tool: ShelfTool): void {
    this.tool = tool;
  }

  /** A tap (or long-press) on the current member's socket. Saves when the page changed. */
  tapSocket(at: Coord, longPress = false): void {
    if (this.refusal) return;
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
    if (this.refusal) return this.refusal;
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
    return this.retainedText ?? saveText(this.save);
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
    this.refusal = null;
    this.retainedText = null;
    this.commit(next);
    this.member = openMemberFor(this.save.profile, this.member);
    this.resetLatticeSession();
    this.wipe = null;
    this.tool = NO_TOOL;
    return null;
  }

  /** Throws the notebook away for a brand-new game (a fresh seed), as on a first visit. */
  reset(): void {
    this.dropBattle();
    this.draft = null;
    this.refusal = null;
    this.retainedText = null;
    this.commit(newSave(this.now()));
    this.resetLatticeSession();
    this.wipe = null;
    this.toasted = [];
    this.member = openMemberFor(this.save.profile, 'draughtsman');
    this.tool = NO_TOOL;
  }

  // ── Trip ──

  /**
   * Leaves for an open district: the loadout is checked by the engine. `at: 'checkpoint'` starts
   * past the doorway the city remembers (DK-11). Returns why not, or null.
   */
  setOut(district: DistrictId = 'seam', at: StartAt = 'start'): string | null {
    if (this.refusal) return this.refusal;
    try {
      this.commit(setOutAt(this.save, district, at));
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
    if (this.refusal || this.battle || trip?.status !== 'fight') return;
    let init: ActionResult;
    try {
      init = startBattle(this.save);
    } catch {
      // The recorded fight no longer replays (rules changed in an update): start it over.
      this.commit({ ...this.save, trip: { ...trip, actions: [] } });
      try {
        init = startBattle(this.save);
      } catch {
        // Failed twice: the trip closes as an abandoned fight and the party goes home.
        this.abandonFight();
        toast('This fight could not be resumed, so the party came home.', 'warn');
        return;
      }
      toast('This fight could not be resumed and starts over.', 'warn');
    }
    this.battle = new BattleSession(init, 'trip', {
      onEvents: (events) => this.announce(events),
      onAction: (_, action) => this.commit(recordBattleAction(this.save, action)),
      footnotes: footnoteIds(this.save.profile),
      witnessed: this.save.profile.witnessed,
      intro: trip.actions.length === 0,
    });
  }

  /** Closes the trip as a wiped one (its unbanked loot is lost, discoveries kept) and returns home. */
  private abandonFight(): void {
    const trip = this.save.trip;
    this.dropBattle();
    if (trip) {
      this.commit({
        ...this.save,
        trip: null,
        lastTrip: {
          district: trip.district,
          outcome: 'wiped',
          encounter: trip.encounter,
          place: placeOf(trip),
          stats: trip.stats,
        },
      });
    }
    this.wipe = null;
    this.toasted = [];
    go('study', undefined, { replace: true });
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

  /** A way on from the Crossroads the district module named (span choice, the doorway; DK-11). */
  chooseWay(id: string): void {
    this.commit(chooseWay(this.save, id));
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
    const fresh = newDiscoveries(events, this.save.profile.named, this.toasted);
    for (const id of fresh) {
      this.toasted.push(id);
      toast(`New in the notebook: ${namedTitle(id)}`);
    }
  }

  private dropBattle(): void {
    this.battle?.dispose();
    this.battle = null;
  }

  private commit(save: SaveData): void {
    if (this.refusal) return;
    this.save = save;
    try {
      writeSave(this.backend, save);
    } catch {
      toast('Could not write the save', 'warn');
    }
  }
}
