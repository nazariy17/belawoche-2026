# Provider verification — 2026-11-13

## Traffic: adsb.lol

Documentation: https://www.adsb.lol/docs/open-data/api and https://api.adsb.lol/docs (schema `/api/openapi.json`). A radius query around Zürich returned HTTP 200 and positioned aircraft. Radius is nautical miles; `now` is Unix milliseconds and `seen_pos` seconds. Ground altitude is the string `ground`. Missing positions are excluded. True heading is used when reported, otherwise track; magnetic heading is not silently substituted.

License: ODbL 1.0. No-key allowance currently 500 requests/day/public IP; optional free keys available from provider. The frontend polls every 30 seconds only in live mode and pauses in hidden tabs. A single uninterrupted client can consume that allowance in roughly four hours. HTTP 429 and Retry-After stop retries until allowed. Cached nearby queries include a rounding buffer and exact client-radius filtering.

Cache/cooldown is bounded and per warm Python process. Vercel cold starts and multiple instances do not share it. This is suitable for the classroom demo, not a guarantee of a global quota across public visitors. A durable shared cache/quota store is needed before sustained public traffic. Provider failures return errors, never fabricated empty results. No credentials are shipped to the browser.

## Routes: ADSBDB — blocked for publication

Worldwide traffic lookup was tested with a positioned aircraft: `/v2/callsign/T7437` and `/v2/reg/T7-437` both returned the same aircraft identifier. A nonexistent callsign returned HTTP 200 and an empty aircraft array. These endpoints search tracked observations, not a complete registration database; missing/unpositioned aircraft are not shown as located.

https://github.com/mrjackwills/adsbdb states that route data may not be copied, published or incorporated into other databases without explicit permission from David J Taylor. No route data is bundled or published; capabilities.routes remains false. Source-code MIT licensing is not permission for the route database. No photos from that API are used.

## Photos: Wikimedia Commons

Exterior matching now requires aircraft-subject metadata and excludes cabin/cockpit/window-view/scenery descriptions. This reduces false positives but is not visual verification. Ten candidates are considered; an uncertain match is omitted. Company-logo PNGs are separately bundled from selected public-domain Commons files; source metadata is in `frontend/public/icons/airlines/sources.json`.

The same-origin `/api/aircraft/photo?registration=HB-JCA` endpoint searches Commons file titles for the registration, checks an exact registration boundary, and returns a thumbnail only with supported Creative Commons license metadata, author and source-page links. HB-JCA was verified against the live API. Image metadata is cached for one day per warm process; image files are served directly by Wikimedia. Missing photos and provider errors are distinct, and the client cancels obsolete requests when selection changes. No lookup runs for synthetic traffic.

Attribution appears beside each image. Photos are displayed without cropping and labelled as archive images: registration matching cannot guarantee the current livery or airframe after a registration is reused. Coverage is not guaranteed. Metadata HTML is converted to plain text; image/source/license URLs use fixed approved HTTPS hosts.

References: [Commons reuse guidance](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia), [Imageinfo API](https://www.mediawiki.org/wiki/API:Imageinfo). Each file's source page and license govern reuse.

## Maps

OurAirports public-domain runway snapshot adds individual runway-end numbers and true headings for 10,134 airports. Extended centerlines and approach-light arrays are geometric illustrations. METAR wind ranking uses true headings, excludes variable/calm/stale winds and does not establish the actual active runway. Clouds preserve layer cover and base height in feet above ground.

## Optional route provider: aviationstack

The HTTPS `/v1/flights` integration uses a server-only `AVIATIONSTACK_API_KEY`, a callsign filter and active-flight status. It rejects ambiguous matches, old flight dates and mismatching aircraft registrations. It makes no request without a key. Credentials and live integration validation remain outstanding; capabilities.routes is intentionally false. Lookup is explicit in the details panel and cached 10 minutes per process. Account quota, HTTPS access and display rights depend on the user's plan. Sources: https://aviationstack.com/faq and https://docs.apilayer.com/aviationstack/docs/api-documentation. ADSBDB route data remains unused.

## Weather and notices

NOAA Aviation Weather Center: https://aviationweather.gov/data/api/. Zürich (`LSZH`) returned a current METAR with station, Unix-seconds observation time, wind in knots, visibility in statute miles and raw text. Cached for 10 minutes; fetch only on user request. Empty/204 is distinct from upstream failure. AWC requires a custom User-Agent and limits calls to 100/minute; requests stay server-side because CORS is not supported. DFS AIS https://ais.dfs.de/ returned HTTP 200; linked only for German airports with the registration requirement displayed. No NOTAM feed or republication is claimed.

OpenFreeMap public instance: https://openfreemap.org and https://openfreemap.org/quick_start/. Local ODbL Zürich geometry extracted from its vector tiles; provenance in public/data/sources.json. Natural Earth public-domain coarse map is bundled. No runtime Overpass calls. Airport search data comes from OurAirports through the datasets/airport-codes mirror; attribution and licenses in public/data/LICENSE.md.
