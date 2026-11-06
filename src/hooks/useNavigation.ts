// Turn-by-turn navigation engine.
// Owns geolocation watching, OSRM routing, progress tracking, auto re-route,
// arrival detection and voice cues. UI-free; drive the map from its output.
// See docs/superpowers/specs/2026-10-12-turn-by-turn-navigation-design.md

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MAP_CONFIG } from '@/config/map-config';
import { PROJECT_CONFIG } from '@/config/project-config';
import type { RouteGeoJSON } from '@/hooks/useGeoRoute';
import {
  NAV,
  bearing,
  distanceToStep,
  formatDistance,
  haversine,
  isOffRoute,
  nearestStepIndex,
  parseOsrmRoute,
  routeDistanceRemaining,
  routeDurationRemaining
} from '@/lib/navigation';
import { cancelSpeech, isMuted, setMuted, speak } from '@/lib/voice';
import { saveRoute, getRoute, getRouteAgeMinutes, clearRoute, type CachedRoute } from '@/lib/offline-route';
import { splitRouteAt } from '@/lib/navigation';
import type {
  LngLat,
  ManeuverIcon,
  ManeuverModifier,
  ManeuverType,
  NavRoute,
  NavStatus,
  NavStep,
  NearbyStop
} from '@/types/navigation';

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 10000
};

const DEST: LngLat = MAP_CONFIG.initialCenter as LngLat;

type ProgressMode = 'start' | 'reroute' | 'update';

export interface RouteSplit {
  /** Polyline of the part the user has already travelled (drawn faded). */
  done: LngLat[];
  /** Polyline of the remaining route ahead (drawn bright). */
  ahead: LngLat[];
  /** User's projected snap point on the route. */
  snap: LngLat;
}

export interface UseNavigationResult {
  status: NavStatus;
  route: NavRoute | null;
  routeGeoJSON: RouteGeoJSON | null;
  /** Whether navigation is actively running (navigating or arrived). */
  isNavigating: boolean;
  userLocation: LngLat | null;
  heading: number | null;
  activeStepIndex: number;
  activeStep: NavStep | null;
  upcomingStep: NavStep | null;
  distanceToNextTurn: number;
  distanceRemaining: number;
  durationRemaining: number;
  offRoute: boolean;
  stops: NearbyStop[];
  error: string | null;
  offline: boolean;
  cacheAgeMinutes: number | null;
  /** Split of the route at the user's position (done vs ahead), for map rendering. */
  routeSplit: RouteSplit | null;
  muted: boolean;
  statusMessage: string;
  start: () => void;
  stop: () => void;
  retry: () => void;
  toggleMute: () => void;
  replayInstruction: () => void;
  addStop: (stop: NearbyStop) => void;
  removeStop: (id: string) => void;
}

export function useNavigation(): UseNavigationResult {
  const [status, setStatus] = useState<NavStatus>('idle');
  const [route, setRoute] = useState<NavRoute | null>(null);
  const [userLocation, setUserLocation] = useState<LngLat | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [distanceToNextTurn, setDistanceToNextTurn] = useState(0);
  const [distanceRemaining, setDistanceRemaining] = useState(0);
  const [durationRemaining, setDurationRemaining] = useState(0);
  const [offRoute, setOffRoute] = useState(false);
  const [stops, setStops] = useState<NearbyStop[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMutedState] = useState(false);
  const [offline, setOffline] = useState(false);
  const [cacheAgeMinutes, setCacheAgeMinutes] = useState<number | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const requestIdRef = useRef(0);
  const routeRef = useRef<NavRoute | null>(null);
  const statusRef = useRef<NavStatus>('idle');
  const lastPosRef = useRef<LngLat | null>(null);
  const activeIdxRef = useRef(0);
  const stopsRef = useRef<NearbyStop[]>([]);
  const precue200Ref = useRef(-1);
  const spokenForStepRef = useRef(-1);
  const offRouteSinceRef = useRef<number | null>(null);
  const rerouteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reroutingRef = useRef(false);
  const headingRef = useRef<number | null>(null);
  // GPS-reported accuracy (meters). Absorbed into the off-route tolerance so a
  // noisy fix near the road doesn't read as a detour.
  const accuracyRef = useRef(0);
  // Distance from the requested origin to the route's first vertex. OSRM snaps
  // the origin onto the nearest road, so the polyline starts some meters away
  // from the raw fix; absorbed into the tolerance too.
  const snapGapRef = useRef(0);

  const releaseWatch = useCallback(() => {
    if (
      watchIdRef.current !== null &&
      typeof navigator !== 'undefined' &&
      'geolocation' in navigator
    ) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = null;
    if (rerouteTimerRef.current !== null) {
      clearTimeout(rerouteTimerRef.current);
      rerouteTimerRef.current = null;
    }
  }, []);

  const engine = useMemo(() => {
    function syncStatus(next: NavStatus) {
      statusRef.current = next;
      setStatus(next);
    }

    function buildUrl(from: LngLat): string {
      const pts: LngLat[] = [from, ...stopsRef.current.map((s) => s.location), DEST];
      const path = pts.map((p) => `${p[0]},${p[1]}`).join(';');
      return `${OSRM_BASE}/${path}?overview=full&geometries=geojson&steps=true`;
    }

    function handleArrival() {
      if (statusRef.current === 'arrived') return;
      releaseWatch();
      syncStatus('arrived');
      speak(`Aap pahunch gaye hain. ${PROJECT_CONFIG.name}.`);
    }

    function doReroute() {
      if (reroutingRef.current || statusRef.current !== 'navigating') return;
      const from = lastPosRef.current;
      if (!from) return;
      if (rerouteTimerRef.current !== null) {
        clearTimeout(rerouteTimerRef.current);
        rerouteTimerRef.current = null;
      }
      reroutingRef.current = true;
      offRouteSinceRef.current = null;
      setOffRoute(false);
      speak('Recalculating.');
      void beginRoute(from, { reroute: true });
    }

    function applyProgress(cur: LngLat, r: NavRoute, mode: ProgressMode) {
      const last = r.steps.length - 1;
      let idx = Math.min(activeIdxRef.current, last);

      // Bounded forward correction so a GPS jump doesn't overshoot the route.
      const near = nearestStepIndex(r.steps, cur);
      if (near > idx && near <= idx + 2) idx = near;

      // Walk forward while we've reached the end of the active step.
      while (idx < last && distanceToStep(r.steps[idx], cur) < NAV.STEP_ADVANCE_M) {
        idx += 1;
      }
      activeIdxRef.current = idx;
      setActiveStepIndex(idx);

      const toTurn = distanceToStep(r.steps[idx], cur);
      const remDist = routeDistanceRemaining(r.steps, idx, toTurn);
      const remDur = routeDurationRemaining(r.steps, idx, toTurn);

      setDistanceToNextTurn(isFinite(toTurn) ? toTurn : 0);
      setDistanceRemaining(remDist);
      setDurationRemaining(remDur);

      if (remDist < NAV.ARRIVAL_M || haversine(cur, DEST) < NAV.ARRIVAL_M) {
        handleArrival();
        return;
      }

      // Absorb GPS noise and the route's entry snap gap so a raw fix sitting a
      // few meters off the polyline is not mistaken for a detour.
      const tolerance = NAV.OFF_ROUTE_M + Math.max(accuracyRef.current, snapGapRef.current);
      const off = isOffRoute(cur, r.steps, idx, tolerance);
      setOffRoute(off);
      if (off) {
        if (offRouteSinceRef.current === null) offRouteSinceRef.current = Date.now();
        // Self-heal: a stationary off-route fix gets no follow-up position, so
        // the debounce cannot ride on later updates — schedule the reroute.
        if (rerouteTimerRef.current === null && !reroutingRef.current) {
          rerouteTimerRef.current = setTimeout(() => {
            rerouteTimerRef.current = null;
            doReroute();
          }, NAV.REROUTE_DEBOUNCE_MS);
        }
      } else {
        offRouteSinceRef.current = null;
        if (rerouteTimerRef.current !== null) {
          clearTimeout(rerouteTimerRef.current);
          rerouteTimerRef.current = null;
        }
      }

      const upcoming = r.steps[idx + 1];
      if (mode === 'start' || mode === 'reroute') {
        const prefix = mode === 'reroute' ? 'Route dobara banaya. ' : 'Navigation shuru. ';
        if (upcoming && isFinite(toTurn)) {
          speak(`${prefix}${formatDistance(toTurn)} me ${upcoming.instruction}`);
          precue200Ref.current = upcoming.index;
          if (toTurn <= 40) spokenForStepRef.current = upcoming.index;
        } else {
          speak(prefix.trim());
        }
      } else if (upcoming && isFinite(toTurn)) {
        if (toTurn <= NAV.PRECUE_M && toTurn > 40 && precue200Ref.current !== upcoming.index) {
          speak(`${formatDistance(toTurn)} me ${upcoming.instruction}`);
          precue200Ref.current = upcoming.index;
        }
        if (toTurn <= 40 && spokenForStepRef.current !== upcoming.index) {
          speak(`Ab ${upcoming.instruction}`);
          spokenForStepRef.current = upcoming.index;
        }
      }
    }

    async function beginRoute(from: LngLat, opts?: { reroute?: boolean }) {
      const reroute = opts?.reroute ?? false;
      if (!reroute) reroutingRef.current = false;

      const requestId = (requestIdRef.current += 1);
      if (!reroute) syncStatus('routing');
      setError(null);

      try {
        const res = await fetch(buildUrl(from));
        if (requestId !== requestIdRef.current) return;
        if (!res.ok) throw new Error(String(res.status));

        const data: unknown = await res.json();
        if (requestId !== requestIdRef.current) return;

        const parsed = parseOsrmRoute(data, DEST);
        if (!parsed) throw new Error('no-route');

        // OSRM snaps the raw origin onto the nearest road, so route.geometry[0]
        // is the snapped start. Remember that gap: it is GPS error, not a detour.
        snapGapRef.current =
          parsed.geometry.length > 0 ? haversine(from, parsed.geometry[0]) : 0;

        // Persist to the offline cache so nav can fall back to it later.
        const waypoints = stopsRef.current.length > 0
          ? stopsRef.current.map((s) => s.location)
          : undefined;
        saveRoute({
          from,
          to: DEST,
          waypoints,
          geometry: parsed.geometry,
          distance: parsed.distance,
          duration: parsed.duration,
          steps: parsed.steps.map((s) => ({
            instruction: s.instruction,
            name: s.name,
            maneuverType: s.maneuverType,
            maneuverModifier: s.maneuverModifier,
            icon: s.icon,
            distance: s.distance,
            duration: s.duration,
            location: s.location,
            geometry: s.geometry
          }))
        });
        setOffline(false);
        setCacheAgeMinutes(null);

        routeRef.current = parsed;
        activeIdxRef.current = 0;
        precue200Ref.current = -1;
        spokenForStepRef.current = -1;
        setRoute(parsed);
        setActiveStepIndex(0);
        syncStatus('navigating');
        applyProgress(from, parsed, reroute ? 'reroute' : 'start');
      } catch {
        if (requestId !== requestIdRef.current) return;

        // On failure, try the offline cache before giving up.
        if (!reroute) {
          const cached = getRoute();
          if (cached) {
            setOffline(true);
            setCacheAgeMinutes(getRouteAgeMinutes());
            const cachedRoute: NavRoute = {
              geometry: cached.geometry,
              distance: cached.distance,
              duration: cached.duration,
              steps: cached.steps.map((s, index) => ({
                index,
                instruction: s.instruction,
                name: s.name,
                maneuverType: s.maneuverType as ManeuverType,
                maneuverModifier: s.maneuverModifier as ManeuverModifier | undefined,
                icon: s.icon as ManeuverIcon,
                distance: s.distance,
                duration: s.duration,
                location: s.location,
                geometry: s.geometry
              }))
            };
            routeRef.current = cachedRoute;
            activeIdxRef.current = 0;
            precue200Ref.current = -1;
            spokenForStepRef.current = -1;
            setRoute(cachedRoute);
            setActiveStepIndex(0);
            syncStatus('navigating');
            applyProgress(from, cachedRoute, 'start');
            speak('Cache se purana route istemal ho raha hai.');
            return;
          }
        }

        if (reroute) {
          syncStatus('navigating');
        } else {
          syncStatus('error');
          setError('Raasta nahi bana. Dobara koshish karein.');
        }
      } finally {
        if (reroute) reroutingRef.current = false;
      }
    }

    function onPos(position: GeolocationPosition) {
      const cur: LngLat = [position.coords.longitude, position.coords.latitude];

      const acc = position.coords.accuracy;
      accuracyRef.current =
        typeof acc === 'number' && isFinite(acc) ? acc : 0;

      const ch = position.coords.heading;
      if (typeof ch === 'number' && !Number.isNaN(ch) && ch >= 0) {
        headingRef.current = ch;
      } else {
        const prev = lastPosRef.current;
        if (prev && haversine(prev, cur) >= NAV.HEADING_MIN_MOVE_M) {
          headingRef.current = bearing(prev, cur);
        }
      }
      lastPosRef.current = cur;
      setUserLocation(cur);
      if (headingRef.current !== null) setHeading(headingRef.current);

      const s = statusRef.current;
      if (s === 'locating') {
        void beginRoute(cur);
      } else if (s === 'navigating' && routeRef.current) {
        applyProgress(cur, routeRef.current, 'update');
      }
    }

    function onErr(err: GeolocationPositionError) {
      const s = statusRef.current;
      if (s === 'navigating' || s === 'arrived') return;
      syncStatus('error');
      setError(
        err.code === err.PERMISSION_DENIED
          ? 'Location access band hai. Permission dein.'
          : 'Aapki location nahi mil rahi.'
      );
    }

    function start() {
      if (typeof window === 'undefined' || !('geolocation' in navigator)) {
        syncStatus('error');
        setError('Is device par location support nahi hai.');
        return;
      }
      releaseWatch();
      requestIdRef.current += 1;
      routeRef.current = null;
      activeIdxRef.current = 0;
      lastPosRef.current = null;
      precue200Ref.current = -1;
      spokenForStepRef.current = -1;
      offRouteSinceRef.current = null;
      reroutingRef.current = false;
      headingRef.current = null;
      accuracyRef.current = 0;
      snapGapRef.current = 0;

      setRoute(null);
      setActiveStepIndex(0);
      setDistanceToNextTurn(0);
      setDistanceRemaining(0);
      setDurationRemaining(0);
      setOffRoute(false);
      setError(null);
      setMutedState(isMuted());
      syncStatus('locating');

      watchIdRef.current = navigator.geolocation.watchPosition(onPos, onErr, GEO_OPTIONS);
    }

    function stop() {
      releaseWatch();
      requestIdRef.current += 1;
      routeRef.current = null;
      lastPosRef.current = null;
      syncStatus('idle');
      setRoute(null);
      setUserLocation(null);
      setHeading(null);
      setActiveStepIndex(0);
      setDistanceToNextTurn(0);
      setDistanceRemaining(0);
      setDurationRemaining(0);
      setOffRoute(false);
      setError(null);
      setOffline(false);
      setCacheAgeMinutes(null);
      clearRoute();
      cancelSpeech();
    }

    function toggleMute() {
      const next = !isMuted();
      setMuted(next);
      setMutedState(next);
    }

    function replayInstruction() {
      const r = routeRef.current;
      if (!r) return;
      const idx = activeIdxRef.current;
      const step = r.steps[idx + 1] ?? r.steps[idx];
      if (step) speak(`Ab ${step.instruction}`);
    }

    function addStop(stop: NearbyStop) {
      stopsRef.current = [...stopsRef.current, stop];
      setStops(stopsRef.current);
      if (statusRef.current === 'navigating' && lastPosRef.current) {
        void beginRoute(lastPosRef.current, { reroute: true });
      }
    }

    function removeStop(id: string) {
      stopsRef.current = stopsRef.current.filter((s) => s.id !== id);
      setStops(stopsRef.current);
      if (statusRef.current === 'navigating' && lastPosRef.current) {
        void beginRoute(lastPosRef.current, { reroute: true });
      }
    }

    return {
      start,
      stop,
      retry: start,
      toggleMute,
      replayInstruction,
      addStop,
      removeStop
    };
  }, [releaseWatch]);

  useEffect(() => {
    setMutedState(isMuted());
  }, []);

  useEffect(
    () => () => {
      releaseWatch();
      cancelSpeech();
    },
    [releaseWatch]
  );

  const routeGeoJSON: RouteGeoJSON | null = route
    ? {
        type: 'Feature',
        properties: { distance: route.distance, duration: route.duration },
        geometry: { type: 'LineString', coordinates: route.geometry }
      }
    : null;

  const activeStep = route ? route.steps[activeStepIndex] ?? null : null;
  const upcomingStep = route ? route.steps[activeStepIndex + 1] ?? null : null;

  let statusMessage = '';
  switch (status) {
    case 'locating':
      statusMessage = 'Aapki location dhoondh rahe hain...';
      break;
    case 'routing':
      statusMessage = 'Raasta bana rahe hain...';
      break;
    case 'navigating':
      statusMessage = offRoute ? 'Recalculating...' : '';
      break;
    case 'arrived':
      statusMessage = 'Aap pahunch gaye hain.';
      break;
    case 'error':
      statusMessage = error ?? '';
      break;
    default:
      statusMessage = '';
  }

  const isNavigating = status === 'navigating' || status === 'arrived';

  // Split the route at the user's projected position for map rendering
  // (travelled portion vs. remaining portion).
  let routeSplit: RouteSplit | null = null;
  if (route && userLocation) {
    const split = splitRouteAt(route.geometry, userLocation);
    if (split) {
      routeSplit = {
        done: split.done,
        ahead: split.ahead,
        snap: split.snap
      };
    }
  }

  return {
    status,
    route,
    routeGeoJSON,
    isNavigating,
    userLocation,
    heading,
    activeStepIndex,
    activeStep,
    upcomingStep,
    distanceToNextTurn,
    distanceRemaining,
    durationRemaining,
    offRoute,
    stops,
    error,
    offline,
    cacheAgeMinutes,
    routeSplit,
    muted,
    statusMessage,
    ...engine
  };
}
