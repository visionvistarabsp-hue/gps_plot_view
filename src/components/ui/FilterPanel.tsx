import React from 'react';
import { X, RotateCcw, Check, Filter } from 'lucide-react';
import { FilterOptions, PropertyType, PlotStatus } from '@/types/property';
import { STATUS_COLORS } from '@/config/map-config';

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
  onResetFilters: () => void;
  totalCount: number;
  filteredCount: number;
}

const PROPERTY_TYPES: { id: PropertyType; label: string; countLabel: string }[] = [
  { id: 'residential', label: 'Residential Plots', countLabel: '1-59' },
  { id: 'lig', label: 'LIG Plots', countLabel: 'LIG 1-4' },
  { id: 'ews', label: 'EWS Plots', countLabel: 'EWS 1-6' }
];

const STATUSES: { id: PlotStatus; label: string }[] = [
  { id: 'available', label: 'Available' },
  { id: 'reserved', label: 'Reserved' },
  { id: 'hold', label: 'Hold' },
  { id: 'sold', label: 'Sold' },
  { id: 'blocked', label: 'Blocked' }
];

const FACING_OPTIONS = ['North', 'South', 'East', 'West'];

export const FilterPanel: React.FC<FilterPanelProps> = ({
  isOpen,
  onClose,
  filters,
  onFilterChange,
  onResetFilters,
  totalCount,
  filteredCount
}) => {
  if (!isOpen) return null;

  const toggleType = (type: PropertyType) => {
    const exists = filters.types.includes(type);
    const updated = exists
      ? filters.types.filter(t => t !== type)
      : [...filters.types, type];
    onFilterChange({ ...filters, types: updated });
  };

  const toggleStatus = (status: PlotStatus) => {
    const exists = filters.statuses.includes(status);
    const updated = exists
      ? filters.statuses.filter(s => s !== status)
      : [...filters.statuses, status];
    onFilterChange({ ...filters, statuses: updated });
  };

  const toggleFacing = (direction: string) => {
    const exists = filters.facing.includes(direction);
    const updated = exists
      ? filters.facing.filter(f => f !== direction)
      : [...filters.facing, direction];
    onFilterChange({ ...filters, facing: updated });
  };

  return (
    <aside className="fixed sm:absolute top-0 right-0 sm:top-20 sm:right-4 w-full sm:w-80 h-full sm:h-auto max-h-[90vh] bg-slate-900/95 backdrop-blur-xl border-l sm:border border-slate-700/80 sm:rounded-2xl shadow-2xl z-40 p-5 flex flex-col overflow-y-auto transition-all animate-in slide-in-from-right-5 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#B8DD5A]" />
          <h2 className="text-sm font-bold text-white tracking-wide">Filter Inventory</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onResetFilters}
            className="text-xs text-slate-400 hover:text-[#B8DD5A] flex items-center gap-1 transition-colors"
            title="Reset Filters"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Results badge */}
      <div className="py-3 px-3 my-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs">
        <span className="text-slate-400">Showing Properties</span>
        <span className="font-bold text-[#B8DD5A]-400 bg-[#B8DD5A]-500/10 px-2 py-0.5 rounded-md border border-[#B8DD5A]-500/20">
          {filteredCount} of {totalCount}
        </span>
      </div>

      <div className="space-y-5 flex-1">
        {/* Property Type Section */}
        <div>
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
            Property Category
          </label>
          <div className="space-y-1.5">
            {PROPERTY_TYPES.map(type => {
              const checked = filters.types.length === 0 || filters.types.includes(type.id);
              return (
                <button
                  key={type.id}
                  onClick={() => toggleType(type.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                    checked
                      ? 'bg-[#B8DD5A]-500/15 border-[#B8DD5A]-500/50 text-[#B8DD5A]-200'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                      checked ? 'bg-[#B8DD5A]-500 border-[#B8DD5A]-400 text-slate-950' : 'border-slate-600'
                    }`}>
                      {checked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span>{type.label}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">{type.countLabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Availability Status Section */}
        <div>
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
            Status Availability
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {STATUSES.map(st => {
              const statusConf = STATUS_COLORS[st.id];
              const isSelected = filters.statuses.length === 0 || filters.statuses.includes(st.id);
              return (
                <button
                  key={st.id}
                  onClick={() => toggleStatus(st.id)}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-medium border transition-all ${
                    isSelected
                      ? 'bg-slate-800 border-slate-600 text-white'
                      : 'bg-slate-950/30 border-slate-800/80 text-slate-500 opacity-60'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: statusConf.fill }}
                  />
                  <span>{st.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Facing Direction */}
        <div>
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
            Facing Direction
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {FACING_OPTIONS.map(dir => {
              const isSelected = filters.facing.length === 0 || filters.facing.includes(dir);
              return (
                <button
                  key={dir}
                  onClick={() => toggleFacing(dir)}
                  className={`py-1.5 px-2 rounded-xl text-center text-xs font-semibold border transition-all ${
                    isSelected
                      ? 'bg-[#B8DD5A]-500/20 text-[#B8DD5A]-300 border-[#B8DD5A]-500/40'
                      : 'bg-slate-950/40 border-slate-800 text-slate-500'
                  }`}
                >
                  {dir}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-4 mt-4 border-t border-slate-800">
        <button
          onClick={onClose}
          className="w-full py-2.5 bg-gradient-to-r from-[#B8DD5A]-500 to-teal-500 text-slate-950 font-bold rounded-xl text-xs shadow-lg hover:from-[#B8DD5A]-400 hover:to-teal-400 transition-all"
        >
          Apply Filters ({filteredCount} plots)
        </button>
      </div>
    </aside>
  );
};
