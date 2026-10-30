<script lang="ts">
  interface Props {
    data: unknown;
    size: number;
  }

  let { size }: Props = $props();
  const k = $derived(size / 100);
</script>

<!--
  The postmaster's stamp (IQ-15): a red clock-face stamp. An apprentice landing on it answers the
  writ. The rounds left are drawn over it by the highlight layer while the writ is open.
-->
<g transform="scale({k})" data-piece-art="inkQuarter:clockStamp">
  <circle cx="50" cy="50" r="40" fill="var(--parchment)" fill-opacity="0.6" />
  <circle cx="50" cy="50" r="40" fill="none" stroke="var(--danger)" stroke-width="6" />
  <path d="M50 14v8M50 78v8M14 50h8M78 50h8" stroke="var(--danger)" stroke-width="4" stroke-linecap="round" />
  <path d="M50 50V30M50 50l14 8" fill="none" stroke="var(--ink)" stroke-width="5" stroke-linecap="round" />
  <circle cx="50" cy="50" r="4" fill="var(--ink)" />
</g>
