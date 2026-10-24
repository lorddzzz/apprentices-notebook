<script lang="ts">
  import { HABITS, MEMBERS } from '$data';
  import { compileLattice, openAll } from '$engine';
  import { IDLE } from '../../app/battleInput';
  import { game, lab } from '../../app/instance';
  import { LAB_SCENARIOS, labLocation, PALETTE, variantGroups } from '../../app/lab';
  import { overlayFor } from '../../app/overlay';
  import { go, router } from '../../app/router.svelte';
  import { href } from '../../app/routes';
  import { shelfSlots } from '../../app/study';
  import { toast } from '../../app/toasts.svelte';
  import BattleView from '../components/battle/BattleView.svelte';
  import BattleBoard from '../components/board/BattleBoard.svelte';
  import Button from '../components/common/Button.svelte';
  import HabitFinePrint from '../components/common/HabitFinePrint.svelte';
  import Sheet from '../components/common/Sheet.svelte';
  import CopySheet from '../components/lab/CopySheet.svelte';
  import LabBar from '../components/lab/LabBar.svelte';
  import LabInvention from '../components/lab/LabInvention.svelte';
  import LabLineup from '../components/lab/LabLineup.svelte';
  import LabVariants from '../components/lab/LabVariants.svelte';
  import MemberPicker from '../components/lab/MemberPicker.svelte';
  import Palette from '../components/lab/Palette.svelte';
  import LatticeEditor from '../components/lattice/LatticeEditor.svelte';

  const where = $derived(labLocation(router.params));
  let menuOpen = $state(false);
  let inventOpen = $state(false);
  let variantsOpen = $state(false);
  let lineupOpen = $state(false);
  const variantList = variantGroups();
  const inventions = $derived(lab.session?.state.inventions ?? {});

  // The URL picks the scenario; unknown ids fall back to the sandbox (and the URL follows).
  $effect(() => {
    const { scenario: id, demo } = where;
    if (lab.session && lab.scenario?.id === id) return;
    const unknown = lab.load(id, { demo });
    if (unknown !== null) {
      toast(`Unknown scenario "${unknown}"`, 'warn');
      go('lab', { scenario: lab.scenario?.id ?? 'sandbox' }, { replace: true });
    }
  });

  function pick(id: string): void {
    go('lab', { scenario: id }, { replace: true });
  }

  function reset(): void {
    menuOpen = false;
    lab.reset();
  }

  function run(fn: () => void): void {
    menuOpen = false;
    fn();
  }

  const paintName = $derived(PALETTE.find((p) => p.item === lab.palette)?.name ?? '');
  const slots = $derived(
    shelfSlots(null, lab.lattices[lab.member], null, {}, inventions, lab.member),
  );
  // Start points show as reach tints in Board mode.
  const startTints = $derived(
    lab.starts.map((at) => ({ kind: 'reach' as const, at: { x: at.x, y: at.y } })),
  );
  // The bookmarks hold the lineup and the open page's owner; the picker below reaches everyone.
  const bookmarks = $derived(
    lab.lineup.includes(lab.member) ? lab.lineup : [...lab.lineup, lab.member],
  );
  const lattice = $derived(lab.lattices[lab.member]);
  const memberHabit = $derived(MEMBERS[lab.member].lean.habit);
  const compiled = $derived(compileLattice(lattice, {}, inventions, MEMBERS[lab.member].lean));

  // Dev builds and `?dev` get the city shortcuts (K-24).
  const devTools = $derived(
    import.meta.env.DEV ||
      router.params.has('dev') ||
      new URLSearchParams(window.location.search).has('dev'),
  );
</script>

<div class="lab" data-testid="lab">
  {#if lab.session && lab.scenario}
    {@const session = lab.session}
    {@const scenario = lab.scenario}
    {#snippet bar()}
      <LabBar
        scenarios={LAB_SCENARIOS}
        current={scenario}
        round={session.state.round}
        mode={lab.mode}
        onmode={(m) => lab.setMode(m)}
        onpick={pick}
        onmenu={() => (menuOpen = true)}
      />
    {/snippet}
    {#key session}
      {#if lab.mode === 'play'}
        <BattleView {session} continueLabel="Play again" oncontinue={reset} top={bar} />
      {:else}
        <section class="workshop">
          {@render bar()}
          {#if lab.mode === 'board'}
            <div class="board-wrap">
              <BattleBoard
                view={session.view}
                overlay={{ ...overlayFor(session.state, IDLE), highlights: startTints }}
                ontap={(at) => lab.paint(at)}
              />
            </div>
            <div class="paint-line">
              <p>
                Painting <b>{paintName}</b>. Tap a tile to place or remove it.
                {#if lab.palette === 'P' || lab.starts.length > 0}
                  <span data-testid="start-count">{lab.starts.length} start {lab.starts.length === 1 ? 'point' : 'points'}.</span>
                {/if}
              </p>
              <button
                type="button"
                class="undo"
                disabled={!lab.canUndo}
                data-testid="undo"
                onclick={() => lab.undo()}
              >
                Undo
              </button>
            </div>
            <Palette selected={lab.palette} onselect={(item) => (lab.palette = item)} />
          {:else}
            <MemberPicker member={lab.member} lineup={lab.lineup} onpick={(m) => (lab.member = m)} />
            {#if memberHabit}
              <div class="habit-print">
                <b>{HABITS[memberHabit].line}</b>
                <HabitFinePrint habit={memberHabit} profile={game.profile} />
              </div>
            {/if}
            <div class="desk">
              <LatticeEditor
                sessionKey={lab.latticeSessionKey()}
                {lattice}
                {compiled}
                {inventions}
                capacity={null}
                {slots}
                tool={lab.tool}
                ontool={(t) => lab.setTool(t)}
                onsocket={(at, longPress) => lab.editLattice(at, longPress)}
                members={bookmarks}
                member={lab.member}
                onmember={(m) => (lab.member = m)}
              />
            </div>
          {/if}
        </section>
      {/if}
    {/key}

    <Sheet open={menuOpen} title={scenario.title} onclose={() => (menuOpen = false)}>
      <p class="note">{scenario.note}</p>
      <p class="hint">
        Lab battles never spend charges, and the lattices have unlimited ink and runes. Anyone in
        the registry can stand in: a page from the scenario, else the one in your notebook, else
        their starter page. Nothing here changes your notebook.
      </p>
      <div class="menu" data-testid="lab-sheet">
        <Button variant="quiet" label="Play demo" onclick={() => run(() => lab.playDemo())} testid="play-demo" />
        <Button variant="quiet" label="Reset scenario" onclick={reset} testid="reset" />
        <Button
          variant="quiet"
          label="Undo last action"
          disabled={!lab.canUndo}
          onclick={() => run(() => lab.undo())}
          testid="undo-last"
        />
        <Button variant="quiet" label="Copy board" onclick={() => run(() => void lab.copy('board'))} testid="copy-board" />
        <Button variant="quiet" label="Copy lattices" onclick={() => run(() => void lab.copy('lattices'))} testid="copy-lattices" />
        <Button variant="quiet" label="Copy as scenario" onclick={() => run(() => void lab.copy('scenario'))} testid="copy-scenario" />
        <Button
          variant="quiet"
          label="Lineup ({lab.lineup.length})"
          onclick={() => run(() => (lineupOpen = true))}
          testid="lab-lineup-open"
        />
        <Button variant="quiet" label="Invent for this Lab" onclick={() => run(() => (inventOpen = true))} testid="invent-lab" />
        <Button
          variant="quiet"
          label={lab.variantsOn.length ? `Footnote variants (${lab.variantsOn.length} on)` : 'Footnote variants'}
          onclick={() => run(() => (variantsOpen = true))}
          testid="lab-variants"
        />
        {#if devTools}
          <Button
            variant="quiet"
            label="Open every district"
            onclick={() => run(() => void game.updateProfile(openAll))}
            testid="open-all"
          />
        {/if}
        <a class="link" href={href('gallery', { part: 'board' })}>Gallery</a>
        <a class="link" href={href('study')}>Study</a>
      </div>
    </Sheet>

    <LabVariants
      open={variantsOpen}
      groups={variantList}
      on={lab.variantsOn}
      ontoggle={(id, value) => lab.toggleVariant(id, value)}
      onclose={() => (variantsOpen = false)}
    />
    <LabLineup
      open={lineupOpen}
      lineup={lab.lineup}
      starts={lab.starts.length}
      canField={lab.canField}
      ontoggle={(id) => lab.toggleLineupMember(id)}
      onfield={() => lab.field()}
      onredraw={() => lab.redraw()}
      onclose={() => (lineupOpen = false)}
    />
    <LabInvention open={inventOpen} {inventions} onadd={(def) => lab.addInvention(def)} onclose={() => (inventOpen = false)} />
    <CopySheet out={lab.copyOut} onclose={() => lab.closeCopy()} />
  {/if}
</div>

<style>
  .lab {
    height: 100%;
  }
  .lab :global(.swatch[data-item^='{'] .g) {
    font-size: 9px;
  }
  .workshop {
    display: flex;
    flex-direction: column;
    gap: 6px;
    height: 100%;
    padding: 0 var(--space-2) 16px;
  }
  .board-wrap {
    flex: 1;
    min-height: 0;
  }
  .paint-line {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex: none;
    min-height: 44px;
    border-left: 3px solid var(--line);
    padding-left: var(--space-2);
  }
  .paint-line p {
    flex: 1;
    margin: 0;
    font-size: 13px;
    line-height: 1.3;
  }
  .undo {
    min-width: 64px;
    height: 44px;
    border: 2px solid var(--line);
    border-radius: var(--radius);
    background: var(--parchment-dark);
    color: var(--ink);
    font: 15px Georgia, serif;
    cursor: pointer;
  }
  .undo:disabled {
    opacity: 0.4;
    cursor: default;
  }
  /* the Study's desk: the notebook page and its shelf sit on dark wood */
  .habit-print {
    padding: 2px 8px;
    font-size: 13px;
  }
  .desk {
    flex: 1;
    min-height: 0;
    padding: 6px;
    border-radius: var(--radius);
    background:
      repeating-linear-gradient(90deg, transparent 0 58px, rgba(0, 0, 0, 0.18) 58px 59px),
      linear-gradient(var(--wood-dark), #3a281c);
  }
  .note {
    margin: 0 0 var(--space-2);
    font-style: italic;
  }
  .hint {
    margin: 0 0 var(--space-3);
    font-size: 13px;
    color: var(--ink-soft);
  }
  .menu {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: center;
    gap: var(--space-2);
  }
  .link {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
  }
</style>
