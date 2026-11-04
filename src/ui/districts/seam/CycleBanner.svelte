<script lang="ts">
  import type { BannerProps } from '..';
  import { cycleStrip, KIND_FILL, KIND_NAME, KIND_STROKE, kindPath } from './hands';

  let { battle }: BannerProps = $props();
  const strip = $derived(cycleStrip(battle));
</script>

<!--
  The Marginalia's cycle strip (SM-2, P3), the telegraph's header under the room's header: the
  five hands' kind icons in cycle order with the next one lit, then what it will write and where.
-->
{#if strip}
  <div class="cycle" data-testid="cycle-strip" data-next={strip.next?.kind ?? ''}>
    <ol class="hands" aria-label="The Marginalia's five hands, in order">
      {#each strip.items as h (h.kind)}
        <li class="hand" class:next={h.next} data-kind={h.kind} aria-current={h.next ? 'step' : undefined}>
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <circle
              cx="12"
              cy="12"
              r="11"
              fill={h.next ? KIND_FILL[h.kind] : 'none'}
              stroke={h.next ? 'var(--ink)' : 'var(--ink-soft)'}
              stroke-width={h.next ? 1.6 : 1}
              stroke-dasharray={h.next ? undefined : '2 2.4'}
            />
            <g transform="translate(4.8 4.8) scale(0.6)">
              <path
                d={kindPath(h.kind)}
                fill="none"
                stroke={h.next ? KIND_STROKE[h.kind] : 'var(--ink-soft)'}
                stroke-width="2.4"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </g>
          </svg>
          <span class="sr">{KIND_NAME[h.kind]}{h.next ? ', next' : ''}</span>
        </li>
      {/each}
    </ol>
    {#if strip.text}
      <p class="text">{strip.text}</p>
    {/if}
  </div>
{/if}

<style>
  .cycle {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-1) var(--space-2);
    margin: 0;
    font-size: 13px;
    line-height: 1.25;
    color: var(--ink-soft);
  }
  .hands {
    display: flex;
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
    flex: none;
  }
  .hand {
    display: flex;
    opacity: 0.75;
  }
  .hand.next {
    opacity: 1;
    transform: scale(1.18);
    filter: drop-shadow(0 0 2px var(--danger));
  }
  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
  .text {
    margin: 0;
    min-width: 0;
    font-style: italic;
    color: var(--ink);
  }
</style>
