<script lang="ts">
  interface Props {
    data: unknown;
    size: number;
    /** `address` draws the addressee tile instead of the source stamp. */
    address?: boolean;
  }

  let { data, size, address = false }: Props = $props();
  const k = $derived(size / 100);
  const pair = $derived(
    typeof data === 'object' && data !== null && 'pair' in data && typeof data.pair === 'string'
      ? data.pair.toUpperCase()
      : 'A',
  );
</script>

<!--
  A forwarding pair (IQ-15). The source stamp is a brass-edged stamp with an outgoing arrow; the
  address is an envelope window. Both carry the pair letter. The thread between them is drawn by
  the board's highlight layer (it needs both tiles).
-->
<g transform="scale({k})" data-piece-art={address ? 'inkQuarter:address' : 'inkQuarter:forward'} data-pair={pair}>
  {#if address}
    <rect x="14" y="24" width="72" height="52" rx="5" fill="var(--parchment)" fill-opacity="0.75" />
    <rect x="14" y="24" width="72" height="52" rx="5" fill="none" stroke="var(--m-brass)" stroke-width="5" />
    <path d="M14 28l36 24 36-24" fill="none" stroke="var(--m-brass)" stroke-width="3" stroke-linejoin="round" />
    <circle cx="50" cy="60" r="11" fill="var(--m-brass)" stroke="var(--ink)" stroke-width="3" />
    <text x="50" y="65.5" text-anchor="middle" font-size="15" font-weight="bold" fill="var(--ink)" font-family="var(--mono)">{pair}</text>
  {:else}
    <rect x="14" y="14" width="72" height="72" rx="8" fill="var(--parchment)" fill-opacity="0.6" />
    <rect x="14" y="14" width="72" height="72" rx="8" fill="none" stroke="var(--m-brass)" stroke-width="6" />
    <path d="M26 56h32" stroke="var(--ink)" stroke-width="7" stroke-linecap="round" />
    <path d="M54 40l20 16-20 16z" fill="var(--ink)" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round" />
    <circle cx="30" cy="30" r="11" fill="var(--m-brass)" stroke="var(--ink)" stroke-width="3" />
    <text x="30" y="35.5" text-anchor="middle" font-size="15" font-weight="bold" fill="var(--ink)" font-family="var(--mono)">{pair}</text>
  {/if}
</g>
