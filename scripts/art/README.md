# scripts/art

Art tooling (UA-2, UA-D9). Plain Node >= 24 ESM on `sharp` (a direct devDependency). The contract (roles, sizes, ground points, master rule) is imported from `src/ui/art/spec.ts`; the final proof is `pnpm art:check`.

| Command | What |
|---|---|
| `pnpm art:process <raw.png> <ArtId> --ship\|--scratch --role <role> --size WxH [options]` | one accepted raw generation → shipped asset (or anchor) |
| `pnpm art:sheet <pack>` | contact sheet `docs/art/contact/<pack>.png` for every sidecar with `"pack": "<pack>"` |
| `node scripts/art/selftest.mjs [--keep]` | proves both on synthetic samples in a temp root (deleted afterwards) |

## Destinations

- `--ship`: `src/assets/art/<ArtId>.webp`, `art-src/<ArtId>.json` (skeleton sidecar; hand-filled fields survive a re-run), `art-src/<ArtId>.silhouette.webp` (figures), and the master record. `ArtId` is `<family>/<scope>/<subject>[-<state>]`.
- `--scratch`: anchors, never shipped: `art-src/anchors/<name>.webp` + `.json` (`<name>` like `party/pell-v1`). No master record.
- `--root <dir>` changes the repo root (used by the selftest and for a proof in a temp root).
- Masters (UA-D15, D4 ruling): the raw source is **not copied into Git**. The processor appends its path, size, SHA-256 and archive key to `art-src/MASTERS.json` and the sidecar, then prints the `rclone copyto` command. **Upload it** (the record is not true until you do). `--masters git` is the switch back: a lossless `art-src/<ArtId>.master.webp` is committed instead.

## Options (the shape in ux-art-briefs §1)

`--role` `--size WxH` `[--alpha]` `[--ground-contact x,y]` `[--height h]` `[--baseline 160]` `[--draw-height 150]` `[--slice t,r,b,l]` `[--bbox x,y,w,h]` `[--tile]` `[--edge-from tile.webp]` `[--focal fx,fy]` `[--defringe]` `[--allow-halo]` `[--quality n]` `[--pack p] [--screen s] [--model m] [--generation-id g] [--prompt-file f] [--ref path]… [--set key=value]…`. `art:process --help` lists all.

## Figures

`--ground-contact x,y` is where the feet meet the ground in the **source** image and `--height` the source pixels from there up to the top of the head. The processor scales by that body height, places the contact at (64,160) (boss (96,232)), composes the standard shadow and never trims by alpha extent, so a hem, pole tip or baked shadow below the feet cannot move the feet. It refuses a figure cut off at the top or sides (lower `--draw-height`); running off the bottom is allowed.

```sh
pnpm art:process /tmp/pell.png units/shared/draughtsman --ship --role figure --size 128x176 \
  --alpha --ground-contact 512,1380 --height 1180 --pack party
```

## Checks the processor makes

- **Role rule** before any pixel work (`ROLE_RULES`): size, alpha, ground contact, bbox/slice needed. After encoding, `roleProblems` on the decoded file; in `--ship` the whole `art:check` proof for the asset.
- **Alpha-edge halo**: partial-alpha pixels whose colour is the matte (white or black) rather than the solid pixels beside them are rejected. `--defringe` recolours them; `--allow-halo` waives (recorded in the sidecar).
- **Real transparency** for roles that need it; opaque roles are flattened (`--background`, default `#101820`).
- **Floor sets**: `--tile` offset-wraps for a seamless tile. `--edge-from <floor-a.webp>` pulls later variants' edge rings to A's (`--edge-band` px). `art:sheet` groups letter-suffixed ground tiles by their shared prefix and checks **every ordered pair in both directions**, including self-joins. Standalone floor, quay and water tiles also get the repeat check.

## Contact sheet

Light `#E9DFC8` and dark `#101820` grounds, greyscale, a 24 px row and the 48 px silhouettes for figures and portraits, figures at 51/58/128 px on a light and a dark tile lapping the row above, material states on four grounds, 3×3 self-tiling, floor sets in mixed neighbours, scenes at 375 px wide.

Floor repeats fill 7×7 and 7×9 boards at 51 px per cell, picking from the sorted variants with seed `0x2b461eda`. Both boards appear in colour and greyscale. The check averages sRGB luminance into 7×7 bins per cell to suppress grain, then subtracts each cell's mean. The **lattice score** is the square root of the largest positive covariance of matching bins one cell apart, across horizontal, vertical and diagonal lags. It measures recurring texture in 0–255 luminance steps even when all cells have the same mean. The sheet also reports the standard deviation of cell means and the pooled within-cell standard deviation. It exits 1 after writing the sheet if any lattice score exceeds **3.0**, the cell mean spread exceeds **4.0**, or a mixed joint fails. Review the boards visually for isolated highlights and repeated shapes.
