<script lang="ts">
  import type { ApprenticeId } from '$data';
  import type { CardView } from '../../../app/study';
  import Unseen from '../common/Unseen.svelte';
  import ActionIcon from './ActionIcon.svelte';
  import ApprenticePortrait from './ApprenticePortrait.svelte';
  import { type DropTarget, dragCard } from './drag.svelte';

  interface Props {
    /** The seat's number, 0 to 2. */
    seat: 0 | 1 | 2;
    /** Who sits there; null is an empty seat. */
    card: CardView | null;
    /** Their page is the one open in the editor. */
    open: boolean;
    /** A dragged card is over this seat. */
    over: boolean;
    onopen: (id: ApprenticeId) => void;
    ondetail: (id: ApprenticeId) => void;
    onfill: () => void;
    ondrop: (id: ApprenticeId, target: DropTarget | null) => void;
  }

  // biome-ignore lint/correctness/noUnusedVariables: `over` is used in the template
  let { seat, card, open, over, onopen, ondetail, onfill, ondrop }: Props = $props();
</script>

<div
  class="seat"
  class:empty={card === null}
  class:open
  class:over
  style:--c={card ? `var(--hue-${card.def.look.hue})` : 'var(--line)'}
  data-drop="slot:{seat}"
  data-testid="seat-{seat}"
>
  {#if card}
    {@const def = card.def}
    <button
      type="button"
      class="face"
      aria-pressed={open}
      aria-label="{def.name}, {def.hp} HP, moves {def.move}. Opens their page"
      data-testid="seat-{seat}-open"
      use:dragCard={{ id: def.id, ondrop }}
      onclick={() => onopen(def.id)}
    >
      <ApprenticePortrait {def} size={96} />
      <span class="name">{def.name}</span>
      <span class="trade">{def.trade}</span>
      <span class="stats">
        <span>{def.hp} HP · {def.move} mv</span>
        <ActionIcon action={def.action} size={14} />
      </span>
    </button>
    <button
      type="button"
      class="info"
      aria-label="About {def.name}"
      data-testid="seat-{seat}-info"
      onclick={() => ondetail(def.id)}
    >
      <span aria-hidden="true">i</span>
    </button>
  {:else}
    <button type="button" class="face blank" aria-label="Empty seat" onclick={onfill} data-testid="seat-{seat}-fill">
      <Unseen shape="silhouette" label="Empty seat" />
    </button>
  {/if}
</div>

<style>
  .seat {
    position: relative;
    min-width: 0;
    border: 2px solid var(--c);
    border-radius: var(--radius);
    background: var(--parchment);
    box-shadow: 0 2px 0 rgba(0, 0, 0, 0.35);
    transition: transform 0.12s;
  }
  .seat.open {
    background: var(--parchment-dark);
    box-shadow:
      0 0 0 2px var(--lamp),
      0 2px 0 2px rgba(0, 0, 0, 0.35);
  }
  .seat.empty {
    border-style: dashed;
    border-color: var(--ink-faint);
    background: transparent;
    box-shadow: none;
  }
  .seat.over {
    transform: scale(1.04);
    outline: 3px solid var(--lamp);
    outline-offset: 1px;
  }
  .face {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    width: 100%;
    min-height: 150px;
    padding: 4px;
    border: 0;
    background: none;
    color: var(--ink);
    text-align: center;
    touch-action: manipulation;
    -webkit-user-select: none;
    user-select: none;
    -webkit-touch-callout: none;
  }
  .trade {
    max-width: 100%;
    overflow: hidden;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
    opacity: 0.75;
  }
  .name {
    max-width: 100%;
    overflow: hidden;
    font-size: 12px;
    font-weight: bold;
    letter-spacing: -0.2px;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--c);
  }
  .stats {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    width: 100%;
    font-size: 12px;
    color: var(--ink-soft);
    white-space: nowrap;
  }
  .blank {
    align-items: center;
    justify-content: center;
    color: var(--ink-faint);
  }
  .info {
    position: absolute;
    top: -8px;
    right: -8px;
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    padding: 0;
    border: 0;
    background: none;
  }
  .info span {
    display: grid;
    place-items: center;
    width: 20px;
    height: 20px;
    border: 1.5px solid var(--c);
    border-radius: 50%;
    background: var(--parchment);
    font: italic bold 13px/1 Georgia, serif;
    color: var(--c);
  }
</style>
