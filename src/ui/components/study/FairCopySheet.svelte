<script lang="ts">
  import { RUNES } from '$data';
  import { label } from '$engine';
  import type { FairPreview } from '../../../app/faircopy';
  import Button from '../common/Button.svelte';
  import Sheet from '../common/Sheet.svelte';
  import RuneGlyph from '../RuneGlyph.svelte';

  interface Props {
    /** What the Fair copy would do, or null (closed). */
    preview: FairPreview | null;
    vellum: number;
    onclose: () => void;
    /** Does the Fair copy under this name. Returns why not, or null. */
    onconfirm: (name: string) => string | null;
  }

  let { preview, vellum, onclose, onconfirm }: Props = $props();

  let typed = $state<string | null>(null);
  let error = $state<string | null>(null);
  // The idiom's name until the player types their own.
  const name = $derived(typed ?? preview?.suggestedName ?? '');
  const blocked = $derived((preview?.blocking.length ?? 0) > 0 || !preview?.canAfford);

  function close(): void {
    typed = null;
    error = null;
    onclose();
  }

  function confirm(): void {
    error = onconfirm(name);
    if (error === null) {
      typed = null;
    }
  }
</script>

<Sheet open={preview !== null} title="Fair copy" onclose={close}>
  {#if preview}
    <ol class="chain" data-testid="fair-chain" aria-label="The selected runes in order">
      {#each preview.chain as step (`${step.at.x},${step.at.y}`)}
        <li title={`${RUNES[step.rune].name} at ${label(step.at)}`}>
          <RuneGlyph rune={step.rune} dir={step.dir} size={34} />
        </li>
      {/each}
    </ol>
    <p class="ink" data-testid="fair-ink">
      Ink <b>{preview.inkBefore}</b> &rarr; <b>{preview.inkAfter}</b>
      <span class="cells">{preview.chain.length} runes, one socket</span>
    </p>

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
        {preview.disconnected.map((d) => `${d.name} at ${label(d.at)}`).join(', ')}.
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
  .cells {
    margin-left: var(--space-2);
    font-size: 13px;
    color: var(--ink-soft);
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
