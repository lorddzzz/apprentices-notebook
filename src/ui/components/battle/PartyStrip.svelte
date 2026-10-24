<script lang="ts">
  import { APPRENTICES } from '$data';
  import type { MemberUnit, UnitId } from '$engine';
  import { SCHOOL_NAME } from '../../../app/describe';
  import ApprenticeToken from '../common/ApprenticeToken.svelte';
  import Pips from '../common/Pips.svelte';

  interface Props {
    members: MemberUnit[];
    selected: UnitId | null;
    /** Members an enemy attack would hit as things stand. */
    threatened: UnitId[];
    onselect: (id: UnitId) => void;
  }

  let { members, selected, threatened, onselect }: Props = $props();

  /** DK-6: off the board (fell, erased); a member who is down (hp 0) is a different state. */
  const isOut = (m: MemberUnit): boolean => !!m.out;

  function status(m: MemberUnit): string {
    if (m.out) return 'out of the room';
    if (m.hp <= 0) return 'down';
    const parts = [m.moved ? 'moved' : 'can move', m.acted ? 'acted' : 'can act'];
    return parts.join(', ');
  }
</script>

<div class="party" class:three={members.length >= 3} data-testid="party">
  {#each members as m (m.id)}
    {@const danger = threatened.includes(m.id)}
    <button
      type="button"
      class="chip-btn"
      class:selected={selected === m.id}
      class:down={m.hp <= 0 && !isOut(m)}
      class:out={isOut(m)}
      disabled={isOut(m)}
      style:--c="var(--hue-{APPRENTICES[m.def].look.hue})"
      aria-pressed={selected === m.id}
      aria-label="{m.name}, {m.hp} of {m.maxHp} HP, {status(m)}{danger ? ', in danger' : ''}"
      onclick={() => onselect(m.id)}
    >
      <span class="row">
        <ApprenticeToken def={APPRENTICES[m.def]} size={18} />
        <span class="name">{m.name}</span>
        <span class="aff" title="Trained: its runes cost 1 ink less. Gifted: its runes work a step better.">
          {SCHOOL_NAME[m.lean.trained].toLowerCase()}{m.lean.gifted && m.lean.gifted !== m.lean.trained
            ? ` / ${SCHOOL_NAME[m.lean.gifted].toLowerCase()}`
            : ''}
        </span>
        {#if danger}<span class="danger" title="An attack is aimed here">!</span>{/if}
      </span>
      <span class="row small">
        <Pips value={m.hp} max={m.maxHp} />
        {#if isOut(m)}<span class="away" data-testid="out-tag">out of the room</span>{/if}
        {#if !isOut(m) && m.shield > 0}<span class="shield">◈{m.shield}</span>{/if}
        {#if m.mark}<span class="inked" title={m.mark.deep ? 'Deeply marked' : 'Marked'}>●</span>{/if}
        {#if m.collar !== false}<span class="collar" title="Collared in brass">○</span>{/if}
        <span class="ticks" class:hidden={isOut(m)}>
          <span class:used={m.moved}><span class="full">move</span><span class="short" title="move">m</span></span>
          <span class:used={m.acted}><span class="full">act</span><span class="short" title="act">a</span></span>
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
  /* Out of the room: not selectable, drawn apart from the downed (a hatched, dashed card). */
  .out {
    cursor: default;
    border-style: dashed;
    background: repeating-linear-gradient(135deg, var(--parchment-dark) 0 6px, var(--parchment) 6px 12px);
    color: var(--ink-soft);
  }
  .away {
    min-width: 0;
    overflow: hidden;
    font-style: italic;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .ticks.hidden {
    display: none;
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
  .aff {
    font-size: 11px;
    color: var(--ink-soft);
    white-space: nowrap;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .name {
    flex: none;
    font-size: 14px;
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
  .collar {
    color: var(--m-brass-dark);
    font-size: 13px;
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
  .ticks > span {
    padding: 0 3px;
    border-radius: 3px;
    background: var(--parchment);
  }
  .ticks .used {
    text-decoration: line-through;
    opacity: 0.45;
    background: none;
  }

  /* Three apprentices share one row (HC-8): a narrower chip keeps the board's cells above 44px. */
  .party.three {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
  }
  .three .chip-btn {
    padding: 4px 4px 4px 6px;
  }
  .three .name {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    font-size: 13px;
    text-overflow: ellipsis;
  }
  .three .aff,
  .three .full {
    display: none;
  }
  .party:not(.three) .short {
    display: none;
  }
  .three .ticks {
    gap: 2px;
    font-size: 10px;
  }
</style>
