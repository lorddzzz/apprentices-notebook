<script lang="ts">
  import { RUNE_IDS, RUNES } from '$data';
  import type { Dir } from '$engine';
  import { router } from '../../app/router.svelte';
  import { toast } from '../../app/toasts.svelte';
  import BackLink from '../components/common/BackLink.svelte';
  import Button from '../components/common/Button.svelte';
  import Pips from '../components/common/Pips.svelte';
  import Sheet from '../components/common/Sheet.svelte';
  import RuneGlyph from '../components/RuneGlyph.svelte';

  const DIR_LIST: Dir[] = ['up', 'right', 'down', 'left'];
  const part = $derived(router.params.get('part') ?? 'glyphs');

  let sheetOpen = $state(false);
</script>

<section data-testid="gallery">
  <header>
    <BackLink to="lab" label="Lab" />
    <h1>Gallery</h1>
  </header>

  {#if part === 'glyphs'}
    <h2>Runes</h2>
    <ul class="runes" data-testid="glyphs">
      {#each RUNE_IDS as id (id)}
        <li>
          <RuneGlyph rune={id} dir={RUNES[id].arrow ? 'right' : undefined} size={56} />
          <span class="name">{RUNES[id].name}</span>
          <span class="family">{RUNES[id].family}</span>
        </li>
      {/each}
      <li>
        <RuneGlyph rune={null} size={56} />
        <span class="name">???</span>
        <span class="family">unknown</span>
      </li>
    </ul>

    <h2>Arrow runes, four ways</h2>
    {#each ['bolt', 'bend'] as const as id (id)}
      <div class="row">
        <span class="label">{RUNES[id].name}</span>
        {#each DIR_LIST as d (d)}
          <RuneGlyph rune={id} dir={d} size={48} />
        {/each}
      </div>
    {/each}

    <h2>States</h2>
    <div class="row">
      <RuneGlyph rune="ink" size={48} />
      <RuneGlyph rune="ink" size={48} selected />
      <RuneGlyph rune="ink" size={48} dim />
    </div>

    <h2>Parts</h2>
    <div class="row">
      <Pips value={3} max={6} />
      <Pips value={2} max={3} tone="charge" />
      <Pips value={7} max={12} />
      <Button label="Toast" variant="quiet" onclick={() => toast('A small toast')} />
      <Button label="Sheet" onclick={() => (sheetOpen = true)} />
    </div>
  {:else}
    <p>No gallery part "{part}" yet.</p>
  {/if}

  <Sheet open={sheetOpen} title="A sheet" onclose={() => (sheetOpen = false)}>
    <p>Bottom sheets hold menus and the copy fallback.</p>
    <Button variant="danger" label="Close it" onclick={() => (sheetOpen = false)} />
  </Sheet>
</section>

<style>
  section {
    height: 100%;
    overflow-y: auto;
    padding: 0 var(--space-3) var(--space-4);
  }
  header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }
  h1 {
    margin: 0;
    font-weight: normal;
  }
  h2 {
    margin: var(--space-3) 0 var(--space-2);
    font-size: 14px;
    font-weight: normal;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-soft);
  }
  .runes {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-3) var(--space-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }
  .name {
    font-size: 14px;
  }
  .family {
    font-size: 11px;
    color: var(--ink-soft);
    text-transform: uppercase;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-3);
    margin-bottom: var(--space-2);
  }
  .label {
    width: 48px;
    font-size: 14px;
  }
</style>
