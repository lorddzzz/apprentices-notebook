<script lang="ts">
  interface Props {
    /** The latest line the notebook wrote (the playback readout), for the accessible name. */
    line?: string | null;
    /** A chain is playing: the notes wait (FT-D4). */
    disabled?: boolean;
    onlog: () => void;
  }

  let { line = null, disabled = false, onlog }: Props = $props();
</script>

<button
  type="button"
  class="log"
  aria-label={line ? `Field notes. Latest: ${line}` : 'Field notes'}
  data-testid="log"
  {disabled}
  onclick={onlog}
>
  <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
    <path
      d="M5 3.5h11.5a2 2 0 0 1 2 2V20.5H7a2 2 0 0 1-2-2zM8.5 8h7M8.5 11.5h7M8.5 15h4.5"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</button>

<style>
  .log {
    display: grid;
    flex: none;
    place-items: center;
    width: 48px;
    min-height: 52px;
    padding: 0;
    border: 2px solid var(--world-line, var(--line));
    border-radius: var(--radius);
    background: transparent;
    color: var(--world-fg, var(--ink));
    cursor: pointer;
  }
  .log:focus-visible {
    outline: 3px solid var(--select);
    outline-offset: 1px;
  }
  .log:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .log:active:not(:disabled) {
    transform: translateY(1px);
  }
</style>
