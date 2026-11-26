# Art review checklist

The one list the orchestrator and the Gallery art page (UF-7) use to accept an art pack. Source: [ux-art-plan.md](../plans/ux-art-plan.md) §7. Rules: [style-sheet.md](style-sheet.md).

## Per pack (before merge)

1. **Handoff.** Apply the pack's `/tmp/<pack>.mbox` in a clean checkout (`git am`), confirm the binaries apply, and **re-open every image**.
2. **`pnpm art:check` passes**: sidecar present, sidecar-declared size equals the decoded file and the role rule, alpha present where the role needs it, master record present (`art-src/MASTERS.json` entry with archive key and hash), bbox/slice in bounds, scope within budget (shared + home ≤ 4.5 MB, district ≤ 1.5 MB, map ≤ 0.8 MB, total ≤ 15 MB).
3. **Count.** Assets by ArtId match the brief's enumerated list (the count is derived from the list, not remembered). List the missing ArtIds if the pack timed out.
4. **Bytes.** Shipped bytes vs the pack's estimate; record the per-scope totals.
5. **Contact sheet.** `pnpm art:sheet <pack>` rendered `docs/art/contact/<pack>.png`; open it. Light and dark grounds, greyscale row, 24 px row, 3×3 and mixed A–D tiling, 375 px board crop for scenes.
6. **Native and display size.** Inspect every output at native size **and** at display size for lettering, pseudo-labels and copied UI. Compare dominant value masses with the approved sample of the same kind.
7. **Silhouettes.** Greyscale + 24 px: each figure and portrait is told apart from its siblings by silhouette alone (party, foes, a district's cast).
8. **Gallery art page** at 375×812 lists the pack's assets; use the greyscale toggle.
9. **Widest grid.** Every figure on the 7×9 grid, overlapping the row behind: feet at the cell, shadow on both a light and a dark tile; figure foot at (64,160) within tolerance (boss (96,232)).
10. **Materials.** Material states side by side: a distinct silhouette and corner area (oil: sheen + drop; steam: scalloped; brass: squared).
11. **Negative rules.** No painted text, UI chrome, reach dots, arrows, rings, step numbers, HP, grid lines, corner marks or pips in any asset. By eye on the contact sheet.
12. **Transparent edges.** A transparent asset has a clean edge on `#FFFFFF` and on `#101820` (no matte halo).
13. **Floors.** Floor variants A–D tile in **mixed neighbours** as well as 3×3 self-tiling; no visible seam.
14. **Scenes.** Central 60 % calm; fight scenes show no figures; muted compared with tiles.
15. **Palette.** Dominant colours sit in the district's triple (style-sheet §3.1).
16. **Repo hygiene.** No rejects, no contact-sheet candidates, no regenerable full-size sheets, no masters in Git (D4: masters go to the external archive with hashes in `art-src/MASTERS.json`).

## At the end of a phase

- One full-loop phone run (other plans' packs).
- **Per-district greyscale + squint** pass: a district pack's board composite in greyscale must keep tile states, figures and overlay readable (UD owns the code, UA owns this sheet).

## At the end of the program (UA close)

All packs merged, `art:check` green on `main`, per-scope totals recorded in the program log, the style sheet's "Known drift" section filled from the review notes.
