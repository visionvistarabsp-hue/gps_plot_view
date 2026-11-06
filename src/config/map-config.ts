export const STATUS_COLORS = {
  available: {
    fill: '#789158', // Spacer --highland (green)
    border: '#7C923C',
    hover: '#B8DD5A',
    bgBadge: 'bg-[#789158]/20 text-[#B8DD5A] border-[#789158]/40',
    name: 'Available'
  },
  reserved: {
    fill: '#9B4A2E', // Spacer --mule-fawn (brown)
    border: '#A07C2E',
    hover: '#FBD879',
    bgBadge: 'bg-[#9B4A2E]/20 text-[#FBD879] border-[#9B4A2E]/40',
    name: 'Reserved'
  },
  hold: {
    fill: '#A07C2E', // Spacer --luxor-gold (gold)
    border: '#FBD879',
    hover: '#B8DD5A',
    bgBadge: 'bg-[#A07C2E]/20 text-[#FBD879] border-[#A07C2E]/40',
    name: 'Hold'
  },
  sold: {
    fill: '#8B1626', // Spacer --merlot (deep red)
    border: '#FF003D',
    hover: '#B8DD5A',
    bgBadge: 'bg-[#8B1626]/20 text-[#FF003D] border-[#8B1626]/40',
    name: 'Sold'
  },
  blocked: {
    fill: '#4C4C4C', // Spacer --tundro (grey)
    border: '#323232',
    hover: '#696969',
    bgBadge: 'bg-[#4C4C4C]/20 text-[#696969] border-[#4C4C4C]/40',
    name: 'Blocked'
  }
};

export const SATELLITE_PROVIDERS = {
  esri: {
    name: 'Satellite (High-Res)',
    // Google Maps satellite tiles — best India coverage, supports zoom 20+ in cities
    // Multiple subdomains (mt0-mt3) for parallel tile loading = faster map
    tiles: [
      'https://mt0.google.com/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}',
      'https://mt1.google.com/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}',
      'https://mt2.google.com/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}',
      'https://mt3.google.com/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}'
    ],
    attribution: 'Map data &copy; Google',
    maxzoom: 20
  },
  osm: {
    name: 'OpenStreetMap',
    tiles: [
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
    ],
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxzoom: 19
  },
  cartoDark: {
    name: 'Dark Map',
    tiles: [
      'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    ],
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxzoom: 19
  }
};

export const MAP_CONFIG = {
  initialCenter: [82.096311, 22.0331] as [number, number],
  initialZoom: 17,
  initialPitch: 0,
  initialBearing: 0,
  minZoom: 13,
  maxZoom: 20,
  defaultBaseLayer: 'esri' as keyof typeof SATELLITE_PROVIDERS,
  referenceImage: '/reference/original-layout.png',
  
  // Coordinates mapping bounds for the reference image overlay
  // Approx 350m wide × 220m tall centred on 22.033111°N, 82.096311°E
  // At lat 22°N: 350m = 0.003416° lon, 220m = 0.001980° lat
  referenceBounds: [
    [82.094603, 22.034101], // Top-Left [lon, lat]
    [82.098019, 22.032121]  // Bottom-Right [lon, lat]
  ] as [[number, number], [number, number]],

  fitBoundsPadding: { top: 70, bottom: 70, left: 70, right: 380 },
  fitBoundsPaddingMobile: { top: 60, bottom: 260, left: 20, right: 20 }
};

// Turn-by-turn navigation palette (see docs/superpowers/specs/2026-10-12-turn-by-turn-navigation-design.md)
export const NAV_COLORS = {
  routeAhead: '#3b82f6', // remaining route — blue
  routeAheadCasing: '#ffffff', // white outline for remaining route
  routeDone: '#64748b', // travelled portion — slate grey
  userDot: '#3b82f6', // current position dot
  userDotHalo: 'rgba(59, 130, 246, 0.25)', // translucent position halo
  userDotArrow: '#ffffff', // heading arrow on the user dot
  destination: '#10b981', // project/arrival marker — emerald
  destinationHalo: 'rgba(16, 185, 148, 0.35)', // pulsing halo around destination
  stop: '#f59e0b', // nearby via-stops — amber
  arrow: '#ffffff' // direction arrow on the user dot
} as const;

/** Day/night theme: dark when system prefers dark OR local time is outside 06:00–18:00. */
export function isNightMode(mediaQueryDark: boolean): boolean {
  const h = new Date().getHours();
  return mediaQueryDark || h < 6 || h >= 18;
}

/** Raster paint overrides applied to the base layer for night mode. */
export const NIGHT_RASTER = {
  'raster-brightness-min': 0.55,
  'raster-brightness-max': 0.85,
  'raster-saturation': -0.55,
  'raster-hue-rotate': -15
} as const;

export const DAY_RASTER = {
  'raster-brightness-min': 0,
  'raster-brightness-max': 1,
  'raster-saturation': 0,
  'raster-hue-rotate': 0
} as const;
