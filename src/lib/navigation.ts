// Turn-by-turn navigation — pure helper functions and constants.
// No React, no DOM. Safe to unit-test.
// See docs/superpowers/specs/2026-10-12-turn-by-turn-navigation-design.md

import type {
  LngLat,
  ManeuverIcon,
  ManeuverModifier,
  ManeuverType,
  NavRoute,
  NavStep
} from '@/types/navigation';

/** Engine tunables (meters, milliseconds, degrees). */
export const NAV = {
  /** Beyond this distance from the route, we consider the user off-route. */
  OFF_ROUTE_M: 35,
  /** Within this distance of the destination, we call it arrived. */
  ARRIVAL_M: 25,
  /** Within this distance of a step's end, advance to the next step. */
  STEP_ADVANCE_M: 15,
  /** Wait this long after going off-route before rerouting (debounce). */
  REROUTE_DEBOUNCE_MS: 2500,
  /** Pre-cue the next maneuver this far ahead. */
  PRECUE_M: 200,
  /** Minimum movement before trusting a two-point heading. */
  HEADING_MIN_MOVE_M: 3,
  /** Camera only re-centers after this much movement. */
  CAMERA_MIN_MOVE_M: 5,
  /** Camera only re-rotates after this much bearing change. */
  CAMERA_MIN_BEARING_DEG: 5
} as const;

const EARTH_R = 6371000;

const toRad = (deg: number): number => (deg * Math.PI) / 180;
const toDeg = (rad: number): number => (rad * 180) / Math.PI;

/** Great-circle distance between two [lon, lat] points, in meters. */
export function haversine(a: LngLat, b: LngLat): number {
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const dLat = lat2 - lat1;
  const dLon = toRad(b[0] - a[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial bearing from `a` to `b` in degrees clockwise from north (0..360). */
export function bearing(a: LngLat, b: LngLat): number {
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const dLon = toRad(b[0] - a[0]);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Project `point` into a local east/north plane centered on `origin`. */
function localXY(point: LngLat, origin: LngLat): [number, number] {
  const latRad = toRad(origin[1]);
  const x = (point[0] - origin[0]) * 111320 * Math.cos(latRad);
  const y = (point[1] - origin[1]) * 110540;
  return [x, y];
}

/** Perpendicular distance in meters from `point` to segment `a`–`b`. */
export function pointToSegment(point: LngLat, a: LngLat, b: LngLat): number {
  const [bx, by] = localXY(b, a);
  const [px, py] = localXY(point, a);
  const len2 = bx * bx + by * by;
  let t = len2 > 0 ? (px * bx + py * by) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - t * bx, py - t * by);
}

/** Minimum distance in meters from `point` to a polyline. */
export function pointToPolylineDistance(point: LngLat, coords: LngLat[]): number {
  if (coords.length === 0) return Infinity;
  if (coords.length === 1) return haversine(point, coords[0]);
  let best = Infinity;
  for (let i = 0; i < coords.length - 1; i++) {
    const d = pointToSegment(point, coords[i], coords[i + 1]);
    if (d < best) best = d;
  }
  return best;
}

/** Closest point on segment `a`–`b` to `point`, as a [lon, lat] pair. */
export function closestPointOnSegment(point: LngLat, a: LngLat, b: LngLat): LngLat {
  const [bx, by] = localXY(b, a);
  const [px, py] = localXY(point, a);
  const len2 = bx * bx + by * by;
  let t = len2 > 0 ? (px * bx + py * by) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/** A route cut at the user's snap point into the part behind and ahead. */
export interface RouteSplit {
  /** Route from its start up to (and including) the snap point — travelled. */
  done: LngLat[];
  /** Route from the snap point to its end — still to travel. */
  ahead: LngLat[];
  /** The user's projected position on the route. */
  snap: LngLat;
}

/**
 * Split a route polyline at the point nearest to `user`. Finds the closest
 * segment by perpendicular projection into a local plane, then cuts so the
 * travelled (`done`) and remaining (`ahead`) halves meet exactly at `snap`.
 * Returns null for an empty route; a single-point route snaps to itself.
 */
export function splitRouteAt(route: LngLat[], user: LngLat): RouteSplit | null {
  if (route.length === 0) return null;
  if (route.length === 1) {
    const snap = route[0];
    return { done: [snap], ahead: [snap], snap };
  }

  let bestSeg = 0;
  let bestT = 0;
  let bestDist = Infinity;
  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i];
    const b = route[i + 1];
    const [bx, by] = localXY(b, a);
    const [px, py] = localXY(user, a);
    const len2 = bx * bx + by * by;
    let t = len2 > 0 ? (px * bx + py * by) / len2 : 0;
    t = Math.max(0, Math.min(1, t));
    const d = Math.hypot(px - t * bx, py - t * by);
    if (d < bestDist) {
      bestDist = d;
      bestSeg = i;
      bestT = t;
    }
  }

  const a = route[bestSeg];
  const b = route[bestSeg + 1];
  const snap: LngLat = [
    a[0] + (b[0] - a[0]) * bestT,
    a[1] + (b[1] - a[1]) * bestT
  ];

  const done = [...route.slice(0, bestSeg + 1), snap];
  const ahead = [snap, ...route.slice(bestSeg + 1)];
  return { done, ahead, snap };
}

/** Index of the step whose geometry is closest to `point`. */
export function nearestStepIndex(steps: NavStep[], point: LngLat): number {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < steps.length; i++) {
    const d = pointToPolylineDistance(point, steps[i].geometry);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

/** Distance in meters from `point` to the end of a step (its maneuver exit). */
export function distanceToStep(step: NavStep | undefined, point: LngLat): number {
  if (!step || step.geometry.length === 0) return Infinity;
  return haversine(point, step.geometry[step.geometry.length - 1]);
}

/**
 * Remaining route distance in meters: the un-travelled part of the active
 * step (`toTurn`) plus every following step in full.
 */
export function routeDistanceRemaining(
  steps: NavStep[],
  idx: number,
  toTurn: number
): number {
  let meters = Math.max(0, toTurn);
  for (let j = idx + 1; j < steps.length; j++) meters += steps[j].distance;
  return meters;
}

/** Remaining route duration in seconds, scaled by the active step's progress. */
export function routeDurationRemaining(
  steps: NavStep[],
  idx: number,
  toTurn: number
): number {
  let seconds = 0;
  for (let j = idx + 1; j < steps.length; j++) seconds += steps[j].duration;
  const cur = steps[idx];
  if (cur) {
    if (cur.distance > 0) {
      const frac = Math.max(0, Math.min(1, toTurn / cur.distance));
      seconds += cur.duration * frac;
    } else {
      seconds += cur.duration;
    }
  }
  return seconds;
}

/** Human-first distance label used in banners and the panel. */
export function formatDistance(meters: number): string {
  if (!isFinite(meters) || meters < 0) return '';
  if (meters < 15) return 'ab hi';
  if (meters < 1000) {
    const m = meters >= 100 ? Math.round(meters / 10) * 10 : Math.round(meters);
    return `${m} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/** Local clock time the user is expected to arrive, e.g. "4:05 PM". */
export function formatETA(secondsFromNow: number): string {
  const arrival = new Date(Date.now() + Math.max(0, secondsFromNow) * 1000);
  return arrival.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/**
 * True when the user has drifted beyond the off-route threshold from the
 * active step. `toleranceM` defaults to OFF_ROUTE_M; callers pass a larger
 * value to absorb GPS error and the route's own entry snap gap (OSRM snaps the
 * requested origin onto the nearest road, so a raw fix already sits some meters
 * off the polyline the route actually starts from).
 */
export function isOffRoute(
  point: LngLat,
  steps: NavStep[],
  activeIdx: number,
  toleranceM: number = NAV.OFF_ROUTE_M
): boolean {
  const step = steps[activeIdx];
  if (!step || step.geometry.length === 0) return false;
  // Consider the active step and the one after it so turns don't false-trigger.
  let d = pointToPolylineDistance(point, step.geometry);
  const next = steps[activeIdx + 1];
  if (next && next.geometry.length > 0) {
    d = Math.min(d, pointToPolylineDistance(point, next.geometry));
  }
  return d > toleranceM;
}

function normalizeType(raw: unknown): ManeuverType {
  const t = typeof raw === 'string' ? raw : '';
  switch (t) {
    case 'depart':
    case 'turn':
    case 'new name':
    case 'continue':
    case 'merge':
    case 'on ramp':
    case 'off ramp':
    case 'fork':
    case 'end of road':
    case 'roundabout':
    case 'rotary':
    case 'roundabout turn':
    case 'exit roundabout':
    case 'exit rotary':
    case 'arrive':
      return t;
    default:
      return 'continue';
  }
}

function normalizeModifier(raw: unknown): ManeuverModifier | undefined {
  const m = typeof raw === 'string' ? raw : '';
  switch (m) {
    case 'uturn':
    case 'sharp right':
    case 'right':
    case 'slight right':
    case 'straight':
    case 'slight left':
    case 'left':
    case 'sharp left':
      return m;
    default:
      return undefined;
  }
}

/** Map an OSRM maneuver type/modifier onto a normalized icon key. */
export function pickManeuverIcon(
  type: ManeuverType,
  modifier?: ManeuverModifier
): ManeuverIcon {
  if (type === 'arrive') return 'arrive';
  if (type === 'depart') return 'depart';
  if (type === 'roundabout' || type === 'rotary' || type === 'roundabout turn' ||
      type === 'exit roundabout' || type === 'exit rotary') {
    return 'roundabout';
  }
  if (type === 'merge') return 'merge';
  if (type === 'fork' || type === 'end of road') return 'fork';
  switch (modifier) {
    case 'uturn':
      return 'uturn';
    case 'sharp left':
      return 'sharp-left';
    case 'left':
      return 'left';
    case 'slight left':
      return 'slight-left';
    case 'sharp right':
      return 'sharp-right';
    case 'right':
      return 'right';
    case 'slight right':
      return 'slight-right';
    default:
      return 'straight';
  }
}

/** Build the Hinglish spoken/on-screen instruction for a step. */
export function instructionFor(
  index: number,
  type: ManeuverType,
  modifier: ManeuverModifier | undefined,
  name: string
): string {
  const via = name && name !== '-' ? `, ${name}` : '';

  if (type === 'arrive') return 'Aap pahunch gaye hain';
  if (type === 'depart') {
    return name && name !== '-' ? `${name} ki taraf chalein` : 'Chalein';
  }
  if (type === 'roundabout' || type === 'rotary') {
    return `Gol chakkar se nikalein${via}`;
  }
  if (type === 'roundabout turn' || type === 'exit roundabout' || type === 'exit rotary') {
    return `Gol chakkar se baahar nikalein${via}`;
  }
  if (type === 'merge') return `Road par mil jaayein${via}`;
  if (type === 'on ramp') return `Ramp se chadhein${via}`;
  if (type === 'off ramp') return `Ramp se utrein${via}`;
  if (type === 'fork') {
    if (modifier && modifier.includes('left')) return `Fork se baayein jaayein${via}`;
    if (modifier && modifier.includes('right')) return `Fork se daayein jaayein${via}`;
    return `Fork par seedha rahein${via}`;
  }
  if (type === 'end of road') {
    if (modifier && modifier.includes('left')) return `Sadaak ke ant par baayein mudein${via}`;
    if (modifier && modifier.includes('right')) return `Sadaak ke ant par daayein mudein${via}`;
    return `Sadaak ke ant par seedha rahein${via}`;
  }

  switch (modifier) {
    case 'uturn':
      return 'U-turn lein';
    case 'sharp left':
      return `Tez baayein mudein${via}`;
    case 'left':
      return `Baayein mudein${via}`;
    case 'slight left':
      return `Thoda baayein mudein${via}`;
    case 'sharp right':
      return `Tez daayein mudein${via}`;
    case 'right':
      return `Daayein mudein${via}`;
    case 'slight right':
      return `Thoda daayein mudein${via}`;
    default:
      // A named 'continue'/'new name' is still forward motion.
      if (type === 'new name' && name && name !== '-') return `Seedha chalein, ${name}`;
      if (index === 0) return 'Chalein';
      return `Seedha chalein${via}`;
  }
}

interface OsrmStep {
  distance?: number;
  duration?: number;
  name?: string;
  geometry?: { coordinates?: [number, number][] };
  maneuver?: {
    type?: string;
    modifier?: string;
    location?: [number, number];
  };
}

interface OsrmLeg {
  distance?: number;
  duration?: number;
  steps?: OsrmStep[];
}

interface OsrmRoute {
  geometry?: { coordinates?: [number, number][] };
  distance?: number;
  duration?: number;
  legs?: OsrmLeg[];
}

interface OsrmResponse {
  routes?: OsrmRoute[];
}

/**
 * Parse an OSRM `/route` response into our NavRoute.
 * Returns null when the response has no usable route.
 */
export function parseOsrmRoute(raw: unknown, _dest: LngLat): NavRoute | null {
  const data = raw as OsrmResponse | null;
  const route = data?.routes?.[0];
  if (!route) return null;

  const coords = route.geometry?.coordinates;
  if (!coords || coords.length < 2) return null;

  const osrmSteps: OsrmStep[] = [];
  for (const leg of route.legs ?? []) {
    for (const s of leg.steps ?? []) osrmSteps.push(s);
  }

  const steps: NavStep[] = osrmSteps.map((s, index) => {
    const type = normalizeType(s.maneuver?.type);
    const modifier = normalizeModifier(s.maneuver?.modifier);
    const name = typeof s.name === 'string' ? s.name : '';
    const geometry = (s.geometry?.coordinates ?? []) as LngLat[];
    const location =
      (s.maneuver?.location as LngLat | undefined) ??
      geometry[0] ??
      (coords[0] as LngLat);
    return {
      index,
      instruction: instructionFor(index, type, modifier, name),
      name,
      maneuverType: type,
      maneuverModifier: modifier,
      icon: pickManeuverIcon(type, modifier),
      distance: typeof s.distance === 'number' ? s.distance : 0,
      duration: typeof s.duration === 'number' ? s.duration : 0,
      location,
      geometry
    };
  });

  if (steps.length === 0) return null;

  return {
    geometry: coords as LngLat[],
    distance: typeof route.distance === 'number' ? route.distance : 0,
    duration: typeof route.duration === 'number' ? route.duration : 0,
    steps
  };
}
