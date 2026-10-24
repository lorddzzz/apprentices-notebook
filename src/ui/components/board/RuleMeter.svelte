<script lang="ts">
  interface Props {
    label: string;
    value: number;
    max: number;
  }

  let { label, value, max }: Props = $props();

  const pct = $derived(max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0);
</script>

<!-- A rule's gauge (boil-over heat, a bell's rung count): a thin strip in the board frame. -->
<!-- biome-ignore lint/a11y/useSemanticElements: <meter> cannot be styled as this strip -->
<div class="meter" role="meter" aria-label={label} aria-valuemin="0" aria-valuemax={max} aria-valuenow={value} data-testid="rule-meter">
  <span class="label">{label}</span>
  <span class="bar"><span class="fill" style:width="{pct}%"></span></span>
  <span class="num">{value}/{max}</span>
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
  .label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .bar {
    flex: 0 0 40px;
    height: 8px;
    border-radius: 4px;
    background: var(--parchment-dark);
    box-shadow: inset 0 0 0 1px var(--line);
    overflow: hidden;
  }
  .fill {
    display: block;
    height: 100%;
    background: var(--danger);
  }
  .num {
    flex: none;
  }
</style>
