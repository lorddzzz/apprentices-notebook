<script lang="ts">
  import { RECIPES, RUNES, SOLVENTS } from '$data';
  import { silhouettes as silhouettesOf } from '$engine';
  import {
    attemptOf,
    benchShelf,
    canCommit,
    marginLine,
    solventChoices,
  } from '../../app/bench';
  import { bench } from '../../app/bench.svelte';
  import { game } from '../../app/instance';
  import { NO_TOOL } from '../../app/study';
  import { toast } from '../../app/toasts.svelte';
  import SilhouetteList from '../components/bench/SilhouetteList.svelte';
  import SlotRow from '../components/bench/SlotRow.svelte';
  import BattleBoard from '../components/board/BattleBoard.svelte';
  import Button from '../components/common/Button.svelte';
  import Pips from '../components/common/Pips.svelte';
  import Sheet from '../components/common/Sheet.svelte';
  import RuneShelf from '../components/lattice/RuneShelf.svelte';
  import RuneGlyph from '../components/RuneGlyph.svelte';
  import SolventIcon from '../components/SolventIcon.svelte';

  const profile = $derived(game.profile);
  const state = $derived(bench.bench);
  const session = $derived(bench.session);
  const attempt = $derived(attemptOf(state));
  const result = $derived(state.result);
  const sils = $derived(silhouettesOf(RECIPES, profile.bench.known));
  const shelf = $derived(benchShelf(profile));
  const solvents = $derived(solventChoices(profile));
  const tried = $derived(result !== null && bench.repeat);
  const canWrite = $derived(canCommit(state, profile));
  const busy = $derived(session.busy);

  const pickerTitle = $derived(
    state.picking === 'solvent' ? 'Pick a solvent' : 'Pick a rune from the notebook',
  );

  function pickRune(rune: (typeof shelf)[number]['rune']): void {
    if (state.picking === 'left' || state.picking === 'right') bench.pickRune(state.picking, rune);
  }
</script>

<div class="bench" data-testid="bench">
  <header>
    <a class="back" href="#/study" aria-label="Back to the study">&larr;</a>
    <h1>The bench</h1>
    <span class="stock">{profile.vellum} vellum</span>
  </header>

  <SlotRow
    left={state.left}
    right={state.right}
    solvent={state.solvent}
    picking={state.picking}
    onslot={(s) => bench.openSlot(s)}
    onclear={(s) => bench.clear(s)}
  />

  <div class="stage" data-testid="trial-board">
    <BattleBoard
      view={session.view}
      overlay={session.overlay}
      fx={session.fx}
      fxKey={session.fxKey}
      minimal={busy}
      ontap={() => session.skip()}
    />
  </div>

  <div class="reading">
    <div class="resonance">
      <span>Resonance</span>
      <Pips value={result?.score ?? 0} max={6} tone="ink" />
      <b data-testid="score">{result ? `${result.score} / 6` : '– / 6'}</b>
      {#if tried}<span class="tried" data-testid="tried">tried before</span>{/if}
    </div>
    <p class="margin hand" data-testid="margin">
      {#if bench.written}
        <span class="newrune"><RuneGlyph rune={bench.written} size={30} /></span>
        {RUNES[bench.written].name} is in the notebook.
      {:else if result}
        {marginLine(result)}
      {:else if attempt}
        Try it. A trial is free.
      {:else}
        Two runes and a solvent.
      {/if}
    </p>
  </div>

  <div class="actions">
    <Button
      variant="quiet"
      label="Trial"
      disabled={attempt === null || busy}
      onclick={() => void bench.trial()}
      testid="trial"
    />
    <Button label="Write in ink" disabled={!canWrite} onclick={() => bench.write()} testid="write" />
  </div>

  <SilhouetteList silhouettes={sils} />

  <Sheet open={state.picking !== null} title={pickerTitle} onclose={() => bench.closePicker()}>
    {#if state.picking === 'solvent'}
      {#if solvents.length === 0}
        <p class="note">No solvent yet. The Seam gives them up, now and then.</p>
      {:else}
        <ul class="solvents" data-testid="solvent-picker">
          {#each solvents as s (s.id)}
            <li>
              <button
                type="button"
                class="solvent"
                class:dry={s.count === 0}
                data-testid="solvent-{s.id}"
                onclick={() => bench.pickSolvent(s.id)}
              >
                <SolventIcon solvent={s.id} size={30} />
                <span class="sname">{SOLVENTS[s.id].name}</span>
                <span class="count">{s.count}</span>
              </button>
            </li>
          {/each}
        </ul>
        <p class="note">A solvent you have run out of can still be tried, but not written with.</p>
      {/if}
    {:else}
      <RuneShelf
        slots={shelf}
        tool={NO_TOOL}
        onselect={(t) => t.kind === 'rune' && pickRune(t.rune)}
        onreject={(reason) => toast(reason)}
      />
      {#if state.left || state.right}
        <p class="note">
          Already chosen:
          {#each [state.left, state.right] as r, i (i)}
            {#if r}<span class="chip"><RuneGlyph rune={r} size={18} />{RUNES[r].name}</span>{/if}
          {/each}
        </p>
      {/if}
    {/if}
  </Sheet>
</div>

<style>
  .bench {
    display: flex;
    flex-direction: column;
    gap: 6px;
    height: 100%;
    padding: 0 var(--space-2) 16px;
  }
  header {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    flex: none;
    min-height: 44px;
  }
  .back {
    display: inline-grid;
    place-items: center;
    width: 44px;
    height: 44px;
    color: var(--ink);
    font-size: 22px;
    text-decoration: none;
  }
  h1 {
    flex: 1;
    margin: 0;
    font-size: 21px;
    font-weight: normal;
    font-style: italic;
  }
  .stock {
    font: 12px var(--mono);
    color: var(--ink-soft);
  }
  .stage {
    flex: none;
    height: 190px;
    min-height: 0;
  }
  .reading {
    flex: none;
  }
  .resonance {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: 14px;
  }
  .resonance b {
    font: 13px var(--mono);
  }
  .tried {
    margin-left: auto;
    color: var(--ink-faint);
    font-size: 12px;
    font-style: italic;
  }
  .margin {
    margin: 2px 0 0;
    min-height: 30px;
    font-size: 21px;
    line-height: 1.2;
    color: var(--accent);
  }
  .newrune {
    display: inline-block;
    vertical-align: middle;
    margin-right: var(--space-1);
  }
  .hand {
    font-family: var(--hand);
  }
  .actions {
    display: grid;
    grid-template-columns: 1fr 1.4fr;
    gap: var(--space-2);
    flex: none;
  }
  .solvents {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .solvent {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    width: 100%;
    min-height: 72px;
    padding: var(--space-1);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--parchment-dark);
    color: var(--ink);
    cursor: pointer;
  }
  .solvent.dry {
    opacity: 0.55;
  }
  .sname {
    font-size: 14px;
  }
  .count {
    font: 12px var(--mono);
    color: var(--ink-soft);
  }
  .note {
    margin: var(--space-2) 0 0;
    font-size: 13px;
    color: var(--ink-soft);
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    margin-left: var(--space-1);
  }
</style>
