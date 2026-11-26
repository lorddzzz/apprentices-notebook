<script lang="ts">
  interface Props {
    beat: { kind: 'burst' | 'compound' | 'first'; name: string; first: boolean } | null;
    onspeedup: () => void;
    onskip: () => void;
  }

  const _props: Props = $props();
</script>
