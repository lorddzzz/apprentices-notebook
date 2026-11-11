<script lang="ts">
  import type { UnitArtProps } from '..';
  import { handOf } from './hands';
  import MarginaliaToken from './MarginaliaToken.svelte';

  let { unit, glyph }: UnitArtProps = $props();
</script>

<MarginaliaToken {glyph} next={handOf(unit.intent)} />
