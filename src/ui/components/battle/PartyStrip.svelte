<script lang="ts">
  import type { MemberUnit, UnitId } from '$engine';
  import Pips from '../common/Pips.svelte';

  interface Props {
    members: MemberUnit[];
    selected: UnitId | null;
    /** Members an enemy attack would hit as things stand. */
    threatened: UnitId[];
    onselect: (id: UnitId) => void;
  }

  let { members, selected, threatened, onselect }: Props = $props();

  function status(m: MemberUnit): string {
    if (m.hp <= 0) return 'down';
    const parts = [m.moved ? 'moved' : 'can move', m.acted ? 'acted' : 'can act'];
    return parts.join(', ');
  }
</script>

<div class="party" data-testid="party">
  {#each members as m (m.id)}
    {@const danger = threatened.includes(m.id)}
    <button
      type="button"
      class="chip-btn"
      class:selected={selected === m.id}
      class:down={m.hp <= 0}
      style:--c="var(--member-{m.def})"
      aria-pressed={selected === m.id}
      aria-label="{m.name}, {m.hp} of {m.maxHp} HP, {status(m)}{danger ? ', in danger' : ''}"
      onclick={() => onselect(m.id)}
    >
      <span class="row">
        <span class="dot"></span>
        <span class="name">{m.name}</span>
        {#if danger}<span class="danger" title="An attack is aimed here">!</span>{/if}
      </span>
      <span class="row small">
        <Pips value={m.hp} max={m.maxHp} />
        {#if m.shield > 0}<span class="shield">◈{m.shield}</span>{/if}
        {#if m.inked}<span class="inked" title="Inked">●</span>{/if}
        <span class="ticks">
          <span class:used={m.moved}>move</span>
          <span class:used={m.acted}>act</span>
        </span>
      </span>
    </button>
  {/each}
</div>

<style>
  .party {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-2);
    flex: none;
  }
  .chip-btn {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 2px;
    min-height: 52px;
    padding: 4px var(--space-2);
    border: 2px solid var(--line);
    border-left: 6px solid var(--c);
    border-radius: var(--radius);
    background: var(--parchment-dark);
    text-align: left;
    cursor: pointer;
    min-width: 0;
  }
  .selected {
    border-color: var(--select);
    border-left-color: var(--c);
    box-shadow: 0 0 0 2px var(--select);
    background: #f6e3b4;
  }
  .down {
    opacity: 0.45;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }
  .small {
    font-size: 11px;
  }
  .dot {
    width: 10px;
    height: 10px;
    flex: none;
    border-radius: 50%;
    background: var(--c);
  }
  .name {
    font-size: 14px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .danger {
    display: inline-grid;
    place-items: center;
    width: 18px;
    height: 18px;
    flex: none;
    border-radius: 50%;
    background: var(--danger);
    color: #fff;
    font: bold 13px var(--mono);
  }
  .shield {
    color: var(--shield);
    font-family: var(--mono);
  }
  .inked {
    color: var(--m-ink);
  }
  .ticks {
    display: flex;
    gap: 4px;
    margin-left: auto;
    font-family: var(--mono);
  }
  .ticks span {
    padding: 0 3px;
    border-radius: 3px;
    background: var(--parchment);
  }
  .ticks .used {
    text-decoration: line-through;
    opacity: 0.45;
    background: none;
  }
</style>
