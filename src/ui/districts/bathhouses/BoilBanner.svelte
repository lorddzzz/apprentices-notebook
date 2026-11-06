<script lang="ts">
  import { gaugeLine } from '../../../app/describe';
  import type { BannerProps } from '..';

  let { battle }: BannerProps = $props();
  const line = $derived(gaugeLine(battle));
</script>

<!--
  The gauge's warning under the room's header (BH-12): silent until the next round end would boil
  over, then it names the party members in the steam (their harm ring is on the board).
-->
{#if line?.boils}
  <p class="boil" role="status" data-testid="boil-banner" data-harm={line.harm.length}>
    <span class="mark" aria-hidden="true">!</span>
    <span class="text">{line.text}</span>
  </p>
{/if}

<style>
  .boil {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
    margin: 0;
    padding: 2px var(--space-2);
    border: 2px solid var(--danger);
    border-radius: 8px;
    background: var(--danger-tint);
    font-size: 13px;
    line-height: 1.25;
    color: var(--ink);
  }
  .mark {
    flex: none;
    font: bold 14px var(--mono);
    color: var(--danger);
  }
  .text {
    min-width: 0;
  }
</style>
