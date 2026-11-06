import { useCallback, useRef, useState } from 'react';
import { MAP_CONFIG } from '@/config/map-config';

export type GeoRouteStatus = 'idle' | 'locating' | 'routing' | 'ready' | 'error';

export interface RouteGeoJSON {
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
}

interface UseGeoRouteResult {
  userLocation: [number, number] | null;
  routeGeoJSON: RouteGeoJSON | null;
  status: GeoRouteStatus;
  error: string | null;
  requestRoute: () => void;
  reset: () => void;
}

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 60000
};

/**
 * Handles browser geolocation and computes a driving route to the project
 * using the public OSRM demo server. Returns GeoJSON ready to feed a
 * MapLibre source, plus status/error state for UI feedback.
 */
export function useGeoRoute(): UseGeoRouteResult {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [routeGeoJSON, setRouteGeoJSON] = useState<RouteGeoJSON | null>(null);
  const [status, setStatus] = useState<GeoRouteStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const reset = useCallback(() => {
    requestIdRef.current += 1;
    setUserLocation(null);
    setRouteGeoJSON(null);
    setStatus('idle');
    setError(null);
  }, []);

  const requestRoute = useCallback(() => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setStatus('error');
      setError("Location isn't supported on this device. Centering on the project instead.");
      return;
    }

    const requestId = (requestIdRef.current += 1);
    setStatus('locating');
    setError(null);
    setRouteGeoJSON(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        if (requestId !== requestIdRef.current) return;

        const userLoc: [number, number] = [
          position.coords.longitude,
          position.coords.latitude
        ];
        setUserLocation(userLoc);
        setStatus('routing');

        const projectLoc = MAP_CONFIG.initialCenter;
        const url =
          `${OSRM_BASE}/${userLoc[0]},${userLoc[1]};${projectLoc[0]},${projectLoc[1]}` +
          `?overview=full&geometries=geojson`;

        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`Routing request failed (${res.status})`);

          const data = await res.json();
          const route = data?.routes?.[0];
          const coordinates = route?.geometry?.coordinates as [number, number][] | undefined;

          if (requestId !== requestIdRef.current) return;

          if (!route || !coordinates || coordinates.length < 2) {
            throw new Error('No route found');
          }

          setRouteGeoJSON({
            type: 'Feature',
            properties: {
              distance: route.distance ?? null,
              duration: route.duration ?? null
            },
            geometry: {
              type: 'LineString',
              coordinates
            }
          });
          setStatus('ready');
        } catch (e) {
          if (requestId !== requestIdRef.current) return;
          setStatus('error');
          setError("Couldn't calculate a route to the project. Centering on the project instead.");
        }
      },
      (geoError) => {
        if (requestId !== requestIdRef.current) return;
        setStatus('error');
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setError("Location access was blocked. Centering on the project instead.");
        } else {
          setError("Couldn't access your location. Centering on the project instead.");
        }
      },
      GEO_OPTIONS
    );
  }, []);

  return { userLocation, routeGeoJSON, status, error, requestRoute, reset };
}
