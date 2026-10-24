<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { METHODS, type RuneRef } from '$data';
  import { inventionLibrary } from '$engine';
  import {
    choicesFor,
    defaultName,
    eventsKnown,
    lineTextFor,
    methodsKnown,
    sceneItems,
    subjectsIn,
  } from '../../app/bench';
  import { BenchStore } from '../../app/bench.svelte';
  import { game } from '../../app/instance';
  import { EMPTY_OVERLAY } from '../../app/overlay';
  import MethodRow from '../components/bench/MethodRow.svelte';
  import PartSheet from '../components/bench/PartSheet.svelte';
  import PartSlots from '../components/bench/PartSlots.svelte';
  import SolventRow from '../components/bench/SolventRow.svelte';
  import WriteSheet from '../components/bench/WriteSheet.svelte';
  import BattleBoard from '../components/board/BattleBoard.svelte';
  import BackLink from '../components/common/BackLink.svelte';
  import Button from '../components/common/Button.svelte';
  import Palette from '../components/lab/Palette.svelte';

  const bench = new BenchStore(game);
  const profile = $derived(bench.profile);
  const lib = $derived(inventionLibrary(profile));
  const status = $derived(bench.status);
  const draft = $derived(bench.draft);
  const session = $derived(bench.session);

  let slot = $state<number | null>(null);
  let writing = $state(false);
  let written = $state<string | null>(null);

  onMount(() => bench.open());
  onDestroy(() => bench.leave());

  const choices = $derived(slot === null ? [] : choicesFor(profile, draft, slot));
  const slotTitle = $derived(
    slot === null || !draft.method ? '' : `Choose ${METHODS[draft.method].slots[slot]?.label ?? 'a part'}`,
  );

  function pick(ref: RuneRef): void {
    if (slot !== null) bench.setPart(slot, ref);
    slot = null;
  }

  function write(): void {
    const name = bench.write();
    if (name === null) return;
    writing = false;
    written = name;
  }
</script>

<section class="bench" data-testid="bench">
  <header>
    <BackLink to="study" label="Study" />
    <h1>The Bench</h1>
  </header>

  <div class="top">
    <MethodRow methods={methodsKnown(profile)} chosen={draft.method} onpick={(m) => bench.pickMethod(m)} />
    {#if draft.method}
      <PartSlots
        method={draft.method}
        parts={draft.parts}
        inventions={lib}
        event={draft.event}
        events={eventsKnown(profile)}
        onslot={(i) => (slot = i)}
        onevent={(e) => bench.setEvent(e)}
      />
    {/if}
    <SolventRow counts={profile.solvents} chosen={draft.solvent} onpick={(s) => bench.setSolvent(s)} />
    <div class="read" data-testid="headline-box">
      {#if status.headline}
        <p class="headline" data-testid="headline">{status.headline}</p>
      {:else}
        <p class="headline faint" data-testid="headline">Pick a method and its parts. The headline shows here.</p>
      {/if}
      {#if status.issue && draft.method}
        <p class="issue" class:bad={status.complete} data-testid="issue">
          {status.issue}
        </p>
      {:else if status.ink !== null}
        <p class="ink" data-testid="ink">Costs {status.ink} ink to place.</p>
      {/if}
    </div>
  </div>

  <div class="scene">
    <div class="board-wrap" data-testid="scene" class:aiming={bench.aiming}>
      {#if session}
        <BattleBoard
          view={session.view}
          overlay={EMPTY_OVERLAY}
          fx={session.fx}
          fxKey={session.fxKey}
          minimal={session.busy}
          ontap={(at) => bench.tap(at)}
        />
      {/if}
    </div>
    <p class="caption" data-testid="caption">
      {#if bench.aiming}
        Tap the board to aim the cast from the caster.
      {:else if session?.busy}
        {session.caption.text}
      {:else}
        {subjectsIn(bench.scene)} of 3 subjects. Tap a tile to place or remove the swatch.
      {/if}
    </p>
    <Palette
      selected={bench.item}
      items={sceneItems(profile)}
      onselect={(item) => (bench.item = item)}
    />
    {#if bench.witnessed.length > 0}
      <ul class="seen" data-testid="seen">
        {#each bench.witnessed as id (id)}
          <li>{lineTextFor(profile, id)}</li>
        {/each}
      </ul>
    {/if}
    <div class="actions">
      <Button
        variant="quiet"
        label={bench.aiming ? 'Cancel aim' : 'Trial'}
        disabled={!status.valid}
        onclick={() => bench.startAiming()}
        testid="trial"
      />
      <Button variant="quiet" label="Clear" onclick={() => bench.clearScene()} testid="clear-scene" />
      <Button
        label="Name and write"
        disabled={!status.valid}
        onclick={() => (writing = true)}
        testid="write"
      />
    </div>
    {#if written}
      <p class="done" data-testid="written">{written} is written. It is on the Study shelf.</p>
    {/if}
  </div>

  <PartSheet
    open={slot !== null}
    title={slotTitle}
    {choices}
    inventions={lib}
    onpick={pick}
    onclose={() => (slot = null)}
  />
  <WriteSheet
    open={writing}
    name={bench.name}
    placeholder={defaultName(draft, lib)}
    headline={status.headline ?? ''}
    solvent={draft.solvent}
    onname={(n) => (bench.name = n)}
    onwrite={write}
    onclose={() => (writing = false)}
  />
</section>

<style>
  .bench {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 6px;
    height: 100%;
    padding: 0 var(--space-2) var(--space-2);
    background: var(--parchment);
    overflow: hidden;
  }
  header {
    flex: none;
    display: flex;
    align-items: center;
    margin: 0 calc(var(--space-2) * -1);
    padding-right: var(--space-3);
    border-bottom: 2px solid var(--ink);
    background: var(--parchment-dark);
  }
  h1 {
    margin: 0 auto;
    font-size: 20px;
    font-weight: normal;
    letter-spacing: 0.03em;
  }
  .top {
    flex: none;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .read {
    min-height: 74px;
    padding: 4px var(--space-2);
    border-left: 3px solid var(--ink);
    background: rgba(43, 33, 24, 0.05);
  }
  .read p {
    margin: 0;
  }
  .headline {
    font-family: var(--hand);
    font-size: 17px;
    line-height: 1.2;
  }
  .faint {
    color: var(--ink-soft);
  }
  .issue {
    font-size: 13px;
    color: var(--ink-soft);
  }
  .issue.bad {
    color: var(--danger);
    font-weight: bold;
  }
  .ink {
    font-size: 12px;
    color: var(--ink-soft);
  }
  .scene {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .board-wrap {
    flex: 1;
    min-height: 120px;
    border-radius: var(--radius);
  }
  .board-wrap.aiming {
    outline: 3px solid var(--select);
  }
  .caption {
    flex: none;
    margin: 0;
    font-size: 12px;
    color: var(--ink-soft);
  }
  .seen {
    flex: none;
    max-height: 52px;
    margin: 0;
    padding: 0 0 0 18px;
    overflow-y: auto;
    font-size: 12px;
    line-height: 1.3;
  }
  .actions {
    flex: none;
    display: flex;
    gap: var(--space-2);
  }
  .actions :global(.btn:last-child) {
    flex: 1;
  }
  .done {
    flex: none;
    margin: 0;
    font-family: var(--hand);
    font-size: 16px;
  }
</style>
