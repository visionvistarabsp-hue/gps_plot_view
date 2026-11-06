// Nearby POI discovery via the Overpass API.
// Builds an Overpass QL query for fuel stations, ATMs, food, and parking
// near a [lon, lat] point, and parses the XML-ish JSON response into NearbyStop[].
// See docs/superpowers/specs/2026-10-12-turn-by-turn-navigation-design.md §6 Extra 1

import { haversine } from './navigation';

export type NearbyCategory = 'fuel' | 'atm' | 'food' | 'parking';

export interface NearbyStop {
  id: string;
  name: string;
  category: NearbyCategory;
  location: [number, number];
  distance: number;
}

export const NEARBY_CATEGORIES: NearbyCategory[] = ['fuel', 'atm', 'food', 'parking'];

export interface NearbyCategoryMeta {
  label: string;
  overpassTags: string[];
  icon: string;
}

export const NEARBY_CATEGORY_META: Record<NearbyCategory, NearbyCategoryMeta> = {
  fuel: { label: 'Fuel', overpassTags: ['fuel'], icon: 'fuel-station' },
  atm: { label: 'ATM', overpassTags: ['atm'], icon: 'atm' },
  food: { label: 'Food', overpassTags: ['restaurant', 'fast_food', 'cafe', 'pub', 'bar'], icon: 'restaurant' },
  parking: { label: 'Parking', overpassTags: ['parking'], icon: 'local-parking' }
};

const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';
const REQUEST_TIMEOUT_MS = 12000;
const SEARCH_RADIUS_M = 1500;

/** Build an Overpass QL query string for one or more categories around a point. */
export function buildOverpassQuery(
  center: [number, number],
  categories: NearbyCategory[]
): string {
  const tags = categories.flatMap((c) => NEARBY_CATEGORY_META[c].overpassTags);
  const [lon, lat] = center;
  const tagFilters = tags.map((t) => `["${t}"]`).join('');

  const parts: string[] = [];
  for (const cat of categories) {
    const tagsStr = NEARBY_CATEGORY_META[cat].overpassTags
      .map((t) => `["${t}"]`)
      .join('');
    parts.push(
      `node["amenity"${tagsStr}](around:${SEARCH_RADIUS_M},${lat},${lon});`
    );
  }

  const body = parts.join('\n');
  return `
[out:json][timeout:10];
(
${body})
out center tags;
`.trim();
}

/**
 * Classify an OSM amenity value into one of our NearbyCategory buckets.
 * Returns null when the tag doesn't match any supported category.
 */
export function classifyAmenity(amenity: string): NearbyCategory | null {
  const v = amenity.toLowerCase();
  if (v === 'fuel') return 'fuel';
  if (v === 'atm') return 'atm';
  if (['restaurant', 'fast_food', 'cafe', 'pub', 'bar'].includes(v)) return 'food';
  if (v === 'parking') return 'parking';
  return null;
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements?: OverpassElement[];
}

/** Parse a raw Overpass JSON response into NearbyStop[], deduped by OSM id. */
export function parseOverpassResponse(
  raw: unknown,
  userLocation: [number, number]
): NearbyStop[] {
  const data = (raw as OverpassResponse) ?? {};
  const elements = data.elements ?? [];

  const seen = new Set<string>();
  const results: NearbyStop[] = [];

  for (const el of elements) {
    const amenity = el.tags?.amenity;
    const category = amenity ? classifyAmenity(amenity) : null;
    if (!category) continue;

    const lat = el.center?.lat ?? el.lat;
    const lon = el.center?.lon ?? el.lon;
    if (typeof lat !== 'number' || typeof lon !== 'number') continue;

    const loc: [number, number] = [lon, lat];
    const key = `${loc[0]},${loc[1]}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const dist = haversine(userLocation, loc);
    results.push({
      id: `${el.type}-${el.id}`,
      name: el.tags?.name || el.tags?.['name:en'] || NEARBY_CATEGORY_META[category].label,
      category,
      location: loc,
      distance: dist
    });
  }

  results.sort((a, b) => a.distance - b.distance);
  return results;
}

/** Fetch nearby POIs from Overpass. Throws on network/timeout error. */
export async function fetchNearbyStops(
  center: [number, number],
  categories: NearbyCategory[] = NEARBY_CATEGORIES
): Promise<NearbyStop[]> {
  if (categories.length === 0) return [];

  const query = buildOverpassQuery(center, categories);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const url = `${OVERPASS_ENDPOINT}?data=${encodeURIComponent(query)}&format=json`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' }
    });
    if (!res.ok) throw new Error(`Overpass request failed (${res.status})`);
    const raw = await res.json();
    return parseOverpassResponse(raw, center);
  } finally {
    clearTimeout(timeout);
  }
}
