# Smart Parking Garage Operator Dashboard

A React + TypeScript dashboard with read-only parking monitoring. CCTV view selection manages focus leases through the existing FastAPI backend.

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

## CCTV monitoring

The existing 14 official camera IDs and responsive CCTV grid use live JPEG thumbnails. `GET /api/cameras` is polled approximately every second without overlapping requests, independently of occupancy polling, with a four-second timeout. Camera names and IDs remain available when the backend is offline.

The shared preview requests `GET /api/cameras/{camera_id}/frame?kind=thumbnail`. Its URL includes both the frame sequence and capture timestamp, plus a session/reconnect cache token. Unchanged frames do not trigger another image request. Failed images retry after one second with a new cache token.

Backend thumbnail health is displayed as Fresh, Stale, NoFrame, or Unavailable. Stale frames remain visible with a warning; NoFrame and Unavailable show an explanatory state. Metadata connection failures retain last known thumbnails with an explicit warning and retry automatically. Individual JPEG failures are labeled separately from camera health.

Click a tile, or focus it with Tab and press Enter or Space, to open its focused view. Select "Back to all cameras" to restore the grid. Keyboard focus moves to the back button and returns to the selected tile. A camera selector allows switching directly between enlarged views.

The enlarged view acquires a lease using `POST /api/cameras/{camera_id}/focus`, then renews using `{ "lease_id": "..." }` every ten seconds. The existing camera poll must report a Fresh focused feed after acquisition before the view opens `GET /api/cameras/{camera_id}/stream` as a native MJPEG image. Once started, the MJPEG connection stays mounted for the selected camera and lease. Routine polls, changing frame metadata, brief Stale/NoFrame/Unavailable health, or metadata request failures update the status message without resetting the stream. Metadata health does not prove whether an already-open MJPEG connection has failed. Thumbnail polling continues underneath, with visible fallback while waiting, after an actual image error, when focus is explicitly disabled, or when the lease is lost. An image failure remains in fallback until an explicit retry; a Fresh poll cannot silently restart it.

Focus conflicts (409), unavailable feeds (404/503), renewal failures, and expiry show explanatory messages. "Retry focused view" releases the current lease and tries again; the dashboard does not automatically compete for another viewer's lease. Focus operations are serialized across switching, retries, and React StrictMode cleanup. Closing, switching, and unmounting clear renewal timers, disconnect the MJPEG image, and send `DELETE /api/cameras/focus` with `X-Focus-Lease-Id`. A late acquisition is released before the next acquisition starts. Page navigation sends a best-effort keepalive release. If the network prevents cleanup or an acquisition times out before its ID is received, server lease expiration is the final safeguard.

Camera inventory and types live in `src/cctv.ts`, polling in `src/useCameras.ts`, selection in `src/components/CctvMonitor.tsx`, and JPEG rendering in `src/components/CameraPreview.tsx`. `src/focusLease.ts` manages lease ownership, `src/focusedStream.ts` manages stream startup/failure state, and `src/components/FocusedCamera.tsx` manages streaming and fallback. Run lease and stream regression checks with `node --test tests/*.test.mjs` (Node 24).

Manual verification: confirm 14 thumbnails, changing sequence/timestamps update images, unchanged frames do not reload, and each backend health state is labeled correctly. Check selection, focus restoration, narrow layouts, and existing garage behavior. Stop/restart FastAPI to check camera connection warnings and automatic recovery; check a failed JPEG separately from metadata failures.

Phase 2 manual verification: open a camera and confirm thumbnail fallback transitions to moving MJPEG; keep it open beyond ten seconds and inspect renewal POST bodies. Switch cameras rapidly and close during acquisition; verify release headers and that only the selected camera streams. Use another viewer to hold a lease and check the conflict message. Check unsupported cameras, stopped Unity, interrupted MJPEG, backend/network failure during renewal, retry recovery, and page navigation cleanup.

Stream stability verification: keep CAM_ENTRANCE open through repeated polls and successful lease renewals; confirm a single long-lived stream request. Briefly Stale focused metadata or a failed metadata poll should change the health message without replacing HD with a thumbnail or opening a new stream request. An actual MJPEG image error should disconnect the image and reveal the thumbnail until retry. Switching or closing must still disconnect the stream and release the lease.
