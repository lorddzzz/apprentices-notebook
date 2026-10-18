# Rival Inscribers

> **Status: Exploring** (scoped 2026-10-18; the main decisions are in §0, and the full design comes later). Roadmap: BL-30.
> Summary and decision log: [DESIGN.md](../../DESIGN.md) §6.7 and §11. Related: [city-and-districts.md](city-and-districts.md) (guild schools), [party.md](party.md), [rune-content.md](rune-content.md) §7 (what this means for runes).

## 0. Decided in the scoping round (2026-10-18)

| Question | Decision | Why |
|---|---|---|
| Who they are | **Each guild's inscribers**: an elite in the deeper rooms and the heart's master. A few come back across trips as **named faces** | Rivals belong to the guild schools, so every district has its own |
| Their rules | **Mostly yours: the same runes, plus one signature trick** per rival that you can't get | Runes stay honest when an enemy uses them too. The trick makes each rival memorable |
| The best moment | **Breaking their chain**: you read their telegraphed spell and starve it (shove away the unit their trigger waits for, put steam in a line's path, put out the oil they meant to light) | Into the Breach for spell chains |
| The reward | **A page of their lattice**: their guild's idiom becomes known, and one of their spells comes home as a folio to mend or a Glyph to study | You learn a school by facing it |

**Assumed defaults** (*Proposal*, tune by playing):

| Topic | Default |
|---|---|
| How a spell is telegraphed | The next spell shows as a short readout with its path and footprint drawn on the board. The whole lattice is one tap away |
| Size | One to three spells per rival, short chains (3–6 runes), so the board stays readable |
| AI | Deterministic, like every foe: a fixed priority over its spells and aims, no dice |

## 1. What stays open (for the full design)

- How the signature trick works, one rival at a time.
- How a rival's spell targets: fixed at telegraph time (Into the Breach) or re-aimed at cast time.
- Whether a broken chain fizzles or falls back to a plain attack.
- Lattice authoring format and a Lab prototype before committing (ROADMAP BL-30).
