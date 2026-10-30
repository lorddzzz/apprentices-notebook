<script lang="ts">
  import { clockBanner } from '../../../app/inkClock';
  import type { BannerProps } from '..';

  let { battle, log }: BannerProps = $props();
  const line = $derived(clockBanner(battle, log));
</script>

<!--
  The postmaster's clock writ under the room's header (IQ-18): the seal to break, the stamp to
  stand on and the rounds left; once it ends, how (answered, collected, or him stunned).
-->
{#if line}
  <p class="clock {line.kind}" data-testid="clock-banner" data-kind={line.kind}>
    <span class="mark" aria-hidden="true">{line.kind === 'open' ? '⏳' : line.kind === 'collected' ? '✗' : '✓'}</span>
    <span class="text">{line.text}</span>
    {#if line.kind === 'open'}
      <span class="count" data-testid="clock-count">{line.left === 0 ? 'now' : line.left}</span>
    {/if}
  </p>
{/if}

<style>
  .clock {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
    margin: 0;
    font-size: 13px;
    line-height: 1.25;
    color: var(--ink-soft);
  }
  .mark {
    flex: none;
    color: var(--m-brass-dark);
  }
  .text {
    min-width: 0;
    font-style: italic;
  }
  .count {
    flex: none;
    margin-left: auto;
    font: bold 13px var(--mono);
    color: var(--ink);
  }
  .open .count {
    color: var(--danger);
  }
  .collected .mark {
    color: var(--danger);
  }
  .answered .mark,
  .stunned .mark {
    color: var(--ink);
  }
</style>
