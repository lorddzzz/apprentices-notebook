<script lang="ts">
  import type { Snippet } from 'svelte';
  import { MAP_CAPTION_WIDTH, type MapNode, nodeTag } from '../../../app/city';
  import { href } from '../../../app/routes';
  import { DISTRICT_UI } from '../../districts';

  interface Props {
    node: MapNode;
    onopen: () => void;
    /** Drawn below the caption: the Seam's slot for the lower Seam and the owner's door. */
    under?: Snippet;
  }

  let { node, onopen, under }: Props = $props();
  const open = $derived(node.state === 'open');
  /** The district's own solved art (its UI module), if it has one. */
  const Art = $derived(node.solved ? DISTRICT_UI[node.id]?.solvedArt?.[node.solvedArt] : undefined);
</script>

<div
  class="node {node.label}"
  class:open
  class:heard={!open}
  class:fresh={node.fresh}
  style:left="{node.x}%"
  style:top="{node.y}%"
  style:--caption-w="{MAP_CAPTION_WIDTH}px"
  data-testid={`node-${node.id}`}
  data-state={node.state}
  data-label={node.label}
  data-lean={node.lean}
>
  <svg class="mark" viewBox="0 0 24 24" aria-hidden="true">
    {#if Art}
      <Art />
    {:else if node.solved}
      <!-- a district with no art of its own yet: a ringed dot with a tick through it -->
      <circle cx="12" cy="12" r="8" class="char" />
      <path d="M8 12l3 3 5-6" class="char" />
    {:else}
      <circle cx="12" cy="12" r="6" class="dot" />
    {/if}
  </svg>
  <div class="caption">
    {#if open}
      <button type="button" class="name" onclick={onopen} data-testid={`open-${node.id}`}>
        {node.name}{#if node.heart}<span class="heart" role="img" aria-label="heart cleared"> ✦</span>{/if}
      </button>
    {:else}
      <h2 class="name smudge">{node.name}</h2>
    {/if}
    <p class="tag">{nodeTag(node)}</p>
    {#if node.checkpoint}
      <p class="doorway" data-testid={`checkpoint-${node.id}`}>
        <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 11V5a4 4 0 0 1 8 0v6M2 11h8" /></svg>
        {node.checkpoint}
      </p>
    {/if}
    {#if !open}
      <p class="line">&ldquo;{node.line}&rdquo;</p>
      <p class="barred">{node.barred}</p>
      {#if node.tryLock}
        <a class="lock" href={href('threshold', { d: node.id })} data-testid={`try-lock-${node.id}`}>
          Try the lock
        </a>
      {/if}
    {/if}
    {@render under?.()}
  </div>
</div>

<style>
  /* The anchor is the centre of the 28px mark; the caption sits on the side `label` names. */
  .node {
    position: absolute;
    display: flex;
    width: var(--caption-w);
  }
  .node.below {
    transform: translate(-50%, -14px);
    flex-direction: column;
    align-items: center;
  }
  .node.above {
    transform: translate(-50%, calc(-100% + 14px));
    flex-direction: column-reverse;
    align-items: center;
  }
  .node.left,
  .node.right {
    align-items: flex-start;
    width: calc(var(--caption-w) + 28px);
  }
  .node.left {
    transform: translate(calc(-100% + 14px), -14px);
    flex-direction: row-reverse;
  }
  .node.right {
    transform: translate(-14px, -14px);
    flex-direction: row;
  }
  .caption {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 0;
    text-align: center;
  }
  .left .caption {
    align-items: flex-end;
    text-align: right;
  }
  .right .caption {
    align-items: flex-start;
    text-align: left;
  }
  .mark {
    flex: none;
    width: 28px;
    height: 28px;
    overflow: visible;
  }
  .dot {
    fill: var(--ink);
    stroke: var(--ink);
    stroke-width: 1.5;
  }
  .heard .dot {
    fill: var(--ink-faint);
    stroke: var(--ink-faint);
    stroke-dasharray: 3 3;
    filter: blur(1px);
  }
  .char {
    fill: none;
    stroke: var(--ink);
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .name {
    margin: 0;
    padding: 0 var(--space-1);
    font: inherit;
    font-size: 16px;
    font-weight: bold;
    color: var(--ink);
    background: none;
    border: 0;
    border-bottom: 2px solid var(--ink);
    min-height: var(--tap);
    cursor: pointer;
  }
  .smudge {
    min-height: 0;
    border-bottom: 0;
    color: var(--ink-soft);
    filter: blur(0.5px);
    cursor: default;
  }
  .tag {
    margin: 0;
    font-size: 12px;
    color: var(--ink-soft);
  }
  .doorway {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    margin: var(--space-1) 0 0;
    font-size: 12px;
    font-style: italic;
    color: var(--accent);
  }
  .doorway svg {
    flex: none;
    width: 12px;
    height: 12px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.5;
    stroke-linecap: round;
  }
  .line {
    margin: var(--space-1) 0 0;
    font-family: var(--hand);
    font-size: 17px;
    color: var(--ink-soft);
  }
  .barred {
    margin: var(--space-1) 0 0;
    font-size: 12px;
    font-style: italic;
    color: var(--ink-soft);
  }
  .lock {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-top: var(--space-1);
    padding: 0 var(--space-3);
    min-height: var(--tap);
    border: 2px solid var(--accent);
    border-radius: var(--radius);
    color: var(--accent);
    font-weight: bold;
    text-decoration: none;
  }
  .heart {
    color: var(--accent);
  }
  .fresh .name {
    color: var(--m-ink);
    border-bottom-color: var(--m-ink);
  }
  .fresh .mark {
    animation: fresh-ink 1.4s ease-out;
  }
  @keyframes fresh-ink {
    from {
      transform: scale(0.2);
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .fresh .mark {
      animation: none;
    }
  }
</style>
