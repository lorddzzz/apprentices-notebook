<script lang="ts">
  import type { ApprenticeDef } from '$data';
  import ArtImage from '../../art/ArtImage.svelte';
  import type { ArtId } from '../../art/registry';
  import ApprenticeToken from '../common/ApprenticeToken.svelte';

  /** The apprentice's portrait (192², shown at `size`), or their token when no art ships (C2). */
  interface Props {
    def: Pick<ApprenticeDef<string>, 'id' | 'token' | 'look' | 'name'>;
    size?: number;
  }

  let { def, size = 96 }: Props = $props();
  const id = $derived(`portraits/shared/${def.id}` as ArtId);
</script>

<span class="portrait" style:width="{size}px" style:height="{size}px">
  <ArtImage {id} fit="cover" alt="">
    {#snippet fallback()}
      <ApprenticeToken {def} size={Math.round(size * 0.6)} />
    {/snippet}
  </ArtImage>
</span>

<style>
  .portrait {
    display: inline-grid;
    flex: none;
    place-items: center;
    overflow: hidden;
    border-radius: var(--radius);
    background: var(--parchment-dark);
  }
  .portrait :global(img) {
    width: 100%;
    height: 100%;
  }
</style>
