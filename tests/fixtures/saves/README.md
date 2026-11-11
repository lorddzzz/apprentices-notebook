# Recorded district saves (SAVE-1)

Frozen save files, one pair per playable district, read by `tests/app/save-compat.test.ts`.

- `<district>-returned.json`: a save after a trip that went home (`trip` null, `lastTrip` returned).
- `<district>-mid-trip.json`: a save mid-trip, looting after the opening room was won (offers pending).

Both are envelopes in the save format (`{ "version": 9, "data": … }`), recorded with build
**89f498b** (main before SAVE-1) by playing the greedy bot through the app's own flow
(`setOut`, `startBattle`, `endBattle`, `takeOffer`, `goHome`). The recorder is `record.ts`, kept for
provenance; its one-off writer was a temporary test that was not committed.

**Never regenerate these files.** A later parse or engine change that breaks one is a migration bug:
fix the parser (or add a migration), not the fixture. A save written by a later build gets its own
file and its own test title.

Adding a district: when a district is opened (`PLAYABLE_DISTRICTS` grows, e.g. the foundry at BF-22
or the cartographers), add its pair with the same recipe and add the district to `DISTRICTS` in
`tests/app/save-compat.test.ts`.
