<script lang="ts">
  import type { Snippet } from 'svelte';
  import { prefs } from '../../../app/prefs.svelte';
  import { swipeCloses } from './sheetSwipe';

  /**
   * The bottom sheet. Closes by tap-out, the ✕, Escape, or a downward swipe that starts on the
   * handle or the title row (never on the scrolling body, so scrolling can't close it). Paper
   * follows the world root the sheet is mounted in. Reduced motion: it fades instead of sliding.
   */
  interface Props {
    open: boolean;
    title: string;
    onclose: () => void;
    children: Snippet;
    /** 'auto' grows with content up to 70% of the screen, 'tall' up to 86%. */
    size?: 'auto' | 'tall';
  }

  let { open, title, onclose, children, size = 'auto' }: Props = $props();

  let dragY = $state(0);
  let drag: { id: number; startY: number; startT: number } | null = null;

  function down(e: PointerEvent) {
    if (e.button > 0 || (e.target as Element).closest('button')) return;
    drag = { id: e.pointerId, startY: e.clientY, startT: e.timeStamp };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }
  function move(e: PointerEvent) {
    if (!drag || e.pointerId !== drag.id) return;
    dragY = Math.max(0, e.clientY - drag.startY);
  }
  function up(e: PointerEvent) {
    if (!drag || e.pointerId !== drag.id) return;
    const closes = swipeCloses(
      e.clientY - drag.startY,
      e.timeStamp - drag.startT,
      (e.currentTarget as HTMLElement).parentElement?.offsetHeight ?? 0,
    );
    drag = null;
    dragY = 0;
    if (closes) onclose();
  }
  function cancel() {
    drag = null;
    dragY = 0;
  }
</script>

<svelte:window onkeydown={(e) => open && e.key === 'Escape' && onclose()} />

{#if open}
  <div class="overlay" class:reduced={prefs.reduced}>
    <button type="button" class="scrim" aria-label="Close" onclick={onclose}></button>
    <div
      class="sheet panel {size}"
      class:dragging={dragY > 0}
      style:transform={dragY > 0 ? `translateY(${dragY}px)` : undefined}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        class="grip"
        role="presentation"
        data-testid="sheet-grip"
        onpointerdown={down}
        onpointermove={move}
        onpointerup={up}
        onpointercancel={cancel}
      >
        <span class="handle" aria-hidden="true"></span>
        <header>
          <h2>{title}</h2>
          <button type="button" class="close tap" aria-label="Close" onclick={onclose}
            >&times;</button
          >
        </header>
      </div>
      <div class="body">{@render children()}</div>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: absolute;
    inset: 0;
    z-index: 20;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
  }
  .scrim {
    position: absolute;
    inset: 0;
    border: 0;
    padding: 0;
    background: rgba(43, 33, 24, 0.5);
    cursor: default;
    animation: fade var(--dur-quick) ease-out;
  }
  .panel {
    position: relative;
    display: flex;
    flex-direction: column;
    max-height: 70%;
    padding-bottom: var(--safe-bottom);
    border-top: 2px solid var(--parchment-deep);
    border-radius: 14px 14px 0 0;
    background: var(--world-paper, var(--parchment));
    box-shadow: 0 -8px 24px rgba(43, 33, 24, 0.35);
    color: var(--ink);
    font-family: var(--font-serif);
    animation: rise var(--dur-quick) ease-out;
  }
  .panel.tall {
    max-height: 86%;
  }
  .reduced .panel {
    animation: fade var(--dur-quick) ease-out;
  }
  .panel.dragging {
    animation: none;
    transition: none;
  }
  /* The drag zone: the handle and the title row. touch-action keeps the browser from scrolling. */
  .grip {
    flex: none;
    touch-action: none;
    cursor: grab;
  }
  .handle {
    display: block;
    width: 40px;
    height: 5px;
    margin: var(--space-2) auto 0;
    border-radius: 3px;
    background: var(--ink-faint);
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 var(--space-2) 0 var(--space-3);
    border-bottom: 1px solid var(--line);
  }
  h2 {
    margin: 0;
    font-size: var(--type-lg);
    font-weight: normal;
  }
  .close {
    min-width: var(--tap);
    min-height: var(--tap);
    border: 0;
    background: none;
    font-size: 28px;
    line-height: 1;
    cursor: pointer;
  }
  .close:focus-visible {
    outline: 3px solid var(--select);
    outline-offset: -3px;
  }
  .body {
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: var(--space-3);
    -webkit-user-select: text;
    user-select: text;
  }
  @keyframes rise {
    from {
      transform: translateY(24px);
      opacity: 0;
    }
  }
  @keyframes fade {
    from {
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .panel,
    .scrim {
      animation-name: fade;
    }
  }
</style>
