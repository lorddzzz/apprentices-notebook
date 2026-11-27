<script lang="ts">
  import { prefersReducedMotion } from 'svelte/motion';
  import { motionScale, type PlaybackSpeed } from '../../../app/timing';
  import ArtImage from '../../art/ArtImage.svelte';
  import type { ArtId } from '../../art/registry';

  interface Props {
    beat: { kind: 'burst' | 'compound' | 'first'; name: string; first: boolean } | null;
    onspeedup: () => void;
    onskip: () => void;
    /** The playback speed: the card arrives faster as the hold shortens. */
    speed?: PlaybackSpeed;
  }

  let { beat, onspeedup, onskip, speed = 1 }: Props = $props();

  // Flourish ids (FT-D12). The compound flourish and the name flare are not shipped yet: the
  // registry answers null for them and the vector below is drawn.
  const FLOURISH: Record<'burst' | 'compound' | 'first', ArtId> = {
    burst: 'props/shared/flourish-burst',
    compound: 'props/shared/flourish-compound',
    first: 'props/shared/flourish-first-gold',
  };
  const FLARE: ArtId = 'props/shared/flourish-name-flare';
  const KIND = { burst: 'Burst', compound: 'Compound', first: 'First time' } as const;

  const flourish = $derived(beat ? FLOURISH[beat.first ? 'first' : beat.kind] : null);
  const kind = $derived(beat ? KIND[beat.first ? 'first' : beat.kind] : '');
  const arrive = $derived(Math.max(60, 140 * (motionScale() / speed)));
</script>

{#if beat}
  <div
    class="beat"
    class:gold={beat.first}
    class:reduced={prefersReducedMotion.current}
    data-testid="beat-card"
    data-kind={beat.kind}
    data-first={beat.first}
    style:--arrive="{arrive}ms"
  >
    <!-- Tap anywhere on the card is tap-faster; Skip jumps to the result. Nothing else is live. -->
    <button type="button" class="card" data-testid="beat-tap" onclick={onspeedup}>
      <span class="flourish" aria-hidden="true">
        {#if flourish}
          <ArtImage id={flourish} class="flourish-art">
            {#snippet fallback()}
              <svg class="vec" viewBox="0 0 240 40" width="100%" height="40" focusable="false">
                <title>Flourish</title>
                <path d="M6 20h92M142 20h92" />
                <path d="M120 4l16 16-16 16-16-16z" />
                {#if beat.kind === 'burst'}<path d="M120 0v8M120 32v8M100 20h-8M148 20h8" />{/if}
              </svg>
            {/snippet}
          </ArtImage>
        {/if}
      </span>
      <span class="kind">{kind}</span>
      <span class="name">
        {#if beat.first}
          <ArtImage id={FLARE} class="flare-art">
            {#snippet fallback()}<span class="flare" aria-hidden="true"></span>{/snippet}
          </ArtImage>
        {/if}
        {beat.name}
      </span>
    </button>
    <button type="button" class="skip" data-testid="beat-skip" onclick={onskip}>Skip ▸▸</button>
  </div>
{/if}

<style>
  .beat {
    position: absolute;
    inset: 0;
    z-index: 5;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    gap: var(--space-2);
    /* Below the caption and readout rows, over the top of the board: the cells stay in view. */
    padding-top: 60px;
    pointer-events: none;
  }
  .card,
  .skip {
    pointer-events: auto;
    cursor: pointer;
    font-family: var(--font-serif);
  }
  .card {
    position: relative;
    display: grid;
    justify-items: center;
    gap: 2px;
    min-width: 200px;
    max-width: 86%;
    padding: var(--space-2) var(--space-4);
    border: 2px solid var(--parchment);
    border-radius: var(--radius);
    background: color-mix(in srgb, var(--ink) 92%, transparent);
    color: var(--parchment);
    animation: pop var(--arrive) ease-out both;
  }
  .gold .card {
    border-color: var(--gold);
    box-shadow: 0 0 0 3px var(--gold);
  }
  .flourish {
    display: block;
    width: 100%;
  }
  .flourish :global(.flourish-art) {
    display: block;
    width: 100%;
    height: 40px;
    object-fit: contain;
  }
  .vec {
    fill: none;
    stroke: var(--parchment);
    stroke-width: 2;
    stroke-linecap: round;
  }
  .gold .vec {
    stroke: var(--gold);
  }
  .kind {
    font-size: var(--type-xs);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    opacity: 0.85;
  }
  .gold .kind,
  .gold .name {
    color: var(--gold);
  }
  .name {
    position: relative;
    font-size: var(--type-lg, 20px);
    font-style: italic;
    text-align: center;
    text-wrap: balance;
  }
  .name :global(.flare-art) {
    position: absolute;
    inset: -8px -16px;
    width: calc(100% + 32px);
    height: calc(100% + 16px);
    z-index: -1;
  }
  .flare {
    position: absolute;
    inset: -4px -12px;
    z-index: -1;
    background: radial-gradient(closest-side, color-mix(in srgb, var(--gold) 35%, transparent), transparent);
  }
  .skip {
    min-height: 44px;
    padding: 0 var(--space-4);
    border: 2px solid var(--parchment);
    border-radius: var(--radius);
    background: color-mix(in srgb, var(--ink) 80%, transparent);
    color: var(--parchment);
    font-size: var(--type-sm, 14px);
  }
  .skip:focus-visible,
  .card:focus-visible {
    outline: 3px solid var(--select);
    outline-offset: 2px;
  }
  .reduced .card {
    animation-name: fade;
  }
  @keyframes pop {
    from {
      opacity: 0;
      transform: scale(0.9);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  @keyframes fade {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
</style>
