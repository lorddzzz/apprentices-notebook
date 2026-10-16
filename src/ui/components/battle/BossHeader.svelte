<script lang="ts">
  import { ENEMIES } from '$data';
  import type { UnitView } from '../../../app/view';

  interface Props {
    /** The foes on the board; the bosses among them get a name and HP bar (K-18). */
    units: UnitView[];
  }

  let { units }: Props = $props();

  const bosses = $derived(
    units.filter((u) => u.kind === 'enemy' && u.alive && ENEMIES[u.def as keyof typeof ENEMIES].boss),
  );
</script>

{#each bosses as b (b.id)}
  <div class="boss" data-testid="boss-header">
    <span class="name">{b.name}</span>
    <div class="bar" role="img" aria-label="{b.name}: {b.hp} of {b.maxHp} HP">
      <div class="fill" style:width="{(100 * b.hp) / b.maxHp}%"></div>
    </div>
    <span class="hp">{b.hp}/{b.maxHp}</span>
  </div>
{/each}

<style>
  .boss {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: 14px;
  }
  .name {
    font-family: var(--hand);
    font-size: 17px;
    white-space: nowrap;
  }
  .bar {
    flex: 1;
    height: 12px;
    border: 2px solid var(--ink);
    border-radius: 7px;
    background: var(--parchment);
    overflow: hidden;
  }
  .fill {
    height: 100%;
    background: var(--danger);
    transition: width 220ms ease;
  }
  .hp {
    font-family: var(--mono);
    font-size: 13px;
  }
</style>
