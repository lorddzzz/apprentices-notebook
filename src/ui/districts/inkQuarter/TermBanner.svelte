<script lang="ts">
  import type { OpenTermLine } from '../../../app/inkTerms';

  let { line }: { line: OpenTermLine } = $props();
</script>

<!-- The signed term under the room's header (IQ-17): the condition, and a live round count. -->
<p class="term" class:over={line.count?.over} data-testid="term-banner">
  <span class="mark" aria-hidden="true">✒</span>
  <span class="label">Term</span>
  <span class="text">{line.condition}</span>
  {#if line.count}
    <span class="count" data-testid="term-count">round {line.count.round} / {line.count.limit}</span>
  {/if}
</p>

<style>
  .term {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0 var(--space-2);
    margin: 0;
    font-size: 13px;
    line-height: 1.25;
    color: var(--ink-soft);
  }
  .mark {
    flex: none;
    color: var(--m-brass-dark);
  }
  .label {
    flex: none;
    font-weight: bold;
    color: var(--ink);
  }
  .text {
    min-width: 0;
    font-style: italic;
  }
  .count {
    flex: none;
    margin-left: auto;
    font-weight: bold;
    color: var(--ink);
  }
  .over .count {
    color: var(--danger);
  }
</style>
