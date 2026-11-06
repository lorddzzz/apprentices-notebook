<script lang="ts">
  interface Props {
    /** The foe's def id: warden, gargoyle or mason. */
    def: string;
    glyph: string;
  }

  let { def, glyph }: Props = $props();
  const CY = 42;
</script>

<!--
  The bridge-wardens' staff, drawn in a 100-wide cell like the other unit tokens, one silhouette
  each: the Warden's peaked cap over a chalk stick, the Gargoyle's winged crouch (it flies, so its
  shadow floats under it), the Mason's trowel and hod. Hit pips and traits are drawn by UnitToken.
-->
{#if def === 'warden'}
  <g data-unit="warden">
    <path d="M24 {CY + 30}Q24 {CY - 6} 50 {CY - 6}Q76 {CY - 6} 76 {CY + 30}z" fill="var(--enemy)" stroke="var(--parchment)" stroke-width="6" stroke-linejoin="round" paint-order="stroke" />
    <path d="M26 {CY - 12}H74L64 {CY - 30}H36z" fill="var(--m-ink)" stroke="var(--parchment)" stroke-width="5" stroke-linejoin="round" paint-order="stroke" />
    <path d="M26 {CY - 12}H74" stroke="var(--m-brass)" stroke-width="5" stroke-linecap="round" />
    <rect x="76" y={CY - 6} width="7" height="32" rx="3" fill="var(--parchment)" stroke="var(--ink)" stroke-width="2.5" transform="rotate(14 80 {CY + 10})" />
    <text x="50" y={CY + 22} text-anchor="middle" font-size="24" font-weight="bold" fill="var(--parchment)" font-family="Georgia, serif">{glyph}</text>
  </g>
{:else if def === 'gargoyle'}
  <g data-unit="gargoyle">
    <ellipse cx="50" cy={CY + 32} rx="22" ry="6" fill="var(--ink)" opacity="0.25" />
    <path d="M50 {CY - 6}L8 {CY - 26}Q16 {CY + 8} 40 {CY + 14}z" fill="var(--ink-soft)" stroke="var(--parchment)" stroke-width="5" stroke-linejoin="round" paint-order="stroke" />
    <path d="M50 {CY - 6}L92 {CY - 26}Q84 {CY + 8} 60 {CY + 14}z" fill="var(--ink-soft)" stroke="var(--parchment)" stroke-width="5" stroke-linejoin="round" paint-order="stroke" />
    <path d="M36 {CY - 28}L40 {CY - 40}L46 {CY - 30}M64 {CY - 28}L60 {CY - 40}L54 {CY - 30}" fill="var(--enemy)" stroke="var(--enemy)" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" />
    <path d="M34 {CY + 26}Q32 {CY - 30} 50 {CY - 30}Q68 {CY - 30} 66 {CY + 26}z" fill="var(--enemy)" stroke="var(--parchment)" stroke-width="5" stroke-linejoin="round" paint-order="stroke" />
    <text x="50" y={CY + 14} text-anchor="middle" font-size="26" font-weight="bold" fill="var(--parchment)" font-family="Georgia, serif">{glyph}</text>
  </g>
{:else}
  <g data-unit="mason">
    <rect x="22" y={CY - 2} width="46" height="32" rx="5" fill="var(--wood)" stroke="var(--parchment)" stroke-width="5" paint-order="stroke" />
    <path d="M22 {CY + 10}H68M22 {CY + 20}H68" stroke="var(--wood-dark)" stroke-width="2.5" />
    <circle cx="45" cy={CY - 20} r="12" fill="var(--enemy)" stroke="var(--parchment)" stroke-width="5" paint-order="stroke" />
    <path d="M30 {CY - 24}H60" stroke="var(--parchment-deep)" stroke-width="5" stroke-linecap="round" />
    <path d="M70 {CY + 22}L84 {CY - 12}L92 {CY - 8}L80 {CY + 26}z" fill="var(--m-steam)" stroke="var(--ink)" stroke-width="2.5" stroke-linejoin="round" />
    <path d="M72 {CY + 26}L68 {CY + 36}" stroke="var(--wood)" stroke-width="6" stroke-linecap="round" />
    <text x="45" y={CY + 20} text-anchor="middle" font-size="22" font-weight="bold" fill="var(--parchment)" font-family="Georgia, serif">{glyph}</text>
  </g>
{/if}
