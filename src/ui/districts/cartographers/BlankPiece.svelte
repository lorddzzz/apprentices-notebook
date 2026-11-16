<script lang="ts">
  import { tornEdge } from './look';

  interface Props {
    data: unknown;
    size: number;
  }

  let { size }: Props = $props();
  const k = $derived(size / 100);
  const EDGE = tornEdge(6);
</script>

<!--
  Blank paper (CG-12): no tile at all. A bare page, whiter than the floor, with a hand-torn edge and
  a shadow cast inside the tear. It holds nothing and nobody can stand on it.
-->
<g transform="scale({k})" data-piece-art="cartographers:blank">
  <rect width="100" height="100" fill="var(--ink)" opacity="0.5" />
  <path d={EDGE} fill="none" stroke="var(--ink)" stroke-width="12" stroke-linejoin="round" opacity="0.55" />
  <path d={EDGE} fill="#fbf7ea" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round" />
  <path d="M30 70H70M34 56H66M30 42H70" stroke="#d9cfb4" stroke-width="2" stroke-linecap="round" />
  <path d={EDGE} fill="none" stroke="var(--parchment)" stroke-width="3" stroke-dasharray="2 7" transform="translate(50 50) scale(0.86) translate(-50 -50)" opacity="0.9" />
</g>
