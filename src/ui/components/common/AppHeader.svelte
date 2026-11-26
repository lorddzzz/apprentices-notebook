<script lang="ts" module>
  export {
    type ArtId,
    crestSnippet,
    HEADER_HEIGHT,
    HEADER_WORLD,
    type HeaderBack,
    type HeaderVariant,
  } from './header';
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import { href } from '../../../app/routes';
  import ArtImage from '../../art/ArtImage.svelte';
  import {
    type ArtId,
    HEADER_HEIGHT,
    HEADER_WORLD,
    type HeaderBack,
    type HeaderVariant,
  } from './header';
  import MenuSheet from './MenuSheet.svelte';

  /**
   * C7 (frozen props). Heights: study 88 (home world, wood bar, script title), subroom 64 (home),
   * city 56 (night bar, crest left, also the fight's two-line header), system 56 (paper bar,
   * small-caps title). Without art `strip` and `crest` fall back to the flat world colours.
   * Study: the strip is 750x224, the top 176 px is the header and the lower 48 px (24 CSS px)
   * bleeds behind the seat tabs, so the seat tabs' row must be positioned (it then paints above
   * the bleed). The back control and ⋯ are at least 44x44; ⋯ is always last.
   */
  interface Props {
    variant: HeaderVariant;
    title: string;
    subtitle?: string;
    /** The second line (the fight: boss name, HP, rule). */
    status?: Snippet;
    back?: HeaderBack;
    crest?: Snippet;
    strip?: ArtId;
    /** Extra controls; the ⋯ menu always comes after them. Icon-only controls need an aria-label. */
    right?: Snippet;
  }

  let { variant, title, subtitle, status, back, crest, strip, right }: Props = $props();

  let menuOpen = $state(false);
</script>

<header
  class="app-header {variant}"
  class:has-strip={strip !== undefined}
  data-world={HEADER_WORLD[variant]}
  data-variant={variant}
  data-strip={strip}
  style:--header-h="{HEADER_HEIGHT[variant]}px"
>
  {#if strip}
    <span class="strip" aria-hidden="true"><ArtImage id={strip} fit="cover" /></span>
  {/if}
  {#if back}
    {#if 'to' in back}
      <a class="back" href={href(back.to)} data-testid="header-back">
        <span aria-hidden="true">&larr;</span>
        {back.label}
      </a>
    {:else}
      <button type="button" class="back" onclick={back.onback} data-testid="header-back">
        <span aria-hidden="true">&larr;</span>
        {back.label}
      </button>
    {/if}
  {/if}
  {#if crest}<span class="crest">{@render crest()}</span>{/if}
  <div class="titles">
    <div class="title-row">
      <h1 class={['title', { label: variant === 'system' }]}>{title}</h1>
      <!-- two lines at most: with a status line the subtitle joins the title line -->
      {#if subtitle && status}<span class="subtitle">{subtitle}</span>{/if}
    </div>
    {#if subtitle && !status}<p class="subtitle">{subtitle}</p>{/if}
    {#if status}<div class="status">{@render status()}</div>{/if}
  </div>
  {#if right}<div class="right">{@render right()}</div>{/if}
  <button
    type="button"
    class="more"
    aria-label="Menu"
    aria-haspopup="dialog"
    aria-expanded={menuOpen}
    data-testid="header-menu"
    onclick={() => (menuOpen = true)}
  >
    &hellip;
  </button>
</header>
<MenuSheet open={menuOpen} onclose={() => (menuOpen = false)} />

<style>
  /* The header is positioned only for the strip (z-index 0: a later positioned sibling, the seat
     tabs, paints above the bleed). MenuSheet is its sibling, so it still covers the screen root. */
  .app-header {
    --bleed: 0px;
    position: relative;
    z-index: 0;
    display: flex;
    flex: none;
    align-items: center;
    gap: var(--space-2);
    height: calc(var(--header-h) + var(--safe-top));
    padding: var(--safe-top) var(--space-1) 0 var(--space-1);
    border-bottom: 1px solid var(--world-line);
    background: var(--world-bg);
    color: var(--world-fg);
    font-family: var(--font-serif);
  }
  .app-header.study {
    --bleed: 24px;
    background: linear-gradient(var(--home-wood-dark), var(--home-wood-deep));
    border-bottom-color: var(--home-wood-deep);
  }
  .app-header.city {
    border-bottom-color: var(--city-stone);
  }
  .has-strip {
    border-bottom: 0;
  }
  .strip {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: -1;
    height: calc(var(--header-h) + var(--safe-top) + var(--bleed));
    overflow: hidden;
    pointer-events: none;
  }
  .strip :global(img) {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .back,
  .more {
    display: inline-flex;
    flex: none;
    align-items: center;
    justify-content: center;
    gap: var(--space-1);
    min-width: var(--tap);
    min-height: var(--tap);
    padding: 0 var(--space-2);
    border: 1px solid var(--world-line);
    border-radius: var(--radius);
    background: color-mix(in srgb, var(--world-bg) 60%, transparent);
    color: inherit;
    font-family: var(--font-serif);
    font-size: var(--type-md);
    text-decoration: none;
    cursor: pointer;
  }
  .system .back,
  .system .more {
    border-color: transparent;
    background: none;
  }
  .more {
    font-size: var(--type-xl);
    line-height: 1;
  }
  .back:active,
  .more:active {
    transform: translateY(1px);
  }
  .back:focus-visible,
  .more:focus-visible {
    outline: 3px solid var(--select);
    outline-offset: 1px;
  }
  .crest {
    display: inline-flex;
    flex: none;
    padding-left: var(--space-1);
  }
  .crest :global(.crest-disc) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: 2px solid currentColor;
    border-radius: 50%;
    font-size: var(--type-sm);
  }
  .crest :global(.crest-disc.mounted) {
    border: 0;
  }
  .titles {
    flex: 1;
    min-width: 0;
    padding-left: var(--space-1);
  }
  .title-row {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
    min-width: 0;
  }
  .title,
  .subtitle {
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .title {
    font-size: var(--type-lg);
    font-weight: normal;
    line-height: 1.2;
  }
  .has-strip .title,
  .has-strip .subtitle,
  .has-strip .status {
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.75);
  }
  .study .title,
  .subroom .title {
    font-family: var(--font-script);
  }
  .study .title {
    font-size: var(--type-title);
  }
  .subroom .title {
    font-size: var(--type-xl);
  }
  .subtitle,
  .status {
    font-size: var(--type-sm);
    line-height: 1.3;
    opacity: 0.85;
  }
  .status {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    overflow: hidden;
    white-space: nowrap;
  }
  .right {
    display: flex;
    flex: none;
    align-items: center;
  }
  .title-row .subtitle {
    flex: none;
  }
</style>
