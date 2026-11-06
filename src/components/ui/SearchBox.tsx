import React, { useState, useEffect, useRef } from 'react';
import { Search, X, MapPin, Sparkles } from 'lucide-react';
import { PropertyData } from '@/types/property';
import { STATUS_COLORS } from '@/config/map-config';

interface SearchBoxProps {
  properties: PropertyData[];
  onSelectProperty: (property: PropertyData) => void;
  selectedProperty: PropertyData | null;
}

export const SearchBox: React.FC<SearchBoxProps> = ({
  properties,
  onSelectProperty,
  selectedProperty
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter matching properties based on query: handles "42", "Plot 42", "plot-42", "LIG-2", "EWS-4", etc.
  const filtered = query.trim()
    ? properties.filter(p => {
        const q = query.toLowerCase().trim();
        const num = p.plotNumber.toLowerCase();
        const id = p.id.toLowerCase();
        const status = p.status.toLowerCase();
        const type = p.type.toLowerCase();

        return (
          num === q ||
          `plot ${num}` === q ||
          `plot-${num}` === q ||
          num.includes(q) ||
          id.includes(q) ||
          status.includes(q) ||
          type.includes(q)
        );
      })
    : [];

  const handleSelect = (property: PropertyData) => {
    onSelectProperty(property);
    setQuery(`Plot ${property.plotNumber}`);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (filtered.length > 0) {
        handleSelect(filtered[0]);
      } else {
        // Direct exact lookup
        const exactMatch = properties.find(p => {
          const cleaned = query.replace(/^plot\s*/i, '').trim();
          return p.plotNumber.toLowerCase() === cleaned.toLowerCase();
        });
        if (exactMatch) {
          handleSelect(exactMatch);
        }
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <div className="relative flex items-center">
        <div className="absolute left-3.5 text-slate-400 pointer-events-none">
          <Search className="w-4 h-4 text-emerald-400" />
        </div>
        <input
          type="text"
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search (e.g. 42, Plot 59, LIG-2, EWS-4)..."
          className="w-full pl-10 pr-9 py-2.5 bg-slate-900/90 hover:bg-slate-900 text-slate-100 placeholder-slate-400 text-xs sm:text-sm font-medium rounded-xl border border-slate-700/70 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-xl backdrop-blur-md transition-all"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
            className="absolute right-3 text-slate-400 hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && query.trim().length > 0 && (
        <div className="absolute top-full mt-2 left-0 right-0 max-h-72 overflow-y-auto bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-xl shadow-2xl z-50 p-1.5 space-y-1">
          {filtered.length > 0 ? (
            filtered.slice(0, 8).map(property => {
              const statusConf = STATUS_COLORS[property.status] || STATUS_COLORS.available;
              return (
                <button
                  key={property.id}
                  onClick={() => handleSelect(property)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800/80 flex items-center justify-between transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-white group-hover:border-emerald-500/50">
                      {property.plotNumber}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                        {property.type === 'residential' ? `Plot ${property.plotNumber}` : property.plotNumber}
                        <span className="text-[10px] text-slate-400 capitalize">({property.type})</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {property.area} sq.ft • Facing {property.facing}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border ${statusConf.bgBadge}`}>
                      {statusConf.name}
                    </span>
                    {property.price && (
                      <span className="text-[11px] text-emerald-400 font-bold mt-0.5">
                        ₹{(property.price / 100000).toFixed(1)} L
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          ) : (
            <div className="px-4 py-3 text-center text-xs text-slate-400">
              No matching plot found for &ldquo;{query}&rdquo;
            </div>
          )}
        </div>
      )}
    </div>
  );
};
