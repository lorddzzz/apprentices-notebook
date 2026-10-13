import { MEMBER_IDS, type MemberId } from '$data';
import type { Coord, Profile, SaveData } from '$engine';
import { editAndPersist, importSave, type WipeSummary } from './flow';
import { loadSave, type SaveBackend, saveText, writeSave } from './save';
import { NO_TOOL, type ShelfTool } from './study';
import { toast } from './toasts.svelte';

/**
 * The player's game: the save (profile, trip), the Study's page state and persistence.
 * Every change to `save` is written at once; the engine objects stay in `$state.raw`.
 * U7 adds the trip lifecycle (set out, battle, loot, return).
 */
export class GameStore {
  save = $state.raw<SaveData>() as SaveData;
  /** A wipe waiting to be read (set by the trip flow, cleared by `dismissWipe`). */
  wipe = $state.raw<WipeSummary | null>(null);
  /** The save could not be read and was replaced by a new game (the old text is kept). App toasts it once. */
  recovered = $state(false);
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
    this.commit(next);
    this.wipe = null;
    this.tool = NO_TOOL;
    return null;
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
