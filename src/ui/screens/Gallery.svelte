<script lang="ts">
  import {
    MEMBER_IDS,
    MEMBERS,
    METHOD_IDS,
    METHODS,
    type MemberId,
    RUNE_IDS,
    RUNES,
    SOLVENT_IDS,
    SOLVENTS,
    START_KNOWN,
    TUNING,
  } from '$data';
  import {
    type Coord,
    compileLattice,
    type Dir,
    type Lattice,
    parseBoard,
    parseLattice,
  } from '$engine';
  import { EMPTY_OVERLAY } from '../../app/overlay';
  import { buildSteps } from '../../app/playback';
  import { Playback } from '../../app/playback.svelte';
  import { router } from '../../app/router.svelte';
  import { href } from '../../app/routes';
  import { editSocket, NO_TOOL, type ShelfTool, shelfSlots } from '../../app/study';
  import { toast } from '../../app/toasts.svelte';
  import { type BoardView, viewOfSpec } from '../../app/view';
  import BattleBoard from '../components/board/BattleBoard.svelte';
  import { boardViewBox } from '../components/board/geometry';
  import { cellLabel } from '../components/board/label';
  import BackLink from '../components/common/BackLink.svelte';
  import Button from '../components/common/Button.svelte';
  import Pips from '../components/common/Pips.svelte';
  import Sheet from '../components/common/Sheet.svelte';
  import LatticeEditor from '../components/lattice/LatticeEditor.svelte';
  import RuneGlyph from '../components/RuneGlyph.svelte';
  import SolventIcon from '../components/SolventIcon.svelte';
  import { METHOD_ART } from '../runeArt';
  import {
    FX_DEMOS,
    type FxDemo,
    GLYPH_SAMPLES,
    SHOWCASE_OVERLAY,
    showcaseView,
  } from './galleryFixtures';

  const DIR_LIST: Dir[] = ['up', 'right', 'down', 'left'];
  const part = $derived(router.params.get('part') ?? 'glyphs');

  let sheetOpen = $state(false);

  const PARTS = ['glyphs', 'board', 'fx', 'lattice'] as const;

  // board part
  const showcase = showcaseView();
  let tapped = $state('Tap a cell');
  const aspect = (v: BoardView): string => {
    const [, , w, h] = boardViewBox(v.width, v.height).split(' ');
    return `${w} / ${h}`;
  };

  // lattice part: fully interactive, per-member lattices over the first evening's knowledge
  const startLattices = (): Record<MemberId, Lattice> => ({
    draughtsman: parseLattice(MEMBERS.draughtsman.startLattice),
    stoker: parseLattice(MEMBERS.stoker.startLattice),
  });
  let lattices = $state.raw<Record<MemberId, Lattice>>(startLattices());
  let member = $state<MemberId>(MEMBER_IDS[0] ?? 'draughtsman');
  let tool = $state.raw<ShelfTool>(NO_TOOL);

  const lattice = $derived(lattices[member]);
  const compiled = $derived(compileLattice(lattice, {}, {}, MEMBERS[member].lean));
  const slots = $derived(shelfSlots(START_KNOWN, lattice, TUNING.startInk, {}, {}, member));

  function editAt(at: Coord, longPress: boolean): void {
    const result = editSocket({ lattice, capacity: TUNING.startInk, member }, at, tool, longPress);
    lattices = { ...lattices, [member]: result.lattice };
    tool = result.tool;
    if (result.message) toast(result.message);
  }

  // fx part: the oil chain and a few more playable chains (slide and crush, storm, jar, drop)
  const FIRST_DEMO = FX_DEMOS[0] as FxDemo;
  const startOf = (d: FxDemo): BoardView => {
    const v = viewOfSpec(parseBoard(d.board));
    d.prepare?.(v);
    return v;
  };
  let demo = $state.raw<FxDemo>(FIRST_DEMO);
  let chainStart = $state.raw<BoardView>(startOf(FIRST_DEMO));
  const chainEnd = $derived(buildSteps(chainStart, demo.events).at(-1)?.view ?? chainStart);
  const playback = new Playback();
  let resting = $state.raw<BoardView>(startOf(FIRST_DEMO));
  let runId = $state(0);
  let lastLine = $state('Ready');

  const chainView = $derived(playback.current?.view ?? resting);
  const chainFx = $derived(playback.current?.fx ?? []);
  const chainKey = $derived(runId * 1000 + playback.index);
  const chainLine = $derived(playback.current?.line ?? lastLine);

  function pickDemo(d: FxDemo): void {
    playback.skip();
    demo = d;
    chainStart = startOf(d);
    resting = chainStart;
    runId += 1;
    lastLine = 'Ready';
  }

  function playChain(): void {
    resting = chainStart;
    runId += 1;
    lastLine = 'Ready';
    void playback.play(chainStart, demo.events).then(() => {
      resting = chainEnd;
      lastLine = 'Done. Tap Play to replay.';
    });
  }

  function resetChain(): void {
    playback.skip();
    resting = chainStart;
    lastLine = 'Ready';
  }

  function tapChain(at: Coord): void {
    if (playback.playing) {
      playback.skip();
      return;
    }
    lastLine = cellLabel(resting, at);
  }
</script>

<section data-testid="gallery">
  <header>
    <BackLink to="lab" label="Lab" />
    <h1>Gallery</h1>
  </header>
  <nav aria-label="Gallery parts">
    {#each PARTS as p (p)}
      <a href={href('gallery', { part: p })} aria-current={part === p ? 'page' : undefined}>{p}</a>
    {/each}
  </nav>

  <div class="body" class:fill={part === 'lattice'}>
  {#if part === 'glyphs'}
    <h2>Runes ({RUNE_IDS.length})</h2>
    <ul class="runes" data-testid="glyphs">
      {#each RUNE_IDS as id (id)}
        <li>
          <RuneGlyph rune={id} dir={RUNES[id].arrow ? 'right' : undefined} size={56} />
          <span class="name">{RUNES[id].name}</span>
          <span class="family">{RUNES[id].role}</span>
        </li>
      {/each}
      <li>
        <RuneGlyph rune={null} size={56} />
        <span class="name">???</span>
        <span class="family">unknown</span>
      </li>
    </ul>

    <h2>Methods ({METHOD_IDS.length})</h2>
    <ul class="runes" data-testid="methods">
      {#each METHOD_IDS as id (id)}
        <li>
          <svg width="56" height="56" viewBox="0 0 24 24" role="img" aria-label={METHODS[id].name}>
            <path
              d={METHOD_ART[id]}
              fill="none"
              stroke="var(--ink)"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span class="name">{METHODS[id].name}</span>
          <span class="family">{METHODS[id].makes}</span>
        </li>
      {/each}
    </ul>

    <h2>Solvents ({SOLVENT_IDS.length})</h2>
    <div class="row" data-testid="solvents">
      {#each SOLVENT_IDS as s (s)}
        <div class="solvent">
          <SolventIcon solvent={s} size={40} />
          <span class="name">{SOLVENTS[s].name}</span>
        </div>
      {/each}
    </div>

    <h2>Glyph sockets</h2>
    <div class="row" data-testid="glyph-sockets">
      {#each GLYPH_SAMPLES as g (g.name)}
        <div class="solvent">
          <RuneGlyph rune={null} glyphName={g.name} glyphKind={g.kind} dir="right" size={56} />
          <span class="name">{g.name}</span>
          <span class="family">{g.kind}</span>
        </div>
      {/each}
    </div>

    <h2>Arrow runes, four ways</h2>
    {#each ['bolt', 'touch', 'bend'] as const as id (id)}
      <div class="row">
        <span class="label">{RUNES[id].name}</span>
        {#each DIR_LIST as d (d)}
          <RuneGlyph rune={id} dir={d} size={48} />
        {/each}
      </div>
    {/each}

    <h2>States</h2>
    <div class="row">
      <RuneGlyph rune="ink" size={48} />
      <RuneGlyph rune="ink" size={48} selected />
      <RuneGlyph rune="ink" size={48} dim />
    </div>

    <h2>Parts</h2>
    <div class="row">
      <Pips value={3} max={6} />
      <Pips value={2} max={3} tone="charge" />
      <Pips value={7} max={12} />
      <Button label="Toast" variant="quiet" onclick={() => toast('A small toast')} />
      <Button label="Sheet" onclick={() => (sheetOpen = true)} />
    </div>
  {:else if part === 'board'}
    <p class="readout" data-testid="readout">{tapped}</p>
    <div class="boardbox" style:aspect-ratio={aspect(showcase)}>
      <BattleBoard
        view={showcase}
        overlay={SHOWCASE_OVERLAY}
        ontap={(at) => (tapped = cellLabel(showcase, at))}
      />
    </div>
  {:else if part === 'fx'}
    <div class="row">
      {#each FX_DEMOS as d (d.id)}
        <Button
          label={d.label}
          variant={d.id === demo.id ? 'primary' : 'quiet'}
          onclick={() => pickDemo(d)}
          testid={`demo-${d.id}`}
        />
      {/each}
    </div>
    <div class="row">
      <Button label={`Play ${demo.label.toLowerCase()}`} onclick={playChain} testid="play-chain" />
      <Button label="Reset" variant="quiet" onclick={resetChain} />
    </div>
    <p class="readout" data-testid="caption">{chainLine}</p>
    <div class="boardbox" style:aspect-ratio={aspect(chainStart)}>
      <BattleBoard
        view={chainView}
        overlay={EMPTY_OVERLAY}
        fx={chainFx}
        fxKey={chainKey}
        minimal
        ontap={tapChain}
      />
    </div>
  {:else if part === 'lattice'}
    <LatticeEditor
      {lattice}
      {compiled}
      capacity={TUNING.startInk}
      {slots}
      {tool}
      ontool={(t) => (tool = t)}
      onsocket={editAt}
      {member}
      onmember={(m) => {
        member = m;
        tool = NO_TOOL;
      }}
      onreject={(reason) => toast(reason)}
    />
  {:else}
    <p>No gallery part "{part}" yet.</p>
  {/if}
  </div>

  <Sheet open={sheetOpen} title="A sheet" onclose={() => (sheetOpen = false)}>
    <p>Bottom sheets hold menus and the copy fallback.</p>
    <Button variant="danger" label="Close it" onclick={() => (sheetOpen = false)} />
  </Sheet>
</section>

<style>
  section {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 0 var(--space-3);
  }
  header,
  nav {
    flex: none;
  }
  .body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding-bottom: var(--space-4);
  }
  .body.fill {
    overflow: hidden;
    padding-bottom: calc(var(--space-3) + 8px);
  }
  header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }
  nav {
    display: flex;
    gap: var(--space-2);
  }
  nav a {
    display: inline-flex;
    align-items: center;
    min-height: var(--tap);
    padding: 0 var(--space-3);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    text-decoration: none;
    text-transform: capitalize;
  }
  nav a[aria-current='page'] {
    background: var(--ink);
    color: var(--parchment);
  }
  .readout {
    margin: var(--space-2) 0;
    min-height: 36px;
    font-size: 14px;
  }
  .boardbox {
    margin: 0;
  }
  h1 {
    margin: 0;
    font-weight: normal;
  }
  h2 {
    margin: var(--space-3) 0 var(--space-2);
    font-size: 14px;
    font-weight: normal;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-soft);
  }
  .runes {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-3) var(--space-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }
  .name {
    font-size: 14px;
  }
  .family {
    font-size: 11px;
    color: var(--ink-soft);
    text-transform: uppercase;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-3);
    margin-bottom: var(--space-2);
  }
  .solvent {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }
  .label {
    width: 48px;
    font-size: 14px;
  }
</style>
