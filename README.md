# Smart Parking Garage Operator Dashboard

A read-only React + TypeScript dashboard. It displays responses from the existing FastAPI backend; it sends no commands to Unity.

## Run locally

Start the backend using its existing Python environment (from `Backend/`):

```powershell
.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

If your backend environment lives elsewhere, use that environment's Python executable instead.

In a second terminal, from `OperatorDashboard/`:

```powershell
npm.cmd install --cache node_modules/.npm-cache
npm.cmd run dev
```

Open http://localhost:5173. Vite proxies `/health` and `/api` to http://127.0.0.1:8000. Port 5173 must be free.

## Data and connections

- `GET /health`: FastAPI service health.
- `GET /api/garage`: physical and operational capacity, space states, and L1-L4 summaries.
- `GET /api/integration/status`: Unity connection, data source, and report time.

Reads start approximately every second, without overlapping cycles. Requests time out after four seconds. Parking counts are never fabricated; unavailable initial values display a dash. Failed refreshes retain the last response with a stale warning. Seeded baseline, live Unity, and last known Unity data are explicitly labeled. Independent endpoints can briefly reflect different snapshots.

## Manual verification

1. With the backend stopped, confirm errors and unavailable/unknown connection indicators; initial counts should be dashes.
2. Start FastAPI without Unity: confirm backend connected, Unity disconnected, and seeded baseline counts.
3. Open the existing MainGarage Unity scene and enter Play Mode: confirm Unity connected and live data.
4. Stop Play Mode: after the backend integration timeout (normally five seconds), confirm last known Unity data is marked stale.
5. Stop FastAPI: confirm last counts remain visible with a stale warning. Restart it and confirm automatic recovery.
6. Resize the browser to check the responsive cards.

## Checks

```powershell
npm.cmd run build
npm.cmd run lint
```

Build runs TypeScript checks before writing `dist/`. `node_modules/` and `dist/` are generated folders excluded by the repository's existing Unity Version Control ignore rules. Vite's development proxy is for local development; production hosting needs its own API routing.
