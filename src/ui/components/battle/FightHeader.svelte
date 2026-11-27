<script lang="ts">
  import type { Snippet } from 'svelte';
  import { crestFor } from '../../districts';
  import AppHeader from '../common/AppHeader.svelte';

  /** FT-14. The fight's header: the city bar (56) with the district's crest, no back control. */
  interface Props {
    district: Parameters<typeof crestFor>[0];
    /** The district's proper name. */
    title: string;
    round: number;
    /** 1-based room and the trip's room count. */
    room: number;
    rooms: number;
    /** The notebook icon: toggles the pocket notebook (the parent owns the controller). */
    onpocket: () => void;
    /** A chain is playing: the notebook waits (FT-D4). */
    busy?: boolean;
    /** The second line: the boss or rival's name, HP and rule, when there is one. */
    status?: Snippet;
  }

  let { district, title, round, room, rooms, onpocket, busy = false, status }: Props = $props();

  const crest = $derived(crestFor(district));
  const subtitle = $derived(`Round ${round} · Room ${room}/${rooms}`);
</script>

{#snippet pocket()}
  <button
    type="button"
    class="pocket"
    aria-label="Pocket notebook"
    disabled={busy}
    data-testid="pocket"
    onclick={onpocket}
  >
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false">
      <path
        d="M5.5 3.5h13v17h-13zM9 3.5v17M12 8h4"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </button>
{/snippet}

<div class="fight-header" data-testid="fight-header">
  <AppHeader variant="city" {title} {subtitle} {crest} {status} right={pocket} />
</div>

<style>
  .fight-header {
    flex: none;
  }
  .pocket {
    display: grid;
    flex: none;
    place-items: center;
    min-width: var(--tap);
    min-height: var(--tap);
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    cursor: pointer;
  }
  .pocket:focus-visible {
    outline: 3px solid var(--select);
    outline-offset: 1px;
  }
  .pocket:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .pocket:active:not(:disabled) {
    transform: translateY(1px);
  }
</style>
