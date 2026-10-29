<script lang="ts">
  import { APPRENTICES, type ApprenticeId, type BasicActionId, HABIT_IDS, HABITS, type HabitId } from '$data';
  import { BASIC_LABEL } from '../../../app/describe';
  import { LAB_ACTIONS, type LabKit } from '../../../app/lab';
  import ApprenticeToken from '../common/ApprenticeToken.svelte';
  import Button from '../common/Button.svelte';
  import Sheet from '../common/Sheet.svelte';

  let { open, member, lineup, roster, kit, native, changed, onmember, onaction, onhabit, onreset, onclose }: {
    open: boolean;
    /** Whose kit is shown. */
    member: ApprenticeId;
    lineup: readonly ApprenticeId[];
    /** Who the pickers list: the household in a campaign, everyone in dev. */
    roster: readonly ApprenticeId[];
    /** The kit they carry in the Lab now, and the one the registry gives them. */
    kit: LabKit;
    native: LabKit;
    /** Who carries something other than their own kit. */
    changed: readonly ApprenticeId[];
    onmember: (id: ApprenticeId) => void;
    onaction: (action: BasicActionId) => void;
    onhabit: (habit: HabitId | null) => void;
    onreset: () => void;
    onclose: () => void;
  } = $props();

  const a = $derived(APPRENTICES[member]);
  const differs = $derived(kit.action !== native.action || kit.habit !== native.habit);
  const nativeHabit = $derived(native.habit ? HABITS[native.habit].line : 'no habit');
</script>

<Sheet {open} title="Kits" {onclose}>
  <div class="kits" data-testid="lab-kits">
    <p>
      Give anyone another basic action or habit, on the board or off it. Battles in the Lab, painted
      apprentices and the fielded lineup carry it; a demo plays with each apprentice's own kit.
    </p>
    <label class="field">
      <span class="label">Apprentice</span>
      <select
        data-testid="kit-member"
        value={member}
        onchange={(e) => onmember(e.currentTarget.value as ApprenticeId)}
      >
        {#each roster as id (id)}
          <option value={id}>
            {APPRENTICES[id].name}{lineup.includes(id) ? ' (lineup)' : ''}{changed.includes(id) ? ' *' : ''}
          </option>
        {/each}
      </select>
    </label>

    <div class="who">
      <ApprenticeToken def={a} size={28} />
      <span class="name">{a.name}</span>
      <span class="own">Own: {BASIC_LABEL[native.action].name}, {nativeHabit}</span>
    </div>

    <fieldset class="field">
      <legend class="label">Basic action</legend>
      <div class="actions">
        {#each LAB_ACTIONS as id (id)}
          <button
            type="button"
            class="act"
            class:on={kit.action === id}
            aria-pressed={kit.action === id}
            data-testid="kit-action-{id}"
            onclick={() => onaction(id)}
          >
            <span class="icon" aria-hidden="true">{BASIC_LABEL[id].icon}</span>
            {BASIC_LABEL[id].name}
          </button>
        {/each}
      </div>
      <p class="hint" data-testid="kit-action-hint">{BASIC_LABEL[kit.action].hint}</p>
    </fieldset>

    <label class="field">
      <span class="label">Habit</span>
      <select
        data-testid="kit-habit"
        value={kit.habit ?? ''}
        onchange={(e) => onhabit(e.currentTarget.value === '' ? null : (e.currentTarget.value as HabitId))}
      >
        <option value="">No habit</option>
        {#each HABIT_IDS as id (id)}
          <option value={id}>{HABITS[id].line}</option>
        {/each}
      </select>
    </label>
    <p class="hint" data-testid="kit-habit-line">
      {kit.habit ? HABITS[kit.habit].line : 'No habit: every rune keeps its plain rule.'}
    </p>

    <Button variant="quiet" label="Back to {a.name}'s own kit" disabled={!differs} onclick={onreset} testid="kit-reset" />
  </div>
</Sheet>

<style>
  .kits {
    display: grid;
    gap: var(--space-2);
    min-width: 0;
  }
  p {
    margin: 0;
    font-size: 13px;
    color: var(--ink-soft);
  }
  .field {
    display: grid;
    gap: var(--space-1);
    min-width: 0;
  }
  fieldset.field {
    margin: 0;
    padding: 0;
    border: 0;
  }
  .label {
    font: 700 13px Georgia, serif;
    color: var(--ink);
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
  .who {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    min-width: 0;
  }
  .name {
    font-weight: 700;
  }
  .own {
    flex: 1;
    min-width: 0;
    font-size: 12px;
    color: var(--ink-soft);
    text-align: right;
  }
  .actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-1);
  }
  .act {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-1);
    min-height: 44px;
    border: 2px solid var(--line);
    border-radius: var(--radius);
    background: var(--parchment-dark);
    color: var(--ink);
    font: 15px Georgia, serif;
    cursor: pointer;
  }
  .act.on {
    border-color: var(--select);
    background: #f6e3b4;
    font-weight: 700;
  }
  .icon {
    font-size: 18px;
  }
  .hint {
    font-size: 12px;
  }
</style>
