import { test } from 'vitest';
import { baths, bridges } from './calibration/bath-bridges';
import { drawn } from './calibration/drawn';
import { academy, foundry } from './calibration/foundry-cartographers';
import { ink } from './calibration/ink';
import { options, table } from './calibration/runner';
import { canals, seam } from './calibration/seam-canals';

const full = process.env.CAL === '1';
const filter = process.env.CAL_DISTRICTS?.split(',').map((s) => s.trim().toLowerCase());
const adapters = [seam, canals, ink, baths, bridges, foundry, academy, drawn];
test(
  'CAL-0: smoke tables do not throw or overrun the event cap',
  () => {
    for (const adapter of adapters) {
      if (
        filter &&
        !filter.includes(adapter.name.toLowerCase()) &&
        !filter.includes(adapter.district.toLowerCase())
      )
        continue;
      const markdown = table(adapter, options(full));
      if (full) process.stdout.write(`${markdown}\n`);
    }
  },
  full ? 36_000_000 : 20_000,
);
