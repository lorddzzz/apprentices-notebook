<script lang="ts">
  import type { UnitArtProps } from '../..';
  import BathToken from './BathToken.svelte';
  import { dissolvedOn } from './view';

  let { unit, glyph, view }: UnitArtProps = $props();
</script>

<!-- A bather standing in a cloud is steam (BH-14): drawn dissolved. -->
<BathToken def={unit.def} {glyph} dissolved={dissolvedOn(view, unit)} />
