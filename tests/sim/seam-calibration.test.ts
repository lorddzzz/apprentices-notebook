import { test } from 'vitest';
import { options, table } from './calibration/runner';
import { seam } from './calibration/seam-canals';

// Port of ref/sm-6's measurements; all policy and traversal live in the shared runner.
const full = process.env.SEAM_SIM === '1';
test(
  'SM-6 port: fresh layouts and real attrition without win-rate gates',
  () => {
    const config = options(full, 'SEAM_SEEDS');
    if (process.env.SEAM_PAIR) config.parties = [2];
    if (process.env.SEAM_ROOMS) config.rooms = process.env.SEAM_ROOMS.split(',').map(Number);
    const markdown = table(seam, config);
    if (full) process.stdout.write(`${markdown}\n`);
  },
  full ? 36_000_000 : 20_000,
);
