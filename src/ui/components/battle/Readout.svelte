<script lang="ts">
  interface Props {
    readout: { n: number; total: number; text: string } | null;
    onspeedup: () => void;
  }

  const _props: Props = $props();
</script>
