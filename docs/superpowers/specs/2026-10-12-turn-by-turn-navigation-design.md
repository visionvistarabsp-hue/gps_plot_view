# Turn-by-Turn Live Navigation — Design

**Date:** 2026-10-12
**Feature:** In-app Google-Maps-like turn-by-turn navigation from user's live location to the project, plus journey facilities.
**Status:** Approved (design) — ready for implementation planning
**Approach:** B — Layered modules (approved by user)
**Constraint:** 100% free-to-build — no paid API, no API keys.

---

## 1. Goal & Scope

Give the site visitor live, in-app turn-by-turn navigation from their current location to the project (project location endpoint), with a Google-Maps-like experience, mobile-first, using only free/no-key services.

**In scope**
- Start navigation → live route (OSRM demo) + turn-by-turn guidance.
- On-screen turn banner + voice cues.
- Heading-up map that follows the user.
- Auto re-route when off-route.
- Arrival detection + arrival message + project/plots highlight.
- Five journey extras (below).

**Out of scope**
- Paid routing/traffic APIs (Google Directions, Mapbox).
- Self-hosted OSRM (noted as a production consideration, not built now).
- Native app / background navigation (web only).
- Turn-by-turn in offline *map tiles* (offline covers the cached **route**, best-effort).

**Builds on**
- Existing "Go to see the project" feature: `src/hooks/useGeoRoute.ts`, `Header.tsx` CTA, `PropertyMap.tsx` route + user-location sources/layers, `src/pages/index.tsx` wiring.

---

## 2. Decisions (locked)

| # | Question | Decision |
|---|----------|----------|
| Q1 | Guidance scope | Turn-by-turn live navigation (arrow + direction + live distance/ETA) |
| Q2 | Voice | Yes — voice **and** on-screen (`SpeechSynthesis`) |
| Q3 | Map orientation | **Heading-up** (map rotates with user) |
| Q4 | Off-route | **Auto re-route** ("Recalculating…" + new route) |
| Q5 | Destination | Project location + **arrival message** + highlight project/plots |
| Q6/Q6b | Extras | **All 5**: Nearby stops, Live ETA/distance, Share, Auto day/night, Offline fallback |
| Q7 | Device | **Mobile-first** (phone; walking/driving) |

Reason for Approach B: the 5 extras plug in independently; work is incremental, testable, and stoppable mid-way — no single fragile engine.

Rejected:
- **A** — one big engine (fragile, hard to test/stop).
- **C** — thin: app only shows route + "Open in Google Maps" deep-link (user wants in-app turn-by-turn).

---

## 3. Architecture & File Structure

Layers: **engine (hooks) ← UI (nav components) ← extras (independent, plug-in).**

**New — types & pure libs**
- `src/types/navigation.ts` — `NavStep`, `NavState`, `NavStatus`, `NearbyStop`, `ManeuverType`.
- `src/lib/navigation.ts` — pure helpers: `haversine()`, `bearing()`, `nearestStepIndex()`, `distanceToStep()`, `formatDistance()`, `formatETA()`, `isOffRoute()`, `pickManeuverIcon()`.
- `src/lib/voice.ts` — `SpeechSynthesis` wrapper: `speak(text)`, locale (hi-IN/en), mute toggle.
- `src/lib/nearby.ts` — Overpass query builder + response parser (petrol/ATM/food/parking).
- `src/lib/offline-route.ts` — route `localStorage` save/get (+ timestamp).

**New — hooks**
- `src/hooks/useNavigation.ts` — **core engine**: reuses `useGeoRoute`'s OSRM fetch + stale-guard helpers, and adds `watchPosition` + heading + step-match + off-route→auto-reroute + ETA + voice triggers.
- `src/hooks/useNearbyStops.ts` — Overpass POI fetch (lazy, debounced).
- `src/hooks/useWakeLock.ts` — screen-on during nav (graceful fallback).

**New — components**
- `src/components/nav/NavigationPanel.tsx` — top turn banner (arrow + direction + distance + ETA + mute + End).
- `src/components/nav/NearbyStopsSheet.tsx` — bottom sheet: stop chips + list + "Add stop".

**Edits — existing**
- `src/components/map/PropertyMap.tsx` — follow + heading-up rotate, destination marker, active-step line layer, re-center button.
- `src/components/ui/Header.tsx` — CTA now starts navigation (idle → navigating).
- `src/pages/index.tsx` — nav state wiring, panel/sheet mount, day/night auto theme.
- `src/config/map-config.ts` — nav colors (arrow, route active/done, stop icons).
- `src/hooks/useGeoRoute.ts` — keep its one-shot `getCurrentPosition` preview as-is (the standalone "Go to see the project" preview is superseded by nav, but not deleted). `useNavigation` calls into its OSRM fetch + stale-guard; the live position stream lives in `useNavigation` via `watchPosition`.

No paid API, no keys.

---

## 4. Core Nav Engine (`useNavigation.ts`)

Flow:
- **Start:** CTA → `watchPosition({enableHighAccuracy:true, maximumAge:0, timeout:10000})`. First fix → OSRM fetch (`steps=true&geometries=geojson&overview=full`). Status: `locating → routing → navigating → arrived`.
- **Live position:** each update sets `userLocation` + `heading` (GPS `coords.heading`; fallback = bearing from last 2 points).
- **Step-match:** active step = OSRM step whose geometry point is nearest to user (`nearestStepIndex`), refined segment-wise.
- **Turn banner math:** `distanceToStep()` to active step end; maneuver `type/modifier` → arrow + text ("300 m — baayein mudein").
- **Advance step:** when step geometry crossed (distance < ~15 m or next step nearer) → next step + voice cue.
- **Off-route:** if user > ~35 m from route line → "Recalculating…" (voice too) → OSRM re-fetch from current location → step-match reset. Debounced ~2500 ms.
- **Arrival:** < ~25 m from destination → "Aap pahunch gaye" + nav end + highlight project/plots.
- **ETA/distance:** OSRM `duration`/`distance` minus covered → live "ETA 4 min · 900 m".
- **Voice rules:** speak only on meaningful cues (step change, reroute, arrival, "200 m me turn") — not every GPS tick. Mute toggle.
- **Wake lock:** acquire while navigating; release on End.
- **Stop:** End → `clearWatch()`, release wake lock, status `idle` (route layer optional).
- **Fallback:** GPS unavailable → banner "Location off — tap to retry". OSRM fail → try cached route, else friendly error.

**Tunable constants (one place):** off-route threshold ~35 m, arrival ~25 m, step-advance ~15 m, reroute debounce 2500 ms.

---

## 5. UI/UX & Mobile Behaviours

Layout (mobile-first, large touch targets):
- **Top turn-banner** (`NavigationPanel`, fixed, glass style as existing UI):
  - Large maneuver arrow (left/right/uturn/roundabout/straight) + text **"300 m — baayein mudein"**, subtext "via <road name>" (road name from the OSRM step; e.g. "via MG Road").
  - Right: **ETA + distance** ("4 min · 900 m").
  - Left: **mute** toggle (🔊/🔇).
  - Bottom-left: **End** (×) — red.
- **Panel status line** (a single line inside `NavigationPanel`, under the banner): "Aap destination ke paas ho" / "Recalculating…" (shimmer). Not a separate bar.
- **Nearby stops** = separate bottom sheet (not over the panel).

Map:
- **Follow mode:** camera keeps user centred, `easeTo({center, bearing, zoom:17, pitch:45})`, smoothed (act if moved > ~5 m or bearing > ~5°).
- **Heading-up:** `setBearing(heading)`.
- **User marker:** pulsating blue dot + heading arrow (new layer).
- **Route layers:** done part faded (grey), active/ahead bright blue; destination flag marker.
- **Auto day/night:** dark when system `prefers-color-scheme: dark` **or** local time is outside 06:00–18:00; light otherwise (system dark takes precedence).
- **Re-center:** if user drags, "🎯" button appears → resume follow.

Behaviour:
- Nav start → panel slide-down; End → slide-up + camera `fitBounds` route overview.
- **Wake lock** active (screen on).
- Respect safe-area insets (notch) and `prefers-reduced-motion`.

---

## 6. Five Extras (independent modules)

**1. Nearby stops** (`useNearbyStops` + `NearbyStopsSheet`)
- Navbar "🍴 Nearby" → bottom sheet.
- Overpass query: within ~1.5 km of current location, `amenity=fuel|atm|restaurant|fast_food|cafe|parking` (one query).
- Chips filter (Petrol/ATM/Food/Parking) + list (name + distance). "Add stop" → adds a via-point; multiple stops supported, OSRM route becomes `{lon,lat};stop1;stop2;…;{dest}` → re-route. Added stops shown as removable chips above the panel.
- Lazy (only when sheet opens), debounced.

**2. Share route / live location** (`navigator.share`)
- Navbar "🔗 Share" → Web Share API: "Main <project> ja raha hoon, live route: <link>".
  - `<link>` = the app's own shareable project-page URL (`window.location.href`, deep-link to the project page).
- Fallback: copy-to-clipboard + toast.
- Also include a Google Maps deep-link (current location + destination) in the same shared text.

**3. Live ETA + distance** (part of engine, shown in panel)
- Panel top-right, live update. Focus: **re-render optimization** — only ETA/distance text re-renders, not the whole panel.

**4. Auto day/night theme**
- Dark when system `prefers-color-scheme: dark` **or** local time is outside 06:00–18:00; light otherwise (system dark takes precedence) — same rule as §5.
- Map style: light → existing; night → dark-tinted raster (`raster-brightness-min/max`, `raster-saturation/-hue-rotate`) — no new tile provider needed.
- Existing glassmorphic UI tokens get a dark variant.

**5. Offline fallback route** (`offline-route.ts`)
- On route success → `localStorage` save (start, dest, geojson, steps, timestamp).
- GPS/network fail or OSRM timeout → cached route + banner **"Offline route — purana data, ~X min purana"**.
- Cache older than 24 h → dropped. Step navigation works best-effort on cache.

**Build order:** P1 core engine + panel → P2 follow/rotate + wake → P3 nearby → P4 share → P5 day/night → P6 offline cache.

---

## 7. Free Building Blocks (no keys)

- **Routing:** OSRM demo `https://router.project-osrm.org/route/v1/driving/{lon,lat};{lon,lat}?steps=true&geometries=geojson&overview=full`.
- **Live position + heading:** `navigator.geolocation.watchPosition`.
- **Voice:** `SpeechSynthesis` API.
- **POI:** Overpass API / OpenStreetMap.
- **Screen on:** Wake Lock API.
- **Share:** Web Share API.
- **Offline:** Service worker / `localStorage`.

---

## 8. Build Plan + Verification

Phases — each independently testable/usable:
- **P1** — `types/navigation.ts`, `lib/navigation.ts`, `voice.ts`, `useNavigation.ts`, `NavigationPanel.tsx`, `index.tsx`. Verify: route runs; turn text + distance + ETA live; voice cue; arrival message.
- **P2** — `PropertyMap.tsx` follow/heading-up, pulsating marker, active-step layer, `useWakeLock.ts`, re-center. Verify: camera follow, map rotate, screen stays on.
- **P3** — `lib/nearby.ts`, `useNearbyStops.ts`, `NearbyStopsSheet.tsx`. Verify: POI list + add-stop re-route.
- **P4** — share + clipboard fallback + toast. Verify: share text/link.
- **P5** — auto theme + dark raster tint. Verify: time/OS toggle.
- **P6** — `offline-route.ts` + fallback banner. Verify: network off → cached route runs.

Per phase: Hinglish copy, mobile-first, no paid API; `npx tsc --noEmit` clean + dev-server (port 3000) manual check. Model image input unsupported → verify via DOM/network.

---

## 9. Risks & Free-Service Limits

- **OSRM demo server** (public, rate-limited) → may throttle under load. Mitigation: offline cache, debounced reroute, error UI; production = self-hosted OSRM (or GraphHopper/OpenRouteService free tier).
- **Overpass API** slow/heavy → 1 query + timeout + "stops unavailable" fallback.
- **`watchPosition`** battery drain on mobile → nav needs fresh fixes, so `maximumAge` stays `0`; instead throttle non-critical work (UI/ETA re-render, POI fetch) and release the watch + wake lock the moment nav ends.
- **`SpeechSynthesis`** quality device-dependent; autoplay may be blocked → speak after a user gesture.
- **Wake Lock** not universal (iOS Safari limited) → graceful fallback, never crash.
- **`navigator.share`** limited support → clipboard fallback.
- **Heading** without magnetometer → 2-point bearing fallback.
- **Accuracy:** urban GPS ~10–30 m error → thresholds (off-route ~35 m) tuned for it.
- **`.git` absent** → committing the doc needs `git init` (significant — separate confirmation).

---

## 10. Open Items / Follow-ups

- `git init` decision (needed before any commit).
- Production routing host decision (self-hosted OSRM vs. free-tier provider).
- Voice locale default (hi-IN vs. en-IN) — confirm during P1.
