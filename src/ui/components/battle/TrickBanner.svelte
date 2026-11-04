<script lang="ts">
  import type { TrickDraw } from '../../../app/overlay';

  interface Props {
    tricks: readonly TrickDraw[];
  }

  let { tricks }: Props = $props();

  const rounds = (n: number): string => (n === 0 ? 'now' : `${n} round${n === 1 ? '' : 's'}`);
</script>

<!--
  A rival's tricks under the room's header (RV-13): one line per telegraphed trick, drawn from the
  trick's own `draw` descriptor. Its name, what it does and where, the `n/m` of a sequence and the
  rounds left; the board shows the same tiles, units and objects.
-->
{#if tricks.length > 0}
  <ul class="tricks" data-testid="trick-banner" aria-label="Rival tricks">
    {#each tricks as t (`${t.unit}:${t.slot}`)}
      <li class="trick" data-slot={t.slot} data-trick={t.label}>
        <span class="mark" aria-hidden="true">{t.slot === 'mark' ? '◇' : '✦'}</span>
        <span class="text">
          <b>{t.label}</b>{t.text ? `: ${t.text}` : ''}{t.where ? ` (${t.where})` : ''}
        </span>
        {#if t.sequence}
          <span class="count" data-testid="trick-seq">{t.sequence[0]}/{t.sequence[1]}</span>
        {/if}
        {#if t.countdown !== null}
          <span class="count warn" data-testid="trick-count">{rounds(t.countdown)}</span>
        {/if}
      </li>
    {/each}
  </ul>
{/if}

<style>
  .tricks {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 13px;
    line-height: 1.25;
    color: var(--ink-soft);
  }
  .trick {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
  }
  .mark {
    flex: none;
    color: var(--danger);
  }
  .text {
    flex: 1;
    min-width: 0;
    font-style: italic;
  }
  .text b {
    font-style: normal;
    color: var(--ink);
  }
  .count {
    flex: none;
    font: bold 13px var(--mono);
    color: var(--ink);
  }
  .warn {
    color: var(--danger);
  }
</style>
