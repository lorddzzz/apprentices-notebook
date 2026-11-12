<script lang="ts">
  import { isTone, type Tone } from '$data/districts/foundry';
  import type { UnitArtProps } from '..';
  import { clapperToneOfId } from './state';
  import { TONE_LOOK } from './tones';

  let { unit, glyph, view }: UnitArtProps = $props();

  const CY = 42;
  // The rope a Ringer stands on gives its tone; a Clapper's comes from its number.
  const ropeTone = $derived.by((): Tone => {
    const piece = view.tiles[unit.pos.y * view.width + unit.pos.x]?.piece;
    const tone = (piece?.data as { tone?: unknown } | null | undefined)?.tone;
    return piece?.id === 'foundry:rope' && isTone(tone) ? tone : 'low';
  });
  const tone = $derived(unit.def === 'clapper' ? clapperToneOfId(unit.id) : ropeTone);
  const look = $derived(TONE_LOOK[tone]);
</script>

<!--
  The ringers' staff (BF-17): the Ringer hauls a rope (its tuft in the rope's tone, so you can see
  which bells it will pull), the Detuner carries a tuning fork, the Clapper is a walking bell in
  its own tone. Hit pips and traits are drawn by UnitToken.
-->
{#if unit.def === 'ringer'}
  <g data-unit="ringer" data-tone={tone}>
    <path d="M50 {CY - 40}V{CY - 6}" stroke="var(--parchment)" stroke-width="9" stroke-linecap="round" />
    <path d="M50 {CY - 40}V{CY - 6}" stroke="var(--ink)" stroke-width="4" stroke-linecap="round" stroke-dasharray="5 3" />
    <rect x="38" y={CY - 12} width="24" height="12" rx="5" fill={look.fill} stroke="var(--parchment)" stroke-width="4" paint-order="stroke" />
    <path d="M26 {CY + 30}L34 {CY - 2}H66L74 {CY + 30}z" fill="var(--enemy)" stroke="var(--parchment)" stroke-width="6" stroke-linejoin="round" paint-order="stroke" />
    <path d="M26 {CY + 30}L34 {CY - 2}H66L74 {CY + 30}z" fill="none" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round" />
    <path d="M34 {CY + 4}L24 {CY - 22}M66 {CY + 4}L76 {CY - 22}" stroke="var(--ink)" stroke-width="5" stroke-linecap="round" />
    <text x="50" y={CY + 22} text-anchor="middle" font-size="22" font-weight="bold" fill="var(--parchment)" font-family="Georgia, serif">{glyph}</text>
  </g>
{:else if unit.def === 'detuner'}
  <g data-unit="detuner">
    <path d="M22 {CY + 30}Q22 {CY - 6} 50 {CY - 6}Q78 {CY - 6} 78 {CY + 30}z" fill="var(--enemy)" stroke="var(--parchment)" stroke-width="6" stroke-linejoin="round" paint-order="stroke" />
    <path d="M22 {CY + 30}Q22 {CY - 6} 50 {CY - 6}Q78 {CY - 6} 78 {CY + 30}z" fill="none" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round" />
    <path d="M70 {CY - 40}V{CY - 16}M82 {CY - 40}V{CY - 16}M70 {CY - 16}Q76 {CY - 8} 82 {CY - 16}M76 {CY - 8}V{CY + 4}" fill="none" stroke="var(--parchment)" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M70 {CY - 40}V{CY - 16}M82 {CY - 40}V{CY - 16}M70 {CY - 16}Q76 {CY - 8} 82 {CY - 16}M76 {CY - 8}V{CY + 4}" fill="none" stroke="var(--m-brass)" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" />
    <circle cx="44" cy={CY - 14} r="10" fill="var(--enemy)" stroke="var(--ink)" stroke-width="2.5" />
    <text x="48" y={CY + 20} text-anchor="middle" font-size="22" font-weight="bold" fill="var(--parchment)" font-family="Georgia, serif">{glyph}</text>
  </g>
{:else}
  <g data-unit="clapper" data-tone={tone}>
    <path d="M34 {CY + 34}V{CY + 44}M66 {CY + 34}V{CY + 44}" stroke="var(--ink)" stroke-width="6" stroke-linecap="round" />
    <path d="M50 {CY - 40}C60 {CY - 40} 64 {CY - 32} 64 {CY - 24}C64 {CY - 6} 74 {CY + 4} 78 {CY + 30}H22C26 {CY + 4} 36 {CY - 6} 36 {CY - 24}C36 {CY - 32} 40 {CY - 40} 50 {CY - 40}Z" fill={look.fill} stroke="var(--parchment)" stroke-width="7" stroke-linejoin="round" paint-order="stroke" />
    <path d="M50 {CY - 40}C60 {CY - 40} 64 {CY - 32} 64 {CY - 24}C64 {CY - 6} 74 {CY + 4} 78 {CY + 30}H22C26 {CY + 4} 36 {CY - 6} 36 {CY - 24}C36 {CY - 32} 40 {CY - 40} 50 {CY - 40}Z" fill="none" stroke="var(--ink)" stroke-width="3.5" stroke-linejoin="round" />
    <circle cx="50" cy={CY + 36} r="6" fill="var(--ink)" />
    <text x="50" y={CY + 14} text-anchor="middle" font-size="24" font-weight="bold" fill={look.mark} font-family="Georgia, serif">{glyph}</text>
    {#each Array.from({ length: look.pips }, (_, i) => i) as i (i)}
      <circle cx={50 + (i - (look.pips - 1) / 2) * 11} cy={CY - 24} r="3.6" fill={look.mark} />
    {/each}
  </g>
{/if}
