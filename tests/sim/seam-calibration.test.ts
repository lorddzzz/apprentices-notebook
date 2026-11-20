import { test } from 'vitest';
import { countEnv, options, table } from './calibration/runner';
import { measure, SWEEPS, seam } from './calibration/seam-canals';

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

const measurement = process.env.CAL1_MEASURE;
if (measurement) {
  const sweep = SWEEPS.find((name) => name === measurement);
  if (!sweep) throw new Error(`Unknown CAL1_MEASURE: ${measurement}`);
  test(`CAL-1 measurement: ${sweep}`, () => {
    const config = options(true);
    if (sweep === 'canals-legacy') config.seeds = countEnv('CAL_SEEDS', 100);
    if (process.env.CAL1_PARTY) config.parties = [countEnv('CAL1_PARTY', 2)];
    process.stdout.write(`${measure(sweep, config)}\n`);
  }, 36_000_000);
}
