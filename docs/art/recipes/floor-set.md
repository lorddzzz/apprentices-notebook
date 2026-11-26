# Recipe: a floor set (tile-opaque, A–D)

Role `tile-opaque` 128×128, **opaque**, seamless at all four edges. Variants `floor-a … floor-d` share edge pixels.

1. Generate overhead square ground at the largest size, style crop and palette strip attached. No grid lines, no marks.
2. Process each with `--tile`: the processor offset-wraps the image by half its size, blends the seam, and downsamples to 128².

   ```sh
   pnpm art:process /tmp/floor-a.png tiles/seam/floor-a --ship --role tile-opaque --size 128x128 --tile
   ```

3. Check the set, not only each tile: `pnpm art:sheet <pack>` draws 3×3 self-tiling and the **mixed A–D neighbour** grid (A|B, B|C, C|D, A over D…). A visible seam in a mix means the variants do not share edge pixels: regenerate from the same base or re-run `--tile` with `--edge-from <other tile>`.
4. Keep texture off the edge pixels' high-contrast features: a bright crack crossing an edge breaks the mix.
