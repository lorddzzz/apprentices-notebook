/**
 * FT-5s measurement: drives harness.html in headless Chromium and prints the measured table.
 *
 *   pnpm dev --port 5191 --strictPort &
 *   PLAYWRIGHT_CORE=/path/to/node_modules/playwright-core node measure.mjs > table.md
 *
 * Playwright is not a repo dependency. Every rect is a CSS-pixel `getBoundingClientRect()`.
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_CORE ?? 'playwright-core');

const BASE = process.env.BASE ?? 'http://localhost:5191/apprentices-notebook';
const PAGE = `${BASE}/docs/plans/ux-fight-evidence/ft5s/harness.html`;
const DEVICES = [
  { name: '812 (44/34)', h: 812, top: 44, bottom: 34 },
  { name: '667 (20/0, SE)', h: 667, top: 20, bottom: 0 },
  { name: '667 (44/34, stress)', h: 667, top: 44, bottom: 34 },
];
const STATES = ['normal', 'tall', 'boss', 'end'];
const SIZES = [];
for (const cols of [5, 6, 7]) for (const rows of [6, 7, 8, 9]) SIZES.push([cols, rows]);
const LAP_NEEDED = 1 / 3;

const r = (n) => Math.round(n * 10) / 10;
const ok = (c) => (c ? 'ok' : 'FAIL');

/** The dev server now and then stalls a navigation: retry once. */
async function open(page, url) {
  for (let attempt = 0; ; attempt++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('html[data-harness=ready]', { timeout: 10000 });
      return;
    } catch (e) {
      if (attempt >= 2) throw e;
    }
  }
}

async function measure(page, cols, rows, state, dev, end) {
  const url = `${PAGE}?cols=${cols}&rows=${rows}&state=${state}&h=${dev.h}&top=${dev.top}&bottom=${dev.bottom}${end ? `&end=${end}` : ''}`;
  await open(page, url);
  return page.evaluate(
    ({ cols, rows, devBottom, devH }) => {
      const rect = (el) => {
        const b = el.getBoundingClientRect();
        return { x: b.x, y: b.y, w: b.width, h: b.height, r: b.right, b: b.bottom };
      };
      const hits = [...document.querySelectorAll('rect.hit')];
      const first = rect(hits[0]);
      const last = rect(hits[hits.length - 1]);
      const wrap = rect(document.querySelector('[data-testid=board-wrap]'));
      const caption = rect(document.querySelector('[data-testid=caption]'));
      // Unobscured: at each cell's centre and four inner corners the topmost element is that cell's rect.
      // The caption has pointer-events: none, so a tap goes through it.
      let obscured = 0;
      for (const el of hits) {
        const b = el.getBoundingClientRect();
        const pts = [
          [b.x + b.width / 2, b.y + b.height / 2],
          [b.x + 3, b.y + 3],
          [b.right - 3, b.y + 3],
          [b.x + 3, b.bottom - 3],
          [b.right - 3, b.bottom - 3],
        ];
        if (pts.some(([px, py]) => document.elementFromPoint(px, py) !== el)) obscured++;
      }
      const primary = document.querySelector('[data-testid=end-turn], [data-testid=take-find]');
      const ctrls = [...document.querySelectorAll('button')].map(rect);
      return {
        cell: first.w,
        first,
        last,
        pr: primary ? rect(primary) : null,
        minCtrl: Math.min(...ctrls.map((c) => Math.min(c.w, c.h))),
        // Room above the top row inside the board area (gutter + slack) for a lapping figure and the caption.
        headroom: first.y - wrap.y,
        captionOverTop: Math.max(0, caption.b - first.y),
        obscured,
        gapToControls: Math.min(...ctrls.map((c) => c.y)) - last.b,
        overflowX: Math.max(last.r - innerWidth, 0 - first.x),
        overflowBottom: last.b - (devH - devBottom),
        cells: hits.length,
        expected: cols * rows,
      };
    },
    { cols, rows, devBottom: dev.bottom, devH: dev.h },
  );
}

async function targeting(page, cols, rows) {
  await open(page, `${PAGE}?cols=${cols}&rows=${rows}&state=tall&h=812`);
  // Keyboard: focus the first cell and activate it with Enter, Tab to the next and press Space.
  await page.focus('rect.hit');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Space');
  const kbd = await page.evaluate(() => window.__taps.slice());
  // Hold: press the last cell for 550 ms (HOLD_MS is 450) and release; the release click is swallowed.
  const hits = await page.$$('rect.hit');
  const box = await hits[hits.length - 1].boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(550);
  await page.mouse.up();
  const after = await page.evaluate(() => ({
    taps: window.__taps.slice(),
    holds: window.__holds.slice(),
  }));
  // Adjacent taps: 3 px either side of the shared edge of two vertically adjacent cells.
  const a = await hits[0].boundingBox();
  await page.evaluate(() => window.__taps.splice(0));
  await page.mouse.click(a.x + a.width / 2, a.y + a.height - 3);
  await page.mouse.click(a.x + a.width / 2, a.y + a.height + 3);
  const adj = await page.evaluate(() => window.__taps.slice());
  return { kbd, holds: after.holds, holdTapSwallowed: after.taps.length === kbd.length, adj };
}

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 375, height: 812 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
const rows = [];
for (const dev of DEVICES) {
  await page.setViewportSize({ width: 375, height: dev.h });
  for (const [cols, rws] of SIZES) {
    for (const state of STATES) {
      rows.push({ dev, cols, rws, state, m: await measure(page, cols, rws, state, dev) });
    }
  }
}
// The old design's end overlay (282 px, rising over the stack): how much of the board it hides.
const old = [];
for (const dev of DEVICES.slice(0, 2)) {
  await page.setViewportSize({ width: 375, height: dev.h });
  old.push({ dev, m: await measure(page, 7, 9, 'end', dev, 282) });
}
await page.setViewportSize({ width: 375, height: 812 });
const tgt = await targeting(page, 7, 9);
await browser.close();

const out = [];
out.push(
  '| device | size | state | cell px | A1 hit rect (x,y w×h) | last hit rect (x,y w×h) | primary control (y, w×h) | headroom above row 1 | lap needed (⅓ cell) | caption over row 1 | cells obscured | last row to controls | overflow x,y | verdict |',
);
out.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const { dev, cols, rws, state, m } of rows) {
  const lap = m.cell * LAP_NEEDED;
  const minCell = dev.h === 812 ? 44 : 38;
  const verdict = [
    `cell≥${minCell} ${ok(m.cell >= minCell - 0.05)}`,
    `fits ${ok(m.overflowX <= 0.5 && m.overflowBottom <= 0.5 && m.cells === m.expected)}`,
    `ctrl≥44 ${ok(m.minCtrl >= 44)}`,
    `board clear ${ok(m.obscured === 0)}`,
  ].join('; ');
  out.push(
    `| ${dev.name} | ${cols}×${rws} | ${state} | ${r(m.cell)} | ${r(m.first.x)},${r(m.first.y)} ${r(m.first.w)}×${r(m.first.h)} | ${r(m.last.x)},${r(m.last.y)} ${r(m.last.w)}×${r(m.last.h)} | ${m.pr ? `${r(m.pr.y)}, ${r(m.pr.w)}×${r(m.pr.h)}` : '-'} | ${r(m.headroom)} | ${r(lap)} (${ok(m.headroom >= lap)}) | ${r(m.captionOverTop)} | ${m.obscured} | ${r(m.gapToControls)} | ${r(m.overflowX)}, ${r(m.overflowBottom)} | ${verdict} |`,
  );
}
out.push('\n### End overlay of the old design (282 px rising over the stack), 7×9\n');
out.push('| device | board bottom | overlay top | cells obscured of 63 | cell px |');
out.push('|---|---|---|---|---|');
for (const { dev, m } of old) {
  out.push(`| ${dev.name} | ${r(m.last.b)} | ${r(m.pr?.y ?? 0)} | ${m.obscured} | ${r(m.cell)} |`);
}
out.push('\n### Keyboard, hold and adjacent-tap targeting (7×9, tall, 812)\n');
out.push(`- Enter on A1, Tab, Space: taps ${JSON.stringify(tgt.kbd)} (expect "0,0" then "1,0").`);
out.push(
  `- Hold 550 ms on the last cell: holds ${JSON.stringify(tgt.holds)}; the release tap was swallowed: ${tgt.holdTapSwallowed}.`,
);
out.push(
  `- Taps 3 px either side of the A1/A2 edge: ${JSON.stringify(tgt.adj)} (expect "0,0" then "0,1").`,
);
console.log(out.join('\n'));
