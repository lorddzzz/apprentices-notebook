# Recipe: a scene, strip or plate

Roles: `scene` 750×N opaque, `strip` 750×N, Study header strip 750×224 (top 176 px header, lower 48 px bleed behind the seat tabs), full-bleed 750×1624, `map-plate` 750×3800, `map-patch-with-bbox` alpha + `--bbox x,y,w,h` in master pixels, `nine-slice` alpha + `--slice t,r,b,l`.

1. Fight scenes: muted (lower contrast and saturation than tiles), **no figures**, central 60 % calm. Study and map: no lettering or pseudo-writing.
2. Process (q80, q76 for scenes ≥ 750×800 automatically):

   ```sh
   pnpm art:process /tmp/seam-fight.png scenes/seam/fight --ship --role scene --size 750x800
   ```

3. Anchors use `--scratch` (`art-src/anchors/<name>/…`, never shipped).
4. The sheet shows the board crop at 375 px wide; judge the scene there.
