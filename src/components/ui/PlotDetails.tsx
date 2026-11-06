import React, { useState } from 'react';
import { X, MapPin, Compass, Maximize2, Tag, Calendar, PhoneCall, Share2, CheckCircle, Info, Box, FileText, ChevronRight } from 'lucide-react';
import { PropertyData } from '@/types/property';
import { STATUS_COLORS } from '@/config/map-config';
import { PROJECT_CONFIG } from '@/config/project-config';

interface PlotDetailsProps {
  property: PropertyData | null;
  onClose: () => void;
  onBookVisit: (property: PropertyData) => void;
  onContactSales: (property: PropertyData) => void;
}

export const PlotDetails: React.FC<PlotDetailsProps> = ({
  property,
  onClose,
  onBookVisit,
  onContactSales
}) => {
  const [showSpecsModal, setShowSpecsModal] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!property) return null;

  const statusConf = STATUS_COLORS[property.status] || STATUS_COLORS.available;
  const isResidential = property.type === 'residential';
  const displayTitle = isResidential ? `Plot ${property.plotNumber}` : property.plotNumber;

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}?plot=${property.plotNumber}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatPrice = (val: number | null) => {
    if (!val) return 'Price on Request';
    if (val >= 10000000) {
      return `₹${(val / 10000000).toFixed(2)} Cr`;
    }
    return `₹${(val / 100000).toFixed(2)} Lakh`;
  };

  return (
    <>
      <section
        aria-label={`Property Details for ${displayTitle}`}
        className="fixed bottom-0 left-0 right-0 sm:bottom-auto sm:top-20 sm:right-4 sm:left-auto w-full sm:w-96 bg-slate-900/95 backdrop-blur-2xl border-t sm:border border-slate-700/80 sm:rounded-2xl shadow-2xl z-30 p-5 max-h-[85vh] sm:max-h-[80vh] overflow-y-auto transition-all animate-in slide-in-from-bottom sm:slide-in-from-right-4 duration-300"
      >
        {/* Top bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full animate-pulse"
              style={{ backgroundColor: statusConf.fill }}
            />
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${statusConf.bgBadge}`}>
              {statusConf.name}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleShare}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              title="Share Plot Link"
            >
              {copied ? <CheckCircle className="w-4 h-4 text-[#B8DD5A]" /> : <Share2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close Panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Hero Plot Title & Category */}
        <div className="mt-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl font-black text-white tracking-tight">
              {displayTitle}
            </h2>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-emerald-400 capitalize">
              {property.type} Plot
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-emerald-400" />
            {PROJECT_CONFIG.name}, {PROJECT_CONFIG.location}
          </p>
        </div>

        {/* Price Box */}
        <div className="mt-4 p-3.5 rounded-xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/20 shadow-inner">
          <div className="text-[11px] text-emerald-400/80 font-medium">Estimated Investment</div>
          <div className="text-2xl font-black text-white tracking-tight">
            {formatPrice(property.price)}
          </div>
          {property.price && property.area && (
            <div className="text-[11px] text-slate-400 mt-0.5">
              ₹{Math.round(property.price / property.area).toLocaleString('en-IN')}/sq.ft base rate
            </div>
          )}
        </div>

        {/* Property Specs Grid */}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Plot Area</span>
            </div>
            <div className="text-sm font-bold text-white mt-1">
              {property.area ? `${property.area} sq.ft` : '--'}
            </div>
            {property.area && (
              <div className="text-[10px] text-slate-500">
                {(property.area / 9).toFixed(1)} sq. yards
              </div>
            )}
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              <span>Facing</span>
            </div>
            <div className="text-sm font-bold text-white mt-1">
              {property.facing || 'East'}
            </div>
            <div className="text-[10px] text-slate-500">Vastu Compliant</div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Tag className="w-3.5 h-3.5 text-purple-400" />
              <span>Road Width</span>
            </div>
            <div className="text-sm font-bold text-white mt-1">
              {property.roadWidth ? `${property.roadWidth} ft` : "30' Wide Road"}
            </div>
            <div className="text-[10px] text-slate-500">Paved Asphalt</div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Info className="w-3.5 h-3.5 text-emerald-400" />
              <span>Dimensions</span>
            </div>
            <div className="text-sm font-bold text-white mt-1">
              {property.dimensions || 'Standard'}
            </div>
            <div className="text-[10px] text-slate-500">Regular Boundary</div>
          </div>
        </div>

        {/* Future 3D Architecture Model Connection Badge */}
        {property.model_object_id && (
          <div className="mt-3.5 p-2 rounded-xl bg-slate-950/40 border border-slate-800 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2 text-slate-400">
              <Box className="w-3.5 h-3.5 text-indigo-400" />
              <span>3D Model Key:</span>
              <code className="text-indigo-300 font-mono text-[10px] bg-indigo-950/50 px-1.5 py-0.5 rounded border border-indigo-800/50">
                {property.model_object_id}
              </code>
            </div>
            <span className="text-[10px] text-emerald-400 font-medium">Ready</span>
          </div>
        )}

        {/* Description / Highlights */}
        <div className="mt-3 text-xs text-slate-400 leading-relaxed bg-slate-950/30 p-2.5 rounded-xl border border-slate-800/50">
          {property.description || 'Prime plotted parcel with direct road connectivity, uninterrupted electricity, water supply lines, and scenic park proximity.'}
        </div>

        {/* Action Buttons as requested */}
        <div className="mt-4 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setShowSpecsModal(true)}
              className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>View Details</span>
            </button>
            <button
              onClick={() => onContactSales(property)}
              className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
              <span>Contact Sales</span>
            </button>
          </div>

          <button
            onClick={() => onBookVisit(property)}
            className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.01] active:scale-[0.99]"
          >
            <Calendar className="w-4 h-4" />
            <span>Book Site Visit for {displayTitle}</span>
          </button>
        </div>
      </section>

      {/* Extended Specification Modal */}
      {showSpecsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>{displayTitle} Detailed Specifications</span>
              </h3>
              <button
                onClick={() => setShowSpecsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block">RERA Status</span>
                  <span className="font-semibold text-emerald-400">Sanctioned & Approved</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block">Khata Type</span>
                  <span className="font-semibold text-white">A-Khata Clear Title</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block">Electricity</span>
                  <span className="font-semibold text-white">Underground Cabling</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block">Sanitation</span>
                  <span className="font-semibold text-white">Dedicated Sewage Lines</span>
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <div className="font-semibold text-slate-300">GeoJSON & GIS References</div>
                <div className="text-[11px] text-slate-400">Feature ID: <code className="text-emerald-400 font-mono">{property.id}</code></div>
                <div className="text-[11px] text-slate-400">3D Mesh Model Binding: <code className="text-indigo-400 font-mono">{property.model_object_id}</code></div>
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => {
                  setShowSpecsModal(false);
                  onBookVisit(property);
                }}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs"
              >
                Book Visit
              </button>
              <button
                onClick={() => setShowSpecsModal(false)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
