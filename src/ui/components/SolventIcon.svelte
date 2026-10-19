<script lang="ts">
  import { SOLVENTS, type SolventId } from '$data';
  import { FILLED_SOLVENT_ART, SOLVENT_ART } from '../runeArt';

  interface Props {
    solvent: SolventId;
    size?: number;
  }

  let { solvent, size = 24 }: Props = $props();
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
  <path
    d={SOLVENT_ART[solvent]}
    fill={FILLED_SOLVENT_ART.has(solvent) ? 'currentColor' : 'none'}
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
</svg>

<style>
  .solvent {
    display: block;
    flex: none;
    overflow: visible;
  }
</style>
