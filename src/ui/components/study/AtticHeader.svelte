<script lang="ts">
  import { artUrl } from '../../art/registry';
  import Sheet from '../common/Sheet.svelte';
  import HomeStrip from '../home/HomeStrip.svelte';
  import RoomObject from '../home/RoomObject.svelte';
  import StudyScene from './StudyScene.svelte';

  /**
   * UH-1. The Study's header: the attic strip (88 px, AppHeader's `study` variant through
   * HomeStrip), the script title, the room objects (Codex always, Bench and Desk once unlocked,
   * a locked one keeps its slot) and AppHeader's own ⋯ last, which opens the MenuSheet.
   * It also paints the zero-art fallback of the 24 px bleed that hangs under the header, behind
   * the seat tabs (with art, AppHeader's strip layer carries the painted bleed). A quiet doorway
   * uses the same header with its own title and a Codex object only.
   * `note` is one line of paper under the title (the rumour, or the doorway's rule), ellipsised;
   * a tap opens its full text.
   */
  interface Props {
    /** A quiet doorway: the field editor's header (no Bench or Desk slots). */
    doorway?: boolean;
    oncodex: () => void;
    /** Set once the Bench is unlocked; null keeps an empty slot. */
    onbench?: (() => void) | null;
    /** Set once a rune has footnote points; null keeps an empty slot. */
    ondesk?: (() => void) | null;
    note?: { text: string; title: string; testid: string } | null;
  }

  let { doorway = false, oncodex, onbench = null, ondesk = null, note = null }: Props = $props();

  const STRIP = 'scenes/home/attic-header-night';
  const painted = artUrl(STRIP) !== null;

  let reading = $state(false);
</script>

<div class="attic" class:doorway data-testid={doorway ? 'field-header' : 'study-header'}>
  <HomeStrip strip={STRIP} title={doorway ? 'A quiet doorway' : 'The Study'} variant="study">
    {#snippet right()}
      <div class="objects">
        <RoomObject
          art="props/home/book"
          label="Codex"
          onclick={oncodex}
          data-testid="codex-button"
        >
          {#snippet fallback()}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">
              <path d="M4 5c3-1 6-1 8 1 2-2 5-2 8-1v13c-3-1-6-1-8 1-2-2-5-2-8-1z" />
              <path d="M12 6v13" />
            </svg>
          {/snippet}
        </RoomObject>
        {#if !doorway}
          <RoomObject
            art="props/home/jar"
            label="Bench"
            hidden={!onbench}
            onclick={() => onbench?.()}
            data-testid={onbench ? 'bench-button' : undefined}
          >
            {#snippet fallback()}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">
                <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3" />
                <path d="M7.5 15h9" />
              </svg>
            {/snippet}
          </RoomObject>
          <RoomObject
            art="props/home/desk"
            label="Desk"
            hidden={!ondesk}
            onclick={() => ondesk?.()}
            data-testid={ondesk ? 'desk-button' : undefined}
          >
            {#snippet fallback()}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">
                <path d="M5 4h10l4 4v12H5z" />
                <path d="M14 4v5h5M8 13h8M8 17h5" />
              </svg>
            {/snippet}
          </RoomObject>
        {/if}
      </div>
    {/snippet}
    {#snippet fallback()}<StudyScene />{/snippet}
  </HomeStrip>
  {#if !painted}<span class="bleed" aria-hidden="true"></span>{/if}
  {#if note}
    <button type="button" class="note" onclick={() => (reading = true)} data-testid={note.testid}>
      <span class="paper">{note.text}</span>
    </button>
  {/if}
</div>

{#if note}
  <Sheet open={reading} title={note.title} onclose={() => (reading = false)}>
    <p class="full">{note.text}</p>
  </Sheet>
{/if}

<style>
  .attic {
    --room-object-size: 48px;
    position: relative;
    flex: none;
  }
  .attic.doorway {
    --note-w: 250px;
  }
  /* Out of the header's flex row: the labels are wider than the objects, so they need the room.
     They stand on the shelf, left of the ⋯ (AppHeader's last control: 44 px and 4 px of padding). */
  .objects {
    position: absolute;
    right: calc(var(--tap) + var(--space-1) + var(--space-2));
    bottom: 6px;
    display: flex;
    align-items: center;
    gap: 18px;
  }
  /* The calm 24 px under the header: the flat home colour when no strip is shipped. */
  .bleed {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    z-index: 0;
    height: 24px;
    background: linear-gradient(var(--home-wood-deep), transparent);
    pointer-events: none;
  }
  /* One line of paper under the title; the button is the 44 px target, the paper is the look. */
  .note {
    position: absolute;
    left: var(--space-1);
    bottom: 0;
    z-index: 1;
    display: flex;
    align-items: flex-end;
    box-sizing: border-box;
    width: var(--note-w, 132px);
    min-height: var(--tap);
    padding: 0 0 5px var(--space-2);
    border: 0;
    background: none;
    color: var(--home-ink);
    font-family: var(--font-serif);
    text-align: left;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .note:focus-visible {
    outline: 3px solid var(--select);
    outline-offset: -3px;
  }
  .paper {
    display: block;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    padding: 1px var(--space-2);
    border-radius: 3px;
    background: var(--home-paper);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
    font-size: var(--type-sm);
    font-style: italic;
    line-height: 1.3;
    text-overflow: ellipsis;
    white-space: nowrap;
    transform: rotate(-1deg);
  }
  .full {
    margin: 0;
    font-size: var(--type-md);
    font-style: italic;
  }
</style>
