#!/usr/bin/env node
// Runs one pack on Codex through the CLI, for apps whose own Codex spawn is unavailable.
// Usage (run it in the background; it exits when the agent is done):
//   node .claude/skills/implement/codex-pack.mjs <worktree> <prompt-file> [--model gpt-6.1-terra] [--effort high]
// The agent runs sandboxed (workspace-write) inside the worktree and cannot write git metadata,
// so it edits and tests but does NOT commit: the orchestrator reads the report, then commits.
// The agent's final message (its report) goes to <prompt-file>.report.md and is printed on exit.
import { spawn } from 'node:child_process';
import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const [worktree, promptFile, ...rest] = process.argv.slice(2);
if (!worktree || !promptFile) {
  console.error('usage: codex-pack.mjs <worktree> <prompt-file> [--model M] [--effort E]');
  process.exit(2);
}
const opt = (name, fallback) => {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? rest[i + 1] : fallback;
};
const cwd = resolve(worktree);
if (!existsSync(`${cwd}/.git`) || !cwd.includes('/.claude/worktrees/')) {
  console.error(`refusing to run: ${cwd} is not a worktree under .claude/worktrees/`);
  process.exit(2);
}
const prompt = resolve(promptFile);
const report = `${prompt}.report.md`;
const args = [
  'exec',
  '-m',
  opt('model', 'gpt-6.1-terra'),
  '-c',
  `model_reasoning_effort=${opt('effort', 'high')}`,
  '-s',
  'workspace-write',
  '-o',
  report,
  '-',
];
const child = spawn('codex', args, { cwd, stdio: ['pipe', 'ignore', 'ignore'] });
createReadStream(prompt).pipe(child.stdin);
child.on('exit', (code) => {
  const text = existsSync(report) ? readFileSync(report, 'utf8') : '(no report written)';
  console.log(`codex exited ${code}; report: ${report}\n\n${text}`);
  process.exit(code ?? 1);
});
