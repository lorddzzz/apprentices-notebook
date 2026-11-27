<script lang="ts">
  interface Props {
    text: string;
    tone: 'hint' | 'event' | 'warn';
  }

  let { text, tone }: Props = $props();
</script>

<!-- Overlays the board's top edge (FT-D9): 24 px, one line; a warning may take a second. It is
     no control: taps reach the cells under it, and tap-faster is the board's (busy: any cell). -->
<div class="caption {tone}" data-testid="caption" role="status" aria-live="polite">
  <span class="text">{text}</span>
</div>

<style>
  .caption {
    display: flex;
    align-items: center;
    width: 100%;
    min-height: 24px;
    padding: 2px var(--space-2);
    border-left: 3px solid var(--world-line, var(--line));
    background: color-mix(in srgb, var(--world-bg, var(--parchment)) 88%, transparent);
    color: var(--world-fg, var(--ink));
    font-family: var(--font-serif);
    font-size: var(--type-xs);
    line-height: 1.15;
    pointer-events: none;
  }
  .text {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
    line-clamp: 1;
    overflow: hidden;
  }
  .event {
    border-left-color: var(--f-source);
    font-style: italic;
  }
  .warn {
    border-left-color: var(--danger);
    border-left-width: 5px;
    font-weight: bold;
  }
  .warn .text {
    -webkit-line-clamp: 2;
    line-clamp: 2;
  }
</style>
