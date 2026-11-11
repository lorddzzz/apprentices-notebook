<script lang="ts">
  import type { Fx } from '../../../app/fx';
  import BoilFx from './BoilFx.svelte';

  let { fx }: { fx: Fx } = $props();
</script>

{#if fx.kind === 'boil'}
  <BoilFx cells={fx.cells} />
{/if}
