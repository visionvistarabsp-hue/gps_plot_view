// Offline-first route cache: saves the last successfully fetched route to
// localStorage so turn-by-turn nav can fall back to it when the network or
// OSRM is unavailable. Cache expires after 24 h.
// See docs/superpowers/specs/2026-10-12-turn-by-turn-navigation-design.md §6 Extra 5

export interface CachedRoute {
  from: [number, number];
  to: [number, number];
  waypoints?: Array<[number, number]>;
  geometry: Array<[number, number]>;
  distance: number;
  duration: number;
  steps: {
    instruction: string;
    name: string;
    maneuverType: string;
    maneuverModifier?: string;
    icon: string;
    distance: number;
    duration: number;
    location: [number, number];
    geometry: Array<[number, number]>;
  }[];
  savedAt: number;
}

const STORAGE_KEY = 'dhg:nav:cached-route';
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

function readStorage(): CachedRoute | null {
  if (typeof window === 'undefined') return null;
  try {
    const json = window.localStorage.getItem(STORAGE_KEY);
    if (!json) return null;
    return JSON.parse(json) as CachedRoute;
  } catch {
    return null;
  }
}

function writeStorage(route: CachedRoute): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(route));
  } catch {
    // quota / disabled localStorage — silently ignore
  }
}

/** Persist a route to localStorage with the current timestamp. */
export function saveRoute(route: Omit<CachedRoute, 'savedAt'>): void {
  const cached: CachedRoute = { ...route, savedAt: Date.now() };
  writeStorage(cached);
}

/** Retrieve the cached route, or null if missing / stale / undecryptable. */
export function getRoute(): CachedRoute | null {
  const cached = readStorage();
  if (!cached) return null;

  const age = Date.now() - cached.savedAt;
  if (age > MAX_AGE_MS) {
    clearRoute();
    return null;
  }

  return { ...cached, savedAt: cached.savedAt };
}

/** Age of the cached route in minutes, or null when there is no cache. */
export function getRouteAgeMinutes(): number | null {
  const cached = readStorage();
  if (!cached) return null;
  const age = Date.now() - cached.savedAt;
  if (age > MAX_AGE_MS) {
    clearRoute();
    return null;
  }
  return Math.floor(age / 60000);
}

/** Whether a non-expired route exists in the cache. */
export function hasRoute(): boolean {
  return getRoute() !== null;
}

/** Remove the cached route from storage. */
export function clearRoute(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
