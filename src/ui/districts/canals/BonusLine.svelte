<script lang="ts">
  interface Props {
    text: string;
    /** `open`: still to do; `met`: done; `lost`: can no longer be earned this room. */
    status: 'open' | 'met' | 'lost';
  }

  let { text, status }: Props = $props();
  const mark = $derived(status === 'met' ? '✓' : status === 'lost' ? '✗' : '◇');
</script>

<!-- A room's optional bonus under the header (CN-10): one line, struck through once it is lost. -->
<p class="bonus {status}" data-testid="bonus-line" data-status={status}>
  <span class="mark" aria-hidden="true">{mark}</span>
  <span class="label">Bonus pick</span>
  <span class="text">{text}</span>
</p>

<style>
  .bonus {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
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
  .lost .text,
  .lost .label {
    text-decoration: line-through;
    opacity: 0.6;
  }
  .lost .mark {
    color: var(--danger);
  }
</style>
