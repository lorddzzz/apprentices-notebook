<script lang="ts">
  import { DEFAULT_HANG, isNote, isTone } from '$data/districts/foundry';
  import BellPiece from './BellPiece.svelte';

  interface Props {
    data: unknown;
    size: number;
  }

  let { data, size }: Props = $props();
  const k = $derived(size / 100);
  const d = $derived((data ?? {}) as Record<string, unknown>);
  const note = $derived(isNote(d.note) ? d.note : 1);
  const hang = $derived(isTone(d.hang) ? d.hang : DEFAULT_HANG[note]);
  const allied = $derived(d.allied === true);
  const rung = $derived(d.rung === true);
  const hum = $derived(d.hum === true);
</script>

<!--
  A great bell (BF-18): a bell of its hang tone drawn large, with its note numbered below. A hung
  bell (yours, after its room was rung) is held by a gold crossbeam and chains; one still to be
  rung wears a plain iron ring; a rung one a gold rim.
-->
<g transform="scale({k})" data-piece-art="foundry:greatBell" data-note={note} data-allied={allied} data-rung={rung} data-tone={hang}>
  {#if allied}
    <path d="M12 8H88" stroke="#f1e6cc" stroke-width="12" stroke-linecap="round" />
    <path d="M12 8H88" stroke="var(--m-brass)" stroke-width="7" stroke-linecap="round" />
    <path d="M34 8L42 24M66 8L58 24" stroke="var(--ink)" stroke-width="4" stroke-linecap="round" />
  {/if}
  <g transform="translate(50 50) scale(0.92) translate(-50 -50)">
    <BellPiece data={{ tone: hang, hum }} size={100} />
  </g>
  {#if rung}
    <circle cx="50" cy="50" r="48" fill="none" stroke="#f1e6cc" stroke-width="7" />
    <circle cx="50" cy="50" r="48" fill="none" stroke="var(--m-brass)" stroke-width="4" />
  {/if}
  <circle cx="82" cy="82" r="13" fill="var(--parchment)" stroke="var(--ink)" stroke-width="3.5" />
  <text x="82" y="89" text-anchor="middle" font-size="20" font-weight="bold" fill="var(--ink)" font-family="Georgia, serif">{note}</text>
</g>
