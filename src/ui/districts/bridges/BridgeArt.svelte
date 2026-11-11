<script lang="ts">
  import type { UnitArtProps } from '..';
  import BridgeToken from './BridgeToken.svelte';

  let { unit, glyph }: UnitArtProps = $props();
</script>

<BridgeToken def={unit.def} {glyph} />
