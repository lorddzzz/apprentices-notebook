<script lang="ts">
  import type { UnitArtProps } from '..';
  import StaffToken from './StaffToken.svelte';

  let { unit, glyph }: UnitArtProps = $props();
</script>

<StaffToken def={unit.def} {glyph} />
