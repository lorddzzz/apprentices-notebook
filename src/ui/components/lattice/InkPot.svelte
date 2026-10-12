<script lang="ts">
  interface Props {
    used: number;
    /** null = unlimited (Lab). */
    capacity: number | null;
    /** Ink cost of the selected shelf rune, drawn as a dashed ghost. */
    pending?: number;
  }

  let { used, capacity, pending = 0 }: Props = $props();

  const BODY_TOP = 14;
  const BODY_H = 24;
  // biome-ignore lint/correctness/noUnusedVariables: used in the template
  const over = $derived(capacity !== null && used > capacity);
  const frac = (n: number): number =>
    capacity === null || capacity <= 0 ? 0 : Math.min(1, Math.max(0, n / capacity));
  const fillH = $derived(frac(used) * BODY_H);
  const ghostH = $derived(Math.max(0, frac(used + pending) * BODY_H - fillH));
</script>

<div
  class="pot"
  class:over
  data-testid="inkpot"
  role="img"
  aria-label={capacity === null ? `${used} ink used, unlimited` : `${used} of ${capacity} ink used`}
>
  <svg width="32" height="40" viewBox="0 0 32 40" aria-hidden="true">
    <clipPath id="pot-body">
      <path d="M6 14h20l3 8v12a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V22z" />
    </clipPath>
    <g clip-path="url(#pot-body)">
      <rect x="0" y={BODY_TOP + BODY_H - fillH} width="32" height={fillH} fill="var(--m-ink)" />
      {#if ghostH > 0}
        <rect
          x="1"
          y={BODY_TOP + BODY_H - fillH - ghostH + 0.5}
          width="30"
          height={Math.max(0, ghostH - 1)}
          fill="var(--m-ink)"
          fill-opacity="0.18"
          stroke="var(--m-ink)"
          stroke-dasharray="3 2"
        />
      {/if}
    </g>
    <path
      d="M6 14h20l3 8v12a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V22z"
      fill="none"
      stroke="var(--ink)"
      stroke-width="2"
      stroke-linejoin="round"
    />
    <path d="M10 14v-4h12v4M13 10V6h6v4" fill="none" stroke="var(--ink)" stroke-width="2" stroke-linejoin="round" />
  </svg>
  <span class="count">
    {used}{#if pending > 0}<span class="plus">+{pending}</span>{/if}<span class="cap"
      >/{capacity === null ? '∞' : capacity}</span
    >
  </span>
</div>

<style>
  .pot {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    min-height: var(--tap);
  }
  .count {
    font: 700 16px var(--mono);
    min-width: 3.4em;
  }
  .cap {
    font-weight: 400;
    color: var(--ink-soft);
  }
  .plus {
    margin-left: 2px;
    font-size: 12px;
    color: var(--m-ink);
  }
  .over .count {
    color: var(--danger);
  }
</style>
