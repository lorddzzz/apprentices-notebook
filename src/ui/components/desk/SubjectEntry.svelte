<script lang="ts">
  import type { MethodId, RuneId, SolventId } from '$data';
  import type { SubjectRow } from '../../../app/desk';
  import { METHOD_ART } from '../../runeArt';
  import Pips from '../common/Pips.svelte';
  import RuneGlyph from '../RuneGlyph.svelte';
  import SolventIcon from '../SolventIcon.svelte';

  interface Props {
    row: SubjectRow;
    open: boolean;
    ontoggle: () => void;
  }

  let { row, open, ontoggle }: Props = $props();
</script>

<button
  type="button"
  class="entry"
  class:open
  aria-expanded={open}
  data-testid="desk-subject-{row.subject}"
  onclick={ontoggle}
>
  <span class="glyph">
    {#if row.kind === 'rune'}
      <RuneGlyph rune={row.subject as RuneId} size={40} />
    {:else if row.kind === 'solvent'}
      <SolventIcon solvent={row.subject as SolventId} size={36} />
    {:else}
      <svg width="36" height="36" viewBox="0 0 24 24" role="img" aria-label={row.name}>
        <path
          d={METHOD_ART[row.subject as MethodId]}
          fill="none"
          stroke="var(--ink)"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    {/if}
  </span>
  <span class="body">
    <span class="name">{row.name}</span>
    <span class="pips"><Pips value={row.level} max={3} tone="ink" /></span>
    <span class="points">
      {row.points} points{row.toNext === null ? '' : `, ${row.toNext} to the next level`}
    </span>
  </span>
  {#if row.open > 0}
    <span class="mark" data-testid="desk-open-{row.subject}">{row.open} to write</span>
  {/if}
</button>

<style>
  .entry {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    height: 72px;
    padding: 6px var(--space-2);
    border: 2px solid var(--line);
    border-radius: var(--radius);
    background: var(--parchment-dark);
    color: var(--ink);
    font: 15px var(--font-serif);
    text-align: left;
    cursor: pointer;
  }
  .open {
    border-color: var(--ink);
    background: #f6e3b4;
  }
  .glyph {
    flex: none;
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
  }
  .body {
    flex: 1;
    min-width: 0;
    display: grid;
    grid-template-columns: auto 1fr;
    column-gap: var(--space-2);
    align-items: center;
  }
  .name {
    font-size: 17px;
  }
  .points {
    grid-column: 1 / -1;
    font-size: 12px;
    color: var(--ink-soft);
  }
  .pips {
    display: inline-flex;
  }
  .mark {
    flex: none;
    padding: 2px 8px;
    border-radius: 10px;
    background: var(--lamp);
    font-size: 12px;
    font-weight: bold;
  }
</style>
