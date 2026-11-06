import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Map as MapLibreMap, Popup, NavigationControl, Marker } from 'maplibre-gl';
import { PropertyData, CalibrationParams, FilterOptions } from '@/types/property';
import { MAP_CONFIG, SATELLITE_PROVIDERS, STATUS_COLORS, NAV_COLORS, isNightMode, NIGHT_RASTER, DAY_RASTER } from '@/config/map-config';
import type { RouteGeoJSON } from '@/hooks/useGeoRoute';
import type { RouteSplit } from '@/hooks/useNavigation';

interface PropertyMapProps {
  properties: PropertyData[];
  selectedProperty: PropertyData | null;
  onSelectProperty: (property: PropertyData | null) => void;
  baseLayer: 'esri' | 'osm' | 'cartoDark';
  filters?: FilterOptions;
  calibrationParams?: CalibrationParams;
  onMapLoaded?: () => void;
  fitBoundsTrigger?: number;
  userLocation?: [number, number] | null;
  routeGeoJSON?: RouteGeoJSON | null;
  heading?: number | null;
  isNavigating?: boolean;
  routeSplit?: RouteSplit | null;
}

export const PropertyMap: React.FC<PropertyMapProps> = ({
  properties,
  selectedProperty,
  onSelectProperty,
  baseLayer,
  filters,
  calibrationParams,
  onMapLoaded,
  fitBoundsTrigger,
  userLocation,
  routeGeoJSON,
  heading,
  isNavigating = false,
  routeSplit
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const hoveredFeatureIdRef = useRef<string | number | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const destinationMarkerRef = useRef<Marker | null>(null);
  const userLocationMarkerRef = useRef<Marker | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [followMode, setFollowMode] = useState(false);

  // Status color expression for MapLibre paint
  const statusColorExpression = [
    'match',
    ['get', 'status'],
    'available', STATUS_COLORS.available.fill,
    'reserved', STATUS_COLORS.reserved.fill,
    'hold', STATUS_COLORS.hold.fill,
    'sold', STATUS_COLORS.sold.fill,
    'blocked', STATUS_COLORS.blocked.fill,
    STATUS_COLORS.available.fill // fallback
  ];

  const statusBorderColorExpression = [
    'match',
    ['get', 'status'],
    'available', STATUS_COLORS.available.border,
    'reserved', STATUS_COLORS.reserved.border,
    'hold', STATUS_COLORS.hold.border,
    'sold', STATUS_COLORS.sold.border,
    'blocked', STATUS_COLORS.blocked.border,
    STATUS_COLORS.available.border
  ];

  // Helper to compute overlay coordinates based on calibration parameters
  const getOverlayCoordinates = useCallback((cal?: CalibrationParams) => {
    const baseBounds = MAP_CONFIG.referenceBounds;
    const offX = cal?.offsetX || 0;
    const offY = cal?.offsetY || 0;
    const scale = cal?.scale || 1.0;

    const lonCenter = (baseBounds[0][0] + baseBounds[1][0]) / 2 + offX;
    const latCenter = (baseBounds[0][1] + baseBounds[1][1]) / 2 + offY;
    const halfWidth = ((baseBounds[1][0] - baseBounds[0][0]) / 2) * scale;
    const halfHeight = ((baseBounds[0][1] - baseBounds[1][1]) / 2) * scale;

    const topLeft = [lonCenter - halfWidth, latCenter + halfHeight];
    const topRight = [lonCenter + halfWidth, latCenter + halfHeight];
    const bottomRight = [lonCenter + halfWidth, latCenter - halfHeight];
    const bottomLeft = [lonCenter - halfWidth, latCenter - halfHeight];

    return [topLeft, topRight, bottomRight, bottomLeft];
  }, []);

  // Initialize Map dynamically on client
  useEffect(() => {
    let isCancelled = false;

    async function initMap() {
      if (!mapContainerRef.current || mapRef.current) return;

      const maplibreModule = await import('maplibre-gl');
      const maplibregl = maplibreModule.default || maplibreModule;

      if (isCancelled || !mapContainerRef.current) return;

      const provider = SATELLITE_PROVIDERS[baseLayer] || SATELLITE_PROVIDERS.esri;

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: {
          version: 8,
          sources: {
            'base-raster': {
              type: 'raster',
              tiles: provider.tiles,
              tileSize: 256,
              attribution: provider.attribution,
              maxzoom: provider.maxzoom || 20
            }
          },
          layers: [
            {
              id: 'base-raster-layer',
              type: 'raster',
              source: 'base-raster',
              paint: {
                'raster-opacity': 1,
                'raster-resampling': 'linear'
              }
            }
          ]
        },
        center: MAP_CONFIG.initialCenter,
        zoom: MAP_CONFIG.initialZoom,
        minZoom: MAP_CONFIG.minZoom,
        maxZoom: MAP_CONFIG.maxZoom,
        pitch: MAP_CONFIG.initialPitch,
        bearing: MAP_CONFIG.initialBearing
      });

      // Add navigation control
      map.addControl(
        new maplibregl.NavigationControl({ showCompass: true, showZoom: true, visualizePitch: true }),
        'bottom-right'
      );

      // Destination marker at the project center
      const destinationEl = document.createElement('div');
      destinationEl.className = 'destination-marker';
      destinationEl.style.zIndex = '10';
      destinationEl.innerHTML = `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-6 h-6 rounded-full bg-emerald-400 opacity-30 animate-ping"></div>
          <div class="relative w-4 h-4 rounded-full bg-emerald-400 border-2 border-white shadow-lg" style="box-shadow: 0 0 0 4px rgba(16,185,148,0.45)"></div>
        </div>
      `;
      destinationMarkerRef.current = new maplibregl.Marker({ element: destinationEl })
        .setLngLat(MAP_CONFIG.initialCenter)
        .addTo(map);

      // Heading-aware user location marker (pulsating dot + arrow)
      const userEl = document.createElement('div');
      userEl.className = 'nav-user-marker';
      userEl.style.zIndex = '11';
      userEl.innerHTML = `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-5 h-5 rounded-full bg-blue-500 opacity-25 animate-ping"></div>
          <div class="w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white shadow-lg"></div>
          <div id="user-heading-arrow" class="absolute -top-1 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[7px] border-b-white opacity-0 transition-opacity"></div>
        </div>
      `;
      userLocationMarkerRef.current = new maplibregl.Marker({ element: userEl })
        .setLngLat(MAP_CONFIG.initialCenter)
        .addTo(map);
      userEl.style.visibility = 'hidden';

      // Break follow mode on user drag/pinch
      const breakFollow = () => {
        if (followMode) setFollowMode(false);
      };
      map.on('movestart', breakFollow);

      // Popup for plot hover tooltip
      popupRef.current = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 15,
        className: 'plot-tooltip-popup'
      });

      map.on('load', () => {
        if (isCancelled) return;

        // 1. Add Reference Image Overlay Source (for Calibration)
        map.addSource('reference-image-source', {
          type: 'image',
          url: MAP_CONFIG.referenceImage,
          coordinates: getOverlayCoordinates(calibrationParams) as any
        });

        map.addLayer({
          id: 'reference-image-layer',
          type: 'raster',
          source: 'reference-image-source',
          paint: {
            'raster-opacity': calibrationParams?.enabled && calibrationParams?.showReference ? calibrationParams.opacity : 0,
            'raster-resampling': 'linear'
          }
        });

        // 2. Add Project Boundary
        map.addSource('project-boundary-source', {
          type: 'geojson',
          data: '/data/project-boundary.geojson'
        });

        map.addLayer({
          id: 'project-boundary-glow',
          type: 'line',
          source: 'project-boundary-source',
          paint: {
            'line-color': '#B8DD5A',       // Spacer whatsapp green
            'line-width': 8,
            'line-opacity': 0.35,
            'line-blur': 4
          }
        });

        map.addLayer({
          id: 'project-boundary-stroke',
          type: 'line',
          source: 'project-boundary-source',
          paint: {
            'line-color': '#7C923C',       // Spacer wasabi
            'line-width': 2.5,
            'line-dasharray': [3, 2],
            'line-opacity': 0.95
          }
        });

        // 3. Add Roads
        map.addSource('roads-source', {
          type: 'geojson',
          data: '/data/roads.geojson'
        });

        map.addLayer({
          id: 'roads-fill',
          type: 'fill',
          source: 'roads-source',
          paint: {
            'fill-color': '#323232',       // Spacer shaft
            'fill-opacity': 0.85
          }
        });

        map.addLayer({
          'id': 'roads-stroke',
          type: 'line',
          source: 'roads-source',
          paint: {
            'line-color': '#4C4C4C',       // Spacer tundro
            'line-width': 1.5,
            'line-opacity': 0.9
          }
        });

        map.addLayer({
          'id': 'roads-centerline',
          type: 'line',
          source: 'roads-source',
          paint: {
            'line-color': '#BDBDBD',       // Spacer silver
            'line-width': 1,
            'line-dasharray': [4, 4],
            'line-opacity': 0.5
          }
        });

        // 4. Add Amenities (Gardens, Clubhouse, Transformer)
        map.addSource('amenities-source', {
          type: 'geojson',
          data: '/data/amenities.geojson'
        });

        map.addLayer({
          id: 'amenities-fill',
          type: 'fill',
          source: 'amenities-source',
          paint: {
            'fill-color': [
              'match',
              ['get', 'type'],
              'garden', '#789158',       // Spacer highland green
              'clubhouse', '#7C923C',    // Spacer wasabi
              'transformer', '#9B4A2E',  // Spacer mule-fawn
              '#789158'
            ],
            'fill-opacity': [
              'match',
              ['get', 'type'],
              'garden', 0.55,
              'clubhouse', 0.65,
              'transformer', 0.7,
              0.5
            ]
          }
        });

        map.addLayer({
          id: 'amenities-stroke',
          type: 'line',
          source: 'amenities-source',
          paint: {
            'line-color': [
              'match',
              ['get', 'type'],
              'garden', '#B8DD5A',       // Spacer whatsapp green
              'clubhouse', '#7C923C',    // Spacer wasabi
              'transformer', '#FBD879',  // Spacer golden glow
              '#B8DD5A'
            ],
            'line-width': 2,
            'line-opacity': 0.9
          }
        });

        // 5. Add All Plots (Residential, LIG, EWS)
        map.addSource('all-plots-source', {
          type: 'geojson',
          data: '/data/all-plots.geojson',
          generateId: true
        });

        map.addLayer({
          id: 'plots-fill',
          type: 'fill',
          source: 'all-plots-source',
          paint: {
            'fill-color': statusColorExpression as any,
            'fill-opacity': [
              'case',
              ['boolean', ['feature-state', 'hover'], false],
              0.85,
              ['boolean', ['feature-state', 'selected'], false],
              0.9,
              0.45
            ]
          }
        });

        map.addLayer({
          id: 'plots-stroke',
          type: 'line',
          source: 'all-plots-source',
          paint: {
            'line-color': [
              'case',
              ['boolean', ['feature-state', 'selected'], false],
              '#ffffff',
              ['boolean', ['feature-state', 'hover'], false],
              '#ffffff',
              statusBorderColorExpression as any
            ],
            'line-width': [
              'case',
              ['boolean', ['feature-state', 'selected'], false],
              3.5,
              ['boolean', ['feature-state', 'hover'], false],
              2.5,
              1.2
            ],
            'line-opacity': 0.95
          }
        });

        // 6. Add Plot Labels Layer
        map.addSource('plot-labels-source', {
          type: 'geojson',
          data: '/data/plot-labels.geojson'
        });

        map.addLayer({
          id: 'plot-labels-layer',
          type: 'symbol',
          source: 'plot-labels-source',
          minzoom: 16.5,
          layout: {
            'text-field': ['get', 'plotNumber'],
            'text-size': [
              'interpolate',
              ['linear'],
              ['zoom'],
              16.5, 10,
              18.5, 13,
              20, 16
            ],
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            'text-anchor': 'center',
            'text-allow-overlap': true,
            'text-ignore-placement': true
          },
          paint: {
            'text-color': '#FBD879',              // Spacer golden glow
            'text-halo-color': '#151515',          // Spacer cod grey
            'text-halo-width': 2.5,
            'text-halo-blur': 0.5
          }
        });

        // 7. Route line + user location (Go to see the project)
        map.addSource('route-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });

        // Preview route (non-navigating): single blue line with white casing
        map.addLayer({
          id: 'route-casing',
          type: 'line',
          source: 'route-source',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': '#ffffff',
            'line-width': 9,
            'line-opacity': 0.9
          }
        });

        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route-source',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': '#1a73e8',
            'line-width': 6,
            'line-opacity': 0.95
          }
        });

        // Navigation split route: done (grey) + ahead (blue)
        map.addSource('route-done-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });

        map.addSource('route-ahead-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });

        map.addLayer({
          id: 'route-done-line',
          type: 'line',
          source: 'route-done-source',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': NAV_COLORS.routeDone,
            'line-width': 6,
            'line-opacity': 0.6
          }
        });

        map.addLayer({
          id: 'route-ahead-casing',
          type: 'line',
          source: 'route-ahead-source',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': NAV_COLORS.routeAheadCasing,
            'line-width': 10,
            'line-opacity': 0.6
          }
        });

        map.addLayer({
          id: 'route-ahead-line',
          type: 'line',
          source: 'route-ahead-source',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': NAV_COLORS.routeAhead,
            'line-width': 6,
            'line-opacity': 0.95
          }
        });

        // User location marker (heading-aware, used during navigation)
        // The Marker is created in initMap; this GeoJSON source is for preview mode.
        map.addSource('user-location-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });

        map.addLayer({
          id: 'user-location-halo',
          type: 'circle',
          source: 'user-location-source',
          paint: {
            'circle-radius': 14,
            'circle-color': '#1a73e8',
            'circle-opacity': 0.2
          }
        });

        map.addLayer({
          id: 'user-location-dot',
          type: 'circle',
          source: 'user-location-source',
          paint: {
            'circle-radius': 7,
            'circle-color': '#1a73e8',
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 3
          }
        });

        // Hover interaction on plots
        map.on('mousemove', 'plots-fill', (e) => {
          if (!e.features || e.features.length === 0) return;
          map.getCanvas().style.cursor = 'pointer';

          const feature = e.features[0];
          const props = feature.properties as any;
          const currentId = feature.id as any;

          if (hoveredFeatureIdRef.current !== currentId) {
            if (hoveredFeatureIdRef.current !== null) {
              map.setFeatureState(
                { source: 'all-plots-source', id: hoveredFeatureIdRef.current },
                { hover: false }
              );
            }
            hoveredFeatureIdRef.current = currentId;
            map.setFeatureState(
              { source: 'all-plots-source', id: currentId },
              { hover: true }
            );
          }

          // Show Tooltip
          const statusConf = STATUS_COLORS[props.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.available;
          const html = `
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${statusConf.fill}"></span>
              <span class="font-bold text-sm text-white">${props.type === 'residential' ? 'Plot ' + props.plotNumber : props.plotNumber}</span>
              <span class="text-[10px] uppercase px-1.5 py-0.5 rounded font-bold ${statusConf.bgBadge}">
                ${statusConf.name}
              </span>
            </div>
            <div class="text-[11px] text-slate-300 mt-1">
              ${props.area ? props.area + ' sq.ft' : ''} ${props.facing ? '• Facing ' + props.facing : ''}
            </div>
          `;

          if (popupRef.current) {
            popupRef.current.setLngLat(e.lngLat).setHTML(html).addTo(map);
          }
        });

        map.on('mouseleave', 'plots-fill', () => {
          map.getCanvas().style.cursor = '';
          if (hoveredFeatureIdRef.current !== null) {
            map.setFeatureState(
              { source: 'all-plots-source', id: hoveredFeatureIdRef.current },
              { hover: false }
            );
            hoveredFeatureIdRef.current = null;
          }
          if (popupRef.current) {
            popupRef.current.remove();
          }
        });

        // Click on Plot
        map.on('click', 'plots-fill', (e) => {
          if (!e.features || e.features.length === 0) return;
          const props = e.features[0].properties as any;
          const clickedProp = properties.find(p => p.id === props.id || p.plotNumber === props.plotNumber);
          if (clickedProp) {
            onSelectProperty(clickedProp);
            // Fly camera to the clicked plot center
            const center = props.center
              ? (typeof props.center === 'string' ? JSON.parse(props.center) : props.center)
              : e.lngLat.toArray();
            map.flyTo({
              center: center as [number, number],
              zoom: Math.max(map.getZoom(), 18.5),
              duration: 900,
              essential: true
            });
          }
        });

        // Click on Amenities
        map.on('click', 'amenities-fill', (e) => {
          if (!e.features || e.features.length === 0) return;
          const props = e.features[0].properties as any;
          if (popupRef.current) {
            popupRef.current
              .setLngLat(e.lngLat)
              .setHTML(`
                <div class="font-bold text-sm text-emerald-300">${props.name}</div>
                <div class="text-[11px] text-slate-300 mt-0.5">${props.description || props.category}</div>
              `)
              .addTo(map);
          }
        });

        setIsLoaded(true);
        if (onMapLoaded) onMapLoaded();
      });

      mapRef.current = map;
    }

    initMap();

    return () => {
      isCancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update Base Raster when provider changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;

    const provider = SATELLITE_PROVIDERS[baseLayer] || SATELLITE_PROVIDERS.esri;
    const source = map.getSource('base-raster') as any;

    if (source && source.setTiles) {
      source.setTiles(provider.tiles);
    }
  }, [baseLayer, isLoaded]);

  // Sync Selected Plot highlight in MapLibre
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;

    // Reset all selection states
    properties.forEach((p, idx) => {
      map.setFeatureState(
        { source: 'all-plots-source', id: idx },
        { selected: selectedProperty?.id === p.id }
      );
    });

    if (selectedProperty) {
      // Find property center and fly camera smoothly
      const propIndex = properties.findIndex(p => p.id === selectedProperty.id);
      if (propIndex !== -1) {
        map.setFeatureState(
          { source: 'all-plots-source', id: propIndex },
          { selected: true }
        );
      }
    }
  }, [selectedProperty, properties, isLoaded]);

  // Fit bounds when trigger changes or on reset
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;

    map.flyTo({
      center: MAP_CONFIG.initialCenter,
      zoom: MAP_CONFIG.initialZoom,
      pitch: 0,
      bearing: 0,
      duration: 1200
    });
  }, [fitBoundsTrigger, isLoaded]);

  // Sync route line + user location ("Go to see the project" preview + turn-by-turn nav)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;

    const makeLine = (coords: [number, number][]) => ({
      type: 'Feature' as const,
      properties: {},
      geometry: { type: 'LineString' as const, coordinates: coords }
    });

    if (isNavigating && routeSplit) {
      // Navigation mode: split the route into done (grey) + ahead (blue)
      const doneSrc = map.getSource('route-done-source') as any;
      if (doneSrc && doneSrc.setData) {
        doneSrc.setData({
          type: 'FeatureCollection',
          features:
            routeSplit.done.length >= 2
              ? [makeLine(routeSplit.done)]
              : []
        });
      }

      const aheadSrc = map.getSource('route-ahead-source') as any;
      if (aheadSrc && aheadSrc.setData) {
        aheadSrc.setData({
          type: 'FeatureCollection',
          features:
            routeSplit.ahead.length >= 2
              ? [makeLine(routeSplit.ahead)]
              : []
        });
      }

      // Show nav route layers, hide preview layers
      ['route-done-line', 'route-ahead-casing', 'route-ahead-line'].forEach((id) => {
        if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'visible');
      });
      ['route-casing', 'route-line'].forEach((id) => {
        if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none');
      });

      // Use the heading-aware marker (not the GeoJSON circle)
      const userMarker = userLocationMarkerRef.current;
      if (userMarker && userLocation) {
        userMarker.setLngLat(userLocation);
        if (heading != null) {
          const arrow = document.getElementById('user-heading-arrow');
          if (arrow) {
            arrow.style.transform = `rotate(${heading}deg)`;
            arrow.style.opacity = '1';
          }
        }
        userMarker.getElement().style.visibility = 'visible';
      }

      // Hide GeoJSON user dot during navigation
      const userSrc = map.getSource('user-location-source') as any;
      if (userSrc && userSrc.setData) {
        userSrc.setData({ type: 'FeatureCollection', features: [] });
      }

      // Fit to show both the route split and destination on first nav start
      if (routeSplit.done.length === 0 && routeSplit.ahead.length >= 2) {
        map.fitBounds(
          [
            [Math.min(...routeSplit.ahead.map((c) => c[0])),
             Math.min(...routeSplit.ahead.map((c) => c[1]))],
            [Math.max(...routeSplit.ahead.map((c) => c[0])),
             Math.max(...routeSplit.ahead.map((c) => c[1]))]
          ],
          { padding: 80, duration: 1200 }
        );
      }
    } else {
      // Preview mode: single blue route line
      const routeSource = map.getSource('route-source') as any;
      if (routeSource && routeSource.setData) {
        routeSource.setData(
          routeGeoJSON
            ? { type: 'FeatureCollection', features: [routeGeoJSON] }
            : { type: 'FeatureCollection', features: [] }
        );
      }

      // Show preview route layers, hide nav split layers
      ['route-casing', 'route-line'].forEach((id) => {
        if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'visible');
      });
      ['route-done-line', 'route-ahead-casing', 'route-ahead-line'].forEach((id) => {
        if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none');
      });

      // Use GeoJSON user dot for preview, hide the nav marker
      const userSrc = map.getSource('user-location-source') as any;
      if (userSrc && userSrc.setData) {
        userSrc.setData(
          userLocation
            ? {
                type: 'FeatureCollection',
                features: [
                  {
                    type: 'Feature',
                    properties: {},
                    geometry: { type: 'Point', coordinates: userLocation }
                  }
                ]
              }
            : { type: 'FeatureCollection', features: [] }
        );
      }
      const userMarker = userLocationMarkerRef.current;
      if (userMarker) {
        const el = userMarker.getElement();
        if (el) el.style.visibility = 'hidden';
      }

      // Fit both the user and the project into view once a route exists
      const coords = routeGeoJSON?.geometry?.coordinates;
      if (coords && coords.length >= 2) {
        let minLon = coords[0][0];
        let minLat = coords[0][1];
        let maxLon = coords[0][0];
        let maxLat = coords[0][1];
        for (const [lon, lat] of coords) {
          if (lon < minLon) minLon = lon;
          if (lat < minLat) minLat = lat;
          if (lon > maxLon) maxLon = lon;
          if (lat > maxLat) maxLat = lat;
        }
        map.fitBounds(
          [[minLon, minLat], [maxLon, maxLat]],
          { padding: 80, duration: 1200 }
        );
      }
    }
  }, [routeGeoJSON, routeSplit, userLocation, heading, isNavigating, isLoaded]);

  // Heading-up follow mode during navigation
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded || !isNavigating) return;

    if (!userLocation) return;

    if (followMode) {
      const userMarker = userLocationMarkerRef.current;
      if (userMarker) {
        userMarker.setLngLat(userLocation);
        const arrow = document.getElementById('user-heading-arrow');
        if (arrow && heading != null) {
          arrow.style.transform = `rotate(${heading}deg)`;
          arrow.style.opacity = '1';
        }
      }

      map.easeTo({
        center: userLocation,
        zoom: 17,
        bearing: heading ?? 0,
        duration: 300,
        essential: true
      });
    }
  }, [userLocation, heading, followMode, isNavigating, isLoaded]);

  // Auto-enable follow mode when navigation starts
  useEffect(() => {
    if (isNavigating && !followMode) {
      setFollowMode(true);
    }
  }, [isNavigating, followMode]);

  // Day/night auto theme
  useEffect(() => {
    if (!isLoaded) return;
    const map = mapRef.current;
    if (!map) return;

    const checkTheme = () => {
      const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const night = isNightMode(dark);
      const paint = night ? NIGHT_RASTER : DAY_RASTER;
      const layer = map.getLayer('base-raster-layer');
      if (layer) {
        Object.entries(paint).forEach(([k, v]) => {
          map.setPaintProperty('base-raster-layer', k, v);
        });
      }
    };

    checkTheme();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', checkTheme);
    return () => mq.removeEventListener('change', checkTheme);
  }, [isLoaded]);

  // Calibration overlay and layer visibility updates
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded || !calibrationParams) return;

    // Update overlay coordinates
    const source = map.getSource('reference-image-source') as any;
    if (source && source.setCoordinates) {
      source.setCoordinates(getOverlayCoordinates(calibrationParams));
    }

    // Update opacity
    if (map.getLayer('reference-image-layer')) {
      const targetOpacity = calibrationParams.enabled && calibrationParams.showReference ? calibrationParams.opacity : 0;
      map.setPaintProperty('reference-image-layer', 'raster-opacity', targetOpacity);
    }

    // Update layer visibilities
    if (map.getLayer('project-boundary-stroke')) {
      map.setLayoutProperty('project-boundary-stroke', 'visibility', calibrationParams.showBoundary ? 'visible' : 'none');
      map.setLayoutProperty('project-boundary-glow', 'visibility', calibrationParams.showBoundary ? 'visible' : 'none');
    }
    if (map.getLayer('roads-fill')) {
      map.setLayoutProperty('roads-fill', 'visibility', calibrationParams.showRoads ? 'visible' : 'none');
      map.setLayoutProperty('roads-stroke', 'visibility', calibrationParams.showRoads ? 'visible' : 'none');
    }
    if (map.getLayer('plots-fill')) {
      map.setLayoutProperty('plots-fill', 'visibility', calibrationParams.showGeoJson ? 'visible' : 'none');
      map.setLayoutProperty('plots-stroke', 'visibility', calibrationParams.showGeoJson ? 'visible' : 'none');
    }
  }, [calibrationParams, isLoaded, getOverlayCoordinates]);

  // Dynamic filter application in MapLibre
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded || !filters) return;

    const filterConditions: any[] = ['all'];

    if (filters.types.length > 0) {
      filterConditions.push(['in', ['get', 'type'], ['literal', filters.types]]);
    }

    if (filters.statuses.length > 0) {
      filterConditions.push(['in', ['get', 'status'], ['literal', filters.statuses]]);
    }

    if (filters.facing.length > 0) {
      filterConditions.push(['in', ['get', 'facing'], ['literal', filters.facing]]);
    }

    const appliedFilter = filterConditions.length > 1 ? filterConditions : null;

    if (map.getLayer('plots-fill')) {
      map.setFilter('plots-fill', appliedFilter as any);
    }
    if (map.getLayer('plots-stroke')) {
      map.setFilter('plots-stroke', appliedFilter as any);
    }
    if (map.getLayer('plot-labels-layer')) {
      map.setFilter('plot-labels-layer', appliedFilter as any);
    }
  }, [filters, isLoaded]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full bg-slate-950" />

      {/* Re-center button — appears during navigation when not in follow mode */}
      {isNavigating && !followMode && (
        <button
          onClick={() => setFollowMode(true)}
          className="absolute bottom-20 right-4 z-30 w-10 h-10 rounded-full bg-slate-900/90 border border-slate-700/60 shadow-xl flex items-center justify-center text-slate-300 hover:bg-slate-800 hover:text-white transition-all duration-200"
          title="Follow my location"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="12"
              cy="12"
              r="7"
              strokeWidth="2"
              strokeOpacity="0.6"
            />
            <circle
              cx="12"
              cy="12"
              r="3"
              fill="currentColor"
              fillOpacity="0.9"
            />
          </svg>
        </button>
      )}
    </div>
  );
};
