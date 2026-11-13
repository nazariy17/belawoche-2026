# Geographic data

`world.geojson`: Natural Earth, public domain. Source: https://github.com/nvkelso/natural-earth-vector (ne_110m_admin_0_countries).

`zurich-airport.geojson`: © OpenStreetMap contributors, via OpenFreeMap/OpenMapTiles. This extracted database is distributed under ODbL 1.0: https://opendatacommons.org/licenses/odbl/1-0/. Attribution and copyright: https://www.openstreetmap.org/copyright. The repository MIT license does not replace this data license.

The extract contains quantized, tile-clipped aeroways and building footprints, including terminal-area buildings. Building classifications are not inferred. See sources.json for tile URLs and retrieval date. It is illustrative, not operational airport information.

Optional online vector tiles: OpenFreeMap public instance, https://openfreemap.org. World geometry and Zürich airport are bundled independently for local use.

Font glyphs: Noto Sans, SIL Open Font License 1.1; see ../fonts/OFL.txt. Glyph PBF files obtained from OpenFreeMap.

`airports.json`: OurAirports, via https://github.com/datasets/airport-codes. Public-domain airport records (Open Data Commons Public Domain Dedication and License in the mirror). Compact extract includes large, medium and small airports; heliports, seaplane bases and closed airports excluded. Retrieved 2026-11-13. Reproduce with scripts/download-airports.py.
