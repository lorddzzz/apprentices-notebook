<script lang="ts">
  import { RUNES } from '$data';
  import type { LootItem } from '$engine';
  import { lootLine } from '../../../app/describe';
  import { cardPlan } from '../../../app/lootviews';
  import ArtImage from '../../art/ArtImage.svelte';
  import type { ArtId } from '../../art/registry';
  import { FALLBACK_CARD, offerCardFor } from '../../districts';
  import { METHOD_ART } from '../../runeArt';
  import RuneGlyph from '../RuneGlyph.svelte';
  import SolventIcon from '../SolventIcon.svelte';

  /**
   * UT-7. The offer card's shell: 112 px baseline, sized to content (never stretched), the find's
   * art on the left (the vector mark until the raster ships), its words on the right. A chosen
   * card has its own cue (amber edge and a check); the gold ribbon is only for a find the
   * notebook does not have (UT-D2). A district's registered card body is hosted unchanged.
   */
  interface Props {
    item: LootItem;
    selected: boolean;
    /** Taken finds (the Crossroads list) can't be tapped. */
    onselect?: () => void;
    /** The notebook does not have this find yet (`offerNovelty`). */
    isNew?: boolean;
    testid?: string;
  }

  let { item, selected, onselect, isNew = false, testid }: Props = $props();

  // Core kinds draw themselves; other kinds go through their registered card, else the fallback (DK-12).
  const plan = $derived(cardPlan(item));
  const Body = $derived(
    plan.how === 'key' ? (offerCardFor(plan.key) ?? FALLBACK_CARD) : FALLBACK_CARD,
  );
  const line = $derived(plan.how === 'core' ? lootLine(item) : { title: '', text: '' });

  const ART_KINDS: ReadonlySet<string> = new Set([
    'rune',
    'method',
    'ink',
    'solvent',
    'vellum',
    'doorway',
  ]);
  // The two illustrations of a kind alternate by the item, so a row of the same kind varies.
  const variant = $derived(
    [...JSON.stringify(item)].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 2 === 0 ? 'a' : 'b',
  );
  const artId = $derived(
    ART_KINDS.has(item.kind) ? (`finds/shared/${item.kind}-${variant}` as ArtId) : null,
  );
  const tint = 'var(--ink-faint)';
</script>

{#snippet vector()}
  {#if item.kind === 'rune'}
    <RuneGlyph rune={item.rune} dir={RUNES[item.rune].arrow ? 'right' : undefined} size={52} />
  {:else if item.kind === 'ink'}
    <svg width="52" height="52" viewBox="0 0 40 40" role="img" aria-label="Ink">
      <circle cx="20" cy="20" r="16.5" fill="var(--parchment)" stroke={tint} stroke-width="2.5" />
      <path d="M20 8c4 6 7 9.5 7 14a7 7 0 0 1-14 0c0-4.500 3-8 7-14z" fill="var(--m-ink)" />
    </svg>
  {:else if item.kind === 'solvent'}
    <SolventIcon solvent={item.solvent} size={44} />
  {:else if item.kind === 'method'}
    <svg width="52" height="52" viewBox="0 0 40 40" role="img" aria-label="A method page">
      <circle cx="20" cy="20" r="16.5" fill="var(--parchment)" stroke="var(--ink)" stroke-width="2.5" />
      <g transform="translate(20 20) scale(0.7) translate(-12 -12)">
        <path d={METHOD_ART[item.method]} fill="none" stroke="var(--ink)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </g>
    </svg>
  {:else if item.kind === 'doorway'}
    <svg width="52" height="52" viewBox="0 0 40 40" role="img" aria-label="A quiet doorway">
      <circle cx="20" cy="20" r="16.5" fill="var(--parchment)" stroke="var(--ink)" stroke-width="2.5" />
      <path d="M13 31V18a7 7 0 0 1 14 0v13z" fill="var(--wood-dark)" stroke="var(--wood-deep)" stroke-width="1.5" />
      <circle cx="23.5" cy="24.5" r="1.2" fill="var(--lamp)" />
    </svg>
  {:else if item.kind === 'key'}
    <svg width="52" height="52" viewBox="0 0 40 40" role="img" aria-label="A key">
      <circle cx="20" cy="20" r="16.5" fill="var(--parchment)" stroke="var(--ink)" stroke-width="2.5" />
      <circle cx="14.500" cy="17" r="4.500" fill="none" stroke="var(--ink)" stroke-width="2.500" />
      <path d="M18.500 20.500L29 31M25 27l3-3M28 30l3-3" fill="none" stroke="var(--ink)" stroke-width="2.500" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  {:else}
    <svg width="52" height="52" viewBox="0 0 40 40" role="img" aria-label="Vellum">
      <rect x="7" y="5" width="26" height="30" rx="2" fill="var(--parchment)" stroke="var(--ink)" stroke-width="2" />
      <path d="M12 13h16M12 19h16M12 25h10" stroke="var(--ink-soft)" stroke-width="2" stroke-linecap="round" />
    </svg>
  {/if}
{/snippet}

<button
  type="button"
  class="card"
  class:selected
  aria-pressed={selected}
  disabled={!onselect}
  onclick={onselect}
  data-new={isNew ? '' : undefined}
  data-testid={testid}
>
  {#if isNew}<span class="ribbon" data-testid="offer-new">New</span>{/if}
  {#if selected}<span class="check" aria-hidden="true">✓</span>{/if}
  {#if plan.how !== 'core'}
    <Body {item} />
  {:else}
    <span class="art">
      {#if artId}
        <ArtImage id={artId} fallback={vector} />
      {:else}
        {@render vector()}
      {/if}
    </span>
    <span class="words">
      <span class="title">{line.title}</span>
      <span class="text">{line.text}</span>
    </span>
  {/if}
</button>

<style>
  .card {
    position: relative;
    display: flex;
    align-items: center;
    gap: var(--space-3);
    width: 100%;
    min-height: 112px;
    padding: 10px var(--space-3);
    border: 2px solid var(--parchment-deep);
    border-radius: var(--radius);
    background: var(--parchment);
    box-shadow: var(--shadow-1);
    color: var(--ink);
    font-family: var(--font-serif);
    text-align: left;
    cursor: pointer;
  }
  .card:disabled {
    cursor: default;
  }
  .card:focus-visible {
    outline: 3px solid var(--select);
    outline-offset: 2px;
  }
  .selected {
    border-color: var(--select);
    background: color-mix(in srgb, var(--select) 16%, var(--parchment));
    box-shadow: 0 0 0 2px var(--select);
  }
  .check {
    position: absolute;
    top: var(--space-2);
    right: var(--space-2);
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--select);
    color: var(--ink);
    font-size: var(--type-sm);
    font-weight: bold;
    line-height: 1;
  }
  .ribbon {
    position: absolute;
    top: -2px;
    left: var(--space-3);
    padding: 1px var(--space-2) 2px;
    border-radius: 0 0 var(--radius) var(--radius);
    background: var(--gold);
    color: var(--ink);
    font-size: var(--type-xs);
    font-variant-caps: all-small-caps;
    letter-spacing: 0.08em;
    line-height: 1.3;
  }
  .art {
    display: grid;
    place-items: center;
    flex: none;
    width: 88px;
    height: 88px;
  }
  .art :global(img) {
    width: 88px;
    height: 88px;
    object-fit: contain;
  }
  .words {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    padding-right: var(--space-4);
  }
  .title {
    font-size: 19px;
    line-height: 1.2;
  }
  .text {
    display: -webkit-box;
    -webkit-line-clamp: 4;
    line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
    font-size: 13px;
    line-height: 1.25;
    color: var(--ink-soft);
  }
</style>
