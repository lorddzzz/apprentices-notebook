<script lang="ts">
  import {
    type CellKey,
    type Coord,
    compiledFor,
    type Dir,
    type GlyphArg,
    type GlyphId,
    type GlyphInside,
    glyphLibrary,
    insideIssues,
    insideOf,
    inventionLibrary,
    isGlyph,
    lastTripDeadCells,
    latticeOf,
    type Profile,
    revertGlyph,
    reviseGlyph,
    revisionWarning,
    setExtraExit,
    socketAt,
  } from '$engine';
  import { deskUnlocked } from '../../app/desk';
  import {
    type FairState,
    fairTap,
    glowCells,
    NO_SELECTION,
    previewFairCopy,
  } from '../../app/faircopy';
  import { game } from '../../app/instance';
  import { go } from '../../app/router.svelte';
  import { href } from '../../app/routes';
  import {
    benchUnlocked,
    glyphSlots,
    loadoutBlocker,
    NO_TOOL,
    profileShelf,
    revisionPalette,
    setGlyphArgs,
    setGlyphOpenCells,
  } from '../../app/study';
  import { toast } from '../../app/toasts.svelte';
  import Button from '../components/common/Button.svelte';
  import Sheet from '../components/common/Sheet.svelte';
  import ArgPicker from '../components/lattice/ArgPicker.svelte';
  import LatticeEditor from '../components/lattice/LatticeEditor.svelte';
  import RuneGlyph from '../components/RuneGlyph.svelte';
  import FairCopySheet from '../components/study/FairCopySheet.svelte';
  import GlyphRanking from '../components/study/GlyphRanking.svelte';
  import GlyphSheet from '../components/study/GlyphSheet.svelte';
  import RevisionEditor from '../components/study/RevisionEditor.svelte';
  import StudyScene from '../components/study/StudyScene.svelte';

  // In a quiet doorway the Study is the field editor: the banked collection only, no Bench, no
  // Fair copy, and "Done" in place of the door. Edits live in a draft until Done.
  const field = $derived(game.inDoorway);
  const profile = $derived(game.studyProfile);
  const lattice = $derived(latticeOf(profile, game.member));
  const compiled = $derived(compiledFor(profile, game.member));
  const slots = $derived(profileShelf(profile, game.member));
  const library = $derived(glyphLibrary(profile));
  const copies = $derived(glyphSlots(profile, game.member));

  // Fair copy: proven cells glow; the mode selects the maximal proven cluster and trims it.
  const glow = $derived(glowCells(profile, game.member));
  let fairMode = $state(false);
  let fair = $state.raw<FairState>(NO_SELECTION);
  let fairOpen = $state(false);
  let peeked = $state<GlyphId | null>(null);
  const selected = $derived(new Set((fair.cluster?.cells ?? []).map((c) => `${c.x},${c.y}`)));
  const preview = $derived(
    fair.cluster ? previewFairCopy(profile, game.member, fair.cluster) : null,
  );
  const fairLive = $derived(!field && fairMode && glow.size > 0);

  function leaveFair(): void {
    fairMode = false;
    fair = NO_SELECTION;
    fairOpen = false;
  }

  function toggleFair(): void {
    if (fairMode) {
      leaveFair();
      return;
    }
    game.setTool(NO_TOOL);
    fairMode = true;
  }

  function tapFair(at: { x: number; y: number }): void {
    const r = fairTap(profile, game.member, fair, at);
    fair = r.state;
    if (r.message) toast(r.message);
  }

  function confirmFair(name: string, open: Coord | null = null): string | null {
    if (!fair.cluster) return 'Nothing is selected';
    const why = game.fairCopy(fair.cluster, name, open);
    if (why === null) leaveFair();
    return why;
  }

  function switchMember(m: typeof game.member): void {
    leaveFair();
    argAt = null;
    game.selectMember(m);
  }

  // What stops the party leaving: the first problem with either lattice, in plain words.
  const blocker = $derived(loadoutBlocker(profile));
  const doorCaption = $derived(
    blocker ?? 'The owner\'s map of the city',
  );
  const doneCaption = $derived(blocker ?? 'Back to the spoils, with the new pages');
  type Panel = 'closed' | 'menu' | 'paste' | 'copy' | 'reset';
  let panel = $state<Panel>('closed');
  let pasted = $state('');
  let copyText = $state('');

  function openMenu(): void {
    panel = 'menu';
  }

  async function copySave(): Promise<void> {
    const text = game.exportText();
    try {
      await navigator.clipboard.writeText(text);
      panel = 'closed';
      toast('Save copied');
    } catch {
      // No clipboard access (some iOS contexts): show the text to select by hand.
      copyText = text;
      panel = 'copy';
    }
  }

  function loadPasted(): void {
    const err = game.importText(pasted);
    if (err) {
      toast(err, 'warn');
      return;
    }
    pasted = '';
    panel = 'closed';
    toast('Save loaded');
  }

  function resetAll(): void {
    game.reset();
    panel = 'closed';
    // A full reload clears every screen's in-memory state too: the next visit is a first one.
    go('study');
    location.reload();
  }

  function finishField(): void {
    const why = game.finishDoorway();
    if (why) toast(why, 'warn');
  }

  function renameGlyph(id: string, name: string): string | null {
    return field ? 'Rename it at home' : game.renameGlyph(id, name);
  }

  // Glyph mastery: the ranked list, revisions, settings and arguments (plan M14–M26).
  // Revisions, reverts and settings are for the desk; in a doorway the sheet is read-only.
  let ranking = $state(false);
  let revising = $state<GlyphId | null>(null);
  let argAt = $state<Coord | null>(null);
  const revisingDef = $derived(revising ? (profile.glyphs.find((g) => g.id === revising) ?? null) : null);
  const argTarget = $derived.by(() => {
    const placed = argAt ? socketAt(lattice, argAt) : null;
    const def = placed && isGlyph(placed) ? library[placed.glyph] : undefined;
    return argAt && placed && isGlyph(placed) && def
      ? { at: argAt, glyph: def, args: placed.args ?? {} }
      : null;
  });
  // Plain spells' cells that never fired on the last trip, while their paths still match (M15).
  const deadCells = $derived(new Set(lastTripDeadCells(game.save.lastTrip, game.member, compiled)));

  function atHome(change: (p: Profile) => Profile): string | null {
    return field ? 'Only at home' : game.updateProfile(change);
  }

  function saveRevision(inside: GlyphInside): string | null {
    const id = revising;
    if (!id) return 'Nothing is being revised';
    const why = atHome((p) => reviseGlyph(p, id, inside));
    if (why === null) revising = null;
    return why;
  }

  function applyArgs(args: Readonly<Record<CellKey, GlyphArg>>): string | null {
    const at = argAt;
    if (!at) return 'No Fair copy picked';
    const member = game.member;
    const why = game.updateProfile((p) => setGlyphArgs(p, member, at, args));
    if (why === null) argAt = null;
    return why;
  }

  const title = $derived(
    panel === 'paste'
      ? 'Paste save'
      : panel === 'copy'
        ? 'Copy save'
        : panel === 'reset'
          ? 'Start over'
          : 'The study',
  );
</script>

<div class="study" data-testid="study">
  {#if field}
    <header class="field" data-testid="field-header">
      <div class="fwords">
        <h1>A quiet doorway</h1>
        <p>Rewire the pages with what you own. Spent charges stay spent.</p>
      </div>
      <button
        type="button"
        class="fcodex"
        onclick={() => go('codex')}
        data-testid="codex-button"
        aria-label="Read the notebook (codex)"
      >
        Codex
      </button>
    </header>
  {:else}
    <StudyScene
      oncodex={() => go('codex')}
      onmenu={openMenu}
      onbench={benchUnlocked(profile) ? () => go('bench') : null}
      ondesk={deskUnlocked(profile) ? () => go('desk') : null}
    />
  {/if}

  <div class="desk">
    <LatticeEditor
      sessionKey={game.latticeSessionKey()}
      {lattice}
      {compiled}
      capacity={profile.ink}
      {slots}
      tool={game.tool}
      ontool={(t) => game.setTool(t)}
      onsocket={(at, longPress) => game.tapSocket(at, longPress)}
      member={game.member}
      onmember={switchMember}
      onreject={(reason) => toast(reason)}
      inventions={inventionLibrary(profile)}
      witnessed={profile.witnessed}
      glyphs={library}
      glyphSlots={copies}
      onpeek={(id) => (peeked = id)}
      onranking={() => (ranking = true)}
      onargs={(at) => (argAt = at)}
      {deadCells}
      fair={{
        available: !field && glow.size > 0,
        active: fairLive,
        glow,
        selected,
        ontoggle: toggleFair,
        ontap: tapFair,
      }}
    >
      {#snippet fairinfo()}
        <div class="fairinfo" data-testid="fair-info">
          {#if preview}
            <ol class="mini" aria-label="Selected runes">
              {#each preview.chain as step (`${step.at.x},${step.at.y}`)}
                <li><RuneGlyph rune={step.rune} dir={step.dir} size={26} /></li>
              {/each}
            </ol>
            <p class="line">
              {preview.chain.length} runes · ink {preview.inkBefore} &rarr; {preview.inkAfter}
              {#if preview.blocking.length > 0}<span class="bad"> · blocked</span>{/if}
            </p>
            <p class="rule">Tap the last rune to trim it, or another glowing rune to start over.</p>
            <div class="fairrow">
              <Button variant="quiet" label="Done" onclick={leaveFair} />
              <Button label="Fair-copy…" onclick={() => (fairOpen = true)} testid="fair-review" />
            </div>
          {:else}
            <p class="line"><b>Fair copy</b></p>
            <p class="rule">
              Glowing runes have proven themselves. Tap one to select the whole proven chain, and
              fold it into a single Glyph.
            </p>
            <div class="fairrow">
              <Button variant="quiet" label="Done" onclick={leaveFair} />
            </div>
          {/if}
        </div>
      {/snippet}
    </LatticeEditor>
  </div>

  <div class="doorway">
    {#if field}
      <button
        type="button"
        class="door done"
        disabled={blocker !== null}
        onclick={finishField}
        data-testid="field-done"
        aria-describedby="done-note"
      >
        <span class="words">
          <span class="label">Done</span>
          <span class="caption" id="done-note">{doneCaption}</span>
        </span>
      </button>
    {:else}
      <button
        type="button"
        class="door"
        disabled={blocker !== null}
        onclick={() => go('map')}
        data-testid="door"
        aria-describedby="door-note"
      >
        <svg class="arch" width="28" height="36" viewBox="0 0 28 36" aria-hidden="true">
          <path d="M3 35V14a11 11 0 0 1 22 0v21z" fill="var(--wood-dark)" stroke="var(--wood-deep)" stroke-width="2" />
          <path d="M14 3v32M8.5 10v25M19.5 10v25" stroke="var(--wood-deep)" stroke-opacity="0.6" />
          <circle cx="20.5" cy="23" r="1.8" fill="var(--lamp)" />
        </svg>
        <span class="words">
          <span class="label">Out into the city</span>
          <span class="caption" id="door-note">{doorCaption}</span>
        </span>
      </button>
    {/if}
  </div>

  <FairCopySheet
    preview={fairOpen ? preview : null}
    vellum={profile.vellum}
    onclose={() => (fairOpen = false)}
    onconfirm={confirmFair}
  />
  <GlyphSheet
    glyph={peeked ? (library[peeked] ?? null) : null}
    {profile}
    readonly={field}
    onclose={() => (peeked = null)}
    onrename={renameGlyph}
    onrevise={field
      ? null
      : (id) => {
          peeked = null;
          revising = id;
        }}
    onrevert={(id, version) => atHome((p) => revertGlyph(p, id, version))}
    onopencells={(id, cells: CellKey[]) => atHome((p) => setGlyphOpenCells(p, id, cells))}
    onextraexit={(id, dir: Dir | null) => atHome((p) => setExtraExit(p, id, dir))}
  />
  <GlyphRanking
    open={ranking}
    {profile}
    onpick={(id) => {
      ranking = false;
      peeked = id;
    }}
    onclose={() => (ranking = false)}
  />
  <RevisionEditor
    inside={revisingDef ? insideOf(revisingDef) : null}
    title={revisingDef ? `Revise ${revisingDef.name}` : 'Revise'}
    palette={revisionPalette(profile)}
    inventions={inventionLibrary(profile)}
    issues={insideIssues}
    warning={(inside) => (revising ? revisionWarning(profile, revising, inside) : null)}
    onsave={saveRevision}
    onclose={() => (revising = null)}
  />
  <ArgPicker
    target={argTarget}
    {profile}
    member={game.member}
    onapply={applyArgs}
    onclose={() => (argAt = null)}
  />

  <Sheet open={panel !== 'closed'} {title} onclose={() => (panel = 'closed')}>
    {#if panel === 'menu'}
      <div class="menu">
        <a class="item tap" href={href('lab', { scenario: 'sandbox' })} data-testid="menu-lab">Visit the Lab</a>
        <Button variant="quiet" label="Copy save" onclick={copySave} testid="copy-save" />
        <Button
          variant="quiet"
          label="Paste save"
          onclick={() => (panel = 'paste')}
          testid="paste-save"
        />
        <Button
          variant="quiet"
          label="Start over"
          onclick={() => (panel = 'reset')}
          testid="reset-save"
        />
      </div>
      <p class="hint">
        Your notebook lives in this browser. Copy the save somewhere safe: phones sometimes clear
        site data.
      </p>
    {:else if panel === 'paste'}
      <p class="hint">Paste a copied save here. It replaces the notebook you have now.</p>
      <textarea
        bind:value={pasted}
        rows="5"
        spellcheck="false"
        autocapitalize="off"
        placeholder="Paste save text"
        aria-label="Save text"
        data-testid="paste-text"
      ></textarea>
      <div class="row">
        <Button variant="quiet" label="Back" onclick={() => (panel = 'menu')} />
        <Button variant="danger" label="Replace my save" onclick={loadPasted} testid="paste-go" />
      </div>
    {:else if panel === 'reset'}
      <p class="hint">
        This wipes the whole notebook (runes, glyphs, folios, trip) and begins a new game. Copy the
        save first if you might want it back.
      </p>
      <div class="row">
        <Button variant="quiet" label="Back" onclick={() => (panel = 'menu')} />
        <Button variant="danger" label="Wipe everything" onclick={resetAll} testid="reset-go" />
      </div>
    {:else if panel === 'copy'}
      <p class="hint">Copying was blocked. Select the text below and copy it by hand.</p>
      <textarea readonly rows="5" value={copyText} aria-label="Save text" data-testid="copy-text"
      ></textarea>
      <div class="row">
        <Button variant="quiet" label="Back" onclick={() => (panel = 'menu')} />
      </div>
    {/if}
  </Sheet>
</div>

<style>
  .study {
    display: flex;
    flex-direction: column;
    height: 100%;
    /* the desk: dark planks lit from the lamp side */
    background:
      radial-gradient(ellipse at 65% 0%, rgba(232, 176, 74, 0.22), transparent 60%),
      repeating-linear-gradient(90deg, transparent 0 58px, rgba(0, 0, 0, 0.18) 58px 59px),
      linear-gradient(var(--wood-dark), #3a281c);
  }
  .desk {
    flex: 1;
    min-height: 0;
    padding: var(--space-2) var(--space-2) 0;
  }
  .fairinfo {
    padding: var(--space-1) var(--space-2);
  }
  .mini {
    display: flex;
    flex-wrap: wrap;
    gap: 1px;
    margin: 0 0 2px;
    padding: 0;
    list-style: none;
  }
  .fairinfo .line {
    margin: 0;
    font-size: 14px;
  }
  .fairinfo .rule {
    margin: 2px 0 0;
    font-size: 13px;
    line-height: 1.25;
    color: var(--ink-soft);
  }
  .bad {
    color: var(--danger);
  }
  .fairrow {
    display: flex;
    justify-content: space-between;
    gap: var(--space-2);
    margin-top: var(--space-1);
  }
  .field {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    flex: none;
    min-height: 64px;
    padding: var(--space-2) var(--space-3);
    background: linear-gradient(#2c3a4b, #1f2a38);
    border-bottom: 2px solid var(--wood-deep);
    color: var(--parchment);
  }
  .fwords h1 {
    margin: 0;
    font-size: 20px;
    font-weight: normal;
    font-style: italic;
  }
  .fwords p {
    margin: 2px 0 0;
    font-size: 12px;
    line-height: 1.25;
    color: rgba(241, 230, 204, 0.75);
  }
  .fcodex {
    flex: none;
    min-height: var(--tap);
    padding: 0 var(--space-3);
    border: 2px solid var(--wood-deep);
    border-radius: var(--radius);
    background: rgba(0, 0, 0, 0.25);
    color: var(--parchment);
    font-size: 14px;
  }
  .done {
    justify-content: center;
  }
  .doorway {
    flex: none;
    padding: var(--space-2) var(--space-2) calc(var(--space-2) + 14px);
  }
  .door {
    position: relative;
    display: flex;
    align-items: center;
    gap: var(--space-3);
    width: 100%;
    min-height: 52px;
    padding: 0 var(--space-3);
    border: 2px solid var(--wood-deep);
    border-radius: var(--radius);
    background:
      repeating-linear-gradient(90deg, transparent 0 44px, rgba(0, 0, 0, 0.3) 44px 45px),
      linear-gradient(#37271c, #2a1d15);
    color: var(--parchment);
    text-align: left;
    box-shadow: 0 5px 0 -1px rgba(232, 176, 74, 0.55); /* lamplight under the door */
  }
  .door:disabled {
    cursor: default;
  }
  .arch {
    flex: none;
  }
  .words {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
  }
  .label {
    font-size: 17px;
    font-style: italic;
  }
  .caption {
    font-size: 12px;
    color: rgba(241, 230, 204, 0.7);
  }
  .menu {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .item {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 var(--space-3);
    border: 2px solid var(--line);
    border-radius: var(--radius);
    font-size: 16px;
    text-decoration: none;
  }
  .hint {
    margin: var(--space-3) 0 var(--space-2);
    font-size: 13px;
    color: var(--ink-soft);
  }
  textarea {
    display: block;
    width: 100%;
    padding: var(--space-2);
    border: 2px solid var(--line);
    border-radius: var(--radius);
    background: var(--parchment-dark);
    font: 16px/1.3 var(--mono);
    resize: none;
  }
  .row {
    display: flex;
    justify-content: space-between;
    gap: var(--space-2);
    margin-top: var(--space-3);
  }
</style>
