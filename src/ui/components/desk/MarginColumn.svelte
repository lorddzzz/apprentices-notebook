<script lang="ts">
  import { levelNumeral, type MarginView } from '../../../app/desk';
  import MarginFrame from './MarginFrame.svelte';

  interface Props {
    margin: MarginView;
    name: string;
    onwrite: (variantId: string) => void;
  }

  let { margin, name, onwrite }: Props = $props();
</script>

<div class="margin" data-testid="desk-margin">
  {#each margin.lines as line (line.line)}
    <section class="line" data-testid="margin-line-{line.line}">
      <p class="sentence">{line.current}</p>
      {#each line.frames as frame (frame.key)}
        <MarginFrame {frame} title="Level {levelNumeral(frame.level)}" {onwrite} />
      {/each}
    </section>
  {/each}
  {#if margin.capstone}
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
  .sentence {
    margin: 0 0 var(--space-1);
    font-family: var(--hand);
    font-size: 16px;
    line-height: 1.2;
  }
  .none {
    margin: 0;
    font-family: var(--hand);
    font-size: 15px;
    line-height: 1.3;
    color: var(--ink-soft);
  }
</style>
