<script lang="ts">
  interface Props {
    text: string;
    tone: 'hint' | 'event' | 'warn';
    /** Tapping the caption skips playback. */
    ontap: () => void;
  }

  let { text, tone, ontap }: Props = $props();
</script>

<button type="button" class="caption {tone}" data-testid="caption" aria-live="polite" onclick={ontap}>
  <span class="text">{text}</span>
</button>

<style>
  .caption {
    display: flex;
    align-items: center;
    width: 100%;
    height: 44px;
    flex: none;
    padding: 0 var(--space-2);
    border: 0;
    border-left: 3px solid var(--line);
    background: transparent;
    text-align: left;
    font-size: 13px;
    line-height: 1.3;
    cursor: default;
  }
  .text {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
  }
  .event {
    border-left-color: var(--f-source);
    font-style: italic;
  }
  .warn {
    border-left-color: var(--danger);
    color: var(--danger);
  }
</style>
