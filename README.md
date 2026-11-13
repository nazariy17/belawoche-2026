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

Open http://localhost:4200. The schematic simulation works without the API or external map tiles. It is not a recorded replay or a complete offline-installable application.

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
cd backend
.venv/Scripts/python.exe -m pytest
```

The frontend build checks TypeScript and Angular templates. API tests cover health, OpenAPI, unknown endpoints and disabled capabilities. There are no frontend automated interaction tests yet.

## Vercel deployment

Import `nazariy17/belawoche-2026` in Vercel after the local changes have been committed and pushed. Set the project root to the repository root (`.`), not `frontend/` or `backend/`. Use Node.js 24.x.

The checked-in configuration uses [Vercel Services](https://vercel.com/docs/services), currently in beta, to build Angular and FastAPI independently and expose them on one domain. The Angular output is `frontend/dist/frontend/browser`; Python uses `backend/main.py:app` and Python 3.12. No environment variables or API keys are required for this scaffold. Future provider credentials belong only in server-side Vercel environment variables.

After deployment verify `/`, `/api/health`, `/api/capabilities`, `/api/docs` and an unknown `/api/...` path (must return JSON 404). Use the frontend connection button and check on a phone and second network. Deployment has not been performed or validated yet.

## Implemented and next steps

The starter includes a responsive German screen, a schematic MapLibre canvas centred on Zürich, a movable pin, 10/25/50 km geographic filtering, a selectable stationary synthetic aircraft, an empty state, and an explicit API health check. It requests no external imagery, tiles or live aircraft data.

The roadmap remains to be implemented: attributed basemap and airport geometry, runway lighting, timestamped animated replay, airline badges, aircraft details, airport search, live feeds with caching/rate-limit handling, route enrichment, licensed photos, weather and notices. The capabilities endpoint explicitly reports these integrations as unavailable. This scaffold does not yet satisfy the full plan's acceptance checks.

All demonstration traffic is fictional and labelled **Simulation**. The aircraft symbol uses the system font; no airline imagery or third-party geographic extracts are bundled. Keep provider licensing and attribution review as part of each integration.
