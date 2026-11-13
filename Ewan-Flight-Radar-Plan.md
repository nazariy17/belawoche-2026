# Ewan’s flight radar | Codex implementation brief

Build a German-language web app for Ewan’s BELA-Woche presentation. A visitor picks any point on a world map and explores aircraft around it. The signature view is a smooth 2D radar with recognizable planes above an illuminated airport. Friday is the build day. Deliver a public HTTPS link before next week’s presentation.

## 1. Start with one playable scene

Use Angular with TypeScript and the Angular CLI for the frontend. Use MapLibre GL JS for the radar, aircraft animation and airport lighting. Implement the backend in Python with FastAPI. Keep upstream requests, credentials, caching and rate-limit handling behind /api. Keep the bundled replay playable without a running backend. Begin with a bundled airport scene and time-stamped aircraft samples. Choose Zürich as a suggested demo airport, replaceable by Ewan. Label recorded traffic “Wiedergabe” with its date and synthetic traffic “Simulation”. Give Ewan control of the colours, radius and opening airport.

## 2. Build the point-centred radar

Click “Radar hier setzen” and tap the map, or search for an airport by name, IATA or ICAO code. Offer 10, 25 and 50 km rings, initially 25 km. Filter by geographic distance from the pin. Panning leaves the pin in place. Moving it keeps the chosen radius and cancels obsolete requests. An empty ring shows “Keine Flugzeuge im gewählten Umkreis” with a radius control. Distinguish an empty result from a failed feed.

Draw clickable airplane silhouettes. Rotate by reported heading when available, otherwise by ground track. Keep the livery badge and text upright. Before selection show badge, callsign, direction and altitude. Label heading “Steuerkurs” and track “Flugrichtung”. Use a neutral aircraft for an unknown operator. Offset or declutter overlapping labels while keeping each aircraft selectable. Animate between timestamped observations using a short playback buffer. Stop movement and show the age when updates go stale. Interpolate angles across north by the shortest turn.

Keep worldwide lookup separate from the radius filter. A callsign or registration search can locate a tracked plane outside the ring. Offer to move the radar there. Verify the chosen provider supports each search type before enabling it.

## 3. Give airports their own night lighting

Use an attributed vector basemap and inspect its actual aeroway geometry at the demo airport. Draw runway pavement and terminal footprints first. Add thin amber taxiways, then taxiway letters and runway identifiers where supplied. For a convincing runway glow, draw a broad, low-opacity halo underneath a narrow bright core. At close zoom, place small, evenly spaced light sprites along mapped runway edges. Where only a centreline exists, use a restrained centreline glow. Treat the lights as illustrative styling. Keep light sprites below aircraft, fade them out at regional zoom and cache the airport geometry. Avoid per-light HTML markers.

First validate one airport at regional, approach and ground zooms. Apply the same rules wherever the tiles contain suitable geometry. If essential detail is missing at the demo airport, bundle one attributed local geometry extract. Preserve a readable runway outline when lights are turned off.

## 4. Make each selected plane identifiable

Open a side card on desktop and a bottom sheet on mobile. Show airline, callsign, registration, aircraft type, departure and arrival airport codes and cities, ground speed in kt and km/h, altitude in ft and m, observation age, distance and bearing from the pin. Use a photo matched by registration when licensed for publication. Otherwise label an airline/type photo “Beispielbild”; use a silhouette if no image is available. Credit each image. Keep the small livery badge visible on the unselected map. Start with a small credited collection Ewan chooses.

Use the aircraft identifier for observations, registration for the photo, and callsign for a separate route lookup. Label a database match “Route laut Datenbank”. If ambiguous or missing, show “Route unbekannt”. Keep observed trails separate from departure and destination. A missing photo or route must never delay the radar.

## 5. Connect sources without a paid subscription

| Need | First source to evaluate | Implementation check |
|---|---|---|
| Live traffic and replay | [adsb.lol API](https://www.adsb.lol/docs/open-data/api) and [daily traces](https://www.adsb.lol/docs/open-data/historical) | Test a radius query, units, timestamps and available fields. Cache nearby queries server-side, pause polling in hidden tabs and honour rate limits. Bundle one credited replay. |
| Route lookup | [ADSBDB](https://www.adsbdb.com/) | Test several callsigns including a miss. Verify reuse terms and cache by callsign with expiry. |
| Airport layout | [OpenMapTiles schema](https://openmaptiles.org/docs/schema/) | Select tiles permitted for the public deployment. Inspect geometry and labels, retain attribution and confirm free usage limits. |
| Airport weather | [Aviation Weather Center](https://aviationweather.gov/data/api/) | Fetch METAR by selected airport’s ICAO code through the backend. Show station, observation time, wind, visibility and raw report. Handle no report. |
| Airport notices | [DFS AIS](https://ais.dfs.de/) | For German airports link to the official briefing and indicate registration. Embed live notices only after verifying a subscription-free feed and publication rights for its coverage. |

Keep credentials server-side. Load enrichment only for the selected aircraft or airport. Verify provider responses, quotas, image permissions and attribution before publication. If a feed is down or exhausted, offer replay explicitly.

## 6. Publish and demonstrate

1. Friday milestone: Ewan places a pin, recognizes an airline from its badge, reads its direction and altitude, selects it and zooms down to illuminated runways. Complete this interaction with bundled data first.
2. Connect live traffic, route lookup and licensed photos. Add the airport weather card and notices link. Have Ewan try another airport and a rural point without developer assistance.
3. Deploy the frontend and API on a free hosting option compatible with the project. Test the HTTPS link in a signed-out browser, on a phone and on a second network. Verify API calls through the deployed origin. Include a local replay using bundled geometry and assets for classroom Wi-Fi failures.
4. Hand over the public URL, source, local start command, environment-variable names, attribution and any known coverage limits. Do not mark deployment complete until the link works from a second device.

## Acceptance checks

- Drop a pin anywhere, resize the ring and pan away and back. Only aircraft inside the selected radius appear in radar mode.
- With no aircraft selected, identify a plane’s livery when available, direction and altitude. Tap its silhouette or label to see the matching card.
- Follow a replay across north, pan while traffic refreshes and zoom to taxiway level. Watch for sudden turns, map recentering, flicker and lights obscuring aircraft.
- Try a known route, unknown route, missing image, stale observation, no traffic and a rate-limited response. Each state is distinguishable.
- Disable network access and run the bundled demo locally. Restore connectivity and verify live mode independently.
