<script lang="ts">
  import { endingOf } from '$engine/drawing';
  import { BUILD } from '../../../app/build';
  import { game } from '../../../app/instance';
  import { isDevEnabled, MOTIONS, type Motion } from '../../../app/prefs';
  import { prefs } from '../../../app/prefs.svelte';
  import { go } from '../../../app/router.svelte';
  import { href } from '../../../app/routes';
  import { toast } from '../../../app/toasts.svelte';
  import ActionButton from './ActionButton.svelte';
  import Card from './Card.svelte';
  import Sheet from './Sheet.svelte';

  /** C7 (frozen props). The ⋯ menu: Settings, Install, About, Copy/Paste save, Start a new
   *  notebook, the Lab (always) and the Gallery (dev builds or `?dev`). */
  interface Props {
    open: boolean;
    onclose: () => void;
  }

  let { open, onclose }: Props = $props();

  type View = 'list' | 'settings' | 'install' | 'about' | 'paste' | 'copy' | 'reset';
  const TITLES: Record<View, string> = {
    list: 'The notebook',
    settings: 'Settings',
    install: 'Install to the Home Screen',
    about: 'About',
    paste: 'Paste save',
    copy: 'Copy save',
    reset: 'Start a new notebook',
  };

  let view = $state<View>('list');
  let pasted = $state('');
  let copyText = $state('');

  // Opening the sheet always starts at the list.
  $effect(() => {
    if (open) view = 'list';
  });

  const showGallery = isDevEnabled(
    import.meta.env.DEV,
    typeof location === 'undefined' ? '' : location.search,
  );
  const creditsSeen = $derived(
    game.save.profile ? endingOf(game.save.profile).creditsSeen : false,
  );

  const MOTION_LABELS: Record<Motion, string> = { normal: 'Normal', quick: 'Quick' };

  function close(): void {
    view = 'list';
    onclose();
  }

  async function copySave(): Promise<void> {
    const text = game.exportText();
    try {
      await navigator.clipboard.writeText(text);
      close();
      toast('Save copied');
    } catch {
      // No clipboard access (some iOS contexts): show the text to select by hand.
      copyText = text;
      view = 'copy';
    }
  }

  function loadPasted(): void {
    const err = game.importText(pasted);
    if (err) {
      toast(err, 'warn');
      return;
    }
    pasted = '';
    close();
    toast('Save loaded');
  }

  function resetAll(): void {
    game.reset();
    close();
    // A full reload clears every screen's in-memory state too: the next visit is a first one.
    go('study');
    location.reload();
  }
</script>

<Sheet {open} title={TITLES[view]} onclose={close}>
  <div class="menu" data-testid="menu-sheet">
    {#if view === 'list'}
      <ActionButton kind="quiet" label="Settings" onclick={() => (view = 'settings')} testid="menu-settings" />
      <ActionButton
        kind="quiet"
        label="Install to the Home Screen"
        onclick={() => (view = 'install')}
        testid="menu-install"
      />
      <ActionButton kind="quiet" label="About" onclick={() => (view = 'about')} testid="menu-about" />
      <ActionButton kind="quiet" label="Copy save" onclick={copySave} testid="copy-save" />
      <ActionButton kind="quiet" label="Paste save" onclick={() => (view = 'paste')} testid="paste-save" />
      <ActionButton
        kind="quiet"
        danger
        label="Start a new notebook"
        onclick={() => (view = 'reset')}
        testid="reset-save"
      />
      <a class="item tap" href={href('lab', { scenario: 'sandbox' })} onclick={close} data-testid="menu-lab">
        The Lab
      </a>
      {#if showGallery}
        <a class="item tap" href={href('gallery')} onclick={close} data-testid="menu-gallery">The Gallery</a>
      {/if}
      <p class="hint">
        Your notebook lives in this browser. Copy the save somewhere safe: phones sometimes clear
        site data.
      </p>
    {:else if view === 'settings'}
      <Card tone="plain">
        <fieldset class="setting">
          <legend class="name">Motion</legend>
          <div class="segments">
            {#each MOTIONS as m (m)}
              <button
                type="button"
                aria-pressed={prefs.motion === m}
                class="segment tap"
                class:on={prefs.motion === m}
                onclick={() => (prefs.motion = m)}
                data-testid="motion-{m}"
              >
                {MOTION_LABELS[m]}
              </button>
            {/each}
          </div>
        </fieldset>
        <p class="hint">Quick plays every animation at twice the speed. It is kept on this device.</p>
      </Card>
      <div class="row">
        <ActionButton kind="quiet" label="Back" onclick={() => (view = 'list')} />
      </div>
    {:else if view === 'install'}
      <p class="text">
        On an iPhone, open this page in Safari, tap Share, then Add to Home Screen. The notebook
        then opens full-screen like an app, and keeps working offline.
      </p>
      <div class="row">
        <ActionButton kind="quiet" label="Back" onclick={() => (view = 'list')} />
      </div>
    {:else if view === 'about'}
      <p class="text">The Apprentice's Notebook</p>
      <p class="build" data-testid="about-build">{BUILD}</p>
      {#if creditsSeen}
        <a class="item tap" href={href('credits')} onclick={close} data-testid="menu-credits">Credits</a>
      {/if}
      <div class="row">
        <ActionButton kind="quiet" label="Back" onclick={() => (view = 'list')} />
      </div>
    {:else if view === 'paste'}
      <p class="text">Paste a copied save here. It replaces the notebook you have now.</p>
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
        <ActionButton kind="quiet" label="Back" onclick={() => (view = 'list')} />
        <ActionButton kind="secondary" danger label="Replace my save" onclick={loadPasted} testid="paste-go" />
      </div>
    {:else if view === 'reset'}
      <p class="text">
        This wipes the whole notebook (runes, glyphs, folios, trip) and begins a new game. Copy the
        save first if you might want it back.
      </p>
      <div class="row">
        <ActionButton kind="quiet" label="Back" onclick={() => (view = 'list')} testid="reset-cancel" />
        <ActionButton danger label="Wipe everything" onclick={resetAll} testid="reset-go" />
      </div>
    {:else if view === 'copy'}
      <p class="text">Copying was blocked. Select the text below and copy it by hand.</p>
      <textarea readonly rows="5" value={copyText} aria-label="Save text" data-testid="copy-text"
      ></textarea>
      <div class="row">
        <ActionButton kind="quiet" label="Back" onclick={() => (view = 'list')} />
      </div>
    {/if}
  </div>
</Sheet>

<style>
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
    font-family: var(--font-serif);
    font-size: var(--type-md);
    color: var(--ink);
    text-decoration: none;
  }
  .text {
    margin: 0;
    font-family: var(--font-serif);
    font-size: var(--type-md);
    color: var(--ink);
  }
  .hint {
    margin: var(--space-2) 0 0;
    font-family: var(--font-serif);
    font-size: var(--type-sm);
    color: var(--ink-soft);
  }
  .build {
    margin: 0;
    font: 12px var(--font-mono);
    color: var(--ink-soft);
  }
  .setting {
    min-width: 0;
    margin: 0;
    padding: 0;
    border: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .name {
    font-family: var(--font-serif);
    font-size: var(--type-md);
    color: var(--ink);
  }
  .segments {
    display: flex;
    gap: var(--space-2);
  }
  .segment {
    flex: 1;
    border: 2px solid var(--ink);
    border-radius: var(--radius);
    background: transparent;
    font-family: var(--font-serif);
    font-size: var(--type-md);
    color: var(--ink);
    cursor: pointer;
  }
  .segment.on {
    background: var(--ink);
    color: var(--parchment);
  }
  .segment:focus-visible {
    outline: 3px solid var(--select);
    outline-offset: 2px;
  }
  textarea {
    display: block;
    width: 100%;
    padding: var(--space-2);
    border: 2px solid var(--line);
    border-radius: var(--radius);
    background: var(--parchment-dark);
    font: 16px/1.3 var(--font-mono);
    resize: none;
  }
  .row {
    display: flex;
    justify-content: space-between;
    gap: var(--space-2);
  }
</style>
