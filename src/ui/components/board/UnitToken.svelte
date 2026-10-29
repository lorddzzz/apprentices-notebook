<script lang="ts">
  import { fade } from 'svelte/transition';
  import { APPRENTICES, ENEMIES } from '$data';
  import type { UnitView } from '../../../app/view';
  import { CrateToken } from '../../districts/canals';
  import ApprenticeToken from '../common/ApprenticeToken.svelte';
  import { runePath } from './art';
  import { CELL } from './geometry';

  interface Props {
    unit: UnitView;
    selected: boolean;
    dim: boolean;
  }

  let { unit, selected, dim }: Props = $props();

  const glyph = $derived(
    unit.kind === 'member'
      ? APPRENTICES[unit.def as keyof typeof APPRENTICES].token
      : ENEMIES[unit.def as keyof typeof ENEMIES].token,
  );
  const apprentice = $derived(unit.kind === 'member' ? APPRENTICES[unit.def as keyof typeof APPRENTICES] : null);
  const pipText = $derived(unit.maxHp > 8);
  const pipX = $derived(50 - (unit.maxHp * 11 - 3) / 2);
  const CY = 42;
  // A shackle is a chain of brass links round the token; a bound mark shows the action it holds.
  const LINKS = Array.from({ length: 12 }, (_, i) => i);
  const heldArt = $derived(runePath(unit.bound));
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

  {#if apprentice}
    <ApprenticeToken def={apprentice} size="board" x={0} y={CY - 50} />
  {:else if unit.def === 'rat'}
    <circle cx="50" cy={CY} r="27" fill="var(--enemy)" />
    <text x="50" y={CY + 11} text-anchor="middle" font-size="34" fill="var(--parchment)" font-family="Georgia, serif">{glyph}</text>
  {:else if unit.def === 'sentry'}
    <rect x="18" y={CY - 32} width="64" height="64" rx="10" fill="var(--m-brass)" stroke="var(--m-brass-dark)" stroke-width="6" />
    <text x="50" y={CY + 11} text-anchor="middle" font-size="34" font-weight="bold" fill="var(--m-brass-dark)" font-family="Georgia, serif">{glyph}</text>
  {:else if unit.def === 'familiar'}
    <path d="M50 {CY - 32} 82 {CY} 50 {CY + 32} 18 {CY}z" fill="var(--enemy)" stroke="var(--m-ink)" stroke-width="3" stroke-linejoin="round" />
    <text x="50" y={CY + 10} text-anchor="middle" font-size="30" fill="var(--parchment)" font-family="Georgia, serif">{glyph}</text>
  {:else if unit.def === 'barge'}
    <CrateToken moored={unit.moored === true} />
  {:else if unit.def === 'eel'}
    <path d="M14 {CY + 6}q9-26 18-6t18 0 18-6 14 4q-6 22-18 14t-18 0-18 6z" fill="var(--m-ink)" stroke="var(--parchment)" stroke-width="3" stroke-linejoin="round" />
    <circle cx="78" cy={CY - 2} r="3.5" fill="var(--parchment)" />
    <text x="40" y={CY + 20} text-anchor="middle" font-size="22" fill="var(--parchment)" font-family="Georgia, serif">{glyph}</text>
  {:else if unit.def === 'snuffer'}
    <path d="M50 {CY - 34} 80 {CY + 30} H20z" fill="var(--enemy)" stroke="var(--ink-soft)" stroke-width="4" stroke-linejoin="round" />
    <circle cx="50" cy={CY - 34} r="6" fill="var(--parchment-deep)" stroke="var(--ink)" stroke-width="2" />
    <text x="50" y={CY + 20} text-anchor="middle" font-size="32" fill="var(--parchment)" font-family="Georgia, serif">{glyph}</text>
  {:else if unit.def === 'moth'}
    <path d="M50 {CY} 20 {CY - 24}Q10 {CY + 6} 50 {CY + 18}Q90 {CY + 6} 80 {CY - 24}z" fill="var(--lamp)" stroke="var(--ink)" stroke-width="4" stroke-linejoin="round" />
    <circle cx="50" cy={CY + 2} r="8" fill="var(--ink)" />
    <text x="50" y={CY + 11} text-anchor="middle" font-size="22" font-weight="bold" fill="var(--lamp)" font-family="Georgia, serif">{glyph}</text>
  {:else if unit.def === 'mother'}
    <circle cx="50" cy={CY} r="40" fill="var(--lamp)" opacity="0.35" class="glow" />
    <circle cx="50" cy={CY} r="31" fill="var(--lamp)" stroke="var(--ink)" stroke-width="6" />
    <path d="M50 {CY - 31}V{CY + 31}M19 {CY}H81" stroke="var(--ink)" stroke-width="3" opacity="0.55" />
    <circle cx="50" cy={CY} r="15" fill="var(--parchment)" stroke="var(--ink)" stroke-width="3" />
    <text x="50" y={CY + 9} text-anchor="middle" font-size="24" font-weight="bold" fill="var(--ink)" font-family="Georgia, serif">{glyph}</text>
  {:else}
    <g stroke="var(--ink-soft)" stroke-width="9" stroke-linecap="round">
      <path d="M50 {CY - 26}V{CY + 26}M30 {CY - 8}H70" />
    </g>
    <path d="M50 {CY - 26}V{CY + 26}M30 {CY - 8}H70" stroke="var(--parchment-deep)" stroke-width="3" stroke-linecap="round" />
  {/if}

  {#if unit.collar && unit.def !== 'sentry'}
    <circle cx="50" cy={CY} r="37" fill="none" stroke="var(--m-brass)" stroke-width="5" data-trait="collar" />
  {/if}

  {#if unit.shackle}
    <g data-trait="shackle">
      {#each LINKS as i (i)}
        <rect
          x={i % 2 === 0 ? -8 : -4}
          y={i % 2 === 0 ? -42 - 3.5 : -42 - 6}
          width={i % 2 === 0 ? 16 : 8}
          height={i % 2 === 0 ? 7 : 12}
          rx="3.5"
          fill="none"
          stroke="var(--m-brass-dark)"
          stroke-width="3.5"
          transform="translate(50 {CY}) rotate({i * 30})"
        />
      {/each}
    </g>
  {/if}

  {#if unit.held}
    <g data-trait="held" transform="translate(70 4)">
      <rect x="0" y="9" width="22" height="16" rx="3" fill="var(--ink-soft)" stroke="var(--parchment)" stroke-width="2" />
      <path d="M4 9V6a7 7 0 0 1 14 0v3" fill="none" stroke="var(--ink-soft)" stroke-width="4" />
    </g>
  {/if}

  {#if unit.stunned}
    <g data-trait="stunned" fill="var(--lamp)" stroke="var(--ink)" stroke-width="1.5">
      <circle cx="34" cy="6" r="5" />
      <circle cx="50" cy="2" r="5" />
      <circle cx="66" cy="6" r="5" />
    </g>
  {/if}

  {#if unit.mark}
    <g data-trait={unit.mark === 'deep' ? 'deep-mark' : 'mark'}>
      {#if unit.mark === 'deep'}
        <path
          d="M70 40c-4 5-6 7.5-6 11a6 6 0 0 0 12 0c0-3.5-2-6-6-11z"
          fill="var(--m-ink)"
          stroke="var(--parchment)"
          stroke-width="2.5"
        />
      {/if}
      {#if unit.bound}
        <g data-trait="bound" data-bound={unit.bound}>
          <path
            d="M84 24c-8 10-13 15-13 22.5a13 13 0 0 0 26 0c0-7.5-5-12.5-13-22.5z"
            fill="var(--m-ink)"
            stroke="var(--parchment)"
            stroke-width="3"
          />
          {#if heldArt}
            <g transform="translate(75 36) scale(0.75)">
              <path d={heldArt} fill="none" stroke="var(--parchment)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
            </g>
          {:else}
            <circle cx="84" cy="46" r="4" fill="var(--parchment)" />
          {/if}
        </g>
      {:else}
        <path
          d="M84 30c-5 7-8 10-8 14.5a8 8 0 0 0 16 0c0-4.5-3-7.5-8-14.5z"
          fill="var(--m-ink)"
          stroke="var(--parchment)"
          stroke-width="2.5"
        />
      {/if}
    </g>
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
    <text x="50" y="91" text-anchor="middle" font-size="20" fill="var(--ink)" font-family="var(--mono)">{unit.hp}/{unit.maxHp}</text>
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
  .glow {
    animation: glow 1.4s ease-in-out infinite alternate;
  }
  @media (prefers-reduced-motion: reduce) {
    .glow {
      animation: none;
    }
  }
  @keyframes glow {
    from {
      opacity: 0.55;
    }
    to {
      opacity: 1;
    }
  }
  .unit {
    transition: transform 220ms ease;
    pointer-events: none;
  }
</style>
