<script lang="ts">
  import { fade } from 'svelte/transition';
  import { ENEMIES, MEMBERS } from '$data';
  import type { UnitView } from '../../../app/view';
  import { CELL } from './geometry';

  interface Props {
    unit: UnitView;
    selected: boolean;
    dim: boolean;
  }

  let { unit, selected, dim }: Props = $props();

  const glyph = $derived(
    unit.kind === 'member'
      ? MEMBERS[unit.def as keyof typeof MEMBERS].token
      : ENEMIES[unit.def as keyof typeof ENEMIES].token,
  );
  const memberColor = $derived(`var(--member-${unit.def})`);
  const pipText = $derived(unit.maxHp > 8);
  const pipX = $derived(50 - (unit.maxHp * 11 - 3) / 2);
  const CY = 42;
</script>

<g
  class="unit"
  style:opacity={dim ? 0.4 : undefined}
  style="transform: translate({unit.pos.x * CELL}px, {unit.pos.y * CELL}px)"
  out:fade={{ duration: 220 }}
>
  {#if selected}
    <circle cx="50" cy={CY} r="44" fill="var(--select)" opacity="0.4" />
    <circle cx="50" cy={CY} r="42" fill="none" stroke="var(--select)" stroke-width="5" />
  {/if}

  {#if unit.kind === 'member'}
    <circle cx="50" cy={CY} r="32" fill="var(--parchment)" stroke={memberColor} stroke-width="7" />
    <text x="50" y={CY + 13} text-anchor="middle" font-size="38" font-weight="bold" fill={memberColor} font-family="Georgia, serif">{glyph}</text>
  {:else if unit.def === 'rat'}
    <circle cx="50" cy={CY} r="27" fill="var(--enemy)" />
    <text x="50" y={CY + 11} text-anchor="middle" font-size="34" fill="var(--parchment)" font-family="Georgia, serif">{glyph}</text>
  {:else if unit.def === 'sentry'}
    <rect x="18" y={CY - 32} width="64" height="64" rx="10" fill="var(--m-brass)" stroke="var(--m-brass-dark)" stroke-width="6" />
    <text x="50" y={CY + 11} text-anchor="middle" font-size="34" font-weight="bold" fill="var(--m-brass-dark)" font-family="Georgia, serif">{glyph}</text>
  {:else if unit.def === 'familiar'}
    <path d="M50 {CY - 32} 82 {CY} 50 {CY + 32} 18 {CY}z" fill="var(--enemy)" stroke="var(--m-ink)" stroke-width="3" stroke-linejoin="round" />
    <text x="50" y={CY + 10} text-anchor="middle" font-size="30" fill="var(--parchment)" font-family="Georgia, serif">{glyph}</text>
  {:else}
    <g stroke="var(--ink-soft)" stroke-width="9" stroke-linecap="round">
      <path d="M50 {CY - 26}V{CY + 26}M30 {CY - 8}H70" />
    </g>
    <path d="M50 {CY - 26}V{CY + 26}M30 {CY - 8}H70" stroke="var(--parchment-deep)" stroke-width="3" stroke-linecap="round" />
  {/if}

  {#if unit.brass && unit.def !== 'sentry'}
    <circle cx="50" cy={CY} r="37" fill="none" stroke="var(--m-brass)" stroke-width="5" />
  {/if}

  {#if unit.inked}
    <path
      d="M84 30c-5 7-8 10-8 14.5a8 8 0 0 0 16 0c0-4.5-3-7.5-8-14.5z"
      fill="var(--m-ink)"
      stroke="var(--parchment)"
      stroke-width="2.5"
    />
  {/if}

  {#if unit.shield > 0}
    <g>
      <path
        d="M6 6h28v16c0 10-6 15-14 19C12 37 6 32 6 22z"
        fill="var(--shield)"
        stroke="var(--ink)"
        stroke-width="2.5"
        stroke-linejoin="round"
      />
      <text x="20" y="30" text-anchor="middle" font-size="24" font-weight="bold" fill="#fff" font-family="var(--mono)">{unit.shield}</text>
    </g>
  {/if}

  {#if pipText}
    <text x="50" y="94" text-anchor="middle" font-size="22" fill="var(--ink)" font-family="var(--mono)">{unit.hp}/{unit.maxHp}</text>
  {:else}
    {#each { length: unit.maxHp } as _, i (i)}
      <rect
        x={pipX + i * 11}
        y="82"
        width="8"
        height="13"
        rx="1.5"
        fill={i < unit.hp ? 'var(--ink)' : 'var(--parchment)'}
        stroke="var(--ink)"
        stroke-width="2"
      />
    {/each}
  {/if}
</g>

<style>
  .unit {
    transition: transform 220ms ease;
    pointer-events: none;
  }
</style>
