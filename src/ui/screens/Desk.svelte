<script lang="ts">
  import { DRAFTS, RUNES } from '$data';
  import { draftInside, insideIssues, lastPage } from '$engine';
  import {
    cellMarks,
    deskRows,
    drawerView,
    goalSentences,
    noteFragments,
    pageLabel,
    scrapsLine,
    testChips,
    trayPalette,
  } from '../../app/desk';
  import { desk } from '../../app/desk.svelte';
  import { game } from '../../app/instance';
  import { sameInside } from '../../app/revision';
  import BattleBoard from '../components/board/BattleBoard.svelte';
  import BackLink from '../components/common/BackLink.svelte';
  import Button from '../components/common/Button.svelte';
  import DraftPage from '../components/desk/DraftPage.svelte';
  import RuneGlyph from '../components/RuneGlyph.svelte';
  import RevisionEditor from '../components/study/RevisionEditor.svelte';

  // The desk where the owner's folios are mended (plan M31-M36, BL-14).
  const profile = $derived(game.profile);
  const rows = $derived(deskRows(profile.drafts));
  const row = $derived(rows.find((r) => r.def.id === desk.open) ?? null);
  const def = $derived(row?.def ?? null);
  const copy = $derived(row?.copy ?? null);

  const last = $derived(def ? lastPage(def) : 0);
  const fresh = $derived(def && copy ? desk.fresh(def.id, copy.inside) : null);
  // A mended folio reads as all passing and is never re-run: a page mended before save v6 can fail
  // the rebuilt tests (F16 keeps its inside).
  const run = $derived(copy?.repaired ? null : (fresh?.run ?? null));
  const broke = $derived(fresh?.broke ?? []);
  const sel = $derived(copy ? desk.selected(copy.page, run) : 0);
  const test = $derived(def ? def.pages[sel]?.test : undefined);
  const lines = $derived(test ? goalSentences(test.goal) : []);
  const shown = $derived(run?.tests[sel] ?? null);
  const marks = $derived(copy ? cellMarks(copy.inside, shown ? shown.events : null) : {});
  const chips = $derived(
    copy
      ? copy.repaired
        ? testChips(copy.page, null, []).map((c) => ({ ...c, state: 'pass' as const }))
        : testChips(copy.page, run, broke)
      : [],
  );
  const issues = $derived(copy ? insideIssues(copy.inside) : []);
  const notes = $derived(def && copy ? noteFragments(def, copy) : []);
  const drawer = $derived(def && copy ? drawerView(def, copy.page, copy.inside) : []);
  const scraps = $derived(def && copy && copy.page > 0 ? scrapsLine(def, copy.page) : null);
  const allRun = $derived(!!run && !!copy && run.tests.length === copy.page + 1);
  const canTurn = $derived(!!copy && !copy.repaired && allRun && !!run?.passed && copy.page < last);
  const canCopy = $derived(!!copy && !copy.repaired && allRun && !!run?.passed && copy.page >= last);
  const changed = $derived(def && copy ? !sameInside(copy.inside, draftInside(def)) : false);
  const busy = $derived(desk.playing);

  let editing = $state(false);
  let confirming = $state(false);

  function open(id: string): void {
    editing = false;
    confirming = false;
    desk.show(id);
  }

  function close(): void {
    editing = false;
    confirming = false;
    desk.show(null);
  }

  function save(inside: Parameters<typeof desk.save>[1]): string | null {
    if (!def) return 'No draft is open';
    const err = desk.save(def.id, inside);
    if (err === null) editing = false;
    return err;
  }

  const tick = (i: number): string => {
    if (copy?.repaired) return '✓';
    const g = shown?.goals[i];
    return g ? (g.met ? '✓' : '✗') : '○';
  };
  const SYMBOL = { pass: '✓', fail: '✗', broke: '✗', idle: '○' } as const;
  const WORD = { pass: 'passes', fail: 'fails', broke: 'broke', idle: 'not run yet' } as const;
</script>

<section class="desk" data-testid="desk">
  <header>
    {#if def}
      <button type="button" class="back" data-testid="desk-back" onclick={close}>&larr; Folios</button>
    {:else}
      <BackLink to="study" label="Study" />
    {/if}
    <span class="count">{rows.filter((r) => r.copy.repaired).length} / {DRAFTS.length} mended</span>
  </header>

  <div class="body">
    {#if def && copy}
      <article class="torn" data-testid="draft-open">
        <h1>{def.name}</h1>
        <!-- The cover line lives on the list row; open, the page fragments are the note. -->
        <div data-testid="draft-notes">
          {#each notes as n, i (i)}
            <p class="hand frag" class:newest={i === notes.length - 1}>{n}</p>
          {/each}
        </div>
        {#if !copy.repaired}
          <p class="hint" data-testid="draft-hint">{def.pages[copy.page]?.hint}</p>
        {/if}
      </article>

      <div class="chips" data-testid="draft-chips">
        {#each chips as c, i (c.n)}
          <button
            type="button"
            class="chip {c.state}"
            class:on={i === sel}
            aria-pressed={i === sel}
            aria-label="Test {c.n}, {WORD[c.state]}"
            disabled={busy}
            data-testid="draft-chip-{c.n}"
            onclick={() => desk.select(i)}
          >
            <span>{c.n}</span>
            <span aria-hidden="true">{c.state === 'broke' ? 'broke' : SYMBOL[c.state]}</span>
          </button>
        {/each}
      </div>

      <ul class="goals" data-testid="draft-goals">
        {#each lines as line, i (line)}
          <li class:met={tick(i) === '✓'} class:miss={tick(i) === '✗'}>
            <span class="tick" aria-hidden="true">{tick(i)}</span>
            <span>{line}</span>
          </li>
        {/each}
      </ul>

      <div class="stage" data-testid="draft-stage">
        <BattleBoard
          view={desk.view(def, sel, run)}
          minimal={busy}
          ontap={() => desk.playback.skip()}
        />
      </div>

      <h2>The page</h2>
      <DraftPage inside={copy.inside} {marks} />
      {#if !shown && !copy.repaired && issues.some((i) => !i.blocking)}
        <p class="faint" data-testid="draft-unreached">Faded runes are never reached by the flow.</p>
      {:else if shown && !copy.repaired}
        <p class="faint" data-testid="draft-legend">Lit runes fired in this test; faded runes didn't.</p>
      {/if}

      {#if !copy.repaired}
        <h2>The drawer</h2>
        {#if scraps}
          <p class="hand scraps" data-testid="draft-scraps">{scraps}</p>
        {/if}
        <ul class="drawer" data-testid="draft-drawer">
          {#each drawer as c (c.rune)}
            <li class="slot" class:empty={c.free === 0} data-testid="drawer-{c.rune}">
              <RuneGlyph rune={c.rune} size={26} />
              <span class="rname">{RUNES[c.rune].name}</span>
              <span class="free" title="{c.free} free of {c.total}">{c.free}</span>
              {#if c.fresh}<span class="new">new</span>{/if}
            </li>
          {/each}
        </ul>

        <div class="actions">
          <Button variant="quiet" label="Edit" disabled={busy} testid="draft-edit" onclick={() => (editing = true)} />
          <Button
            label="Run the tests"
            disabled={busy}
            testid="draft-run"
            onclick={() => void desk.runTests(def.id, copy.page, copy.inside)}
          />
        </div>

        {#if canTurn}
          <Button label="Turn the page" disabled={busy} testid="draft-turn" onclick={() => desk.turn(def.id)} />
        {/if}

        {#if canCopy}
          <article class="torn pass" data-testid="draft-pass">
            <p class="hand reaction">{def.reaction}</p>
            {#if issues.length > 0}
              <p class="faint">Tidy the runes it never reaches before you copy it.</p>
            {/if}
            <Button
              label="Copy into my notebook"
              disabled={issues.length > 0 || busy}
              testid="draft-copy"
              onclick={() => desk.copyIn(def.id)}
            />
          </article>
        {:else if fresh && !fresh.run.passed}
          <p class="hand fail" data-testid="draft-fail">
            {broke.some(Boolean) ? 'Something that worked has broken.' : 'Not yet.'} Look at what fired and what didn't.
          </p>
        {/if}

        {#if changed}
          {#if confirming}
            <p class="confirm" data-testid="draft-confirm">
              <span>Put back the owner's page? Your drawer keeps its scraps.</span>
              <Button variant="quiet" label="Keep mine" onclick={() => (confirming = false)} />
              <Button
                variant="danger"
                label="Start over"
                testid="draft-reset-confirm"
                onclick={() => {
                  confirming = false;
                  desk.startOver(def.id);
                }}
              />
            </p>
          {:else}
            <Button variant="quiet" label="Start over" disabled={busy} testid="draft-reset" onclick={() => (confirming = true)} />
          {/if}
        {/if}
      {:else}
        <article class="torn" data-testid="draft-mended">
          <p class="hand reaction" data-testid="draft-reaction">{def.reaction}</p>
          <p class="hand lore" data-testid="draft-lore">{def.lore}</p>
          <p class="mended">Mended and copied into your notebook.</p>
        </article>
      {/if}
    {:else}
      <h1 class="title">The owner's folios</h1>
      <p class="hand lead">Pages the owner left half-finished. Make them work.</p>
      {#if rows.length === 0}
        <p class="faint" data-testid="desk-empty">None yet. The Seam gives them up now and then.</p>
      {/if}
      <ul class="list" data-testid="draft-list">
        {#each rows as { def: d, copy: c } (d.id)}
          <li>
            <button type="button" class="torn row" class:done={c.repaired} data-testid="draft-row-{d.id}" onclick={() => open(d.id)}>
              <span class="name">{d.name}</span>
              <span class="status" data-testid="draft-status-{d.id}">{pageLabel(d, c)}</span>
              <span class="hand note">{d.note}</span>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  <RevisionEditor
    inside={editing && copy ? copy.inside : null}
    title={def ? `Edit ${def.name}` : 'Edit'}
    palette={def && copy ? trayPalette(def, copy.page) : []}
    issues={insideIssues}
    saveLabel="Keep"
    lenient
    onsave={save}
    onclose={() => (editing = false)}
  />
</section>

<style>
  .desk {
    position: relative;
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--parchment);
  }
  header {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-right: var(--space-3);
    border-bottom: 2px solid var(--ink);
    background: var(--parchment-dark);
  }
  .back {
    display: inline-flex;
    align-items: center;
    min-height: var(--tap);
    padding: 0 var(--space-2);
    border: 0;
    background: none;
    color: var(--ink);
    font: inherit;
    cursor: pointer;
  }
  .count {
    font: 700 14px var(--mono);
  }
  .body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior: contain;
    padding: var(--space-3) var(--space-3) calc(var(--space-4) + 24px);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  h1 {
    margin: 0;
    font-size: 22px;
    font-weight: normal;
    letter-spacing: 0.03em;
  }
  h2 {
    margin: var(--space-1) 0 0;
    padding-bottom: 4px;
    border-bottom: 2px solid var(--ink);
    font-size: 13px;
    font-weight: normal;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--ink-soft);
  }
  .hand {
    font-family: var(--hand);
  }
  .lead {
    margin: 0;
    font-size: 17px;
    color: var(--ink-soft);
  }
  .faint {
    margin: 0;
    font-size: 13px;
    color: var(--ink-soft);
  }
  .list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  /* A page torn from a notebook: ragged lower edge, a margin line and faint ruling. */
  .torn {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: var(--space-2) var(--space-3) calc(var(--space-2) + 8px);
    border: 0;
    background:
      linear-gradient(to right, transparent 26px, rgba(139, 58, 43, 0.35) 26px 27px, transparent 27px),
      repeating-linear-gradient(to bottom, transparent 0 23px, rgba(43, 33, 24, 0.08) 23px 24px),
      #f7efd8;
    box-shadow: 0 2px 0 rgba(43, 33, 24, 0.2);
    clip-path: polygon(
      0 0, 100% 0, 100% calc(100% - 7px), 94% calc(100% - 2px), 88% calc(100% - 6px),
      81% 100%, 74% calc(100% - 4px), 66% calc(100% - 8px), 58% calc(100% - 1px),
      51% calc(100% - 5px), 43% 100%, 36% calc(100% - 6px), 28% calc(100% - 2px),
      20% calc(100% - 7px), 12% calc(100% - 1px), 6% calc(100% - 5px), 0 calc(100% - 3px)
    );
    padding-left: calc(var(--space-3) + 20px);
    color: var(--ink);
    text-align: left;
  }
  .row {
    width: 100%;
    font: inherit;
    cursor: pointer;
    min-height: var(--tap);
  }
  .row.done {
    opacity: 0.85;
  }
  .name {
    font-size: 18px;
  }
  .status {
    font: 12px var(--mono);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-soft);
  }
  .note {
    margin: 0;
    font-size: 18px;
    line-height: 1.25;
    color: var(--accent);
  }
  .frag {
    margin: 0;
    font-size: 17px;
    line-height: 1.25;
    color: var(--ink-faint);
  }
  .frag.newest {
    color: var(--ink);
  }
  .reaction {
    margin: 0;
    font-size: 18px;
    line-height: 1.25;
    color: var(--ink);
  }
  .lore {
    margin: 0;
    font-size: 17px;
    line-height: 1.3;
    white-space: pre-line;
    color: var(--ink);
  }
  .mended {
    margin: 0;
    font-size: 13px;
    color: var(--ink-soft);
  }
  .hint {
    margin: 0;
    font-size: 13px;
    font-style: italic;
    color: var(--ink-soft);
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  .chip {
    display: inline-flex;
    gap: 6px;
    align-items: center;
    min-height: var(--tap);
    padding: 0 var(--space-3);
    border: 1.5px solid var(--line);
    border-radius: var(--radius);
    background: rgba(255, 252, 240, 0.7);
    color: var(--ink);
    font: 700 15px var(--mono);
    cursor: pointer;
  }
  .chip.on {
    border-color: var(--ink);
    box-shadow: 0 2px 0 var(--ink);
  }
  .chip.pass {
    color: var(--ok, #4f6b3a);
  }
  .chip.fail,
  .chip.broke {
    color: var(--danger);
  }
  .chip.broke {
    border-style: dashed;
  }
  .goals {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 15px;
  }
  .goals li {
    display: flex;
    gap: var(--space-2);
  }
  .tick {
    flex: none;
    width: 1.2em;
    text-align: center;
    color: var(--ink-faint);
  }
  .goals .met .tick {
    color: var(--ok, #4f6b3a);
    font-weight: 700;
  }
  .goals .miss .tick {
    color: var(--danger);
    font-weight: 700;
  }
  .scraps {
    margin: 0;
    font-size: 18px;
    color: var(--accent);
  }
  .drawer {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin: 0;
    padding: 6px 0 0;
    list-style: none;
  }
  .slot {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px 2px 4px;
    border: 1.5px solid var(--line);
    border-radius: var(--radius);
    background: rgba(255, 252, 240, 0.7);
    font-size: 13px;
  }
  .slot.empty {
    opacity: 0.45;
  }
  .free {
    font: 700 14px var(--mono);
  }
  .new {
    position: absolute;
    top: -9px;
    right: -4px;
    padding: 0 5px;
    border-radius: 8px;
    background: var(--accent);
    color: #fff;
    font: 700 10px var(--mono);
    text-transform: uppercase;
  }
  .stage {
    flex: none;
    height: 190px;
  }
  .actions {
    display: grid;
    grid-template-columns: 1fr 1.4fr;
    gap: var(--space-2);
  }
  .pass {
    gap: var(--space-2);
    align-items: flex-start;
  }
  .fail {
    margin: 0;
    font-size: 18px;
    color: var(--danger);
  }
  .confirm {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-1) var(--space-2);
    margin: 0;
    font-size: 14px;
  }
</style>
