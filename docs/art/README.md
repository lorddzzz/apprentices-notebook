# docs/art

The art bible in the repo (UA Pack A).

| File | What |
|---|---|
| [style-sheet.md](style-sheet.md) | The authority: vision, rules, palettes, figures, prompt recipe, naming, acceptance. Wins over the whiteboard once merged. |
| [review-checklist.md](review-checklist.md) | The orchestrator's and the Gallery art page's review steps for a pack. |
| [recipes/](recipes/) | Short generate-and-process recipes: figure, floor set, material state, scene. |
| `contact/` | Rendered contact sheets (`<pack>.png`) from `pnpm art:sheet`. Reviewed, not shipped. |

Tools live in [`scripts/art/`](../../scripts/art/README.md): `pnpm art:process` and `pnpm art:sheet`. The gate is `pnpm art:check`.

Where things go:

- shipped art: `src/assets/art/<family>/<scope>/<subject>[-<state>].webp`
- sidecar: `art-src/<same path>.json` (role, size, ground contact, prompt, references, master record)
- masters (native-resolution accepted source): the external archive; `art-src/MASTERS.json` carries path, size, SHA-256 and archive key (D4, UA-D15). Never in Git.
- anchors (not shipped): `art-src/anchors/<name>/`
- raw generations and rejects: `/tmp`, never in the repo
