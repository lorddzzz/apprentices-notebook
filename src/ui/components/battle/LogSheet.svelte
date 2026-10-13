<script lang="ts">
  import { describe, type GameEvent } from '$engine';
  import Sheet from '../common/Sheet.svelte';

  interface Props {
    open: boolean;
    log: GameEvent[];
    onclose: () => void;
  }

  let { open, log, onclose }: Props = $props();

  /** Lines grouped under their round. */
  const groups = $derived.by(() => {
    const out: { round: number; lines: string[] }[] = [{ round: 1, lines: [] }];
    for (const e of log) {
      if (e.type === 'round' && e.round > 1) out.push({ round: e.round, lines: [] });
      else if (e.type !== 'round') out.at(-1)?.lines.push(describe(e));
    }
    return out;
  });

  /** Opens at the latest line: scrolls the sheet's own scroll container, nothing else. */
  const scrollEnd = (el: HTMLElement): void => {
    let p = el.parentElement;
    while (p && getComputedStyle(p).overflowY !== 'auto') p = p.parentElement;
    if (p) p.scrollTop = p.scrollHeight;
  };
</script>

<Sheet {open} title="Battle log" {onclose}>
  <div class="log" data-testid="log-sheet">
    {#each groups as g (g.round)}
      <h3>Round {g.round}</h3>
      <ol>
        {#each g.lines as line, i (i)}
          <li>{line}</li>
        {/each}
      </ol>
    {/each}
    <div {@attach scrollEnd}></div>
  </div>
</Sheet>

<style>
  h3 {
    margin: var(--space-2) 0 var(--space-1);
    font-size: 14px;
    font-weight: normal;
    color: var(--accent);
  }
  ol {
    margin: 0;
    padding-left: var(--space-3);
    font-size: 14px;
    line-height: 1.45;
  }
</style>
