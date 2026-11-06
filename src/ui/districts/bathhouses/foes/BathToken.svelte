<script lang="ts">
  interface Props {
    /** The foe's def id: dissolvedBather, attendant, boilerman or bathSteward. */
    def: string;
    glyph: string;
    /** The foe stands in a cloud and is steam: only a burst of the cloud hurts it (P8). */
    dissolved?: boolean;
  }

  let { def, glyph, dissolved = false }: Props = $props();
  const CY = 42;
</script>

<!--
  The thermae's staff and bathers, drawn in a 100-wide cell like the other unit tokens. One shape
  each so they read apart at a glance: a towelled bather (a rounded head over a wrapped towel),
  the attendant's white coat with a shoving palm, the boilerman's stoke-pot with its flame, and the
  Bath-Steward's cloud-crowned bust. A dissolved bather is drawn as steam: a pale, dashed outline
  with wisps rising, fading under its glyph, so the board says "it passes through" before you tap.
  Hit pips and traits are drawn by UnitToken.
-->
{#if def === 'dissolvedBather'}
  <g data-unit="bather" data-dissolved={dissolved ? 'true' : 'false'}>
    {#if dissolved}
      <g class="drift" opacity="0.8">
        <ellipse cx="50" cy={CY + 4} rx="30" ry="28" fill="var(--parchment)" opacity="0.45" />
        <ellipse cx="50" cy={CY + 4} rx="30" ry="28" fill="none" stroke="var(--m-ink)" stroke-width="3" stroke-dasharray="5 6" stroke-linecap="round" />
        <path d="M34 {CY - 22}q-6-9 0-16M50 {CY - 28}q-6-10 0-18M66 {CY - 22}q-6-9 0-16" fill="none" stroke="var(--parchment)" stroke-width="5" stroke-linecap="round" opacity="0.9" />
        <path d="M34 {CY - 22}q-6-9 0-16M50 {CY - 28}q-6-10 0-18M66 {CY - 22}q-6-9 0-16" fill="none" stroke="var(--ink-soft)" stroke-width="2" stroke-linecap="round" />
      </g>
      <text x="50" y={CY + 11} text-anchor="middle" font-size="30" fill="var(--ink)" opacity="0.7" font-family="Georgia, serif">{glyph}</text>
    {:else}
      <circle cx="50" cy={CY - 20} r="13" fill="var(--enemy)" stroke="var(--parchment)" stroke-width="5" paint-order="stroke" />
      <path d="M26 {CY + 30}V{CY - 2}Q26 {CY - 10} 36 {CY - 10}H64Q74 {CY - 10} 74 {CY - 2}V{CY + 30}z" fill="var(--parchment-dark)" stroke="var(--parchment)" stroke-width="6" stroke-linejoin="round" paint-order="stroke" />
      <path d="M26 {CY + 30}V{CY - 2}Q26 {CY - 10} 36 {CY - 10}H64Q74 {CY - 10} 74 {CY - 2}V{CY + 30}z" fill="none" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round" />
      <path d="M30 {CY + 4}H70M30 {CY + 14}H70" stroke="var(--enemy)" stroke-width="3" opacity="0.7" />
      <circle cx="50" cy={CY - 20} r="13" fill="var(--enemy)" />
      <text x="50" y={CY + 22} text-anchor="middle" font-size="22" font-weight="bold" fill="var(--ink)" font-family="Georgia, serif">{glyph}</text>
    {/if}
  </g>
{:else if def === 'attendant'}
  <g data-unit="attendant">
    <path d="M50 {CY - 34}L82 {CY + 28}H18z" fill="var(--parchment)" stroke="var(--parchment)" stroke-width="8" stroke-linejoin="round" />
    <path d="M50 {CY - 34}L82 {CY + 28}H18z" fill="var(--parchment-dark)" stroke="var(--ink)" stroke-width="3.5" stroke-linejoin="round" />
    <rect x="76" y={CY - 12} width="16" height="22" rx="5" fill="var(--enemy)" stroke="var(--parchment)" stroke-width="4" paint-order="stroke" />
    <path d="M80 {CY - 4}H88M80 {CY + 3}H88" stroke="var(--parchment)" stroke-width="2.5" stroke-linecap="round" />
    <circle cx="50" cy={CY - 20} r="8" fill="var(--enemy)" stroke="var(--ink)" stroke-width="2" />
    <text x="50" y={CY + 20} text-anchor="middle" font-size="26" font-weight="bold" fill="var(--ink)" font-family="Georgia, serif">{glyph}</text>
  </g>
{:else if def === 'boilerman'}
  <g data-unit="boilerman">
    <path d="M24 {CY - 6}H76V{CY + 14}Q76 {CY + 30} 50 {CY + 30}Q24 {CY + 30} 24 {CY + 14}z" fill="var(--m-ink)" stroke="var(--parchment)" stroke-width="6" stroke-linejoin="round" paint-order="stroke" />
    <rect x="20" y={CY - 12} width="60" height="10" rx="4" fill="var(--m-brass)" stroke="var(--ink)" stroke-width="2.5" />
    <path d="M50 {CY - 40}Q62 {CY - 28} 56 {CY - 16}Q52 {CY - 22} 50 {CY - 20}Q46 {CY - 14} 42 {CY - 18}Q40 {CY - 30} 50 {CY - 40}z" fill="var(--danger)" stroke="var(--parchment)" stroke-width="3" stroke-linejoin="round" paint-order="stroke" class="flicker" />
    <text x="50" y={CY + 20} text-anchor="middle" font-size="22" fill="var(--parchment)" font-family="Georgia, serif">{glyph}</text>
  </g>
{:else}
  <g data-unit="bath-steward">
    <circle cx="50" cy={CY - 2} r="32" fill="var(--parchment)" opacity="0.55" class="drift" />
    <circle cx="30" cy={CY - 22} r="12" fill="var(--parchment)" stroke="var(--ink-soft)" stroke-width="2.5" />
    <circle cx="50" cy={CY - 30} r="14" fill="var(--parchment)" stroke="var(--ink-soft)" stroke-width="2.5" />
    <circle cx="70" cy={CY - 22} r="12" fill="var(--parchment)" stroke="var(--ink-soft)" stroke-width="2.5" />
    <path d="M24 {CY + 30}Q26 {CY - 8} 50 {CY - 8}Q74 {CY - 8} 76 {CY + 30}z" fill="var(--enemy)" stroke="var(--parchment)" stroke-width="6" stroke-linejoin="round" paint-order="stroke" />
    <path d="M42 {CY - 8}L50 {CY + 4}L58 {CY - 8}" fill="none" stroke="var(--parchment)" stroke-width="3" stroke-linejoin="round" />
    <text x="50" y={CY + 22} text-anchor="middle" font-size="22" font-weight="bold" fill="var(--parchment)" font-family="Georgia, serif">{glyph}</text>
  </g>
{/if}

<style>
  .drift {
    animation: drift 2.4s ease-in-out infinite alternate;
  }
  .flicker {
    animation: flicker 0.9s ease-in-out infinite alternate;
    transform-origin: 50px 30px;
  }
  @keyframes drift {
    to {
      transform: translateY(-3px);
      opacity: 0.6;
    }
  }
  @keyframes flicker {
    to {
      transform: scale(1.08, 0.94);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .drift,
    .flicker {
      animation: none;
    }
  }
</style>
