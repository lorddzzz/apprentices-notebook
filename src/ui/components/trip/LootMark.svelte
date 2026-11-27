<script lang="ts">
  import { APPRENTICES, RUNES } from '$data';
  import type { LootItem } from '$engine';
  import { METHOD_ART } from '../../runeArt';
  import ApprenticeToken from '../common/ApprenticeToken.svelte';
  import RuneGlyph from '../RuneGlyph.svelte';
  import SolventIcon from '../SolventIcon.svelte';

  /** The small vector mark of a find (chips and the carried-home list). */
  interface Props {
    item: LootItem;
  }

  let { item }: Props = $props();
</script>

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

<style>
  .icon {
    display: inline-grid;
    place-items: center;
    width: 24px;
    color: var(--m-ink);
  }
</style>
