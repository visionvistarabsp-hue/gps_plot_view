import React from 'react';
import Link from 'next/link';
import { Compass, SlidersHorizontal, ShieldCheck, MapPin, Layers, PhoneCall, Sparkles, Navigation, Loader2, Share2, Car } from 'lucide-react';
import { PROJECT_CONFIG } from '@/config/project-config';
import { MAP_CONFIG } from '@/config/map-config';

interface HeaderProps {
  onToggleFilters: () => void;
  isFilterOpen: boolean;
  activeFilterCount: number;
  onResetView: () => void;
  onBookVisit: () => void;
  onGoToProject: () => void;
  isLocating?: boolean;
  isNavigating?: boolean;
  onShowNearby?: () => void;
  onShareRoute?: () => void;
  userLocation?: [number, number] | null;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleFilters,
  isFilterOpen,
  activeFilterCount,
  onResetView,
  onBookVisit,
  onGoToProject,
  isLocating = false,
  isNavigating = false,
  onShowNearby,
  onShareRoute,
  userLocation = null
}) => {
  return (
    <header className="absolute top-4 left-4 right-4 z-30 pointer-events-none flex items-center justify-between gap-3">
      {/* Left Project Brand Card */}
      <div className="pointer-events-auto flex items-center gap-3 bg-slate-900/90 backdrop-blur-md border border-slate-700/60 py-2.5 px-4 rounded-2xl shadow-2xl transition-all duration-300 hover:border-emerald-500/50">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 p-0.5 shadow-md flex items-center justify-center">
          <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-emerald-400 font-black text-sm">
            DHG
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm md:text-base font-bold text-white tracking-tight flex items-center gap-1.5">
              {PROJECT_CONFIG.name}
              <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                <Sparkles className="w-2.5 h-2.5" /> 69 Plots
              </span>
            </h1>
          </div>
          <p className="text-[11px] text-slate-400 hidden sm:flex items-center gap-1">
            <MapPin className="w-3 h-3 text-emerald-400" />
            {PROJECT_CONFIG.location}
          </p>
        </div>
      </div>

      {/* Right Navigation & Quick Actions */}
      <div className="pointer-events-auto flex items-center gap-2">
        {/* Go To Project (Geolocate + Route) CTA */}
        <button
          onClick={onGoToProject}
          disabled={isLocating || isNavigating}
          className="flex items-center gap-1.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 disabled:opacity-70 disabled:cursor-wait text-white font-bold px-3.5 py-2.5 rounded-xl text-xs shadow-lg shadow-blue-500/25 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
          title="Locate me and route to the project"
        >
          {isLocating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Navigation className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">
            {isNavigating ? 'Navigating…' : isLocating ? 'Locating…' : 'Go to see the project'}
          </span>
        </button>

        {/* Nearby Stops (shown during navigation) */}
        {isNavigating && (
          <button
            onClick={onShowNearby}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            title="Find nearby fuel, ATM, food, parking"
          >
            <Compass className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Nearby</span>
          </button>
        )}

        {/* Share Route (shown during navigation) */}
        {isNavigating && userLocation && (
          <button
            onClick={onShareRoute}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            title="Share route to the project"
          >
            <Share2 className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Share</span>
          </button>
        )}

        {/* Navigation to Google Maps (shown during navigation) */}
        {isNavigating && userLocation && onShareRoute && (
          <button
            onClick={() => {
              const [userLon, userLat] = userLocation;
              const [destLon, destLat] = MAP_CONFIG.initialCenter;
              const url = `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLon}&destination=${destLat},${destLon}&travelmode=driving`;
              window.open(url, '_blank', 'noopener,noreferrer');
            }}
            className="hidden sm:flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            title="Open in Google Maps"
          >
            <Car className="w-4 h-4 text-blue-400" />
            <span>Google Maps</span>
          </button>
        )}

        {/* Filter Trigger Button */}
        <button
          onClick={onToggleFilters}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold backdrop-blur-md border transition-all duration-200 shadow-lg ${
            isFilterOpen || activeFilterCount > 0
              ? 'bg-emerald-600 text-white border-emerald-400 shadow-emerald-900/40'
              : 'bg-slate-900/85 text-slate-200 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
          }`}
          title="Filter Plots"
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden sm:inline">Filters</span>
          {activeFilterCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-white text-emerald-900 text-[11px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Schedule Site Visit CTA */}
        <button
          onClick={onBookVisit}
          className="hidden md:flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <PhoneCall className="w-3.5 h-3.5 text-slate-950" />
          <span>Book Site Visit</span>
        </button>

        {/* Calibration Dev Route */}
        <Link
          href="/calibration"
          className="hidden lg:flex items-center gap-1.5 bg-slate-900/85 hover:bg-slate-800 text-slate-300 border border-slate-700/60 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors shadow-lg"
          title="Calibration Mode (Development)"
        >
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>Calibration</span>
        </Link>

        {/* Admin Dashboard */}
        <Link
          href="/admin"
          className="flex items-center gap-1.5 bg-slate-900/85 hover:bg-slate-800 text-slate-300 border border-slate-700/60 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors shadow-lg"
          title="Admin Control Center"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="hidden sm:inline">Admin</span>
        </Link>
      </div>
    </header>
  );
};
