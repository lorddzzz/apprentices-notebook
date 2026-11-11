#!/usr/bin/env node
// Task ledger: which task IDs of a plan are merged, only mentioned, or open.
// Usage: node .claude/skills/implement/ledger.mjs <log.md> <plan.md> [<plan.md> ...]
// A task counts as merged when the log has a table row starting with its ID, or a commit
// message names it. Exit code 1 while any task is open (neither merged, a gate, nor in the log).
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
const logRows = new Set();
for (const line of log.split('\n')) {
  const m = ROW.exec(line);
  if (m) logRows.add(m[1]);
}
const subjects = execFileSync('git', ['log', '--format=%s%n%b'], {
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
});

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
process.exit(unknown > 0 ? 1 : 0);
