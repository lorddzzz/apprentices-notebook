# Calibration verification (CAL-G1 Close)

Revision: 24c6af5 on `main` (CAL-5H applied at 9aae581). 2026-11-22.

- **Full gate:** `pnpm check` green: 455 files, 9,382 tests passed, 6 skipped, 13 todo (sims included).
- **Code review:** one `code-review` (low) of 8c7192f..HEAD (CAL-5R, CAL-5H): no findings.
- **Tables:** every district and drawn table is linked from [calibration-results.md](calibration-results.md) (CAL-5R and CAL-5H rows at the end; dispositions G1-1..G1-12) and [drawn-calibration.md](drawn-calibration.md).
- **Recorded misses (kept, G1-1/G1-2):** medium hearts 78.1 %, heavy 74.0 % (light in band at 74.0 %); solo walkovers; authored misses per G1 rows.
- **Not verified:** the full drawn-trip loop at 375x812 (no browser tools in this session); real-iPhone timing (CAL-P emulated only); the BL-111 offline check in real Chrome; unfinished CAL-5S shards (canals, bridges, cartographers) await a nightly job.
