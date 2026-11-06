import React from 'react';
import { Layers, Globe, Maximize2, RotateCcw, Map as MapIcon } from 'lucide-react';
import { STATUS_COLORS } from '@/config/map-config';
import { PropertyData } from '@/types/property';

interface LegendProps {
  properties: PropertyData[];
  baseLayer: 'esri' | 'osm' | 'cartoDark';
  onToggleBaseLayer: (layer: 'esri' | 'osm' | 'cartoDark') => void;
  onResetView: () => void;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
}

export const Legend: React.FC<LegendProps> = ({
  properties,
  baseLayer,
  onToggleBaseLayer,
  onResetView,
  onToggleFullscreen,
  isFullscreen
}) => {
  // Legend rows mirror the exact statuses the map renders (5 colors)
  const legendItems = [
    { key: 'available', label: 'Available' },
    { key: 'reserved', label: 'Reserved' },
    { key: 'hold', label: 'Hold' },
    { key: 'sold', label: 'Sold' },
    { key: 'blocked', label: 'Blocked' }
  ] as const;

  const counts: Record<(typeof legendItems)[number]['key'], number> = {
    available: properties.filter(p => p.status === 'available').length,
    reserved: properties.filter(p => p.status === 'reserved').length,
    hold: properties.filter(p => p.status === 'hold').length,
    sold: properties.filter(p => p.status === 'sold').length,
    blocked: properties.filter(p => p.status === 'blocked').length
  };

  return (
    <div className="absolute bottom-4 left-4 z-30 pointer-events-auto flex flex-col gap-2">
      {/* Map Control Buttons [Satellite] [Map] [Reset] [Fullscreen] */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 shadow-2xl">
        <button
          onClick={() => onToggleBaseLayer('esri')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            baseLayer === 'esri'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="Switch to High-Resolution Satellite View"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Satellite</span>
        </button>

        <button
          onClick={() => onToggleBaseLayer('osm')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            baseLayer === 'osm'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="Switch to Standard Street Map"
        >
          <MapIcon className="w-3.5 h-3.5" />
          <span>Map</span>
        </button>

        <button
          onClick={() => onToggleBaseLayer('cartoDark')}
          className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            baseLayer === 'cartoDark'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="Switch to Dark Vector Map"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Dark</span>
        </button>

        <div className="w-px h-5 bg-slate-700/80 my-auto mx-0.5" />

        <button
          onClick={onResetView}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          title="Reset & Fit Layout to Screen"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reset</span>
        </button>

        <button
          onClick={onToggleFullscreen}
          className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Map'}
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Plot Status Color Legend */}
      <div className="p-3 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 shadow-2xl text-xs">
        <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-2 flex items-center justify-between">
          <span>Plot Availability</span>
          <span className="text-slate-300 font-mono font-normal">Total: {properties.length}</span>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-2 sm:gap-x-4 sm:gap-y-2">
          {legendItems.map(({ key, label }) => {
            const color = STATUS_COLORS[key];
            return (
              <div key={key} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: color.fill, boxShadow: `0 0 0 2px ${color.fill}33` }}
                />
                <span className="text-slate-200 font-medium">{label}</span>
                <span className={`text-[10px] font-bold border px-1.5 py-0.5 rounded ${color.bgBadge}`}>
                  {counts[key]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
