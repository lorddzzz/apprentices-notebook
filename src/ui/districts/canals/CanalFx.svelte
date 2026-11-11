<script lang="ts">
  import type { Fx } from '../../../app/fx';
  import MoorFx from './MoorFx.svelte';
  import RuinFx from './RuinFx.svelte';

  let { fx }: { fx: Fx } = $props();
</script>

{#if fx.kind === 'moor'}
  <MoorFx at={fx.at} />
{:else if fx.kind === 'ruin'}
  <RuinFx at={fx.at} />
{/if}
