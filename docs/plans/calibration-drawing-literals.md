# CAL-D drawing loot literals

| Use | Before | After | Numeric delta |
| --- | --- | --- | --- |
| Quiet doorway weight, each non-heart tier | `DOORWAY_WEIGHT = 1` in drawing loot | `DRAWN_LOOT.doorwayWeight = 1` | 0 |
| Encounter placeholder loot table | `LOOT = 'deep'` in inked page | `DRAWN_LOOT.placeholder.table = 'deep'` | none |
| Encounter placeholder picks, room / heart | `PICKS = { room: 1, heart: 2 }` in inked page | `DRAWN_LOOT.placeholder.picks = { room: 1, heart: 2 }` | 0 / 0 |

The placeholders satisfy encounter metadata; the lent shape's `offersFor` supplies the drawn table, picks and guaranteed cards, and retains lent extras. The doorway is still excluded at the heart. Seeded pre-change offer snapshots and the metadata override regression check the unchanged results; no balance values changed.
