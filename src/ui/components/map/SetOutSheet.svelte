<script lang="ts">
  import { APPRENTICES } from '$data';
  import { compiledFor, describeSpell, type Profile, tripParty } from '$engine';
  import ApprenticeToken from '../common/ApprenticeToken.svelte';
  import Button from '../common/Button.svelte';
  import Sheet from '../common/Sheet.svelte';

  interface Props {
    open: boolean;
    profile: Profile;
    onclose: () => void;
    onsetout: () => void;
  }

  let { open, profile, onclose, onsetout }: Props = $props();

  // Who goes out the door (the trip slots) and what each carries.
  const carried = $derived(
    tripParty(profile).map((m) => ({
      def: APPRENTICES[m],
      spells: compiledFor(profile, m).spells.map((s) => `${describeSpell(s)} (${s.charges} charges)`),
    })),
  );
  // One quiet line when some of the household stays home (not for a household that is all going).
  const staying = $derived(
    carried.length > 0 && carried.length < Math.min(3, profile.household.members.length)
      ? carried.length === 1
        ? 'Going alone.'
        : `${carried.length} of the household go; the rest stay home.`
      : null,
  );
</script>

<Sheet {open} title="Set out?" {onclose}>
  {#if carried.length === 0}
    <p class="hint" data-testid="no-party">
      Nobody is in a trip slot. Pick the party on the study's shelf, then come back.
    </p>
  {:else}
    <p class="hint">
      The party takes only what is inscribed. Charges do not come back until you return home, and if
      everyone falls, whatever you found is lost.
    </p>
    <ul class="carry" data-testid="carry">
      {#each carried as c (c.def.id)}
        <li>
          <strong><ApprenticeToken def={c.def} size="ledger" /> {c.def.name}</strong>
          <span>{c.spells.join('; ') || 'no spells inscribed'}</span>
        </li>
      {/each}
    </ul>
    {#if staying}<p class="staying" data-testid="staying">{staying}</p>{/if}
  {/if}
  <div class="row">
    <Button variant="quiet" label="Not yet" onclick={onclose} testid="not-yet" />
    <Button label="Set out" disabled={carried.length === 0} onclick={onsetout} testid="set-out" />
  </div>
</Sheet>

<style>
  .hint {
    margin: 0 0 var(--space-2);
    font-size: 14px;
    color: var(--ink-soft);
  }
  .carry {
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 15px;
  }
  .carry li {
    display: flex;
    flex-direction: column;
    padding: 4px 0;
  }
  .carry span {
    font-size: 14px;
    color: var(--ink-soft);
  }
  .staying {
    margin: var(--space-2) 0 0;
    font-size: 13px;
    font-style: italic;
    color: var(--ink-soft);
  }
  .row {
    display: flex;
    justify-content: space-between;
    gap: var(--space-2);
    margin-top: var(--space-3);
  }
</style>
