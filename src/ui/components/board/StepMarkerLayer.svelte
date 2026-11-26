<script lang="ts">
  import type { Coord } from '$engine';

  interface Props {
    markers: readonly { n: number; at: Coord; first: boolean }[];
  }

  const _props: Props = $props();
</script>
