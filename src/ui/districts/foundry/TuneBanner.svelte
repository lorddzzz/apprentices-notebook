<script lang="ts">
  import type { BannerProps } from '..';
  import BellPiece from './BellPiece.svelte';
  import { tuneLine } from './state';

  let { battle }: BannerProps = $props();
  const line = $derived(tuneLine(battle));
  const when = (n: number): string =>
    n <= 1 ? 'The Great Peal rings this round' : `The Great Peal in ${n} rounds`;
</script>

<!--
  The Carillonneur's tune under the room's header (BF-18): its four notes as bells in their tones
  (colour, stripes and pips, as on the board), the one he rings this round ringed and the notes
  already rung ticked, and the rounds left to the Great Peal. On the fourth note the strip turns to
  the Peal's warning; the bells it will ring are haloed on the board.
-->
{#if line}
  <div class="tune" class:peal={line.peal} role="status" data-testid="tune-banner" data-at={line.at} data-called={line.called}>
    <span class="name">Tune</span>
    <ol class="notes" aria-label="The tune">
      {#each line.notes as tone, i (i)}
        <li class:now={i === line.at} class:done={i < line.at} data-tone={tone} data-note={i + 1}>
          <svg viewBox="0 0 100 100" width="30" height="30" aria-hidden="true"><BellPiece data={{ tone }} size={100} /></svg>
          {#if i < line.at}<span class="tick" aria-hidden="true">✓</span>{/if}
          <span class="sr">{i === line.at ? 'called now, ' : ''}note {i + 1}, {tone}</span>
        </li>
      {/each}
    </ol>
    <span class="count" data-testid="tune-count">{when(line.roundsToPeal)}</span>
  </div>
{/if}

<style>
  .tune {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin: 0;
    padding: 2px var(--space-2);
    border: 2px solid var(--line);
    border-radius: 8px;
    background: var(--parchment-dark);
    font-size: 13px;
    line-height: 1.2;
    color: var(--ink);
  }
  .tune.peal {
    border-color: var(--danger);
    background: var(--danger-tint);
  }
  .name {
    flex: none;
    font: bold 13px var(--mono);
  }
  .notes {
    display: flex;
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li {
    position: relative;
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    opacity: 0.85;
  }
  li.now {
    opacity: 1;
    box-shadow:
      0 0 0 2px var(--parchment),
      0 0 0 4.5px var(--ink);
  }
  li.done {
    opacity: 0.45;
  }
  .tick {
    position: absolute;
    right: -2px;
    bottom: -2px;
    font: bold 12px var(--mono);
    color: var(--ink);
    background: var(--parchment);
    border-radius: 50%;
    width: 14px;
    height: 14px;
    line-height: 14px;
    text-align: center;
  }
  .count {
    flex: 1;
    min-width: 0;
    text-align: right;
    font-style: italic;
  }
  .peal .count {
    font-style: normal;
    font-weight: bold;
    color: var(--danger);
  }
  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
</style>
