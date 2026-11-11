<script lang="ts">
  import type { Trip } from '$engine';
  import { shapeOf } from '$engine/trip/shape';
  import type { BoardView } from '../../../app/view';
  import BonusLine from './BonusLine.svelte';

  let { trip, view }: { trip: Trip; view: BoardView } = $props();

  // The room's optional bonus (CN-10): a crate goal reads its state off the board.
  const bonus = $derived(shapeOf(trip.district).bonuses?.[trip.encounter] ?? null);
  const status = $derived.by(() => {
    const crate = view.units.find((u) => u.def === 'barge');
    if (!crate || !bonus || !('happens' in bonus.goal)) return 'open';
    return crate.moored ? 'met' : crate.alive ? 'open' : 'lost';
  });
</script>

{#if bonus}<BonusLine text={bonus.text} {status} />{/if}
