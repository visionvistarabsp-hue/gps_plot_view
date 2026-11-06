import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { Header } from '@/components/ui/Header';
import { SearchBox } from '@/components/ui/SearchBox';
import { FilterPanel } from '@/components/ui/FilterPanel';
import { PlotDetails } from '@/components/ui/PlotDetails';
import { Legend } from '@/components/ui/Legend';
import { BookVisitModal } from '@/components/ui/BookVisitModal';
import { NearbyStopsSheet } from '@/components/nav/NearbyStopsSheet';
import { type NearbyStop } from '@/lib/nearby';
import { PropertyData, FilterOptions } from '@/types/property';
import { INITIAL_PROPERTIES } from '@/lib/property-store';
import { useNavigation } from '@/hooks/useNavigation';
import { useNearbyStops } from '@/hooks/useNearbyStops';
import { NavigationPanel } from '@/components/nav/NavigationPanel';
import { PROJECT_CONFIG } from '@/config/project-config';
import { MAP_CONFIG } from '@/config/map-config';

// Dynamically import PropertyMap with SSR disabled (MapLibre requires window/DOM)
const PropertyMap = dynamic(
  () => import('@/components/map/PropertyMap').then(mod => mod.PropertyMap),
  { ssr: false, loading: () => <div className="w-full h-full bg-slate-950 flex items-center justify-center text-slate-400 text-sm">Loading Real-Estate Map Engine...</div> }
);

export default function HomePage() {
  const router = useRouter();
  const [properties, setProperties] = useState<PropertyData[]>(INITIAL_PROPERTIES);
  const [selectedProperty, setSelectedProperty] = useState<PropertyData | null>(null);
  const [baseLayer, setBaseLayer] = useState<'esri' | 'osm' | 'cartoDark'>('esri');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fitBoundsTrigger, setFitBoundsTrigger] = useState(0);

  // Turn-by-turn navigation to the project (geolocation + OSRM routing)
  const {
    status,
    userLocation,
    routeGeoJSON,
    error,
    statusMessage,
    isNavigating,
    heading,
    routeSplit,
    upcomingStep,
    distanceToNextTurn,
    distanceRemaining,
    durationRemaining,
    muted,
    offline,
    cacheAgeMinutes,
    start: startNavigation,
    stop: stopNavigation,
    toggleMute,
    replayInstruction,
    addStop
  } = useNavigation();

  // Nearby POI stops (lazy — only fetched when the sheet opens)
  const {
    stops: nearbyStops,
    status: nearbyStatus,
    selectedCategories,
    load: loadNearby,
    toggleCategory: toggleCategory,
    clear: clearNearby
  } = useNearbyStops(userLocation);
  const [showNearbySheet, setShowNearbySheet] = useState(false);
  const [showRouteError, setShowRouteError] = useState(false);

  // Filters State
  const [filters, setFilters] = useState<FilterOptions>({
    searchQuery: '',
    types: [],
    statuses: [],
    minPrice: 0,
    maxPrice: 20000000,
    minArea: 0,
    maxArea: 5000,
    facing: []
  });

  // Fetch updated property data from API
  const refreshProperties = useCallback(async () => {
    try {
      const res = await fetch('/api/properties');
      if (res.ok) {
        const json = await res.json();
        if (json.data && json.data.length > 0) {
          setProperties(json.data);
        }
      }
    } catch (e) {
      console.warn('Using cached property dataset:', e);
    }
  }, []);

  useEffect(() => {
    refreshProperties();
  }, [refreshProperties]);

  // Handle URL query parameter e.g. `?plot=42` or `?plot=LIG-2`
  useEffect(() => {
    if (router.query.plot && properties.length > 0) {
      const queryPlot = String(router.query.plot).toLowerCase();
      const match = properties.find(
        p => p.plotNumber.toLowerCase() === queryPlot || p.id.toLowerCase() === `plot-${queryPlot}`
      );
      if (match) {
        setSelectedProperty(match);
      }
    }
  }, [router.query.plot, properties]);

  // React to the geo-route status: show an inline message on failure and
  // re-center the map on the project so the user is never left stranded.
  useEffect(() => {
    if (status === 'error') {
      setShowRouteError(true);
      setFitBoundsTrigger(prev => prev + 1);
      clearNearby();
    } else if (status === 'locating' || status === 'routing') {
      setShowRouteError(false);
    }
  }, [status]);

  // Share route via Web Share API or copy-to-clipboard fallback
  const handleShareRoute = useCallback(() => {
    if (!userLocation) return;

    const [userLon, userLat] = userLocation;
    const [destLon, destLat] = MAP_CONFIG.initialCenter;

    // Google Maps deep-link as a fallback / additional option
    const gmapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLon}&destination=${destLat},${destLon}&travelmode=driving`;
    const appUrl = window.location.origin + window.location.pathname;

    const text = `Main ${PROJECT_CONFIG.name} (${PROJECT_CONFIG.location}) ki taraf ja raha hoon.\n\nIn-app route: ${appUrl}\nGoogle Maps: ${gmapsUrl}`;

    if (navigator.share) {
      navigator.share({
        title: `${PROJECT_CONFIG.name} — Reach the Project`,
        text,
        url: gmapsUrl
      }).catch(() => {
        navigator.clipboard.writeText(text).catch(() => {});
      });
    } else {
      navigator.clipboard.writeText(gmapsUrl).catch(() => {});
    }
  }, [userLocation]);

  // Open the nearby sheet and trigger the POI fetch
  const handleShowNearby = useCallback(() => {
    setShowNearbySheet(true);
    if (userLocation) loadNearby();
  }, [userLocation, loadNearby]);

  const handleAddStopFromNearby = useCallback((stop: NearbyStop) => {
    addStop(stop);
    setShowNearbySheet(false);
  }, [addStop]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.types.length > 0) count += filters.types.length;
    if (filters.statuses.length > 0) count += filters.statuses.length;
    if (filters.facing.length > 0) count += filters.facing.length;
    return count;
  }, [filters]);

  // Filtered properties list
  const filteredProperties = useMemo(() => {
    return properties.filter(p => {
      if (filters.types.length > 0 && !filters.types.includes(p.type)) return false;
      if (filters.statuses.length > 0 && !filters.statuses.includes(p.status)) return false;
      if (filters.facing.length > 0 && (!p.facing || !filters.facing.includes(p.facing))) return false;
      return true;
    });
  }, [properties, filters]);

  // Handlers
  const handleResetView = () => {
    setFitBoundsTrigger(prev => prev + 1);
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleResetFilters = () => {
    setFilters({
      searchQuery: '',
      types: [],
      statuses: [],
      minPrice: 0,
      maxPrice: 20000000,
      minArea: 0,
      maxArea: 5000,
      facing: []
    });
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans">
       {/* Top Header Bar */}
      <Header
        onToggleFilters={() => setIsFilterOpen(!isFilterOpen)}
        isFilterOpen={isFilterOpen}
        activeFilterCount={activeFilterCount}
        onResetView={handleResetView}
        onBookVisit={() => setIsBookModalOpen(true)}
        onGoToProject={startNavigation}
        isLocating={status === 'locating' || status === 'routing'}
        isNavigating={isNavigating}
        onShowNearby={handleShowNearby}
        onShareRoute={handleShareRoute}
        userLocation={userLocation as [number, number] | null}
      />

      {/* Floating Search Bar (Top Right) */}
      <div className="absolute top-20 right-4 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 z-20 w-auto">
        <SearchBox
          properties={properties}
          onSelectProperty={setSelectedProperty}
          selectedProperty={selectedProperty}
        />
      </div>

      {/* Geo-route error notice (location denied / routing failed) */}
      {showRouteError && error && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-[92vw] sm:max-w-md">
          <div className="flex items-start gap-3 rounded-xl border border-amber-300/40 bg-slate-900/90 px-4 py-3 text-sm text-amber-100 shadow-xl backdrop-blur-md">
            <span className="mt-0.5 shrink-0" aria-hidden="true">⚠️</span>
            <p className="flex-1 leading-snug">{error}</p>
            <button
              type="button"
              onClick={() => {
                setShowRouteError(false);
                stopNavigation();
              }}
              className="shrink-0 rounded-md px-1.5 text-amber-200/70 transition hover:bg-white/10 hover:text-amber-100"
              aria-label="Dismiss message"
            >
              ×
            </button>
          </div>
        </div>
      )}

       {/* MapLibre GL Interactive Canvas */}
      <div className="w-full h-full">
        <PropertyMap
          properties={properties}
          selectedProperty={selectedProperty}
          onSelectProperty={setSelectedProperty}
          baseLayer={baseLayer}
          filters={filters}
          fitBoundsTrigger={fitBoundsTrigger}
          userLocation={userLocation as [number, number] | null}
          routeGeoJSON={routeGeoJSON}
          heading={heading}
          isNavigating={isNavigating}
          routeSplit={routeSplit}
        />
      </div>

      {/* Turn-by-turn Navigation Overlay */}
      <NavigationPanel
        visible={
          status === 'locating' ||
          status === 'routing' ||
          status === 'navigating' ||
          status === 'arrived'
        }
        status={status}
        statusMessage={statusMessage}
        upcomingStep={upcomingStep}
        distanceToNextTurn={distanceToNextTurn}
        distanceRemaining={distanceRemaining}
        durationRemaining={durationRemaining}
        muted={muted}
        offline={offline}
        cacheAgeMinutes={cacheAgeMinutes}
        onToggleMute={toggleMute}
        onEnd={stopNavigation}
        onReplay={replayInstruction}
      />

      {/* Nearby Stops Bottom Sheet (journey extras) */}
      <NearbyStopsSheet
        visible={showNearbySheet && isNavigating}
        stops={nearbyStops}
        status={nearbyStatus}
        error={null}
        selectedCategories={selectedCategories}
        onToggleCategory={toggleCategory}
        onAddStop={handleAddStopFromNearby}
        onClose={() => setShowNearbySheet(false)}
        onReload={loadNearby}
      />

      {/* Left Bottom Legend & Map Mode Toggles */}
      <Legend
        properties={filteredProperties}
        baseLayer={baseLayer}
        onToggleBaseLayer={setBaseLayer}
        onResetView={handleResetView}
        onToggleFullscreen={handleToggleFullscreen}
        isFullscreen={isFullscreen}
      />

      {/* Right Floating Property Details Panel / Bottom Sheet */}
      <PlotDetails
        property={selectedProperty}
        onClose={() => setSelectedProperty(null)}
        onBookVisit={prop => {
          setSelectedProperty(prop);
          setIsBookModalOpen(true);
        }}
        onContactSales={prop => {
          setSelectedProperty(prop);
          setIsBookModalOpen(true);
        }}
      />

      {/* Filter Sidebar / Modal */}
      <FilterPanel
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        onFilterChange={setFilters}
        onResetFilters={handleResetFilters}
        totalCount={properties.length}
        filteredCount={filteredProperties.length}
      />

      {/* VIP Site Visit Booking Modal */}
      <BookVisitModal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        property={selectedProperty}
      />
    </main>
  );
}
