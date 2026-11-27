<script lang="ts">
  interface Props {
    size: number;
  }

  let { size }: Props = $props();
</script>

<!-- The Seam's crest: a stitched seam across a page edge. Vector, so it needs no art. -->
<svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" data-crest-art="seam">
  <path d="M6 5h20v22H6z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
  <path d="M16 5v22" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="3 3" stroke-linecap="round" />
  <path d="M11 11l5 3-5 3M21 15l-5 3 5 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
</svg>
