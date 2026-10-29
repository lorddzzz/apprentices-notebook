<script lang="ts">
  import { APPRENTICES, type ApprenticeId } from '$data';

  /** Lattices mode: whose page to edit. Lists the whole registry, the lineup first. */
  let { member, lineup, roster, onpick }: {
    member: ApprenticeId;
    lineup: readonly ApprenticeId[];
    /** Who the pickers list: the household in a campaign, everyone in dev. */
    roster: readonly ApprenticeId[];
    onpick: (id: ApprenticeId) => void;
  } = $props();
</script>

<label class="picker">
  <span class="sr">Whose page</span>
  <select
    data-testid="member-picker"
    value={member}
    onchange={(e) => onpick(e.currentTarget.value as ApprenticeId)}
  >
    {#each roster as id (id)}
      <option value={id}>{APPRENTICES[id].name}{lineup.includes(id) ? ' (lineup)' : ''}</option>
    {/each}
  </select>
</label>

<style>
  .picker {
    display: block;
    flex: none;
  }
  select {
    width: 100%;
    height: 44px;
    padding: 0 var(--space-2);
    border: 2px solid var(--line);
    border-radius: var(--radius);
    background: var(--parchment-dark);
    color: var(--ink);
    font: 16px Georgia, serif;
  }
  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
</style>
