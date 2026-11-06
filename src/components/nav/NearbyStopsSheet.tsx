import React from 'react';
import {
  X,
  MapPin,
  Fuel,
  Banknote,
  Utensils,
  ParkingCircle,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { NEARBY_CATEGORY_META, type NearbyStop, type NearbyCategory } from '@/lib/nearby';
import type { NearbyStatus } from '@/hooks/useNearbyStops';
import { formatDistance } from '@/lib/navigation';

const CATEGORY_ICONS: Record<NearbyCategory, React.ReactNode> = {
  fuel: <Fuel className="w-4 h-4" />,
  atm: <Banknote className="w-4 h-4" />,
  food: <Utensils className="w-4 h-4" />,
  parking: <ParkingCircle className="w-4 h-4" />
};

interface NearbyStopsSheetProps {
  visible: boolean;
  stops: NearbyStop[];
  status: NearbyStatus;
  error: string | null;
  selectedCategories: NearbyCategory[];
  onToggleCategory: (cat: NearbyCategory) => void;
  onAddStop: (stop: NearbyStop) => void;
  onClose: () => void;
  onReload: () => void;
}

export const NearbyStopsSheet: React.FC<NearbyStopsSheetProps> = ({
  visible,
  stops,
  status,
  error,
  selectedCategories,
  onToggleCategory,
  onAddStop,
  onClose,
  onReload
}) => {
  if (!visible) return null;

  const isLoading = status === 'loading';
  const hasStops = stops.length > 0;
  const showError = status === 'error' && error;

  return (
    <div
      aria-label="Nearby Stops"
      className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-lg bg-slate-900/95 backdrop-blur-xl border-t border-slate-700/80 shadow-2xl rounded-t-2xl animate-in slide-in-from-bottom duration-300"
      style={{ maxWidth: 'calc(100vw - 1rem)' }}
    >
      {/* Drag handle */}
      <div className="flex justify-center pt-2 pb-1">
        <div className="w-8 h-1 rounded-full bg-slate-600" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <MapPin className="w-4 h-4 text-emerald-400" />
          <span>Nearby Facilities</span>
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Category Chips */}
      <div className="flex items-center gap-1.5 px-4 py-2.5 overflow-x-auto">
        {(Object.keys(NEARBY_CATEGORY_META) as NearbyCategory[]).map((cat) => {
          const active = selectedCategories.includes(cat);
          const meta = NEARBY_CATEGORY_META[cat];
          return (
            <button
              key={cat}
              onClick={() => onToggleCategory(cat)}
              className={`flex items-center gap-1 shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                active
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
              title={`Filter: ${meta.label}`}
            >
              {CATEGORY_ICONS[cat]}
              <span>{meta.label}</span>
            </button>
          );
        })}

        <button
          onClick={onReload}
          disabled={isLoading}
          className="ml-auto shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-50 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Content */}
      <div className="max-h-64 overflow-y-auto px-2 pb-3">
        {showError ? (
          <div className="px-4 py-3 text-center text-xs text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded-xl m-2">
            {error}
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-8 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            <span className="text-xs">Dhoondh rahe hain…</span>
          </div>
        ) : hasStops ? (
          <div className="space-y-1.5">
            {stops.map((stop) => (
              <div
                key={stop.id}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/60 hover:border-slate-600 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-blue-400 shrink-0">
                  {CATEGORY_ICONS[stop.category]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{stop.name}</div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <span>{NEARBY_CATEGORY_META[stop.category].label}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-600" />
                    <span>{formatDistance(stop.distance)}</span>
                  </div>
                </div>
                <button
                  onClick={() => onAddStop(stop)}
                  className="shrink-0 px-2.5 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 font-semibold text-xs transition-colors"
                  title={`Add ${stop.name} as a stop`}
                >
                  + Add
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-6 text-center text-xs text-slate-500">
            Koi facility nahi mili. Kuchh pasmane walaaghah chunein ya refresh karein.
          </div>
        )}
      </div>
    </div>
  );
};
