<script lang="ts">
  interface Props {
    /** The foe's def id: deadLetter, sorter, sealer, clockSeal or letter. */
    def: string;
    glyph: string;
  }

  let { def, glyph }: Props = $props();
  const CY = 42;
</script>

<!--
  The postal staff's tokens (IQ-16), drawn in a 100-wide cell like the other unit tokens. One shape
  each so they read apart at a glance: a folded envelope (dead letter, flies), a clerk's stamp
  (Sorter), a wax stick over a seal (Sealer), the postmaster's wax seal (clock seal) and a
  sealed letter (the threshold's, inert). Hit pips and traits are drawn by UnitToken.
-->
{#if def === 'deadLetter'}
  <g data-unit="dead-letter" class="flutter">
    <path d="M22 {CY - 18}H78V{CY + 18}H22z" fill="var(--parchment)" stroke="var(--parchment)" stroke-width="10" stroke-linejoin="round" />
    <path d="M22 {CY - 18}H78V{CY + 18}H22z" fill="var(--parchment-dark)" stroke="var(--ink)" stroke-width="4" stroke-linejoin="round" />
    <path d="M22 {CY - 18}L50 {CY + 4}L78 {CY - 18}M22 {CY + 18}L42 {CY - 2}M78 {CY + 18}L58 {CY - 2}" fill="none" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round" />
    <circle cx="50" cy={CY + 5} r="6" fill="var(--danger)" stroke="var(--ink)" stroke-width="2" />
    <path d="M14 {CY - 8}Q8 {CY - 18} 14 {CY - 26}M86 {CY - 8}Q92 {CY - 18} 86 {CY - 26}" fill="none" stroke="var(--ink-soft)" stroke-width="3" stroke-linecap="round" />
  </g>
{:else if def === 'sorter'}
  <g data-unit="sorter">
    <rect x="26" y={CY - 6} width="48" height="26" rx="5" fill="var(--enemy)" stroke="var(--parchment)" stroke-width="6" paint-order="stroke" />
    <rect x="38" y={CY - 34} width="24" height="30" rx="5" fill="var(--m-brass)" stroke="var(--parchment)" stroke-width="6" paint-order="stroke" />
    <rect x="38" y={CY - 34} width="24" height="30" rx="5" fill="var(--m-brass)" stroke="var(--ink)" stroke-width="3" />
    <path d="M30 {CY + 8}H70" stroke="var(--parchment)" stroke-width="3" stroke-linecap="round" />
    <text x="50" y={CY + 17} text-anchor="middle" font-size="22" fill="var(--parchment)" font-family="Georgia, serif">{glyph}</text>
  </g>
{:else if def === 'sealer'}
  <g data-unit="sealer">
    <circle cx="50" cy={CY + 4} r="27" fill="var(--enemy)" stroke="var(--parchment)" stroke-width="6" paint-order="stroke" />
    <path d="M62 {CY - 36}L82 {CY - 16}L74 {CY - 8}L54 {CY - 28}z" fill="var(--danger)" stroke="var(--parchment)" stroke-width="5" stroke-linejoin="round" paint-order="stroke" />
    <path d="M62 {CY - 36}L82 {CY - 16}L74 {CY - 8}L54 {CY - 28}z" fill="var(--danger)" stroke="var(--ink)" stroke-width="2.5" stroke-linejoin="round" />
    <circle cx="50" cy={CY + 4} r="12" fill="var(--danger)" stroke="var(--parchment)" stroke-width="3" />
    <text x="50" y={CY + 11} text-anchor="middle" font-size="18" fill="var(--parchment)" font-family="Georgia, serif">{glyph}</text>
  </g>
{:else if def === 'clockSeal'}
  <g data-unit="clock-seal">
    <path d="M50 {CY - 32}l9 5 11-1 4 10 9 6-3 10 3 10-9 6-4 10-11-1-9 5-9-5-11 1-4-10-9-6 3-10-3-10 9-6 4-10 11 1z" fill="var(--danger)" stroke="var(--parchment)" stroke-width="7" stroke-linejoin="round" paint-order="stroke" />
    <path d="M50 {CY - 32}l9 5 11-1 4 10 9 6-3 10 3 10-9 6-4 10-11-1-9 5-9-5-11 1-4-10-9-6 3-10-3-10 9-6 4-10 11 1z" fill="none" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round" />
    <circle cx="50" cy={CY + 6} r="17" fill="none" stroke="var(--parchment)" stroke-width="3" />
    <path d="M50 {CY + 6}V{CY - 5}M50 {CY + 6}L58 {CY + 10}" stroke="var(--parchment)" stroke-width="3.5" stroke-linecap="round" />
  </g>
{:else}
  <g data-unit="letter">
    <rect x="20" y={CY - 22} width="60" height="46" rx="4" fill="var(--parchment)" stroke="var(--parchment)" stroke-width="10" stroke-linejoin="round" />
    <rect x="20" y={CY - 22} width="60" height="46" rx="4" fill="var(--parchment-dark)" stroke="var(--ink)" stroke-width="4" />
    <path d="M20 {CY - 22}L50 {CY + 2}L80 {CY - 22}" fill="none" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round" />
    <circle cx="50" cy={CY + 3} r="8" fill="var(--danger)" stroke="var(--ink)" stroke-width="2" />
    <path d="M30 {CY + 16}H48M56 {CY + 16}H70" stroke="var(--ink-soft)" stroke-width="2.5" stroke-linecap="round" />
  </g>
{/if}

<style>
  .flutter {
    animation: flutter 1.6s ease-in-out infinite alternate;
  }
  @keyframes flutter {
    to {
      transform: translateY(-3px) rotate(2deg);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .flutter {
      animation: none;
    }
  }
</style>
