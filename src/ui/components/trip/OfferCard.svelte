<script lang="ts">
  import { RUNES } from '$data';
  import type { LootItem } from '$engine';
  import { lootLine } from '../../../app/describe';
  import { cardPlan } from '../../../app/lootviews';
  import { FALLBACK_CARD, offerCardFor } from '../../districts';
  import CardFace from '../../districts/cards/CardFace.svelte';
  import { METHOD_ART } from '../../runeArt';
  import RuneGlyph from '../RuneGlyph.svelte';
  import SolventIcon from '../SolventIcon.svelte';

  interface Props {
    item: LootItem;
    selected: boolean;
    /** Taken finds (the Crossroads list) can't be tapped. */
    onselect?: () => void;
    testid?: string;
  }

  let { item, selected, onselect, testid }: Props = $props();

  // Core kinds draw themselves; other kinds go through their registered card, else the fallback (DK-12).
  const plan = $derived(cardPlan(item));
  const Body = $derived(
    plan.how === 'key' ? (offerCardFor(plan.key) ?? FALLBACK_CARD) : FALLBACK_CARD,
  );
  const line = $derived(plan.how === 'core' ? lootLine(item) : { title: '', text: '' });
  const tint = 'var(--ink-faint)';
</script>

<button
  type="button"
  class="card"
  class:selected
  aria-pressed={selected}
  disabled={!onselect}
  onclick={onselect}
  data-testid={testid}
>
  {#if plan.how !== 'core'}
    <Body {item} />
  {:else}
  <CardFace title={line.title} text={line.text}>
    {#snippet mark()}
    {#if item.kind === 'rune'}
      <RuneGlyph rune={item.rune} dir={RUNES[item.rune].arrow ? 'right' : undefined} size={52} />
    {:else if item.kind === 'ink'}
      <svg width="52" height="52" viewBox="0 0 40 40" role="img" aria-label="Ink">
        <circle cx="20" cy="20" r="16.5" fill="var(--parchment)" stroke={tint} stroke-width="2.5" />
        <path
          d="M20 8c4 6 7 9.5 7 14a7 7 0 0 1-14 0c0-4.500 3-8 7-14z"
          fill="var(--m-ink)"
        />
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
    {:else}
      <svg width="52" height="52" viewBox="0 0 40 40" role="img" aria-label="Vellum">
        <rect x="7" y="5" width="26" height="30" rx="2" fill="var(--parchment)" stroke="var(--ink)" stroke-width="2" />
        <path d="M12 13h16M12 19h16M12 25h10" stroke="var(--ink-soft)" stroke-width="2" stroke-linecap="round" />
      </svg>
    {/if}
    {/snippet}
  </CardFace>
  {/if}
</button>

<style>
  .card {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    width: 100%;
    min-height: 88px;
    padding: var(--space-2) var(--space-3);
    border: 2px solid var(--line);
    border-radius: var(--radius);
    background: var(--parchment-dark);
    text-align: left;
    cursor: pointer;
  }
  .card:disabled {
    cursor: default;
  }
  .selected {
    border-color: var(--select);
    background: #f6e3b4;
    box-shadow: 0 0 0 3px var(--select);
  }
</style>
