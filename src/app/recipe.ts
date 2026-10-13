import { type InteractionId, type MaterialId, RUNES, type RuneId, TUNING } from '$data';
import { type CellKey, type Coord, key, type Spell, type SpellNode } from '$engine';

/**
 * A spell written out as numbered steps, in the order the engine resolves them (path order,
 * depth-first, a Fork's left branch before its right). Reactions between steps are read off
 * statically, from which materials earlier steps laid on the same tiles. Interactions the
 * notebook hasn't recorded are hinted at, not named.
 */

export interface RecipeStep {
  /** 1-based resolution order; the number drawn on the lattice. */
  n: number;
  rune: RuneId;
  at: Coord;
  /** Nesting under triggers (0 = top level). */
  depth: number;
  text: string;
  /** "→ the oil ignites: fire for 2 rounds" lines caused by this step. */
  reactions: string[];
  /** Why an expected reaction won't happen (order, steam), or null. */
  note: string | null;
}

export interface Recipe {
  /** The source's own effect, e.g. "Bolt hits the first thing in line for 2 damage." */
  source: string;
  steps: RecipeStep[];
  /** General remarks (Fork order, echo). */
  notes: string[];
}

type Layer = 'ink' | 'oil' | 'fire' | 'steam' | 'brass';

const rounds = (n: number) => `${n} ${n === 1 ? 'round' : 'rounds'}`;

function sourceText(s: Spell): string {
  switch (s.source) {
    case 'bolt':
      return `Bolt hits the first thing in line for ${s.magnitude} damage.`;
    case 'quill':
      return `Quill hits the first thing in line for ${s.magnitude} damage and pools ink under it.`;
    case 'splash':
      return `Splash hits every unit in a 3×3 for ${s.magnitude} damage (allies too).`;
    case 'ward':
      return `Ward shields you or an adjacent ally for ${s.magnitude}.`;
  }
}

/** What the path runes land on, as a noun phrase. */
function targetPhrase(s: Spell): string {
  switch (s.source) {
    case 'bolt':
    case 'quill':
      return 'the tile it hits';
    case 'splash':
      return 'the 3×3';
    case 'ward':
      return 'the shielded ally';
  }
}

function area(target: string, magnitude: number): string {
  if (magnitude <= 1) return target;
  const r = magnitude - 1;
  return `${target} and ${r} ${r === 1 ? 'tile' : 'tiles'} around it`;
}

export function spellRecipe(
  spell: Spell,
  affinity: readonly MaterialId[],
  known: readonly InteractionId[],
): Recipe {
  const steps: RecipeStep[] = [];
  const said = (id: InteractionId, named: string, what: string): string =>
    known.includes(id) ? named : `something happens with the ${what} (not in your notebook yet)`;

  const material = (
    node: Extract<SpellNode, { kind: 'material' }>,
    target: string,
    layers: Set<Layer>,
  ) => {
    const m = node.magnitude;
    const where = area(target, m);
    const boost = affinity.includes(node.rune) ? ' (+1 affinity)' : '';
    const reactions: string[] = [];
    let text: string;
    switch (node.rune) {
      case 'ink':
        text = `Ink marks ${where}${boost}: inked units take +${TUNING.inkedBonus} damage; bare floor gets a puddle.`;
        if (layers.has('steam')) {
          reactions.push(said('diffuse', 'the ink spreads through the whole steam cloud', 'steam'));
        }
        layers.add('ink');
        break;
      case 'oil':
        text = `Oil coats ${where}${boost}.`;
        if (layers.has('fire')) {
          reactions.push(said('ignite', 'it catches the fire at once', 'fire'));
        }
        layers.add('oil');
        break;
      case 'spark':
        text = `Spark hits ${target} for ${m} damage${boost}.`;
        if (layers.has('oil') && !layers.has('fire')) {
          if (layers.has('steam')) {
            reactions.push(said('extinguish', 'the steam keeps the oil from lighting', 'oil'));
          } else {
            reactions.push(
              said('ignite', `the oil ignites: fire for ${rounds(TUNING.fireRounds)}`, 'oil'),
            );
            layers.add('fire');
          }
        }
        if (layers.has('brass')) {
          reactions.push(said('conduct', 'it runs through all connected brass', 'brass'));
        }
        if (layers.has('steam')) {
          reactions.push(said('arc', 'it arcs through the whole steam cloud', 'steam'));
        }
        if (layers.has('ink')) {
          reactions.push(said('detonate', 'an inked survivor detonates', 'ink'));
        }
        break;
      case 'steam':
        text = `Steam clouds ${where} for ${rounds(TUNING.steamRounds)}${boost}: it blocks shots.`;
        if (layers.has('fire')) {
          reactions.push(said('extinguish', 'it puts the fire out (the oil stays)', 'fire'));
          layers.delete('fire');
        }
        layers.add('steam');
        break;
      case 'brass':
        text = `Brass coats ${where}${boost}; bare floor becomes a plate.`;
        layers.add('brass');
        break;
      case 'smear':
        text = `Smear inks ${where}${boost}, then each unit it inks passes the mark to the units beside it (one hop).`;
        layers.add('ink');
        break;
      case 'torch':
        text = `Torch oils ${where}${boost} and sets it alight: the fire runs along connected oil.`;
        if (layers.has('steam')) {
          reactions.push(said('extinguish', 'steam keeps the oil from lighting', 'oil'));
        } else {
          layers.add('fire');
        }
        layers.add('oil');
        break;
      case 'fog':
        text = `Fog oils ${where}${boost} and clouds it with steam: units slide, and shots stop.`;
        if (layers.has('fire')) {
          reactions.push(said('extinguish', 'the steam puts the fire out (the oil stays)', 'fire'));
          layers.delete('fire');
        }
        layers.add('oil');
        layers.add('steam');
        break;
      case 'mist':
        text = `Mist inks every unit in the steam cloud touching ${where}${boost}, then the steam is gone.`;
        if (layers.has('steam')) {
          layers.add('ink');
          layers.delete('steam');
        } else {
          reactions.push('there is no steam here: nothing happens');
        }
        break;
      case 'brand':
        text = `Brand marks the units on ${where}${boost} like Ink, but never pools on the floor; fire hits a branded unit for +2.`;
        break;
    }
    return { text, reactions };
  };

  const walk = (
    nodes: readonly SpellNode[],
    target: string,
    layers: Set<Layer>,
    depth: number,
  ): void => {
    for (const node of nodes) {
      const n = steps.length + 1;
      if (node.kind === 'material') {
        const { text, reactions } = material(node, target, layers);
        steps.push({ n, rune: node.rune, at: node.at, depth, text, reactions, note: null });
        walk(node.next, target, layers, depth);
      } else if (node.rune === 'onInked') {
        const note = layers.has('ink')
          ? null
          : 'Nothing earlier inks the target: only an already inked one passes.';
        steps.push({
          n,
          rune: node.rune,
          at: node.at,
          depth,
          text: 'If a target is inked, then:',
          reactions: [],
          note,
        });
        walk(node.next, target, layers, depth + 1);
      } else {
        steps.push({
          n,
          rune: node.rune,
          at: node.at,
          depth,
          text: 'For each unit this spell kills, on its tile and the 4 around it:',
          reactions: [],
          note: null,
        });
        // New tiles: nothing earlier was laid there.
        walk(node.next, 'those tiles', new Set(), depth + 1);
      }
    }
  };

  walk(spell.nodes, targetPhrase(spell), new Set(), 0);
  markLateSpark(steps);

  const notes: string[] = [];
  if (spell.path.some((c) => c.rune === 'fork')) {
    notes.push('A Fork runs one branch to the end, then the other: follow the numbers.');
  }
  if (spell.echo) notes.push('Echo: the whole spell repeats next turn at half strength.');
  return { source: sourceText(spell), steps, notes };
}

/** Oil, brass or steam laid after the last Spark: the spark has already passed. */
function markLateSpark(steps: RecipeStep[]): void {
  let lastSpark = -1;
  for (const [i, st] of steps.entries()) if (st.rune === 'spark') lastSpark = i;
  if (lastSpark < 0) return;
  for (const [i, st] of steps.entries()) {
    if (i < lastSpark || st.note) continue;
    if (st.rune === 'oil' || st.rune === 'brass' || st.rune === 'steam') {
      st.note = `The Spark (${steps[lastSpark]?.n}) comes before this ${RUNES[st.rune].name.toLowerCase()}, so it won't reach it.`;
    }
  }
}

/** Step numbers by lattice cell, for the badges on the runes. */
export function stepNumbers(recipe: Recipe): Map<CellKey, number> {
  const out = new Map<CellKey, number>();
  for (const st of recipe.steps) if (!out.has(key(st.at))) out.set(key(st.at), st.n);
  return out;
}
