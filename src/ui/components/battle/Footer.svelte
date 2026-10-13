<script lang="ts">
  import Button from '../common/Button.svelte';

  interface Props {
    /** What the left button does: open the log, or step back out of targeting. */
    left: 'log' | 'cancel';
    /** What the right button does. `confirm-wait`: targeting, nothing to confirm yet. */
    right: 'end' | 'confirm' | 'confirm-wait' | 'skip' | 'none';
    armed: boolean;
    confirmLabel: string;
    onlog: () => void;
    oncancel: () => void;
    onconfirm: () => void;
    onendturn: () => void;
    onskip: () => void;
  }

  let {
    left,
    right,
    armed,
    confirmLabel,
    onlog,
    oncancel,
    onconfirm,
    onendturn,
    onskip,
  }: Props = $props();
</script>

<footer class="footer" data-testid="footer">
  <div class="left">
    {#if left === 'cancel'}
      <Button variant="quiet" label="Cancel" onclick={oncancel} testid="cancel" />
    {:else}
      <Button variant="quiet" label="Log" onclick={onlog} testid="log" />
    {/if}
  </div>
  <div class="right">
    {#if right === 'confirm' || right === 'confirm-wait'}
      <Button
        label={right === 'confirm' ? `Confirm ${confirmLabel}` : 'Pick a target'}
        disabled={right === 'confirm-wait'}
        onclick={onconfirm}
        testid="confirm"
      />
    {:else if right === 'skip'}
      <Button variant="quiet" label="Skip ▸▸" onclick={onskip} testid="skip" />
    {:else if right === 'end'}
      <Button
        variant={armed ? 'danger' : 'primary'}
        label={armed ? 'End turn?' : 'End turn ▸'}
        onclick={onendturn}
        testid="end-turn"
      />
    {/if}
  </div>
</footer>

<style>
  .footer {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--space-2);
    height: 48px;
    flex: none;
    align-items: center;
  }
  .right {
    display: flex;
    justify-content: flex-end;
    min-width: 0;
  }
  .right :global(.btn) {
    max-width: 100%;
    min-width: 140px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
</style>
