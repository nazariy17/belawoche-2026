# Ewan's flight radar · BELA-Woche 2026

German-language flight radar project. The original roadmap is in
[Ewan-Flight-Radar-Plan.md](Ewan-Flight-Radar-Plan.md).

## Project layout

- `frontend/`: Angular CLI project with TypeScript, SCSS and lazy-loaded MapLibre GL JS.
- `backend/`: Python FastAPI application with health, capabilities and OpenAPI endpoints.
- `vercel.json`: one deployment with frontend and backend services on the same origin.
- `.github/workflows/ci.yml`: frontend production build and backend API tests.

## Local development on Windows

Prerequisites: Node.js 24.15+ (24 LTS) and Python 3.12. Install Python with its PATH option enabled if `python --version` opens the Microsoft Store.

Run from this repository root:

```powershell
npm run setup:frontend
npm run dev
```

Open http://localhost:4200. **Live mode starts automatically and requires the backend below.** The Simulation button explicitly switches to a bundled synthetic scenario, which works without the API. It is not a recorded replay or a complete offline-installable application.

For the backend, in another terminal:

```powershell
python -m venv backend/.venv
backend/.venv/Scripts/python.exe -m pip install -e "./backend[dev]"
npm run dev:backend
```

API: http://127.0.0.1:8000/api/health. Interactive documentation: http://127.0.0.1:8000/api/docs.
Angular proxies `/api/**` to port 8000 locally. In production, Vercel routes those requests to FastAPI, so no cross-origin configuration or browser credentials are needed.

On macOS/Linux use `backend/.venv/bin/python` instead of the Windows Python path, and run `backend/.venv/bin/python -m uvicorn main:app --app-dir backend --reload --port 8000`.

## Validation

```powershell
npm run build
npm --prefix frontend test
cd backend
.venv/Scripts/python.exe -m pytest
```

The frontend build checks TypeScript and Angular templates. Frontend tests cover geodesy, interpolation, icon classification, airport data, worker assets, cancellation, stale observations and rate-limit backoff. API tests cover normalization, query validation, caching, provider limits and weather. Full browser visual acceptance is still pending.

## Vercel deployment

Import `nazariy17/belawoche-2026` in Vercel after the local changes have been committed and pushed. Set the project root to the repository root (`.`), not `frontend/` or `backend/`. Use Node.js 24.x.

The checked-in configuration uses [Vercel Services](https://vercel.com/docs/services), currently in beta, to build Angular and FastAPI independently and expose them on one domain. The Angular output is `frontend/dist/frontend/browser`; Python uses `backend/main.py:app` and Python 3.12. No environment variables or API keys are required for this scaffold. Future provider credentials belong only in server-side Vercel environment variables.

After deployment verify `/`, `/api/health`, `/api/capabilities`, `/api/docs` and an unknown `/api/...` path (must return JSON 404). Use the frontend connection button and check on a phone and second network. Deployment has not been performed or validated yet.

## Implemented and next steps

The radar now includes an attributed world map and local Zürich geometry, runway lighting, airport search, live traffic, worldwide aircraft lookup, aircraft details, weather and official German briefing links. Live traffic refreshes every 30 seconds, interpolates between observations and freezes stale positions. Updates pause in hidden tabs. Select a plane and choose **Flugzeug folgen** to follow it; dragging the map stops following without moving the radar pin.

Aircraft silhouettes distinguish small, medium, large, heavy twin-engine and heavy four-engine aircraft. Additional fallbacks cover helicopters, heavy aircraft with unknown engine count and unknown types. Classification uses an explicit partial ICAO type table, then the reported ADS-B category. These are illustrative visual groups, not official weight classes. The map legend explains the shapes; Simulation includes seven aircraft to preview them.

Airline badges use bundled company logos for SWISS, Lufthansa, easyJet (including EJU/EZS), British Airways, Edelweiss and Emirates, with code fallbacks for other operators. Detailed aircraft drawings use approximate operator colors; special liveries and wet leases are not identified. Commons archive photos require an aircraft subject as well as the exact registration; cabin, cockpit and scenery descriptions are rejected. Metadata filtering is conservative and cannot guarantee every exterior image is correct. Simulation does not request real photos.

Runway-end numbers and 10-NM extended centerlines use a bundled OurAirports snapshot covering 10,134 airports with complete paired ends. Approach lines show 2-NM markers and can be hidden; they are geometric aids, not published instrument approaches. Airport zoom fits the selected airport's runways; **Zum Radar** returns to the radar pin. The METAR panel shows wind direction, gusts and cloud layers, plus a wind-based runway ranking using true headings. It does not claim to know the active runway; calm, variable or stale winds suppress the estimate.

Optional departure/destination lookup is implemented through aviationstack. Set `AVIATIONSTACK_API_KEY` in the backend environment (Vercel environment variables in production); use an account/plan allowing HTTPS flight lookup and your intended use. Requests run only after clicking **Route abfragen**, with a 10-minute server-process cache. Only a unique active-flight match with matching callsign and, when supplied, registration is displayed. Live provider validation is pending credentials; `capabilities.routes` stays false until verified. No API key is included in frontend code.

Remaining work: route-provider credentials and live validation, broader visual acceptance and Vercel deployment. See [task status](docs/TASKS.md) and [provider limits/licensing](docs/PROVIDERS.md). Live mode uses adsb.lol (optional server-side `ADSB_LOL_API_KEY`); its no-key allowance is currently 500 requests/day/IP. Quota exhaustion is displayed explicitly, with a Simulation button. The cache is per server process, not a shared global quota store.

All demonstration traffic is fictional and labelled **Simulation**. SVG silhouettes are original MIT-licensed artwork. Geographic extracts, fonts and airport data retain their own licenses in `frontend/public/data/LICENSE.md` and `frontend/public/fonts/OFL.txt`.
