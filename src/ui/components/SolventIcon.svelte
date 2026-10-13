<script lang="ts">
  import { SOLVENTS, type SolventId } from '$data';
  import { FILLED_SOLVENTS, SOLVENT_GLYPH } from '../glyphs';

  interface Props {
    solvent: SolventId;
    size?: number;
  }

  let { solvent, size = 24 }: Props = $props();

  const path = $derived(SOLVENT_GLYPH[solvent] ?? null);
</script>

<svg
  class="solvent"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  role="img"
  aria-label={SOLVENTS[solvent].name}
  style:color="var(--ink)"
>
  {#if path}
    <path
      d={path}
      fill={FILLED_SOLVENTS.has(solvent) ? 'currentColor' : 'none'}
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  {:else}
    <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="3 3" />
  {/if}
</svg>

<style>
  .solvent {
    display: block;
    flex: none;
    overflow: visible;
  }
</style>
