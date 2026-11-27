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
    tripParty,
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
  import {
    benchOf,
    benchUnlocked,
    bookmarksOf,
    doorwayDoneCaption,
    glyphSlots,
    loadoutBlocker,
    NO_TOOL,
    profileShelf,
    revisionPalette,
    seatsOf,
    setGlyphArgs,
    setGlyphOpenCells,
  } from '../../app/study';
  import { toast } from '../../app/toasts.svelte';
  import { rumourLine } from '../../app/tripviews';
  import Button from '../components/common/Button.svelte';
  import ArgPicker from '../components/lattice/ArgPicker.svelte';
  import LatticeEditor from '../components/lattice/LatticeEditor.svelte';
  import RuneGlyph from '../components/RuneGlyph.svelte';
  import NoteUnderDoor from '../components/recruits/NoteUnderDoor.svelte';
  import AtticHeader from '../components/study/AtticHeader.svelte';
  import Door from '../components/study/Door.svelte';
  import FairCopySheet from '../components/study/FairCopySheet.svelte';
  import FirstEvening from '../components/study/FirstEvening.svelte';
  import GlyphRanking from '../components/study/GlyphRanking.svelte';
  import GlyphSheet from '../components/study/GlyphSheet.svelte';
  import HouseholdShelf from '../components/study/HouseholdShelf.svelte';
  import RevisionEditor from '../components/study/RevisionEditor.svelte';

  // In a quiet doorway the Study is the field editor: the banked collection only, no Bench, no
  // Fair copy, and "Done" in place of the door. Edits live in a draft until Done.
  const field = $derived(game.inDoorway);
  const profile = $derived(game.studyProfile);
  const lattice = $derived(latticeOf(profile, game.member));
  const compiled = $derived(compiledFor(profile, game.member));
  const slots = $derived(profileShelf(profile, game.member));
  const library = $derived(glyphLibrary(profile));
  const copies = $derived(glyphSlots(profile, game.member));
  // The editor's bookmarks follow the trip slots, plus whoever's page is open (HC-7).
  const bookmarks = $derived(bookmarksOf(profile, game.member));
  const party = $derived(tripParty(profile));
  let householdOpen = $state(false);
  let drawerUp = $state(false);

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
  const doneCaption = $derived(blocker ?? doorwayDoneCaption(game.save.trip));
  // The header's paper note: the rumour heard on the last trip (K-20), or a doorway's rule.
  const rumour = $derived(rumourLine(game.save.lastTrip));
  const note = $derived(
    field
      ? {
          text: 'Rewire the pages with what you own. Spent charges stay spent.',
          title: 'A quiet doorway',
          testid: 'field-note',
        }
      : rumour
        ? { text: rumour, title: 'A rumour', testid: 'rumour-line' }
        : null,
  );
  const emptySeats = $derived(seatsOf(profile).filter((s) => s === null).length);

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
</script>

<div class="study" data-testid="study">
  <AtticHeader
    doorway={field}
    oncodex={() => go('codex')}
    onbench={!field && benchUnlocked(profile) ? () => go('bench') : null}
    ondesk={!field && deskUnlocked(profile) ? () => go('desk') : null}
    {note}
  />

  <!-- display: contents, so their sheets still cover the whole screen; the cards are positioned
       to paint above the header's 24 px bleed -->
  <div class="rows">
    <FirstEvening />
    <NoteUnderDoor />
  </div>

  <HouseholdShelf
    {profile}
    locked={game.save.trip !== null}
    open={game.member}
    show={householdOpen}
    onclose={() => (householdOpen = false)}
    onopen={switchMember}
    onbring={(id, seat) => game.bring(id, seat)}
    onhome={(id) => game.sendHome(id)}
  />

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
      members={bookmarks}
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
      household={{
        more: benchOf(profile).length,
        onmore: () => (householdOpen = true),
        visiting: new Set(bookmarks.filter((id) => !party.includes(id))),
        empty: emptySeats,
      }}
      bind:drawerUp
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

  <!-- the slot is kept while the drawer is up, so the page above never moves -->
  {#if field}
    <Door
      done
      label="Done"
      caption={doneCaption}
      disabled={blocker !== null}
      hidden={drawerUp}
      onclick={finishField}
      testid="field-done"
    />
  {:else}
    <Door
      label="Out into the city"
      caption={doorCaption}
      disabled={blocker !== null}
      hidden={drawerUp}
      onclick={() => go('map')}
      testid="door"
    />
  {/if}

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
  .rows {
    display: contents;
  }
  .rows > :global(:not(.overlay)) {
    position: relative;
    z-index: 1;
  }
  .desk {
    flex: 1;
    min-height: 0;
    padding: var(--space-1) var(--space-1) 0;
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
</style>
