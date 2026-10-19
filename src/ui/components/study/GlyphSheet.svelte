<script lang="ts">
  import type { CellKey, Dir, GlyphDef, GlyphId, Profile } from '$engine';
  import Button from '../common/Button.svelte';
  import Sheet from '../common/Sheet.svelte';
  import GlyphProfiler from './GlyphProfiler.svelte';
  import GlyphSettings from './GlyphSettings.svelte';

  interface Props {
    /** The Glyph to look inside (the effective view of its current version), or null (closed). */
    glyph: GlyphDef | null;
    /** Records, versions and settings are read from here. */
    profile: Profile;
    /** In a doorway the sheet is read-only (M12). */
    readonly?: boolean;
    onclose: () => void;
    /** Renames (free). Returns why not, or null. */
    onrename: (id: string, name: string) => string | null;
    /** Opens the revision editor ("Revise…", desk only); null hides it. */
    onrevise?: ((id: GlyphId) => void) | null;
    /** Reverts to an archived version. Returns why not, or null. */
    onrevert: (id: GlyphId, version: number) => string | null;
    /** Settings of the current version (M20). Return why not, or null. */
    onopencells: (id: GlyphId, cells: CellKey[]) => string | null;
    onextraexit: (id: GlyphId, dir: Dir | null) => string | null;
  }

  let {
    glyph,
    profile,
    readonly = false,
    onclose,
    onrename,
    onrevise = null,
    onrevert,
    onopencells,
    onextraexit,
  }: Props = $props();

  // The saved current version (settings live there; `glyph` is the effective view).
  const saved = $derived(profile.glyphs.find((g) => g.id === glyph?.id) ?? glyph);

  let typed = $state<string | null>(null);
  let error = $state<string | null>(null);
  const name = $derived(typed ?? glyph?.name ?? '');

  function close(): void {
    typed = null;
    error = null;
    onclose();
  }

  function save(): void {
    if (!glyph) return;
    error = onrename(glyph.id, name);
    if (error === null) close();
  }
</script>

<Sheet open={glyph !== null} title="Fair copy" onclose={close}>
  {#if glyph}
    {#if saved}
      <GlyphProfiler glyph={saved} {profile} {readonly} {onrevert} {onrevise} />
      <GlyphSettings glyph={saved} {profile} {readonly} {onopencells} {onextraexit} />
    {/if}
    <label class="field">
      <span>Name</span>
      <input
        type="text"
        value={name}
        maxlength="24"
        autocomplete="off"
        spellcheck="false"
        oninput={(e) => (typed = e.currentTarget.value)}
        data-testid="glyph-name"
      />
    </label>
    {#if error}<p class="err">{error}</p>{/if}
    <div class="row">
      <Button variant="quiet" label="Close" onclick={close} />
      <Button label="Rename" onclick={save} disabled={name.trim() === ''} testid="glyph-rename" />
    </div>
  {/if}
</Sheet>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 13px;
    color: var(--ink-soft);
  }
  input {
    min-height: var(--tap);
    padding: 0 var(--space-2);
    border: 2px solid var(--line);
    border-radius: var(--radius);
    background: var(--parchment-dark);
    color: var(--ink);
    font: 16px var(--hand);
  }
  .err {
    margin: var(--space-1) 0 0;
    font-size: 13px;
    color: var(--danger);
  }
  .row {
    display: flex;
    justify-content: space-between;
    gap: var(--space-2);
    margin-top: var(--space-3);
  }
</style>
