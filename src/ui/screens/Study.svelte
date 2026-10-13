<script lang="ts">
  import { ENCOUNTERS, MEMBER_IDS, MEMBERS } from '$data';
  import {
    compiledFor,
    describeSpell,
    type GlyphId,
    glyphLibrary,
    latticeOf,
    validateLoadout,
  } from '$engine';
  import { benchUnlocked } from '../../app/bench';
  import {
    type FairState,
    fairTap,
    glowCells,
    NO_SELECTION,
    previewFairCopy,
    trimChip,
  } from '../../app/faircopy';
  import { game } from '../../app/instance';
  import { go } from '../../app/router.svelte';
  import { href } from '../../app/routes';
  import { glyphSlots, NO_TOOL, profileShelf } from '../../app/study';
  import { toast } from '../../app/toasts.svelte';
  import Button from '../components/common/Button.svelte';
  import Sheet from '../components/common/Sheet.svelte';
  import LatticeEditor from '../components/lattice/LatticeEditor.svelte';
  import RuneGlyph from '../components/RuneGlyph.svelte';
  import FairCopySheet from '../components/study/FairCopySheet.svelte';
  import GlyphSheet from '../components/study/GlyphSheet.svelte';
  import StudyScene from '../components/study/StudyScene.svelte';

  const profile = $derived(game.profile);
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
  const chip = $derived(trimChip(preview, fair.lost));
  const fairLive = $derived(fairMode && glow.size > 0);

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

  function confirmFair(name: string): string | null {
    if (!fair.cluster) return 'Nothing is selected';
    const why = game.fairCopy(fair.cluster, name);
    if (why === null) leaveFair();
    return why;
  }

  function switchMember(m: typeof game.member): void {
    leaveFair();
    game.selectMember(m);
  }

  // What stops the party leaving: the first problem with either lattice, in plain words.
  const blocker = $derived.by(() => {
    const issues = validateLoadout(profile);
    for (const [id, list] of Object.entries(issues)) {
      const first = list?.[0];
      if (first) return `${MEMBERS[id as keyof typeof MEMBERS].name}: ${first.message}`;
    }
    return null;
  });
  const doorCaption = $derived(
    blocker ?? `${ENCOUNTERS.length} rooms down to the heart of the Seam`,
  );
  // What each member carries out the door (shown on the confirm sheet).
  const carried = $derived(
    MEMBER_IDS.map((m) => ({
      name: MEMBERS[m].name,
      spells: compiledFor(profile, m).spells.map((s) => `${describeSpell(s)} (${s.charges} charges)`),
    })),
  );

  type Panel = 'closed' | 'menu' | 'paste' | 'copy' | 'door';
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

  function setOut(): void {
    const why = game.setOut();
    if (why) {
      panel = 'closed';
      toast(why, 'warn');
    }
  }

  const title = $derived(
    panel === 'paste'
      ? 'Paste save'
      : panel === 'copy'
        ? 'Copy save'
        : panel === 'door'
          ? 'Set out?'
          : 'The study',
  );
</script>

<div class="study" data-testid="study">
  <StudyScene
    oncodex={() => go('codex')}
    onmenu={openMenu}
    onbench={benchUnlocked(profile) ? () => go('bench') : null}
  />

  <div class="desk">
    <LatticeEditor
      {lattice}
      {compiled}
      capacity={profile.inkCapacity[game.member]}
      {slots}
      tool={game.tool}
      ontool={(t) => game.setTool(t)}
      onsocket={(at, longPress) => game.tapSocket(at, longPress)}
      member={game.member}
      onmember={switchMember}
      onreject={(reason) => toast(reason)}
      known={profile.interactions}
      glyphs={library}
      glyphSlots={copies}
      onpeek={(id) => (peeked = id)}
      fair={{
        available: glow.size > 0,
        active: fairLive,
        glow,
        selected,
        chip,
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
    <button
      type="button"
      class="door"
      disabled={blocker !== null}
      onclick={() => (panel = 'door')}
      data-testid="door"
      aria-describedby="door-note"
    >
      <svg class="arch" width="28" height="36" viewBox="0 0 28 36" aria-hidden="true">
        <path d="M3 35V14a11 11 0 0 1 22 0v21z" fill="var(--wood-dark)" stroke="var(--wood-deep)" stroke-width="2" />
        <path d="M14 3v32M8.5 10v25M19.5 10v25" stroke="var(--wood-deep)" stroke-opacity="0.6" />
        <circle cx="20.5" cy="23" r="1.8" fill="var(--lamp)" />
      </svg>
      <span class="words">
        <span class="label">Set out into the Seam</span>
        <span class="caption" id="door-note">{doorCaption}</span>
      </span>
    </button>
  </div>

  <FairCopySheet
    preview={fairOpen ? preview : null}
    vellum={profile.vellum}
    onclose={() => (fairOpen = false)}
    onconfirm={confirmFair}
  />
  <GlyphSheet
    glyph={peeked ? (library[peeked] ?? null) : null}
    onclose={() => (peeked = null)}
    onrename={(id, name) => game.renameGlyph(id, name)}
  />

  <Sheet open={panel !== 'closed'} {title} onclose={() => (panel = 'closed')}>
    {#if panel === 'door'}
      <p class="hint first">
        The party takes only what is inscribed. Charges do not come back until you return home, and
        if everyone falls, whatever you found is lost.
      </p>
      <ul class="carry" data-testid="carry">
        {#each carried as c (c.name)}
          <li>
            <strong>{c.name}</strong>
            <span>{c.spells.join('; ') || 'no spells inscribed'}</span>
          </li>
        {/each}
      </ul>
      <div class="row">
        <Button variant="quiet" label="Not yet" onclick={() => (panel = 'closed')} />
        <Button label="Set out" onclick={setOut} testid="set-out" />
      </div>
    {:else if panel === 'menu'}
      <div class="menu">
        <a class="item tap" href={href('lab', { scenario: 'sandbox' })} data-testid="menu-lab">Visit the Lab</a>
        <Button variant="quiet" label="Copy save" onclick={copySave} testid="copy-save" />
        <Button
          variant="quiet"
          label="Paste save"
          onclick={() => (panel = 'paste')}
          testid="paste-save"
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
  .first {
    margin-top: 0;
  }
  .carry {
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 15px;
  }
  .carry li {
    display: flex;
    flex-direction: column;
    padding: 4px 0;
  }
  .carry span {
    font-size: 14px;
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
