#!/usr/bin/env node
// Task ledger: which task IDs of a plan are merged, only mentioned, or open.
// Usage: node .claude/skills/implement/ledger.mjs <log.md> <plan.md> [<plan.md> ...]
// A task counts as merged when a log row lists its ID in the first cell, or the subject of a
// commit names it. Record commits (`docs: …` with no scope) and commit bodies do not count, so
// a brief or a status note that names an open task cannot close it.
// Also checks the log's format: every task row has the header's cell count and sits in the
// Tasks table. Exit code 1 while any task is open or any log row is malformed.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

const [logPath, ...planPaths] = process.argv.slice(2);
if (!logPath || planPaths.length === 0) {
  console.error('Usage: ledger.mjs <log.md> <plan.md> [<plan.md> ...]');
  process.exit(2);
}

const ROW = /^\|\s*\**([A-Z]{2,4}-[A-Za-z0-9]+)\**\s*\|(.*)$/;
// Gates and playtests by ID: RV-G1, CN-P1, BH-FG.
const GATE = /-(F?G\d*|P\d+)$/;
const quote = (id) => id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const word = (id) => new RegExp(`(^|[^A-Za-z0-9-])${quote(id)}([^A-Za-z0-9]|$)`);

const log = readFileSync(logPath, 'utf8');
const ID = /[A-Z]{2,4}-[A-Za-z0-9]+/g;
const cells = (line) => line.split(/(?<!\\)\|/).slice(1, -1);
const logRows = new Set();
const malformed = [];
let section = '';
let width = 0;
for (const line of log.split('\n')) {
  if (line.startsWith('## ')) section = line.slice(3).trim();
  if (/^\|\s*ID\s*\|/.test(line)) width = cells(line).length;
  if (!ROW.test(line)) continue;
  const row = cells(line);
  for (const id of row[0].match(ID) ?? []) logRows.add(id);
  if (section !== 'Tasks')
    malformed.push(`${row[0].trim()}: under "## ${section}", not "## Tasks"`);
  else if (width && row.length !== width)
    malformed.push(`${row[0].trim()}: ${row.length} cells, the header has ${width}`);
}
const subjects = execFileSync('git', ['log', '--format=%s'], {
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
})
  .split('\n')
  .filter((subject) => !subject.startsWith('docs: '))
  .join('\n');

let unknown = 0;
for (const planPath of planPaths) {
  const tasks = new Map();
  for (const line of readFileSync(planPath, 'utf8').split('\n')) {
    const m = ROW.exec(line);
    if (m && !tasks.has(m[1])) tasks.set(m[1], m[2]);
  }
  const open = [];
  const gates = [];
  const mentioned = [];
  let merged = 0;
  for (const id of tasks.keys()) {
    if (logRows.has(id) || word(id).test(subjects)) merged++;
    else if (GATE.test(id)) gates.push(id);
    else if (word(id).test(log)) mentioned.push(id);
    else open.push(id);
  }
  unknown += open.length;
  console.log(`${basename(planPath)}: ${merged}/${tasks.size} merged`);
  if (mentioned.length) console.log(`  in the log's prose only: ${mentioned.join(' ')}`);
  if (gates.length) console.log(`  gates: ${gates.join(' ')}`);
  if (open.length) console.log(`  open: ${open.join(' ')}`);
}
if (malformed.length) {
  console.log(`${basename(logPath)}: ${malformed.length} malformed rows`);
  for (const row of malformed) console.log(`  ${row}`);
}
process.exit(unknown > 0 || malformed.length > 0 ? 1 : 0);
