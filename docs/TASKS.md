# Development progress

Each completed task is validated and pushed separately. Deployment and external verification are tracked explicitly.

- [x] 1. Attributed world map and bundled ZÃ¼rich airport geometry (OpenFreeMap vector tiles plus local fallback).
- [x] 2. Airport lighting and zoom-dependent light points; toggle preserves runway pavement/outline.
- [x] 3. Timestamped animated offline simulation with pause/restart, shortest-angle interpolation and stale-position freeze; four synthetic aircraft.
- [x] 4. Aircraft silhouettes, direction, altitude and operator badges.
- [x] 5. Aircraft detail panel, unit conversions, observation age, distance/bearing and mobile bottom sheet; accessible aircraft list.
- [x] 6. Airport search (48,070 large/medium/small airports) and persistent radius, radar colour and opening airport.
- [x] 7. Cached live traffic, distinct failures, rate-limit backoff and explicit simulation fallback. Cache is process-local (see PROVIDERS.md).
- [ ] 8. Verified worldwide aircraft lookup.
- [ ] 9. Routes and photos (route publication permission unresolved; silhouette fallback required).
- [ ] 10. METAR and official notices links.
- [ ] 11. Automated/browser checks and Vercel deployment; phone/second-network acceptance remains a manual check.

Task 1 data inspection: ZÃ¼rich tiles include runway centrelines and polygons for 10/28, 14/32 and 16/34, named taxiways, aprons and building footprints. Local extract retains the original geometry/properties and is published under ODbL. Global detail uses the same aeroway schema; coarse world boundaries remain available locally.

