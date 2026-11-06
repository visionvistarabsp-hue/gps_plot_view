# Design: "Go to see the project" — locate me + route to project

- **Date:** 2026-10-12
- **Status:** Implemented
- **Scope:** Interactive landing map (`/`)

## Problem

Visitors on the landing map want a quick way to see how far the project is and how to get
to it, without leaving the page. An external Google Maps redirect was rejected — the whole
experience must stay in-app on the MapLibre canvas.

## User story

> As a visitor, I click **"Go to see the project"**, I grant location access, and the map
> shows my current position ("you are here") plus a blue driving route line to the project,
> with both points fitted on screen.

Denied / unavailable location must degrade gracefully: show a friendly inline message and
recenter on the project instead of crashing.

## Decisions (approved)

| Decision | Choice |
| --- | --- |
| Behaviour | In-app "locate me" + route line on the map (no external directions) |
| Routing | OSRM public demo server, no API key — `router.project-osrm.org` (driving) |
| Button placement | `Header` top bar, right nav group, before the Filters trigger |
| Denied / unavailable | Inline message + smooth recenter/fit on the project |
| Marker / route style | Google-Maps-like — blue route line (`#1a73e8`) with white casing; static two-circle "you are here" marker |
| Fit after route | `fitBounds` both points (user + project) with padding |
| Data flow | Data-down props (Approach B): hook owns state, `PropertyMap` renders it |

Rejected: `forwardRef` / `useImperativeHandle` (Approach A), all-in-one inside `PropertyMap`
(Approach C).

## Architecture

```
useGeoRoute()  ──state──▶  pages/index.tsx  ──props──▶  PropertyMap  ──▶  MapLibre sources/layers
   ▲                                                        ▲
   └─ navigator.geolocation + OSRM fetch                     └─ setData + fitBounds
```

- **`useGeoRoute`** owns geolocation + OSRM fetch and exposes plain state.
- **`index.tsx`** wires the hook to the Header button and to `PropertyMap` props, and renders
  the dismissible error banner.
- **`PropertyMap`** stays presentational: it receives `userLocation` + `routeGeoJSON` and
  updates MapLibre sources/layers.

## Module 1 — `src/hooks/useGeoRoute.ts`

```ts
export type GeoRouteStatus = 'idle' | 'locating' | 'routing' | 'ready' | 'error';

export interface RouteGeoJSON {
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry: { type: 'LineString'; coordinates: [number, number][] };
}

interface UseGeoRouteResult {
  userLocation: [number, number] | null;   // [lon, lat]
  routeGeoJSON: RouteGeoJSON | null;
  status: GeoRouteStatus;
  error: string | null;
  requestRoute: () => void;
  reset: () => void;
}
```

- `OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving'`.
- `GEO_OPTIONS = { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }`.
- `requestRoute()` reads `navigator.geolocation` **at call time** (not module load), so the
  runtime can be stubbed for tests. Guards `typeof window === 'undefined' || !('geolocation' in navigator)`.
- Request URL: `${OSRM_BASE}/${userLon},${userLat};${projectLon},${projectLat}?overview=full&geometries=geojson`.
- `requestIdRef` guards stale async responses (mismatch → ignore).
- `reset()` bumps `requestIdRef` and clears `userLocation`, `routeGeoJSON`, `status`, `error`.

Error messages (English, all end with "Centering on the project instead."):

| Case | Message |
| --- | --- |
| Unsupported device | "Location isn't supported on this device. Centering on the project instead." |
| Fetch failure | "Couldn't calculate a route to the project. Centering on the project instead." |
| `PERMISSION_DENIED` | "Location access was blocked. Centering on the project instead." |
| Other geo error | "Couldn't access your location. Centering on the project instead." |

## Module 2 — `src/components/ui/Header.tsx`

- New props: `onGoToProject: () => void`, `isLocating?: boolean` (default `false`).
- Blue gradient CTA (`from-blue-500 to-blue-600`) in the right nav group, **before** the
  Filters trigger.
- `disabled` + `cursor-wait` while locating; shows `Loader2` spinner when locating, otherwise
  the lucide `Navigation` icon.
- Label `hidden sm:inline`: "Go to see the project" / "Locating…".
- `title="Locate me and route to the project"`.

## Module 3 — `src/components/map/PropertyMap.tsx`

- New props: `userLocation?: [number, number] | null`, `routeGeoJSON?: RouteGeoJSON | null`.
- Import `RouteGeoJSON` type from `@/hooks/useGeoRoute`.
- On `load`, add empty sources/layers **after `plot-labels`, before the hover interaction**
  (route draws above plots):

  | id | kind | style |
  | --- | --- | --- |
  | `route-source` | geojson (empty) | — |
  | `route-casing` | line | `#ffffff`, width 9, opacity 0.9, round cap/join |
  | `route-line` | line | `#1a73e8`, width 6, opacity 0.95, round cap/join |
  | `user-location-source` | geojson (empty) | — |
  | `user-location-halo` | circle | radius 14, `#1a73e8`, opacity 0.2 |
  | `user-location-dot` | circle | radius 7, `#1a73e8`, white stroke width 3 |

- Sync effect on `[routeGeoJSON, userLocation, isLoaded]` (early return if `!map || !isLoaded`):
  - `routeSource.setData(...)` — the route `Feature`, or an empty `FeatureCollection`.
  - `userSource.setData(...)` — a `Point` `Feature`, or empty.
  - When route has ≥ 2 coords: compute min/max lon/lat and
    `map.fitBounds([[minLon, minLat], [maxLon, maxLat]], { padding: 80, duration: 1200 })`.
- A separate `fitRouteTrigger` was not needed; the existing `fitBoundsTrigger` handles error
  recenter.

## Module 4 — `src/pages/index.tsx` (wiring)

- `useGeoRoute()` destructured; local `showRouteError` state.
- Status effect (deps `[status]`):
  - `error` → `setShowRouteError(true)` and bump `fitBoundsTrigger` (recenter).
  - `locating` / `routing` → `setShowRouteError(false)`.
- Header: `onGoToProject={requestRoute}`,
  `isLocating={status === 'locating' || status === 'routing'}`.
- `PropertyMap`: `userLocation={userLocation}`, `routeGeoJSON={routeGeoJSON}`.
- Dismissible error banner (before the MapLibre canvas block):
  - Outer: `absolute bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-[92vw] sm:max-w-md`.
  - Inner alert card (`border-amber-300/40 bg-slate-900/90 … text-amber-100`), ⚠️ span,
    `{error}` text.
  - Dismiss button `aria-label="Dismiss message"`:
    `onClick={() => { setShowRouteError(false); reset(); }}`.
  - Render guard: `{showRouteError && error && ( … )}`.

## Project coordinate source

- `MAP_CONFIG.initialCenter = [82.096311, 22.0331]` (lon, lat), `initialZoom: 17`
  (`src/config/map-config.ts`).
- `PROJECT_CONFIG` holds no coordinates; routing target is `MAP_CONFIG.initialCenter`.

## Testing notes

- **Granted path:** `ctx.grantPermissions(['geolocation'])` + `ctx.setGeolocation(...)`, then
  click the button. Confirmed OSRM request returns 200 with a `LineString` + `distance` /
  `duration`.
- **Denied path:** no MCP "deny" tool. Stub `navigator.geolocation.getCurrentPosition` via
  `browser_evaluate` (save as `window.__origGeo`, call `error({ code: 1, PERMISSION_DENIED: 1 })`);
  restore afterwards. Banner text and dismiss verified via snapshot.
- **Typecheck:** `npx tsc --noEmit` (no `typecheck` script). `npm run lint` is interactive and
  unusable non-interactively.

## Out of scope

- External Google Maps / directions redirect.
- Turn-by-turn directions, ETA panel, alternate routes.
- Persisting or sharing a route.
- MapLibre pulsing marker animation (static two-circle marker only).
