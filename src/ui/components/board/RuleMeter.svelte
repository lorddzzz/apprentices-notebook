<script lang="ts">
  interface Props {
    label: string;
    value: number;
    max: number;
    /** Next round's level: pips between `value` and it are drawn as a forecast. */
    forecast?: number;
    /** The next round spills it over: the strip turns to a warning. */
    danger?: boolean;
  }

  let { label, value, max, forecast, danger = false }: Props = $props();

  const PIPS_UP_TO = 16;
  const pips = $derived(max > 0 && max <= PIPS_UP_TO);
  const pct = $derived(max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0);
  const next = $derived(forecast !== undefined && forecast > value ? forecast : value);
  const nextPct = $derived(max > 0 ? Math.max(0, Math.min(100, (next / max) * 100)) : 0);
  const aria = $derived(
    `${label} ${value} of ${max}${next > value ? `, rising to ${next}` : ''}${danger ? ', boils over' : ''}`,
  );
</script>

<!-- A rule's gauge (boil-over heat, a bell's rung count): a thin strip in the board frame; whole pips when it is small, a forecast tick, a warning state. -->
<!-- biome-ignore lint/a11y/useSemanticElements: <meter> cannot be styled as this strip -->
<div class="meter" class:danger role="meter" aria-label={aria} aria-valuemin="0" aria-valuemax={max} aria-valuenow={value} data-testid="rule-meter" data-danger={danger}>
  <span class="label">{label}</span>
  {#if pips}
    <span class="pips" aria-hidden="true">
      {#each { length: max } as _, i (i)}
        <span class="pip" class:on={i < value} class:fc={i >= value && i < next}></span>
      {/each}
    </span>
  {:else}
    <span class="bar" aria-hidden="true">
      <span class="ghost" style:width="{nextPct}%"></span>
      <span class="fill" style:width="{pct}%"></span>
    </span>
  {/if}
  <span class="num">{value}{#if !pips}/{max}{/if}{#if next > value}<span class="up" data-testid="meter-forecast">→{next}</span>{/if}</span>
</div>

<style>
  .meter {
    display: flex;
    align-items: center;
    gap: 6px;
    max-width: 100%;
    min-height: 22px;
    padding: 0 8px;
    border: 2px solid var(--line);
    border-radius: 12px;
    background: var(--parchment);
    font: 12px var(--mono);
    color: var(--ink);
  }
  .meter.danger {
    border-color: var(--danger);
    background: var(--danger-tint);
  }
  .label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .pips {
    display: flex;
    gap: 2px;
  }
  .pip {
    flex: none;
    width: 6px;
    height: 12px;
    border-radius: 2px;
    box-shadow: inset 0 0 0 1px var(--line);
    background: var(--parchment-dark);
  }
  .pip.on {
    background: var(--ink-soft);
  }
  .pip.fc {
    background: repeating-linear-gradient(135deg, var(--danger) 0 2px, var(--parchment-dark) 2px 4px);
    box-shadow: inset 0 0 0 1px var(--danger);
  }
  .danger .pip.on {
    background: var(--danger);
  }
  .bar {
    position: relative;
    flex: 0 0 40px;
    height: 8px;
    border-radius: 4px;
    background: var(--parchment-dark);
    box-shadow: inset 0 0 0 1px var(--line);
    overflow: hidden;
  }
  .fill,
  .ghost {
    position: absolute;
    inset: 0 auto 0 0;
    display: block;
  }
  .fill {
    background: var(--danger);
  }
  .ghost {
    background: repeating-linear-gradient(135deg, var(--danger) 0 2px, transparent 2px 4px);
    opacity: 0.6;
  }
  .num {
    flex: none;
  }
  .up {
    margin-left: 2px;
    color: var(--danger);
    font-weight: bold;
  }
  .danger .num {
    font-weight: bold;
  }
</style>
