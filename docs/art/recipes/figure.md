# Recipe: a figure (unit, foe, rival; boss in brackets)

Role `figure` 128×176 alpha, ground contact → (64,160). Boss: role `boss-figure` 192×256, contact → (96,232).

1. Attach the identity reference, a style crop of the approved anchor and the palette strip.
2. Prompt from the skeleton (style-sheet §5.2): high 3/4 standing figure, feet on the bottom-centre baseline, **no baked shadow**, transparent background, the §4.2 silhouette key stated first. No gendered words.
3. Generate at the largest size, pick the best (two rounds max). Open it and note where the feet touch the ground: that pixel is `--ground-contact x,y` in **source pixels**. Hem, pole tip and cloak tail may hang below it.
4. Process:

   ```sh
   pnpm art:process /tmp/pell.png units/shared/draughtsman --ship --role figure \
     --size 128x176 --alpha --ground-contact 512,1380 --height 1180
   ```

   `--height` is the source pixel height from the contact point up to the top of the head or hat; it sets the scale. The processor scales so that height becomes the figure's drawn height, puts the contact at (64,160), composes the standard soft shadow and writes the 48 px greyscale silhouette to `art-src/…/<subject>.silhouette.webp`.
5. `pnpm art:sheet <pack>`: check the row at 24 px greyscale and the real cell size on a light and a dark tile.
6. Portrait and card are derived from the same reference (crop or referenced edit): `--role portrait --size 192x192` and `--role card --size 222x330`, both opaque.
