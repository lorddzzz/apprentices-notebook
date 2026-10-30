<script lang="ts">
  import type { BattleState, Trip } from '$engine';
  import type { GameEvent } from '$engine/events';
  import { bannersFor } from '.';

  interface Props {
    battle: BattleState;
    trip?: Trip | null;
    log?: readonly GameEvent[];
  }

  let { battle, trip = null, log = [] }: Props = $props();
  const banners = $derived(bannersFor(trip?.district));
</script>

<!-- The district banner slot in the battle HUD (D5): each registered banner draws itself or nothing. -->
{#each banners as Banner, i (i)}
  <Banner {battle} {trip} {log} />
{/each}
