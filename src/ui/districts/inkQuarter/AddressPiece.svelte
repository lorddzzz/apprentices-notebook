<script lang="ts">
  import ForwardPiece from './ForwardPiece.svelte';

  interface Props {
    data: unknown;
    size: number;
  }

  let { data, size }: Props = $props();
</script>

<!-- The address tile (IQ-15): the forwarding pair's addressee, drawn by ForwardPiece. -->
<ForwardPiece {data} {size} address />
