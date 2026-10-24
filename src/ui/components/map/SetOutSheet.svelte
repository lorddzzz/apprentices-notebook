<script lang="ts">
  import { APPRENTICES, type DistrictId } from '$data';
  import { compiledFor, describeSpell, type Profile, tripParty } from '$engine';
  import type { StartAt } from '$engine/districts/types';
  import { startCheckpoint } from '../../../app/crossroads';
  import ApprenticeToken from '../common/ApprenticeToken.svelte';
  import Button from '../common/Button.svelte';
  import Sheet from '../common/Sheet.svelte';

  interface Props {
    open: boolean;
    /** The district being left for; its checkpoint (if the city remembers one) is offered. */
    district?: DistrictId | null;
    profile: Profile;
    onclose: () => void;
    onsetout: (at: StartAt) => void;
  }

  let { open, district = null, profile, onclose, onsetout }: Props = $props();

  // The doorway once reached (P5): the default start, the first room the other choice.
  const doorway = $derived(district ? startCheckpoint(profile, district) : null);
  let chosen = $state<StartAt | null>(null);
  const at = $derived<StartAt>(doorway ? (chosen ?? 'checkpoint') : 'start');
  $effect(() => {
    if (!open) chosen = null;
  });

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
  {#if doorway && carried.length > 0}
    <fieldset class="starts" data-testid="starts">
      <legend>Where to start</legend>
      <label class:on={at === 'checkpoint'}>
        <input
          type="radio"
          name="start"
          value="checkpoint"
          checked={at === 'checkpoint'}
          onchange={() => (chosen = 'checkpoint')}
          data-testid="start-checkpoint"
        />
        <span>
          <strong>{doorway}</strong>
          <small>Start past it, at full health and charges. The rooms before it are skipped.</small>
        </span>
      </label>
      <label class:on={at === 'start'}>
        <input
          type="radio"
          name="start"
          value="start"
          checked={at === 'start'}
          onchange={() => (chosen = 'start')}
          data-testid="start-first"
        />
        <span>
          <strong>The first room</strong>
          <small>The whole way in.</small>
        </span>
      </label>
    </fieldset>
  {/if}
  <div class="row">
    <Button variant="quiet" label="Not yet" onclick={onclose} testid="not-yet" />
    <Button label="Set out" disabled={carried.length === 0} onclick={() => onsetout(at)} testid="set-out" />
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
  .starts {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin: var(--space-3) 0 0;
    padding: 0;
    border: 0;
  }
  .starts legend {
    padding: 0;
    margin-bottom: var(--space-2);
    font-family: var(--mono);
    font-size: 13px;
    color: var(--ink-soft);
  }
  .starts label {
    display: flex;
    align-items: flex-start;
    gap: var(--space-2);
    min-height: var(--tap);
    box-sizing: border-box;
    padding: var(--space-2);
    border: 2px solid var(--line);
    border-radius: var(--radius);
    cursor: pointer;
  }
  .starts label.on {
    border-color: var(--ink);
    background: var(--parchment-dark);
  }
  .starts input {
    margin: 4px 0 0;
    width: 20px;
    height: 20px;
    flex: none;
    accent-color: var(--ink);
  }
  .starts span {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .starts small {
    font-size: 13px;
    color: var(--ink-soft);
  }
  .row {
    display: flex;
    justify-content: space-between;
    gap: var(--space-2);
    margin-top: var(--space-3);
  }
</style>
