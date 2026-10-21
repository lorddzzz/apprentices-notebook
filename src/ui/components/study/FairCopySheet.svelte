<script lang="ts">
  import { type Coord, latticeLabel, nameOf, sameCoord } from '$engine';
  import { type FairPreview, openCellOf } from '../../../app/faircopy';
  import Button from '../common/Button.svelte';
  import Sheet from '../common/Sheet.svelte';
  import RuneGlyph from '../RuneGlyph.svelte';

  interface Props {
    /** What the Fair copy would do, or null (closed). */
    preview: FairPreview | null;
    vellum: number;
    onclose: () => void;
    /** Does the Fair copy under this name, with `open` (a local cell) left open, if any. Returns why not, or null. */
    onconfirm: (name: string, open: Coord | null) => string | null;
  }

  let { preview, vellum, onclose, onconfirm }: Props = $props();

  let typed = $state<string | null>(null);
  let error = $state<string | null>(null);
  // The chain step (an outer cell) left open for an argument, if any (M22).
  let openAt = $state<Coord | null>(null);
  const openable = $derived(preview?.chain.filter((s) => s.openable) ?? []);
  const openLocal = $derived(openCellOf(preview, openAt));
  const name = $derived(typed ?? '');
  const blocked = $derived((preview?.blocking.length ?? 0) > 0 || !preview?.canAfford);

  function close(): void {
    typed = null;
    error = null;
    openAt = null;
    onclose();
  }

  function confirm(): void {
    error = onconfirm(name, openLocal);
    if (error === null) {
      typed = null;
      openAt = null;
    }
  }
</script>

<Sheet open={preview !== null} title="Fair copy" onclose={close}>
  {#if preview}
    <ol class="chain" data-testid="fair-chain" aria-label="The selected runes in order">
      {#each preview.chain as step (`${step.at.x},${step.at.y}`)}
        <li title={`${nameOf(step.rune)} at ${latticeLabel(step.at)}`}>
          <RuneGlyph rune={step.rune} dir={step.dir} size={34} />
        </li>
      {/each}
    </ol>
    <p class="ink" data-testid="fair-ink">
      Ink <b>{preview.inkBefore}</b> &rarr; <b>{preview.inkAfter}</b>
      <span class="cells">{preview.chain.length} runes, one socket</span>
    </p>

    {#if preview.slides > 0}
      <p class="slide" data-testid="fair-slide">
        {preview.slides} {preview.slides === 1 ? 'rune slides' : 'runes slide'} up to meet the new
        socket.
      </p>
    {/if}

    {#if openable.length > 0}
      <div class="open" data-testid="fair-open">
        <p class="hint">
          <b>Leave a cell open</b> (optional). Tap a rune whose place you want to choose each time
          you put the Fair copy down.
        </p>
        <div class="picks">
          {#each openable as step (`${step.at.x},${step.at.y}`)}
            {@const on = openAt !== null && sameCoord(openAt, step.at)}
            <button
              type="button"
              class="pick"
              class:on
              aria-pressed={on}
              title={`${nameOf(step.rune)} at ${latticeLabel(step.at)}`}
              data-testid="fair-open-pick"
              onclick={() => (openAt = on ? null : step.at)}
            >
              <RuneGlyph rune={step.rune} dir={step.dir} size={30} />
              {#if on}<span class="badge">( )</span>{/if}
            </button>
          {/each}
        </div>
      </div>
    {/if}

    <label class="field">
      <span>Name</span>
      <input
        type="text"
        value={name}
        placeholder="Name this Fair copy"
        maxlength="24"
        autocomplete="off"
        spellcheck="false"
        oninput={(e) => (typed = e.currentTarget.value)}
        data-testid="fair-name"
      />
    </label>

    {#each preview.blocking as msg (msg)}
      <p class="block" data-testid="fair-block">{msg}.</p>
    {/each}
    {#if preview.disconnected.length > 0}
      <p class="warn" data-testid="fair-warn">
        After the collapse these no longer connect, so you will re-lay them next to the new socket:
        {preview.disconnected.map((d) => `${d.name} at ${latticeLabel(d.at)}`).join(', ')}.
      </p>
    {/if}
    {#if !preview.canAfford}
      <p class="block">Not enough vellum: you have {vellum}.</p>
    {/if}
    {#if error}<p class="block">{error}</p>{/if}

    <div class="row">
      <Button variant="quiet" label="Not yet" onclick={close} />
      <Button
        label={preview.costLine}
        onclick={confirm}
        disabled={blocked || name.trim() === ''}
        testid="fair-confirm"
      />
    </div>
  {/if}
</Sheet>

<style>
  .chain {
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
    margin: 0 0 var(--space-2);
    padding: 0;
    list-style: none;
  }
  .chain li {
    display: flex;
    align-items: center;
  }
  .chain li:not(:last-child)::after {
    content: '\203A';
    margin: 0 1px;
    color: var(--ink-soft);
  }
  .ink {
    margin: 0 0 var(--space-2);
    font-size: 16px;
  }
  .ink b {
    font-family: var(--mono);
  }
  .slide {
    margin: 0 0 var(--space-2);
    font-size: 13px;
    color: var(--ink-soft);
  }
  .cells {
    margin-left: var(--space-2);
    font-size: 13px;
    color: var(--ink-soft);
  }
  .open {
    margin: 0 0 var(--space-2);
  }
  .hint {
    margin: 0 0 var(--space-1);
    font-size: 13px;
    line-height: 1.3;
    color: var(--ink-soft);
  }
  .picks {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }
  .pick {
    position: relative;
    display: grid;
    place-items: center;
    min-width: var(--tap);
    min-height: var(--tap);
    padding: 0;
    border: 2px solid var(--line);
    border-radius: var(--radius);
    background: var(--parchment-dark);
    cursor: pointer;
  }
  .pick.on {
    border-color: var(--lamp);
    background: rgba(232, 176, 74, 0.35);
  }
  .badge {
    position: absolute;
    top: -4px;
    right: -4px;
    padding: 0 3px;
    border-radius: 3px;
    background: var(--parchment);
    font: 700 11px var(--mono);
    line-height: 14px;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 13px;
    color: var(--ink-soft);
  }
  input {
    min-height: var(--tap);
    padding: 0 var(--space-2);
    border: 2px solid var(--line);
    border-radius: var(--radius);
    background: var(--parchment-dark);
    color: var(--ink);
    font: 16px var(--hand);
  }
  .warn,
  .block {
    margin: var(--space-2) 0 0;
    font-size: 13px;
    line-height: 1.3;
  }
  .warn {
    color: var(--ink-soft);
  }
  .block {
    color: var(--danger);
  }
  .row {
    display: flex;
    justify-content: space-between;
    gap: var(--space-2);
    margin-top: var(--space-3);
  }
</style>
