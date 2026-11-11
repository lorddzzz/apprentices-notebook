<script lang="ts">
  import type { Fx } from '../../../app/fx';
  import FallFx from './FallFx.svelte';

  let { fx }: { fx: Fx } = $props();
</script>

{#if fx.kind === 'fall'}
  <FallFx cells={fx.cells} />
{/if}
