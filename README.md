# TBM Monitoring — PTPN

Interactive monitoring of **TBM (Tanaman Belum Menghasilkan)** areas: a georeferenced
aerial-photo pyramid rendered as tile overlays on Google Maps, with an optional
three.js layer for tree instances and terrain.

Area of interest: **3.2242–3.3204 N, 98.909–98.992 E** (Deli Serdang, North Sumatra).

---

## Features

- 🗺️ **Tile overlay on Google Maps** — custom `google.maps.MapType` implementation
- 🔍 **19 zoom levels** — 23,083 PNG tiles organised as `z/x/y`
- 🎚️ **Opacity slider** — blend the imagery against the satellite basemap
- 🌳 **3D view** — three.js trees and terrain, toggled over the 2D map
- 📈 **Growth animation** — animate tree growth over time
- 🧹 **Tile cleanup** — hidden tiles are evicted from the DOM automatically

---

## How the TIFF pipeline works

The source is a ~70 GB GeoTIFF. A browser cannot stream that, and does not need to:
it only ever displays the handful of tiles currently on screen.

### 1. Build a tile pyramid

`gdal2tiles` cuts the raster into 256×256 Web Mercator tiles. Each zoom level is
4× the tile count of the previous one, so the finest level dominates the cost:

| Zoom | Tiles | Share of repo |
|-----:|------:|--------------:|
| 12–17 | 1,527 | 6.6% |
| **18** | **4,331** | 18.8% |
| **19** | **17,202** | **74.5%** |

Total: 23,083 tiles, ≈350 MB — roughly **200× smaller** than the source.

### 2. Pick max zoom from the source GSD

At latitude 3°, z19 is ≈**0.30 m/px**. If the source resolution is coarser than that,
every tile above its native zoom is just interpolated pixels. Matching max zoom to
GSD is the single biggest saving available.

### 3. TMS vs XYZ (y-axis)

`gdal2tiles` writes **TMS** tiles (y counted from the south); Google Maps requests
**XYZ** (y counted from the north). `src/mapManager.js` converts in both directions:

```js
// getTileUrlCoord() — map point → tile address
const y = (1 << zoom) - coord.y - 1;

// getTileUrl() — tile address → lat/lng bounds for the AOI intersection test
const ymax = 1 << zoom;
const y = ymax - tile.y - 1;
```

A missing conversion is the most common cause of an overlay that lands in the wrong
place with no error at all.

### 4. Only request tiles inside the AOI

`getTileUrl()` intersects each tile's bounds with the hard-coded AOI and substitutes a
transparent tile otherwise, so panning outside the project area never 404s.

---

## Regenerating the tiles

```bash
# 1. Confirm CRS, size and resolution — this decides max zoom
gdalinfo input.tif | grep -E "Pixel Size|Coordinate System|Size is"

# 2. Reproject to Web Mercator (required if the source is UTM)
gdalwarp -t_srs EPSG:3857 -co TILED=YES -co COMPRESS=DEFLATE \
         input.tif input_3857.tif

# 3. Build the pyramid, dropping fully transparent tiles
gdal2tiles.py --profile=mercator -z 12-19 --tilesize=256 \
              --processes=8 --exclude --webviewer=google \
              input_3857.tif public/hasil_tiles
```

Output layout:

```
public/hasil_tiles/
└── 19/
    └── 531632/
        └── 373620.png
```

---

## Running locally

```bash
npm install
npm start      # webpack dev server
npm run build  # production bundle
```

Google Maps JS API key is read from `.env` (see `dotenv` in dependencies).

---

## Project structure

| File | Responsibility |
|------|----------------|
| `src/index.js` | Bootstraps Google Maps, wires UI buttons |
| `src/mapManager.js` | Map setup, `CustomTileOverlay`, opacity control, tile eviction |
| `src/threeManager.js` | three.js scene, 2D/3D camera modes, tree instancing |
| `src/terrainManager.js` | Terrain mesh generation from tile bounds |
| `src/tileLoader.js` | Tile → Mercator geometry (currently unused) |

---

## Deployment notes

- **Serve tiles from object storage + CDN**, not the repo. Over 350 MB of PNGs makes
  cloning slow and approaches GitHub's practical repo limits.
- Set `Cache-Control: public, max-age=31536000, immutable` — tiles never change.
- Consider **WebP** instead of PNG (typically 30–50% smaller).
- `tileLoader.js` already has a `GCS_BUCKET` placeholder; switching `getTileUrl()` to
  the bucket URL is a one-line change.
