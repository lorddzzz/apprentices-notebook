<script lang="ts">
  import { SCENARIOS } from '$data';
  import { lab } from '../../app/instance';
  import { labLocation } from '../../app/lab';
  import { go, router } from '../../app/router.svelte';
  import { href } from '../../app/routes';
  import { toast } from '../../app/toasts.svelte';
  import BattleView from '../components/battle/BattleView.svelte';
  import Button from '../components/common/Button.svelte';
  import Sheet from '../components/common/Sheet.svelte';
  import LabBar from '../components/lab/LabBar.svelte';

  const wanted = $derived(labLocation(router.params).scenario);
  let menuOpen = $state(false);

  // The URL picks the scenario; unknown ids fall back to the sandbox (and the URL follows).
  $effect(() => {
    const id = wanted;
    if (lab.session && lab.scenario?.id === id) return;
    const unknown = lab.load(id);
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
</script>

<div class="lab" data-testid="lab">
  {#if lab.session && lab.scenario}
    {@const session = lab.session}
    {@const scenario = lab.scenario}
    {#key session}
    <BattleView {session} continueLabel="Play again" oncontinue={reset}>
      {#snippet top()}
        <LabBar
          scenarios={SCENARIOS}
          current={scenario}
          round={session.state.round}
          onpick={pick}
          onmenu={() => (menuOpen = true)}
        />
      {/snippet}
    </BattleView>
    {/key}

    <Sheet open={menuOpen} title={scenario.title} onclose={() => (menuOpen = false)}>
      <p class="note">{scenario.note}</p>
      <p class="hint">Lab battles never spend charges. Members without a scenario lattice use their starting lattice.</p>
      <div class="menu">
        <Button label="Reset scenario" onclick={reset} testid="reset" />
        <a class="link" href={href('gallery', { part: 'board' })}>Gallery</a>
        <a class="link" href={href('study')}>Study</a>
      </div>
    </Sheet>
  {/if}
</div>

<style>
  .lab {
    height: 100%;
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
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }
  .link {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
  }
</style>
