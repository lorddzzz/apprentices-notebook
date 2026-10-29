<script lang="ts">
  interface Props {
    data: unknown;
    size: number;
  }

  let { size }: Props = $props();
  const k = $derived(size / 100);
</script>

<!--
  The mooring (CN-10): a brass-ringed post standing in the lane over a dashed berth ring, so the
  berth reads on water. Non-solid: a crate drifts onto it and a unit's token draws above.
-->
<g transform="scale({k})" data-piece-art="canal-moor">
  <ellipse cx="50" cy="70" rx="32" ry="10" fill="none" stroke="var(--parchment)" stroke-width="9" opacity="0.8" />
  <ellipse cx="50" cy="70" rx="32" ry="10" fill="none" stroke="var(--m-brass-dark)" stroke-width="4" stroke-dasharray="9 5" />
  <rect x="42" y="20" width="16" height="52" rx="4" fill="var(--wood)" stroke="var(--parchment)" stroke-width="7" paint-order="stroke" />
  <rect x="42" y="20" width="16" height="52" rx="4" fill="var(--wood)" stroke="var(--ink)" stroke-width="3" />
  <path d="M42 36H58M42 52H58" stroke="var(--wood-deep)" stroke-width="2.5" />
  <circle cx="50" cy="22" r="11" fill="none" stroke="var(--parchment)" stroke-width="10" />
  <circle cx="50" cy="22" r="11" fill="none" stroke="var(--m-brass)" stroke-width="6" />
  <circle cx="50" cy="22" r="11" fill="none" stroke="var(--ink)" stroke-width="1.5" />
</g>
