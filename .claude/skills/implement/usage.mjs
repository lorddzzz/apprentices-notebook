#!/usr/bin/env node
// Reads both tools' usage with no secrets touched: `claude -p "/usage"` and the Codex
// app-server's `account/rateLimits/read`. Usage: node .claude/skills/implement/usage.mjs [--json]
// Prints one line per tool; a tool that fails prints "unknown" (a missing reading is not zero).
import { spawn, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const json = process.argv.includes('--json');
const out = { at: new Date().toISOString(), claude: null, codex: null };

function claude() {
  const r = spawnSync('claude', ['-p', '/usage'], {
    cwd: tmpdir(),
    encoding: 'utf8',
    timeout: 90_000,
  });
  const text = r.stdout ?? '';
  const pick = (label) => {
    const m = text.match(new RegExp(`${label}[^\\n]*?(\\d+)% used[^\\n]*?resets ([^\\n]+)`));
    return m ? { usedPercent: Number(m[1]), resets: m[2].trim() } : null;
  };
  const session = pick('Current session');
  const week = pick('Current week \\(all models\\)');
  if (session || week) out.claude = { fiveHour: session, weekly: week };
}

function codex() {
  return new Promise((resolve) => {
    const p = spawn('codex', ['app-server'], { cwd: tmpdir(), stdio: ['pipe', 'pipe', 'ignore'] });
    let buf = '';
    const done = () => {
      clearTimeout(timer);
      p.kill();
      resolve();
    };
    const timer = setTimeout(done, 25_000);
    const send = (m) => p.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', ...m })}\n`);
    p.on('error', done);
    p.stdout.on('data', (d) => {
      buf += d;
      for (const line of buf.split('\n')) {
        let m;
        try {
          m = JSON.parse(line);
        } catch {
          continue;
        }
        if (m.id === 1) {
          send({ method: 'initialized' });
          send({ id: 2, method: 'account/rateLimits/read' });
        }
        if (m.id === 2) {
          const r = m.result?.rateLimits;
          if (r)
            out.codex = {
              fiveHour: {
                usedPercent: r.primary.usedPercent,
                resets: new Date(r.primary.resetsAt * 1000).toISOString(),
              },
              weekly: {
                usedPercent: r.secondary.usedPercent,
                resets: new Date(r.secondary.resetsAt * 1000).toISOString(),
              },
            };
          done();
        }
      }
    });
    send({
      id: 1,
      method: 'initialize',
      params: { clientInfo: { name: 'implement-usage', version: '1' } },
    });
  });
}

claude();
await codex();

if (json) console.log(JSON.stringify(out, null, 2));
else {
  for (const t of ['claude', 'codex']) {
    const v = out[t];
    console.log(
      v
        ? `${t}: 5h ${v.fiveHour?.usedPercent ?? '?'}% (resets ${v.fiveHour?.resets}) · week ${v.weekly?.usedPercent ?? '?'}% (resets ${v.weekly?.resets})`
        : `${t}: unknown (not logged in, or the CLI is missing)`,
    );
  }
}
