<script lang="ts">
  import { DISTRICT_IDS } from '$data/districts';
  import ActionButton from '../common/ActionButton.svelte';
  import AppHeader from '../common/AppHeader.svelte';

  /**
   * UF-6: the Gallery `tokens` page. Everything reads the live custom properties from
   * theme.css, so a swatch that is wrong here is wrong on screen.
   */

  const TYPE = [
    ['--type-xs', 12],
    ['--type-sm', 14],
    ['--type-md', 16],
    ['--type-lg', 20],
    ['--type-xl', 24],
    ['--type-title', 32],
  ] as const;

  const WORLDS = [
    {
      id: 'home',
      names: [
        '--home-wall',
        '--home-wood',
        '--home-wood-dark',
        '--home-wood-deep',
        '--home-lamp',
        '--home-paper',
        '--home-paper-dark',
        '--home-paper-deep',
        '--home-ink',
        '--home-ink-soft',
      ],
    },
    {
      id: 'city',
      names: ['--city-night', '--city-stone', '--city-stone-light', '--city-rain', '--city-ink'],
    },
    { id: 'system', names: ['--system-paper', '--system-ink', '--system-line'] },
  ] as const;

  const DISTRICT_TONES = ['--district-dark', '--district-mid', '--district-light'] as const;

  const MEANING = [
    {
      title: 'Meaning',
      names: [
        '--danger',
        '--danger-tint',
        '--gold',
        '--shield',
        '--reach',
        '--select',
        '--habit',
        '--enemy',
      ],
    },
    {
      title: 'Overlays',
      names: [
        '--overlay-danger',
        '--overlay-reach',
        '--overlay-preview',
        '--overlay-first',
        '--overlay-shield',
      ],
    },
    { title: 'Rune families', names: ['--f-source', '--f-shape', '--f-trigger', '--f-aura'] },
    {
      title: 'Rune roles',
      names: [
        '--role-source',
        '--role-action',
        '--role-kind',
        '--role-shape',
        '--role-trigger',
        '--role-seal',
        '--role-aura',
      ],
    },
    {
      title: 'Apprentice hues',
      names: [
        '--hue-slate',
        '--hue-rust',
        '--hue-amber',
        '--hue-moss',
        '--hue-teal',
        '--hue-plum',
        '--hue-rose',
        '--hue-ochre',
        '--hue-indigo',
        '--hue-gilt',
      ],
    },
    {
      title: 'Materials',
      names: [
        '--m-ink',
        '--m-oil',
        '--m-oil-tint',
        '--m-steam',
        '--m-spark',
        '--m-brass',
        '--m-brass-dark',
        '--m-fire',
        '--m-fire-tint',
        '--vent',
      ],
    },
  ] as const;

  const SPACING = ['--space-1', '--space-2', '--space-3', '--space-4', '--space-5'] as const;
  const MOTION = ['--dur-quick', '--dur-base', '--dur-held'] as const;
  const noop = () => {};
</script>

<div class="tokens" data-testid="tokens-page">
  <h2 class="label">Type scale</h2>
  <ul class="type" data-testid="tokens-type">
    {#each TYPE as [name, px] (name)}
      <li style:font-size="var({name})">
        <span class="meta">{name} · {px}</span>
        <span class="serif">The last tenant left the lamp lit.</span>
      </li>
    {/each}
    <li class="script" style:font-size="var(--type-xl)">
      <span class="meta">--font-script · 20 and up</span>
      <span>Halvemeer, Klokhof, Verloren Corner</span>
    </li>
    <li class="serif-italic" style:font-size="var(--type-sm)">
      <span class="meta">serif italic · apprentice note</span>
      <span>Keep chalk by the door, it burns left.</span>
    </li>
    <li style:font-size="var(--type-md)">
      <span class="meta">.label · all-small-caps</span>
      <span class="label" data-world="system">Seam · Halvemeer Klokhof</span>
    </li>
  </ul>

  <h2 class="label">Worlds</h2>
  {#each WORLDS as w (w.id)}
    <h3>{w.id}</h3>
    <ul class="swatches" data-testid="tokens-world-{w.id}">
      {#each w.names as name (name)}
        <li><span class="chip" style:background="var({name})"></span>{name.slice(2)}</li>
      {/each}
    </ul>
  {/each}
  <div class="world-demo">
    {#each ['home', 'city', 'system'] as const as w (w)}
      <div class="world-card" data-world={w}>
        <span class="label">{w}</span>
        <span>world-bg / fg</span>
      </div>
    {/each}
  </div>

  <h2 class="label">Districts ({DISTRICT_IDS.length})</h2>
  <ul class="districts" data-testid="tokens-districts">
    {#each DISTRICT_IDS as id (id)}
      <li data-world="system" data-district={id}>
        <span class="name">{id}</span>
        {#each DISTRICT_TONES as tone (tone)}
          <span class="chip wide" style:background="var({tone})" title={tone}></span>
        {/each}
      </li>
    {/each}
  </ul>

  {#each MEANING as group (group.title)}
    <h2 class="label">{group.title}</h2>
    <ul class="swatches" data-testid="tokens-{group.title.toLowerCase().replace(/ /g, '-')}">
      {#each group.names as name (name)}
        <li><span class="chip" style:background="var({name})"></span>{name.slice(2)}</li>
      {/each}
    </ul>
  {/each}

  <h2 class="label">Spacing, shape, motion</h2>
  <ul class="spacing" data-testid="tokens-spacing">
    {#each SPACING as name (name)}
      <li>
        <span class="bar" style:width="var({name})"></span>
        {name.slice(2)}
      </li>
    {/each}
    <li><span class="bar tap"></span>tap 44</li>
    <li><span class="bar radius"></span>radius 6</li>
    <li><span class="bar shadow1"></span>shadow-1</li>
    <li><span class="bar shadow2"></span>shadow-2</li>
    <li class="motion">{MOTION.map((m) => m.slice(2)).join(' · ')}</li>
  </ul>

  <h2 class="label">ActionButton</h2>
  <div class="buttons" data-testid="tokens-buttons">
    <ActionButton kind="primary" label="Primary" onclick={noop} />
    <ActionButton kind="secondary" label="Secondary" onclick={noop} />
    <ActionButton kind="quiet" label="Quiet" onclick={noop} />
    <ActionButton kind="primary" danger label="Danger" onclick={noop} />
    <ActionButton kind="secondary" danger label="Danger" onclick={noop} />
    <ActionButton kind="primary" disabled label="Disabled" onclick={noop} />
  </div>

  <h2 class="label">AppHeader</h2>
  <div class="headers" data-testid="tokens-headers">
    <AppHeader
      variant="study"
      title="Study"
      subtitle="Evening 3"
      back={{ label: 'Back', onback: noop }}
    />
    <AppHeader variant="subroom" title="Bench" subtitle="Six parts" back={{ label: 'Study', onback: noop }} />
    <AppHeader variant="city" title="Canals" back={{ label: 'Leave', onback: noop }}>
      {#snippet status()}Rat King · 12 HP · it flees at 4{/snippet}
    </AppHeader>
    <AppHeader variant="system" title="Gallery" back={{ label: 'Lab', onback: noop }} />
  </div>
</div>

<style>
  .tokens {
    font-family: var(--font-serif);
  }
  h2 {
    margin: var(--space-4) 0 var(--space-2);
    font-size: var(--type-sm);
    font-weight: 400;
    color: var(--ink-soft);
  }
  h3 {
    margin: var(--space-2) 0 var(--space-1);
    font-size: var(--type-sm);
    font-weight: 600;
  }
  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .type li {
    display: flex;
    flex-direction: column;
    margin-bottom: var(--space-2);
    line-height: 1.2;
  }
  .meta {
    font-family: var(--font-mono);
    font-size: var(--type-xs);
    color: var(--ink-soft);
  }
  .script {
    font-family: var(--font-script);
  }
  .serif-italic {
    font-style: italic;
  }
  .swatches {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-1) var(--space-2);
    font-family: var(--font-mono);
    font-size: var(--type-xs);
  }
  .swatches li {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .chip {
    flex: none;
    width: 28px;
    height: 28px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
  }
  .chip.wide {
    width: 56px;
  }
  .world-demo {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-2);
    margin-top: var(--space-2);
  }
  .world-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding: var(--space-2);
    border: 1px solid var(--world-line);
    border-radius: var(--radius);
    background: var(--world-bg);
    color: var(--world-fg);
    font-size: var(--type-sm);
  }
  .districts li {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    margin-bottom: var(--space-1);
  }
  .districts .name {
    width: 110px;
    font-family: var(--font-mono);
    font-size: var(--type-xs);
  }
  .spacing li {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-1);
    font-family: var(--font-mono);
    font-size: var(--type-xs);
  }
  .bar {
    display: block;
    height: 12px;
    background: var(--ink);
  }
  .bar.tap {
    width: var(--tap);
    height: var(--tap);
    background: var(--parchment-dark);
    border: 1px solid var(--ink);
  }
  .bar.radius {
    width: var(--tap);
    height: var(--tap);
    border: 2px solid var(--ink);
    border-radius: var(--radius);
    background: none;
  }
  .bar.shadow1,
  .bar.shadow2 {
    width: var(--tap);
    height: var(--tap);
    background: var(--parchment);
  }
  .spacing li:has(.shadow1),
  .spacing li:has(.shadow2) {
    margin-bottom: var(--space-3);
  }
  .bar.shadow1 {
    box-shadow: var(--shadow-1);
  }
  .bar.shadow2 {
    box-shadow: var(--shadow-2);
  }
  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  .headers {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
</style>
