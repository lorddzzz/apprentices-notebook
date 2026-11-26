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
  import {
    type ArtId,
    HEADER_HEIGHT,
    HEADER_WORLD,
    type HeaderBack,
    type HeaderVariant,
  } from './header';
  import MenuSheet from './MenuSheet.svelte';

  /** C7 (frozen props). Stub look: flat world colours, tokens only; Pack B (UF-8) dresses it. */
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
  data-world={HEADER_WORLD[variant]}
  data-variant={variant}
  data-strip={strip}
  style:--header-h="{HEADER_HEIGHT[variant]}px"
>
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
  /* Not positioned: the menu sheet covers the screen root, as every Sheet does. */
  .app-header {
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
    border: 0;
    background: none;
    color: inherit;
    font-size: var(--type-md);
    text-decoration: none;
    cursor: pointer;
  }
  .more {
    font-size: var(--type-xl);
    line-height: 1;
  }
  .back:focus-visible,
  .more:focus-visible {
    outline: 3px solid var(--select);
  }
  .crest {
    display: inline-flex;
    flex: none;
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
