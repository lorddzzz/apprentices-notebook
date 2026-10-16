<script lang="ts">
  import { DISTRICT_IDS, DISTRICTS } from '$data';
  import { game } from '../../app/instance';
  import { href } from '../../app/routes';
  import { toast } from '../../app/toasts.svelte';
  import Button from '../components/common/Button.svelte';

  // W0 stub: the open districts, each with "Set out". U2 draws the sketch map.
  const open = $derived(DISTRICT_IDS.filter((d) => game.profile.city.open.includes(d)));

  function setOut(d: (typeof DISTRICT_IDS)[number]): void {
    const why = game.setOut(d);
    if (why) toast(why, 'warn');
  }
</script>

<div class="map" data-testid="map">
  <h1>The city</h1>
  <ul>
    {#each open as d (d)}
      <li>
        <span>{DISTRICTS[d].name}</span>
        <Button label="Set out" onclick={() => setOut(d)} testid={`set-out-${d}`} />
      </li>
    {/each}
  </ul>
  <a class="back" href={href('study')}>Back to the study</a>
</div>

<style>
  .map {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-4);
  }
  ul {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
  }
</style>
