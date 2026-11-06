<script lang="ts">
  interface Props {
    data: unknown;
    size: number;
  }

  let { size }: Props = $props();
  const k = $derived(size / 100);
</script>

<!--
  A pier (BR-14): the footing a span stands on. A dark masonry block with a capstone and a base
  plinth, drawn heavier than a span slab so "this one holds" reads before any other detail. It
  never wears.
-->
<g transform="scale({k})" data-piece-art="bridges:pier">
  <rect x="4" y="6" width="92" height="88" rx="6" fill="var(--ink-soft)" stroke="var(--ink)" stroke-width="4" />
  <rect x="12" y="14" width="76" height="22" rx="3" fill="var(--parchment-deep)" stroke="var(--ink)" stroke-width="2.5" />
  <path d="M12 52H88M12 72H88M38 36V52M64 36V52M26 52V72M52 52V72M76 52V72M38 72V90M64 72V90" stroke="var(--parchment)" stroke-width="2.5" opacity="0.55" />
  <path d="M14 86H86" stroke="var(--ink)" stroke-width="5" stroke-linecap="round" />
</g>
