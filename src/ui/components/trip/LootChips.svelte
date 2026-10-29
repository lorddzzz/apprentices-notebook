<script lang="ts">
  import { APPRENTICES, RUNES } from '$data';
  import type { LootItem } from '$engine';
  import { lootName } from '../../../app/describe';
  import { METHOD_ART } from '../../runeArt';
  import ApprenticeToken from '../common/ApprenticeToken.svelte';
  import RuneGlyph from '../RuneGlyph.svelte';
  import SolventIcon from '../SolventIcon.svelte';

  interface Props {
    items: readonly LootItem[];
    /** Wiped: the finds are listed struck through. */
    lost?: boolean;
  }

  // biome-ignore lint/correctness/noUnusedVariables: used in the template
  let { items, lost = false }: Props = $props();
</script>

<ul class="chips" class:lost data-testid="loot-list">
  {#each items as item, i (i)}
    <li class="chip" data-kind={item.kind}>
      {#if item.kind === 'rune'}
        <RuneGlyph rune={item.rune} dir={RUNES[item.rune].arrow ? 'right' : undefined} size={28} />
      {:else if item.kind === 'solvent'}
        <span class="icon"><SolventIcon solvent={item.solvent} size={22} /></span>
      {:else if item.kind === 'method'}
        <span class="icon">
          <svg width="22" height="22" viewBox="0 0 24 24" role="img" aria-label="A method page">
            <path d={METHOD_ART[item.method]} fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
      {:else if item.kind === 'recruit'}
        <ApprenticeToken def={APPRENTICES[item.apprentice]} size={26} />
      {:else}
        <span class="icon" aria-hidden="true">{item.kind === 'ink' ? '●' : item.kind === 'key' ? '⚷' : '✎'}</span>
      {/if}
      <span class="name">{item.kind === 'recruit' ? APPRENTICES[item.apprentice].name : lootName(item)}</span>
    </li>
  {:else}
    <li class="none">Nothing yet.</li>
  {/each}
</ul>

<style>
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .chip {
    gap: 4px;
    padding-left: 4px;
    min-height: 36px;
    font-size: 14px;
  }
  .icon {
    display: inline-grid;
    place-items: center;
    width: 24px;
    color: var(--m-ink);
  }
  .lost .name {
    text-decoration: line-through;
    color: var(--ink-soft);
  }
  .lost .chip {
    opacity: 0.7;
  }
  .none {
    font-style: italic;
    color: var(--ink-soft);
  }
</style>
