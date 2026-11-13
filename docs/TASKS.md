# Development progress

Each completed task is validated and pushed separately. Deployment and external verification are tracked explicitly.

- [x] 1. Attributed world map and bundled Zürich airport geometry (OpenFreeMap vector tiles plus local fallback).
- [x] 2. Airport lighting and zoom-dependent light points; toggle preserves runway pavement/outline.
- [x] 3. Timestamped animated offline simulation with pause/restart, shortest-angle interpolation and stale-position freeze; four synthetic aircraft.
- [ ] 4. Aircraft silhouettes, direction, altitude and operator badges.
- [ ] 5. Aircraft detail panel and mobile layout.
- [ ] 6. Airport search and persistent settings.
- [ ] 7. Cached live traffic, failures and replay fallback.
- [ ] 8. Verified worldwide aircraft lookup.
- [ ] 9. Routes and photos (route publication permission unresolved; silhouette fallback required).
- [ ] 10. METAR and official notices links.
- [ ] 11. Automated/browser checks and Vercel deployment; phone/second-network acceptance remains a manual check.

Task 1 data inspection: Zürich tiles include runway centrelines and polygons for 10/28, 14/32 and 16/34, named taxiways, aprons and building footprints. Local extract retains the original geometry/properties and is published under ODbL. Global detail uses the same aeroway schema; coarse world boundaries remain available locally.
