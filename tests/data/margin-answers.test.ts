import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { CODEX } from '$data';

/** SM-14: the 27 approved answers (seam-answers.md) are in data word for word, with their `when`. */

const DOC = new URL('../../docs/design/footnotes-content/seam-answers.md', import.meta.url);

interface Row {
  id: string;
  when: string;
  note: string;
  answer: string;
}

/** The approved tables: each row is `| \`page\` | first note | answer |` under a `when: '...'` heading. */
function approvedRows(): Row[] {
  let when = '';
  const rows: Row[] = [];
  for (const line of readFileSync(DOC, 'utf8').split('\n')) {
    const heading = /^## \d+\. .*`when: '(\w+)'`/.exec(line);
    if (heading) {
      when = heading[1] ?? '';
      continue;
    }
    if (!line.startsWith('| `')) continue;
    const [page = '', note = '', answer = ''] = line
      .slice(1, -1)
      .split('|')
      .map((c) => c.trim());
    rows.push({ id: page.replace(/`/g, ''), when, note, answer });
  }
  return rows;
}

const ROWS = approvedRows();

test('the approved tables hold 27 answers', () => {
  expect(ROWS).toHaveLength(27);
});

test('every approved answer is on its page, word for word, with its when', () => {
  for (const row of ROWS) {
    const entry = CODEX.find((e) => e.id === row.id);
    expect(entry, row.id).toBeDefined();
    expect(entry?.answer, row.id).toEqual({ when: row.when, text: row.answer });
  }
});

test('only the 27 approved pages carry an answer (no compound or burst page answers)', () => {
  const answering = CODEX.filter((e) => e.answer).map((e) => e.id);
  expect(answering.sort()).toEqual(ROWS.map((r) => r.id).sort());
});

test("each answer replies to the page's first note, which stays as the owner note", () => {
  for (const row of ROWS) {
    const entry = CODEX.find((e) => e.id === row.id);
    expect(entry?.ownerNote, row.id).toBe(row.note);
  }
});
