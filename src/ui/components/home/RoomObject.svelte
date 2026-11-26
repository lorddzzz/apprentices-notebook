<script lang="ts">
  import type { Snippet } from 'svelte';
  import ArtImage from '../../art/ArtImage.svelte';
  import type { ArtId } from '../../art/registry';

  /**
   * UH-0. A tappable object in a home room (the book, the jar, the desk): its painted sprite or,
   * without art, a glyph in an ivory-edged disc; a small-caps label pill above it; the shared
   * action cue (sparkle dots, as in docs/design/art-studies/study-v2.png) in the pill.
   * `lit` marks the thing worth doing now (lamp glow, twinkling dots). `hidden` keeps the footprint
   * as an empty slot (a locked object never shifts the layout): not focusable, not announced.
   * The footprint is `--room-object-size` (default 64px); the hit area is at least `--tap`.
   * `data-testid` is passed through to the button (or to the empty slot when hidden).
   */
  interface Props {
    art: ArtId;
    label: string;
    onclick: () => void;
    lit?: boolean;
    hidden?: boolean;
    fallback: Snippet;
    'data-testid'?: string;
  }

  let {
    art,
    label,
    onclick,
    lit = false,
    hidden = false,
    fallback: glyph,
    'data-testid': testid,
  }: Props = $props();
</script>

{#if hidden}
  <span class="room-object slot" aria-hidden="true" data-testid={testid} data-hidden="true"></span>
{:else}
  <button type="button" class="room-object" class:lit={lit} {onclick} data-testid={testid}>
    <span class="pill label">
      {label}
      <span class="cue" aria-hidden="true"><i></i><i></i><i></i></span>
    </span>
    <span class="body" aria-hidden="true">
      <ArtImage id={art} fit="contain" class="sprite">
        {#snippet fallback()}
          <span class="glyph">{@render glyph()}</span>
        {/snippet}
      </ArtImage>
    </span>
  </button>
{/if}

<style>
  .room-object {
    --size: var(--room-object-size, 64px);
    --ivory: #f4ecd6;
    position: relative;
    display: inline-flex;
    flex: none;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: max(var(--size), var(--tap));
    height: max(var(--size), var(--tap));
    padding: 0;
    border: 0;
    background: none;
    color: var(--home-paper);
    font-family: var(--font-serif);
    -webkit-tap-highlight-color: transparent;
  }
  .slot {
    pointer-events: none;
  }
  button.room-object {
    cursor: pointer;
  }
  button.room-object:active {
    transform: translateY(1px);
  }
  button.room-object:focus-visible {
    outline: 3px solid var(--select);
    outline-offset: 2px;
    border-radius: var(--radius);
  }
  .body {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }
  .body :global(.sprite) {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    /* ivory edge: a thin outline that follows the sprite's alpha */
    filter: drop-shadow(1px 0 0 var(--ivory)) drop-shadow(-1px 0 0 var(--ivory))
      drop-shadow(0 1px 0 var(--ivory)) drop-shadow(0 -1px 0 var(--ivory))
      drop-shadow(0 2px 3px rgba(0, 0, 0, 0.5));
  }
  .glyph {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    border: 2px solid var(--ivory);
    border-radius: 50%;
    background: color-mix(in srgb, var(--home-wood-deep) 75%, transparent);
    box-shadow: 0 2px 3px rgba(0, 0, 0, 0.5);
    font-size: var(--type-xl);
  }
  .lit .body {
    filter: drop-shadow(0 0 8px var(--home-lamp));
  }
  .pill {
    position: absolute;
    left: 50%;
    bottom: 100%;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    margin-bottom: -10px;
    padding: 1px var(--space-2);
    border: 1px solid var(--ivory);
    border-radius: 999px;
    background: var(--home-wood-deep);
    color: var(--ivory);
    font-size: var(--type-xs);
    line-height: 1.4;
    white-space: nowrap;
    transform: translateX(-50%);
    pointer-events: none;
  }
  .lit .pill {
    border-color: var(--home-lamp);
    color: var(--home-lamp);
  }
  /* The shared action cue: three sparkle dots. */
  .cue {
    position: relative;
    display: inline-block;
    width: 10px;
    height: 10px;
  }
  .cue i {
    position: absolute;
    width: 2px;
    height: 2px;
    border-radius: 50%;
    background: currentColor;
  }
  .cue i:nth-child(1) {
    top: 0;
    left: 4px;
  }
  .cue i:nth-child(2) {
    top: 4px;
    left: 8px;
  }
  .cue i:nth-child(3) {
    top: 8px;
    left: 2px;
  }
  @media (prefers-reduced-motion: no-preference) {
    .lit .cue i {
      animation: twinkle var(--dur-held) ease-in-out infinite alternate;
    }
    .lit .cue i:nth-child(2) {
      animation-delay: calc(var(--dur-quick) * -1);
    }
    .lit .cue i:nth-child(3) {
      animation-delay: calc(var(--dur-base) * -1);
    }
  }
  @keyframes twinkle {
    from {
      opacity: 0.35;
    }
    to {
      opacity: 1;
    }
  }
</style>
