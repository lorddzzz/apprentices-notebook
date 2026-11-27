<script lang="ts">
  import { levelNumeral, type MarginView } from '../../../app/desk';
  import MarginFrame from './MarginFrame.svelte';

  interface Props {
    margin: MarginView;
    name: string;
    onwrite: (variantId: string) => void;
  }

  let { margin, name, onwrite }: Props = $props();
  let root = $state<HTMLElement>();
  const writable = $derived(
    margin.lines.some((l) => l.frames.some((f) => f.state === 'open')) || margin.capstone?.state === 'open',
  );
  // The capstone is the last column of the last line's row, so the page reads I, II, capstone.
  // Brings the first frame still open into view and puts focus on its first variant.
  const toFirstOpen = () => {
    const frame = root?.querySelector<HTMLElement>('[data-state="open"]');
    frame?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
    frame?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({ preventScroll: true });
  };
</script>

<div class="margin" data-testid="desk-margin" bind:this={root}>
  {#if writable}
    <button type="button" class="primary" data-testid="desk-write" onclick={toFirstOpen}>Write footnote</button>
  {/if}
  {#each margin.lines as line, i (line.line)}
    <section class="line" data-testid="margin-line-{line.line}">
      <p class="sentence">{line.current}</p>
      <div class="cols">
        {#each line.frames as frame (frame.key)}
          <MarginFrame {frame} title="Level {levelNumeral(frame.level)}" {onwrite} />
        {/each}
        {#if margin.capstone && i === margin.lines.length - 1}
          <div class="cap" data-testid="margin-capstone">
            <MarginFrame frame={margin.capstone} title="Capstone" {onwrite} />
          </div>
        {/if}
      </div>
    </section>
  {/each}
  {#if margin.capstone && margin.lines.length === 0}
    <section class="line" data-testid="margin-capstone">
      <p class="sentence">{name}'s capstone, written beside the whole page.</p>
      <MarginFrame frame={margin.capstone} title="Capstone" {onwrite} />
    </section>
  {/if}
  {#if margin.lines.length === 0 && !margin.capstone}
    <p class="none" data-testid="margin-none">
      Nothing is written in this margin yet. Watch one of its lines play out, and come back.
    </p>
  {/if}
</div>

<style>
  .margin {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin-top: var(--space-2);
  }
  .line {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding: var(--space-2);
    border-left: 3px solid var(--ink);
    background: rgba(43, 33, 24, 0.05);
  }
  /* Three columns share the row; when they do not fit they side-scroll, never clip. */
  .cols {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(100px, 1fr);
    align-items: start;
    gap: var(--space-1);
    overflow-x: auto;
    scroll-snap-type: x proximity;
    padding-bottom: 2px;
  }
  .cap {
    display: contents;
  }
  .cols > :global(*),
  .cap > :global(*) {
    scroll-snap-align: start;
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .primary {
    align-self: flex-end;
    min-height: var(--tap);
    padding: 0 var(--space-3);
    border: 2px solid var(--ink);
    border-radius: var(--radius);
    background: var(--ink);
    color: var(--parchment);
    font: 17px var(--font-serif);
    font-variant: small-caps;
    letter-spacing: 0.06em;
  }
  .sentence {
    margin: 0 0 var(--space-1);
    font-family: var(--font-serif);
    font-size: 16px;
    line-height: 1.2;
  }
  .none {
    margin: 0;
    font-family: var(--font-serif);
    font-style: italic;
    font-size: 15px;
    line-height: 1.3;
    color: var(--ink-soft);
  }
</style>
