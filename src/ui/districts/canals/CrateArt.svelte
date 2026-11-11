<script lang="ts">
  import type { UnitArtProps } from '..';
  import CrateToken from './CrateToken.svelte';

  let { unit }: UnitArtProps = $props();
</script>

<CrateToken moored={unit.moored === true} />
