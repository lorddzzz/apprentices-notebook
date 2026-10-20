# Rival Inscribers

> **Status: Exploring** (scoped 2026-10-18; the main decisions are in §0, and the full design comes later). Roadmap: BL-30.
> Summary and decision log: [DESIGN.md](../../DESIGN.md) §6.7 and §11. Related: [city-and-districts.md](city-and-districts.md) (guild schools), [party.md](party.md), [rune-design-final.md](rune-design-final.md) §10 (current rival direction).

## 0. Decided in the scoping round (2026-10-18)

| Question | Decision | Why |
|---|---|---|
| Who they are | **Each guild's inscribers**: an elite in the deeper rooms and the heart's master. A few come back across trips as **named faces** | Rivals belong to the guild schools, so every district has its own |
| Their rules | **Mostly yours: the same runes, plus one signature trick** per rival that you can't get | Runes stay honest when an enemy uses them too. The trick makes each rival memorable |
| The best moment | **Breaking their chain**: you read their telegraphed spell and starve it (shove away the unit their trigger waits for, put steam in a line's path, put out the oil they meant to light) | Into the Breach for spell chains |
| The reward | **A page of their lattice**: witnessing their casts reveals fine print and names any idiom actually performed; victory brings home a spell page. Its repair challenge / studyable Glyph format needs design (BL-118); the old folios are retired | You learn a school by facing it |

**Assumed defaults** (*Proposal*, tune by playing):

| Topic | Default |
|---|---|
| How a spell is telegraphed | The next spell shows a locked aim, path and footprint on the board; the lattice is one tap away. Locked aim follows the final rune design §10 |
| Size | One to three spells per rival, short chains (3–6 runes), so the board stays readable |
| AI | Deterministic, like every foe: a fixed priority over its spells and aims, no dice |

## 1. What stays open (for the full design)

- How the signature trick works, one rival at a time.
- How to communicate the locked aim when a target moves, a network changes or a jar/mark is removed. The final rune design chooses locked aim, not automatic re-aiming.
- Specify the plain-strike fallback for a fully starved chain (final rune design §10) and how to telegraph it; partial chains keep effects already resolved.
- Lattice authoring format and a Lab prototype before committing (ROADMAP BL-30).

## Current implementation boundary (2026-10-20)

No rival lattices, AI casting or page rewards are built. Enemy Ink already uses witnessed Kind behavior; jars and cast origins support either side. Prototype one short rival chain in the Lab before authoring a roster (BL-30). School identities and methods are current; aspects, recipe discovery and free idiom compilation are gone. Recovered pages are BL-118.
