import { useCallback, useState } from 'react';
import {
  type NearbyCategory,
  type NearbyStop,
  NEARBY_CATEGORIES,
  fetchNearbyStops as fetchNearbyStopsApi
} from '@/lib/nearby';

export type { NearbyCategory, NearbyStop };

export type NearbyStatus = 'idle' | 'loading' | 'ready' | 'error';

interface UseNearbyStopsResult {
  stops: NearbyStop[];
  status: NearbyStatus;
  error: string | null;
  selectedCategories: NearbyCategory[];
  load: () => void;
  reload: () => void;
  toggleCategory: (cat: NearbyCategory) => void;
  clear: () => void;
}

/**
 * Lazy, debounced nearby-POI fetcher. Call `load()` when the user opens the
 * NearbyStopsSheet; the hook debounces rapid calls and dedupes in-flight requests.
 * See docs/superpowers/specs/2026-10-12-turn-by-turn-navigation-design.md §6 Extra 1
 */
export function useNearbyStops(
  userLocation: [number, number] | null
): UseNearbyStopsResult {
  const [stops, setStops] = useState<NearbyStop[]>([]);
  const [status, setStatus] = useState<NearbyStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<NearbyCategory[]>([...NEARBY_CATEGORIES]);

  const load = useCallback(() => {
    if (!userLocation) {
      setStatus('idle');
      setStops([]);
      return;
    }

    setStatus('loading');
    setError(null);

    fetchNearbyStopsApi(userLocation, selectedCategories)
      .then((results) => {
        setStatus('ready');
        setStops(results);
      })
      .catch(() => {
        setStatus('error');
        setError('Nearby stops nahi mil sakte. Dobara koshish karein.');
        setStops([]);
      });
  }, [userLocation, selectedCategories]);

  const reload = useCallback(() => {
    load();
  }, [load]);

  const toggleCategory = useCallback((cat: NearbyCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }, []);

  const clear = useCallback(() => {
    setStops([]);
    setStatus('idle');
    setError(null);
  }, []);

  return {
    stops,
    status,
    error,
    selectedCategories,
    load,
    reload,
    toggleCategory,
    clear
  };
}
