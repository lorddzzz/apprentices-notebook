# Recipe: a material state (material-overlay-alpha)

Role `material-overlay-alpha` 128×128, **alpha required** (real transparency), content inside the cell. Painted light-neutral so it sits on any ground (UA-D5).

1. Generate on a transparent background (or a flat key colour you remove). One state per image.
2. The silhouette must read in greyscale: oil = sheen and a droplet, steam = scalloped edge and cloud, brass = squared plate. No corner marks, no pips.
3. Process: `pnpm art:process /tmp/slick.png tiles/shared/slick --ship --role material-overlay-alpha --size 128x128 --alpha`. A matte fringe is rejected; fix the cutout (decontaminate the edge) rather than forcing it.
4. Check on the sheet: light and dark grounds, greyscale row.
