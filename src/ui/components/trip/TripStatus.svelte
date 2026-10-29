<script lang="ts">
  import { APPRENTICES, encountersOf, MEMBERS } from '$data';
  import { compiledFor, type Profile, type Trip } from '$engine';
  import ApprenticeToken from '../common/ApprenticeToken.svelte';
  import Pips from '../common/Pips.svelte';
  import RuneGlyph from '../RuneGlyph.svelte';

  interface Props {
    trip: Trip;
    profile: Profile;
    /** The Crossroads shows it big: HP and charges decide push on or go home. */
    large?: boolean;
  }

  let { trip, profile, large = false }: Props = $props();

  const rows = $derived(
    trip.party.map((m) => ({
      id: m,
      name: MEMBERS[m].name,
      hp: trip.hp[m] ?? 0,
      maxHp: MEMBERS[m].hp,
      spells: compiledFor(profile, m).spells.map((s) => ({
        key: s.key,
        source: s.source,
        dir: s.path[0]?.dir,
        left: trip.charges[m]?.[s.key] ?? 0,
        max: s.charges,
      })),
    })),
  );
</script>

<div class="status" class:large data-testid="trip-status">
  <p class="depth">
    {trip.status === 'fight' ? 'Depth' : 'Cleared'} {trip.encounter + 1} / {encountersOf(trip.district).length}
    <span class="finds">· {trip.loot.length} {trip.loot.length === 1 ? 'find' : 'finds'}</span>
  </p>
  {#each rows as r (r.id)}
    <div class="row" data-member={r.id}>
      <span class="who"><ApprenticeToken def={APPRENTICES[r.id]} size="strip" /><span class="name">{r.name}</span></span>
      <span class="hp"><Pips value={r.hp} max={r.maxHp} /><span class="num">{r.hp}/{r.maxHp}</span></span>
      <span class="spells">
        {#each r.spells as s (s.key)}
          <span class="spell" data-spell={s.source}>
            <RuneGlyph rune={s.source} dir={s.dir} size={large ? 32 : 24} />
            <Pips value={s.left} max={s.max} tone="charge" />
          </span>
        {/each}
      </span>
    </div>
  {/each}
</div>

<style>
  .status {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: var(--space-2) var(--space-3);
    border: 2px solid var(--line);
    border-radius: var(--radius);
    background: var(--parchment-dark);
    font-size: 14px;
  }
  .large {
    gap: var(--space-2);
    padding: var(--space-3);
    font-size: 16px;
  }
  .depth {
    margin: 0;
    font: 12px var(--mono);
    color: var(--ink-soft);
  }
  /* Name and HP share a line, the spells sit under them: a long name ("Lamp-pole runaway") never reaches the pips. */
  .row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas: 'who hp' 'spells spells';
    align-items: center;
    gap: 4px var(--space-2);
  }
  .who {
    grid-area: who;
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    white-space: nowrap;
  }
  .name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .hp {
    grid-area: hp;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .num {
    font: 12px var(--mono);
    color: var(--ink-soft);
  }
  .spells {
    grid-area: spells;
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-start;
    gap: var(--space-2);
  }
  .large .spells {
    gap: var(--space-3);
  }
  .spell {
    display: inline-flex;
    align-items: center;
    gap: 2px;
  }
</style>
