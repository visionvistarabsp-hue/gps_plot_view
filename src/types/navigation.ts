// Turn-by-turn live navigation — shared types.
// See docs/superpowers/specs/2026-10-12-turn-by-turn-navigation-design.md

export type NavStatus =
  | 'idle'
  | 'locating'
  | 'routing'
  | 'navigating'
  | 'arrived'
  | 'error';

/** OSRM maneuver types (subset we render). */
export type ManeuverType =
  | 'depart'
  | 'turn'
  | 'new name'
  | 'continue'
  | 'merge'
  | 'on ramp'
  | 'off ramp'
  | 'fork'
  | 'end of road'
  | 'roundabout'
  | 'rotary'
  | 'roundabout turn'
  | 'exit roundabout'
  | 'exit rotary'
  | 'arrive';

/** OSRM maneuver modifier (turn direction). */
export type ManeuverModifier =
  | 'uturn'
  | 'sharp right'
  | 'right'
  | 'slight right'
  | 'straight'
  | 'slight left'
  | 'left'
  | 'sharp left';

/** Normalized icon key the UI maps to a lucide icon. */
export type ManeuverIcon =
  | 'depart'
  | 'straight'
  | 'left'
  | 'slight-left'
  | 'sharp-left'
  | 'right'
  | 'slight-right'
  | 'sharp-right'
  | 'uturn'
  | 'roundabout'
  | 'merge'
  | 'fork'
  | 'arrive';

export type LngLat = [number, number];

export interface NavStep {
  /** Position of this step in the route's step list. */
  index: number;
  /** Hinglish instruction, e.g. "baayein mudein". */
  instruction: string;
  /** Road / way name for the step, when OSRM provides one. */
  name: string;
  maneuverType: ManeuverType;
  maneuverModifier?: ManeuverModifier;
  /** Normalized icon key for rendering. */
  icon: ManeuverIcon;
  /** Meters of this step (travel along the step). */
  distance: number;
  /** Seconds of this step. */
  duration: number;
  /** Maneuver location [lon, lat] (where the instruction applies). */
  location: LngLat;
  /** Step geometry [lon, lat][]. */
  geometry: LngLat[];
}

export interface NavRoute {
  /** Full route polyline [lon, lat][]. */
  geometry: LngLat[];
  /** Total route distance, meters. */
  distance: number;
  /** Total route duration, seconds. */
  duration: number;
  steps: NavStep[];
}

export type NearbyCategory = 'fuel' | 'atm' | 'food' | 'parking';

export interface NearbyStop {
  id: string;
  name: string;
  category: NearbyCategory;
  location: LngLat;
  /** Straight-line distance from the user, meters. */
  distance: number;
}

export interface NavState {
  status: NavStatus;
  route: NavRoute | null;
  userLocation: LngLat | null;
  /** Degrees clockwise from north; 0 = north. Null when unknown. */
  heading: number | null;
  activeStepIndex: number;
  /** Meters to the upcoming maneuver. */
  distanceToNextTurn: number;
  /** Meters left on the whole route. */
  distanceRemaining: number;
  /** Seconds left on the whole route. */
  durationRemaining: number;
  /** True once the user is beyond the off-route threshold. */
  offRoute: boolean;
  /** Via-points added before the destination. */
  stops: NearbyStop[];
  error: string | null;
  /** True when showing an offline/stale cached route. */
  offline: boolean;
  /** Age of the cached route in minutes (only when offline). */
  cacheAgeMinutes: number | null;
  muted: boolean;
}
