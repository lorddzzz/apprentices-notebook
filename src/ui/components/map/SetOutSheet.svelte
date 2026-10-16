<script lang="ts">
  import { MEMBER_IDS, MEMBERS } from '$data';
  import { compiledFor, describeSpell, type Profile } from '$engine';
  import Button from '../common/Button.svelte';
  import Sheet from '../common/Sheet.svelte';

  interface Props {
    open: boolean;
    profile: Profile;
    onclose: () => void;
    onsetout: () => void;
  }

  let { open, profile, onclose, onsetout }: Props = $props();

  // What each member carries out the door.
  const carried = $derived(
    MEMBER_IDS.map((m) => ({
      name: MEMBERS[m].name,
      spells: compiledFor(profile, m).spells.map((s) => `${describeSpell(s)} (${s.charges} charges)`),
    })),
  );
</script>

<Sheet {open} title="Set out?" {onclose}>
  <p class="hint">
    The party takes only what is inscribed. Charges do not come back until you return home, and if
    everyone falls, whatever you found is lost.
  </p>
  <ul class="carry" data-testid="carry">
    {#each carried as c (c.name)}
      <li>
        <strong>{c.name}</strong>
        <span>{c.spells.join('; ') || 'no spells inscribed'}</span>
      </li>
    {/each}
  </ul>
  <div class="row">
    <Button variant="quiet" label="Not yet" onclick={onclose} testid="not-yet" />
    <Button label="Set out" onclick={onsetout} testid="set-out" />
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
  .row {
    display: flex;
    justify-content: space-between;
    gap: var(--space-2);
    margin-top: var(--space-3);
  }
</style>
