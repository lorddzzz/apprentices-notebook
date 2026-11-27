<script lang="ts">
  interface Props {
    size: number;
  }

  let { size }: Props = $props();
</script>

<!-- The Lampwater's crest: a lamp over two ripples. Vector, so it needs no art. -->
<svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" data-crest-art="canals">
  <path d="M12 6h8l2 8H10z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
  <path d="M16 3v3M14 14v3h4v-3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  <path d="M5 23q3-3 6 0t6 0 6 0 4 0M7 28q3-3 6 0t6 0 6 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
</svg>
