<script lang="ts">
  import { type MapNode, nodeTag } from '../../../app/city';
  import { href } from '../../../app/routes';

  interface Props {
    node: MapNode;
    onopen: () => void;
  }

  let { node, onopen }: Props = $props();
  const open = $derived(node.state === 'open');
</script>

<div
  class="node"
  class:open
  class:heard={!open}
  class:fresh={node.fresh}
  style:left="{node.x}%"
  style:top="{node.y}%"
  data-testid={`node-${node.id}`}
  data-state={node.state}
>
  <svg class="mark" viewBox="0 0 24 24" aria-hidden="true">
    {#if node.burntGate}
      <!-- a burnt gate: two posts, a charred bar and a flick of flame -->
      <path d="M5 21V8M19 21V8M5 12h14M5 17h14" class="char" />
      <path d="M12 3c2 3 3 4 1 7-2-1-4-4-1-7z" class="flame" />
    {:else}
      <circle cx="12" cy="12" r="6" class="dot" />
    {/if}
  </svg>
  {#if open}
    <button type="button" class="name" onclick={onopen} data-testid={`open-${node.id}`}>
      {node.name}{#if node.heart}<span class="heart" role="img" aria-label="heart cleared"> ✦</span>{/if}
    </button>
  {:else}
    <h2 class="name smudge">{node.name}</h2>
  {/if}
  <p class="tag">{nodeTag(node)}</p>
  {#if !open}
    <p class="line">&ldquo;{node.line}&rdquo;</p>
    <p class="barred">{node.barred}</p>
    {#if node.tryLock}
      <a class="lock" href={href('threshold', { d: node.id })} data-testid={`try-lock-${node.id}`}>
        Try the lock
      </a>
    {/if}
  {/if}
</div>

<style>
  .node {
    position: absolute;
    transform: translate(-50%, -14px);
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 150px;
    text-align: center;
  }
  .mark {
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
  }
  .flame {
    fill: var(--m-fire);
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
