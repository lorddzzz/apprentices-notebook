<script lang="ts">
  import { type InventionDef, METHOD_IDS, METHODS, RUNE_IDS, type RuneRef, SOLVENT_IDS, type SolventId } from '$data';
  import { headlineOf, type InventionLibrary, inventionIssue, nameOf, partIssue } from '$engine';
  import { type Draft, defaultName, draftDef, EMPTY_DRAFT, pickMethod, setPart } from '../../../app/bench';
  import { labKnown } from '../../../app/lab';
  import MethodRow from '../bench/MethodRow.svelte';
  import PartSheet from '../bench/PartSheet.svelte';
  import PartSlots from '../bench/PartSlots.svelte';
  import SolventRow from '../bench/SolventRow.svelte';
  import Button from '../common/Button.svelte';
  import Sheet from '../common/Sheet.svelte';

  let { open, inventions, onadd, onclose }: {
    open: boolean;
    inventions: InventionLibrary;
    onadd: (def: InventionDef) => boolean;
    onclose: () => void;
  } = $props();
  let draft = $state<Draft>({ ...EMPTY_DRAFT });
  let name = $state('');
  let slot = $state<number | null>(null);
  const known = $derived(labKnown(inventions));
  const def = $derived(draftDef(draft, name.trim() || defaultName(draft, inventions)));
  const issue = $derived(def ? inventionIssue(def, known) : 'Choose the parts and event.');
  const choices = $derived.by(() => {
    const method = draft.method;
    const index = slot;
    if (method === null || index === null) return [];
    return ([...RUNE_IDS, ...Object.keys(inventions)] as RuneRef[]).map((ref) => ({
      ref, name: nameOf(ref, inventions), reason: partIssue(method, index, ref, known),
    }));
  });
  const counts = Object.fromEntries(SOLVENT_IDS.map((id) => [id, Infinity])) as Record<SolventId, number>;

  function add(): void {
    if (def && onadd(def)) {
      draft = { ...EMPTY_DRAFT };
      name = '';
      onclose();
    }
  }
</script>

<Sheet {open} title="Invent for this Lab" {onclose}>
  <div class="invent">
    <p>Every method and solvent is available here. Inventions stay in this Lab session.</p>
    <MethodRow methods={METHOD_IDS} chosen={draft.method} onpick={(m) => (draft = pickMethod(draft, m))} />
    {#if draft.method}
      <PartSlots method={draft.method} parts={draft.parts} {inventions} event={draft.event}
        events={known.events} onslot={(i) => (slot = i)} onevent={(event) => (draft = { ...draft, event })} />
    {/if}
    <SolventRow {counts} chosen={draft.solvent} onpick={(solvent) => (draft = { ...draft, solvent })} />
    <label>Name <input bind:value={name} placeholder={defaultName(draft, inventions) || 'Lab invention'} /></label>
    {#if def}<p>{headlineOf(def, inventions)}</p>{/if}
    {#if issue}<p role="status">{issue}</p>{/if}
    <Button label="Add to Lab shelf" disabled={issue !== null} onclick={add} testid="add-lab-invention" />
  </div>
</Sheet>
<PartSheet open={open && slot !== null} title={draft.method && slot !== null ? `Choose ${METHODS[draft.method].slots[slot]?.label ?? 'a part'}` : 'Choose a part'}
  {choices} {inventions} onclose={() => (slot = null)} onpick={(ref) => {
    if (slot !== null) draft = setPart(draft, slot, ref);
    slot = null;
  }} />

<style>
  .invent { display: grid; gap: var(--space-2); min-width: 0; }
  p { margin: 0; font-size: 14px; }
  label { display: grid; gap: 4px; }
  input { min-width: 0; min-height: 44px; font: inherit; }
</style>
