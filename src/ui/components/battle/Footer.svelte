<script lang="ts">
  import Button from '../common/Button.svelte';

  interface Props {
    /** What the left button does: open the log, or step back out of targeting. */
    left: 'log' | 'cancel';
    /** What the right button does. `confirm-wait`: targeting, nothing to confirm yet. */
    right: 'end' | 'confirm' | 'confirm-wait' | 'skip' | 'none';
    armed: boolean;
    confirmLabel: string;
    /** The previewed action would hurt the party: say so beside the confirm button (D3). */
    hurtsParty?: boolean;
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
    hurtsParty = false,
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
      {#if right === 'confirm' && hurtsParty}
        <span class="hurt" data-testid="hurt-warning">Your party will be hurt</span>
      {/if}
      <Button
        label={right === 'confirm'
          ? hurtsParty
            ? 'Confirm anyway'
            : `Confirm ${confirmLabel}`
          : 'Pick a target'}
        variant={right === 'confirm' && hurtsParty ? 'danger' : 'primary'}
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
    align-items: center;
    gap: var(--space-2);
    justify-content: flex-end;
    min-width: 0;
  }
  .hurt {
    flex: 0 1 auto;
    min-width: 0;
    max-width: 96px;
    font-size: 11px;
    font-weight: bold;
    line-height: 1.15;
    color: var(--danger);
    text-align: right;
  }
  .right :global(.btn) {
    max-width: 100%;
    min-width: 140px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
</style>
