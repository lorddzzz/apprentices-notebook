<script lang="ts">
  import Button from '../common/Button.svelte';
  import Sheet from '../common/Sheet.svelte';

  interface Props {
    /** Null = closed. */
    out: { title: string; text: string } | null;
    onclose: () => void;
  }

  let { out, onclose }: Props = $props();
</script>

<Sheet open={out !== null} title={out ? `Copy ${out.title.toLowerCase()}` : 'Copy'} {onclose}>
  <p class="hint">Copying was blocked. Select the text below and copy it by hand.</p>
  <textarea
    readonly
    rows="8"
    value={out?.text ?? ''}
    aria-label="Text to copy"
    data-testid="copy-text"
    onfocus={(e) => e.currentTarget.select()}
  ></textarea>
  <div class="row">
    <Button variant="quiet" label="Close" onclick={onclose} />
  </div>
</Sheet>

<style>
  .hint {
    margin: 0 0 var(--space-2);
    font-size: 13px;
    color: var(--ink-soft);
  }
  textarea {
    width: 100%;
    padding: var(--space-2);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--parchment);
    color: var(--ink);
    font: 16px/1.3 var(--mono);
    -webkit-user-select: text;
    user-select: text;
    resize: none;
  }
  .row {
    display: flex;
    justify-content: flex-end;
    margin-top: var(--space-2);
  }
</style>
