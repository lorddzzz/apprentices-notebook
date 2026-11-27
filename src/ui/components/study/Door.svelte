<script lang="ts">
  import ArtImage from '../../art/ArtImage.svelte';
  import { artUrl } from '../../art/registry';
  import ActionButton from '../common/ActionButton.svelte';

  /**
   * UH-2. The Study's one primary: the door out into the city, or "Done" in a quiet doorway
   * (same footprint). A blocked door is a disabled primary whose caption says why. The slot is
   * reserved while `hidden` (the drawer is up), so the page above never moves. 64 px tall, a
   * 52 px bar on short phones (UH-D2). Painted: `ui-plates/home/door-plate` behind the text;
   * without art: dark planks with a small arch.
   */
  interface Props {
    label: string;
    caption: string;
    disabled?: boolean;
    hidden?: boolean;
    /** Done in a quiet doorway: no arch and no arrow. */
    done?: boolean;
    onclick: () => void;
    testid: string;
  }

  let { label, caption, disabled = false, hidden = false, done = false, onclick, testid }: Props = $props();

  const painted = artUrl('ui-plates/home/door-plate') !== null;
</script>

<div class="slot" data-world="home" inert={hidden} aria-hidden={hidden ? 'true' : undefined}>
  <div class="door" class:painted class:hidden class:off={disabled}>
    {#if painted}
      <span class="plate" aria-hidden="true">
        <ArtImage id="ui-plates/home/door-plate" fit="cover" />
      </span>
    {/if}
    <ActionButton kind="primary" {disabled} {onclick} {testid}>
      {#if !done && !painted}
        <svg class="arch" width="24" height="30" viewBox="0 0 28 36" aria-hidden="true">
          <path d="M3 35V14a11 11 0 0 1 22 0v21z" fill="var(--wood-dark)" stroke="var(--wood-deep)" stroke-width="2" />
          <path d="M14 3v32M8.5 10v25M19.5 10v25" stroke="var(--wood-deep)" stroke-opacity="0.6" />
          <circle cx="20.5" cy="23" r="1.8" fill="var(--lamp)" />
        </svg>
      {/if}
      <span class="words">
        <span class="door-label">{label}{#if !done}<span class="go" aria-hidden="true"> &rarr;</span>{/if}</span>
        <span class="caption">{caption}</span>
      </span>
    </ActionButton>
  </div>
</div>

<style>
  .slot {
    --door-h: 64px;
    flex: none;
    padding: var(--space-2);
  }
  .door {
    position: relative;
  }
  .door.hidden {
    visibility: hidden;
  }
  .door :global(.action) {
    position: relative;
    width: 100%;
    min-height: var(--door-h);
    gap: var(--space-2);
    padding: 0 var(--space-3);
  }
  .plate {
    position: absolute;
    inset: 0;
    overflow: hidden;
    border-radius: var(--radius);
    pointer-events: none;
  }
  .plate :global(img) {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .off .plate {
    opacity: 0.45;
    filter: grayscale(0.8);
  }
  /* The door's look, ours over ActionButton's lamp fill (its disabled look stays as it is). */
  .door:not(.painted) :global(.action.primary:not(:disabled)) {
    border-color: var(--home-wood-deep);
    background:
      repeating-linear-gradient(90deg, transparent 0 44px, rgba(0, 0, 0, 0.3) 44px 45px),
      linear-gradient(#37271c, #2a1d15);
    box-shadow: 0 5px 0 -1px rgba(232, 176, 74, 0.55);
    color: var(--home-paper);
  }
  .door.painted :global(.action.primary) {
    border-color: transparent;
    background: transparent;
    box-shadow: none;
    color: var(--home-ink);
  }
  .door.painted.off :global(.action.primary:disabled) {
    background: transparent;
    border-color: var(--ink-faint);
    color: var(--home-ink-soft);
  }
  .arch {
    flex: none;
  }
  .words {
    display: flex;
    flex-direction: column;
    min-width: 0;
    gap: 1px;
    text-align: center;
  }
  .door-label {
    font-size: var(--type-lg);
    font-style: italic;
    line-height: 1.15;
  }
  .caption {
    display: -webkit-box;
    overflow: hidden;
    font-size: var(--type-sm);
    font-style: normal;
    line-height: 1.2;
    opacity: 0.85;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
  }
  /* Short phones: a 52 px bar, one caption line. */
  @media (max-height: 740px) {
    .slot {
      --door-h: 52px;
      padding-block: var(--space-1);
    }
    .caption {
      -webkit-line-clamp: 1;
      line-clamp: 1;
    }
  }
</style>
