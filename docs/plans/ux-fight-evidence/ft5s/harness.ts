/**
 * FT-5s layout spike harness (dev only, served by `pnpm dev`; not part of the app build).
 *
 * Mounts the REAL `BattleBoard` inside a phone-sized frame laid out with the FT-D9 budget: header
 * 56, bottom stack 200 (party 56, spell row 56, one 52 row of log icon + Skip + End turn, three 12
 * gaps), the board filling the remainder, caption and trick banner overlaying the board's top edge.
 * The header and stack are plain placeholders for what Pack B builds; their sizes are the budget.
 *
 * `harness.html?cols=7&rows=9&state=normal|tall|boss|end&h=812&top=44&bottom=34`
 */
import { mount } from 'svelte';
import { parseBoard } from '$engine';
import { viewOfSpec } from '../../../../src/app/view';
import BattleBoard from '../../../../src/ui/components/board/BattleBoard.svelte';
import '../../../../src/ui/theme.css';

const q = new URLSearchParams(location.search);
const cols = Number(q.get('cols') ?? 7);
const rows = Number(q.get('rows') ?? 9);
const state = q.get('state') ?? 'normal';
const height = Number(q.get('h') ?? 812);
const top = Number(q.get('top') ?? 44);
const bottom = Number(q.get('bottom') ?? 34);
/** The end overlay's height: the plan's budget replaces the stack (200); the old design was 282. */
const endHeight = Number(q.get('end') ?? 200);

function ascii(): string {
  const grid: string[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => '.'),
  );
  const put = (x: number, y: number, t: string) => {
    const row = grid[y];
    if (row) row[x] = t;
  };
  put(0, rows - 1, 'D');
  put(Math.min(1, cols - 1), rows - 1, 'S');
  if (state === 'tall' || state === 'end') {
    // A figure on each of the first two rows in every column: vertically adjacent pairs everywhere.
    for (let x = 0; x < cols; x++) {
      put(x, 0, 'r');
      put(x, 1, 'r');
    }
  } else if (state === 'boss') {
    put(Math.floor(cols / 2), 0, 'M');
    put(0, 1, 'r');
  } else {
    put(cols - 1, 1, 'r');
    put(1, 2, 'r');
  }
  return grid.map((r) => r.join(' ')).join('\n');
}

const view = viewOfSpec(parseBoard(ascii()));
(window as unknown as { __taps: string[]; __holds: string[] }).__taps = [];
(window as unknown as { __taps: string[]; __holds: string[] }).__holds = [];
const log = window as unknown as { __taps: string[]; __holds: string[] };

const phone = document.getElementById('phone');
if (!phone) throw new Error('no #phone');
phone.style.cssText = `box-sizing:border-box;width:375px;height:${height}px;padding:${top}px 8px ${bottom}px;display:flex;flex-direction:column;gap:6px;background:var(--parchment);position:relative;overflow:hidden`;
document.body.style.margin = '0';

const box = (testid: string, h: number, extra = '') => {
  const el = document.createElement('div');
  el.dataset.testid = testid;
  el.style.cssText = `flex:none;height:${h}px;box-sizing:border-box;${extra}`;
  return el;
};
const button = (testid: string, label: string, w: number | null, h: number) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.dataset.testid = testid;
  b.textContent = label;
  b.style.cssText = `height:${h}px;${w ? `width:${w}px;flex:none` : 'flex:1'};min-width:44px`;
  return b;
};

const header = box(
  'hdr',
  56,
  'border-bottom:1px solid var(--line);font:14px var(--mono);padding:4px 0',
);
header.innerHTML =
  state === 'boss'
    ? 'Round 4 · 4/4 · ⋯<br />The Lamp-Mother ▮▮▮▮▯ rule line'
    : 'Round 1 · 1/4 · ⋯<br />&nbsp;';
phone.append(header);

const wrap = box('board-wrap', 0, 'position:relative;flex:1;min-height:0;height:auto');
phone.append(wrap);
const caption = box(
  'caption',
  28,
  'position:absolute;left:0;right:0;top:0;z-index:3;pointer-events:none;background:rgba(43,33,24,.5);color:#fff;font:13px var(--mono);padding:4px',
);
caption.textContent = state === 'boss' ? 'TRICK: the lamps gutter' : 'Next: the rat bites C3';
wrap.append(caption);

const stack = box(state === 'end' ? 'end-overlay' : 'stack', state === 'end' ? endHeight : 200);
stack.style.cssText += ';display:flex;flex-direction:column;gap:12px;';
if (state === 'end') {
  stack.style.cssText +=
    state === 'end' && endHeight > 200
      ? ';margin-top:-82px;position:relative;z-index:4;background:var(--parchment);border-top:2px solid var(--ink)'
      : '';
  stack.append(button('take-find', 'Take your find', null, 52));
} else {
  const party = box('party', 56, 'display:flex;gap:8px');
  for (const n of ['p1', 'p2', 'p3']) party.append(button(n, n, null, 56));
  const spell = box('spell', 56, 'display:flex;gap:8px');
  for (const n of ['spell', 'shove', 'undo']) spell.append(button(n, n, null, 56));
  const row = box('row', 52, 'display:flex;gap:8px');
  row.append(
    button('log', '≡', 44, 52),
    button('skip', 'Skip ▸▸', null, 52),
    button('end-turn', 'End turn', null, 52),
  );
  stack.append(party, spell, row);
}
phone.append(stack);

mount(BattleBoard, {
  target: wrap,
  props: {
    view,
    ontap: (at: { x: number; y: number }) => log.__taps.push(`${at.x},${at.y}`),
    onhold: (at: { x: number; y: number }) => log.__holds.push(`${at.x},${at.y}`),
  },
});
document.documentElement.dataset.harness = 'ready';
