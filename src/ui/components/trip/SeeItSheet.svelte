<script lang="ts">
  import type { BattleState } from '$engine';
  import { viewOf } from '../../../app/view';
  import BattleBoard from '../board/BattleBoard.svelte';
  import Sheet from '../common/Sheet.svelte';

  /** UT-D5. The board as the trip ended, read-only: no actions, no focus targets. */
  interface Props {
    open: boolean;
    final: BattleState;
    onclose: () => void;
  }

  let { open, final, onclose }: Props = $props();

  const view = $derived(viewOf(final));
</script>

<Sheet {open} title="How it ended" {onclose} size="tall">
  <div class="board" data-testid="see-it-board" style:aspect-ratio="{view.width} / {view.height}">
    <BattleBoard {view} readonly />
  </div>
</Sheet>

<style>
  .board {
    width: 100%;
    max-height: 60vh;
    margin: 0 auto;
  }
</style>
