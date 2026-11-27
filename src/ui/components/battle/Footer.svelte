<script lang="ts">
  import ActionButton from '../common/ActionButton.svelte';
  import LogLine from './LogLine.svelte';

  interface Props {
    /** `cancel` shows a Cancel beside the log button: targeting steps back one level. */
    left: 'log' | 'cancel';
    /** What the main button does. `confirm-wait`: targeting, nothing to confirm yet. */
    right: 'end' | 'confirm' | 'confirm-wait' | 'skip' | 'none';
    armed: boolean;
    confirmLabel: string;
    /** The previewed action would hurt the party: the confirm button says so (D3). */
    hurtsParty?: boolean;
    /** The playback readout, for the log button's accessible name. */
    logLine?: string | null;
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
    logLine = null,
    onlog,
    oncancel,
    onconfirm,
    onendturn,
    onskip,
  }: Props = $props();
</script>

<!-- One row, 52 px: the log button, then the controls of the input state; one primary at most. -->
<footer class="footer" data-testid="footer">
  <LogLine line={logLine} disabled={right === 'skip'} {onlog} />
  {#if left === 'cancel'}
    <div class="cell side">
      <ActionButton kind="secondary" label="Cancel" onclick={oncancel} testid="cancel" />
    </div>
  {/if}
  <div class="cell main">
    {#if right === 'confirm' || right === 'confirm-wait'}
      <ActionButton
        kind="primary"
        danger={right === 'confirm' && hurtsParty}
        disabled={right === 'confirm-wait'}
        onclick={onconfirm}
        testid="confirm"
      >
        {#if right === 'confirm-wait'}
          Pick a target
        {:else if hurtsParty}
          <span class="two">
            <span>Confirm anyway</span>
            <span class="hurt" data-testid="hurt-warning">Your party will be hurt</span>
          </span>
        {:else}
          Confirm {confirmLabel}
        {/if}
      </ActionButton>
    {:else if right === 'skip'}
      <ActionButton kind="secondary" label="Skip ▸▸" onclick={onskip} testid="skip" />
    {:else if right === 'end'}
      <ActionButton
        kind="primary"
        danger={armed}
        label={armed ? 'End turn?' : 'End turn →'}
        onclick={onendturn}
        testid="end-turn"
      />
    {/if}
  </div>
</footer>

<style>
  .footer {
    display: flex;
    gap: 6px;
    height: 52px;
    flex: none;
    align-items: stretch;
  }
  .cell {
    display: flex;
    min-width: 0;
  }
  .side {
    flex: 0 0 96px;
  }
  .main {
    flex: 1 1 0;
  }
  .cell :global(.action) {
    flex: 1;
    min-width: 0;
    height: 52px;
    padding: 0 var(--space-2);
    overflow: hidden;
    line-height: 1.1;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .two {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 0;
  }
  .hurt {
    font-size: var(--type-xs);
    font-weight: bold;
  }
</style>
