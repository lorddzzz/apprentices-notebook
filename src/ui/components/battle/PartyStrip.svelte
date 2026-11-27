<script lang="ts">
  import { APPRENTICES } from '$data';
  import type { MemberUnit, UnitId } from '$engine';
  import type { UnitView } from '../../../app/view';
  import ApprenticeToken from '../common/ApprenticeToken.svelte';
  import Pips from '../common/Pips.svelte';

  interface Props {
    members: MemberUnit[];
    selected: UnitId | null;
    /** Members an enemy attack would hit as things stand. */
    threatened: UnitId[];
    onselect: (id: UnitId) => void;
    /**
     * Playback: the units of the step on screen. HP and out/down come from here, never from the
     * final state, so the strip cannot spoil a result the board has not reached (FT-15). The
     * strip is dimmed while it is set.
     */
    shown?: readonly UnitView[] | null;
  }

  let { members, selected, threatened, onselect, shown = null }: Props = $props();

  /** What a card says: the member as the board shows them now (the shown step, else the state). */
  interface Card {
    m: MemberUnit;
    hp: number;
    out: boolean;
    down: boolean;
  }
  const cards = $derived.by((): Card[] =>
    members.map((m) => {
      const v = shown?.find((u) => u.id === m.id);
      const hp = v ? v.hp : m.hp;
      const out = v ? !!v.out : !!m.out;
      return { m, hp, out, down: !out && (v ? !v.alive || v.hp <= 0 : m.hp <= 0) };
    }),
  );

  function status(c: Card, danger: boolean): string {
    if (c.out) return 'Out of the room';
    if (c.down) return 'Down';
    if (danger) return 'In danger';
    return `${c.m.moved ? 'Moved' : 'Move'} · ${c.m.acted ? 'Acted' : 'Act ready'}`;
  }
</script>

<div class="party" class:dim={shown !== null} data-testid="party">
  {#each cards as c (c.m.id)}
    {@const m = c.m}
    {@const danger = threatened.includes(m.id) && !c.out && !c.down}
    {@const text = status(c, danger)}
    <button
      type="button"
      class="card"
      class:selected={selected === m.id}
      class:down={c.down}
      class:out={c.out}
      class:danger
      disabled={c.out}
      style:--c="var(--hue-{APPRENTICES[m.def].look.hue})"
      aria-pressed={selected === m.id}
      aria-label="{m.name}, {c.hp} of {m.maxHp} HP, {text}"
      onclick={() => onselect(m.id)}
    >
      <span class="row">
        <ApprenticeToken def={APPRENTICES[m.def]} size={20} />
        <span class="name">{m.name}</span>
        {#if danger}<span class="alarm" aria-hidden="true">!</span>{/if}
      </span>
      <span class="row">
        <Pips value={Math.max(0, c.hp)} max={m.maxHp} />
        {#if !c.out && m.shield > 0}<span class="mark shield" title="Shield">◈{m.shield}</span>{/if}
        {#if m.mark}<span class="mark inked" title={m.mark.deep ? 'Deeply marked' : 'Marked'}>●</span>{/if}
        {#if m.collar !== false}<span class="mark collar" title="Collared in brass">○</span>{/if}
      </span>
      <span class="status" data-testid={c.out ? 'out-tag' : undefined}>{text}</span>
    </button>
  {/each}
</div>

<style>
  .party {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(0, 1fr);
    gap: 6px;
    height: 56px;
    flex: none;
  }
  .party.dim {
    opacity: 0.6;
  }
  .card {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 1px;
    min-width: 0;
    height: 56px;
    padding: 3px 6px;
    border: 2px solid var(--world-line, var(--line));
    border-left: 5px solid var(--c);
    border-radius: var(--radius);
    background: color-mix(in srgb, var(--world-bg, var(--parchment-dark)) 82%, var(--world-fg, var(--ink)) 6%);
    color: var(--world-fg, var(--ink));
    font-family: var(--font-serif);
    text-align: left;
    cursor: pointer;
  }
  .card:focus-visible {
    outline: 3px solid var(--select);
    outline-offset: 1px;
  }
  .selected {
    border-color: var(--select);
    border-left-color: var(--c);
    box-shadow: 0 0 0 2px var(--select);
  }
  .down {
    opacity: 0.55;
  }
  /* Out of the room: not selectable, drawn apart from the downed (a dashed, hatched card). */
  .out {
    cursor: default;
    border-style: dashed;
    border-left-style: solid;
    background: repeating-linear-gradient(
      135deg,
      transparent 0 6px,
      color-mix(in srgb, currentColor 10%, transparent) 6px 12px
    );
    opacity: 0.7;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 5px;
    min-width: 0;
    height: 18px;
  }
  .name {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    font-size: var(--type-sm);
    line-height: 1.2;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .status {
    overflow: hidden;
    font-size: var(--type-xs);
    line-height: 1.2;
    opacity: 0.85;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .danger .status {
    font-weight: bold;
    opacity: 1;
  }
  .alarm {
    display: inline-grid;
    flex: none;
    place-items: center;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--danger);
    color: #fff;
    font-size: var(--type-xs);
    font-weight: bold;
    line-height: 1;
  }
  .mark {
    flex: none;
    font-size: var(--type-xs);
    line-height: 1;
  }
  .collar {
    color: var(--m-brass-dark);
  }
  /* The pips read the world's text colour, not the paper ink. */
  .card :global(.pips.hp),
  .card :global(.text.hp) {
    color: var(--world-fg, var(--ink));
  }
</style>
