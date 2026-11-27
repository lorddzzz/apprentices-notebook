<script lang="ts">
  import type { Profile, Trip } from '$engine';
  import TripStrip from './TripStrip.svelte';

  /** Kept for existing imports: the strip itself is `TripStrip` (UT-7). */
  interface Props {
    trip: Trip;
    profile: Profile;
    large?: boolean;
  }

  let { trip, profile, large = false }: Props = $props();
</script>

<TripStrip {trip} {profile} {large} />
