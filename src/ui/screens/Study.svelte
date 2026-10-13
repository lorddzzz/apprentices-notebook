<script lang="ts">
  import { ENCOUNTERS, MEMBER_IDS, MEMBERS } from '$data';
  import { compiledFor, describeSpell, latticeOf, validateLoadout } from '$engine';
  import { game } from '../../app/instance';
  import { go } from '../../app/router.svelte';
  import { href } from '../../app/routes';
  import { profileShelf } from '../../app/study';
  import { toast } from '../../app/toasts.svelte';
  import Button from '../components/common/Button.svelte';
  import Sheet from '../components/common/Sheet.svelte';
  import LatticeEditor from '../components/lattice/LatticeEditor.svelte';
  import StudyScene from '../components/study/StudyScene.svelte';

  const profile = $derived(game.profile);
  const lattice = $derived(latticeOf(profile, game.member));
  const compiled = $derived(compiledFor(profile, game.member));
  const slots = $derived(profileShelf(profile, game.member));

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
  <StudyScene oncodex={() => go('codex')} onmenu={openMenu} />

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
      onmember={(m) => game.selectMember(m)}
      onreject={(reason) => toast(reason)}
    />
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
  /* The editor is shared with the Lab; on the desk its parts become paper, ribbons and a slip of notes. */
  .desk :global(.page) {
    border: 0;
    border-radius: 3px 8px 8px 3px;
    background:
      linear-gradient(90deg, rgba(139, 58, 43, 0.35) 0 2px, transparent 2px) 34px 0 / 100% 100% no-repeat,
      repeating-linear-gradient(to bottom, transparent 0 27px, rgba(47, 79, 111, 0.12) 27px 28px),
      var(--parchment);
    box-shadow:
      inset 8px 0 10px -8px rgba(43, 33, 24, 0.45),
      0 4px 0 var(--parchment-deep),
      0 8px 14px rgba(0, 0, 0, 0.45);
  }
  .desk :global(.mark:not(.on)) {
    background: var(--parchment-dark);
  }
  /* the ink pot's count sits on a paper tag so it reads against the wood */
  .desk :global(.pot) {
    align-self: center;
    min-height: 36px;
    padding: 0 var(--space-2) 0 var(--space-1);
    border-radius: 999px;
    background: var(--parchment);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
  }
  .desk :global(.info) {
    border-radius: var(--radius);
    background: var(--parchment);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
    transform: rotate(-0.3deg);
  }
  .desk :global(.shelf) {
    padding: 4px;
    border-radius: var(--radius);
    background: var(--wood);
    box-shadow:
      inset 0 2px 4px rgba(0, 0, 0, 0.5),
      0 1px 0 rgba(255, 255, 255, 0.12);
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
