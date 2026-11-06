import React from 'react';
import { Sliders, Eye, EyeOff, Move, RotateCw, ZoomIn, Save, ArrowLeft, Layers, Check } from 'lucide-react';
import Link from 'next/link';
import { CalibrationParams } from '@/types/property';

interface CalibrationControlsProps {
  params: CalibrationParams;
  onChange: (updated: Partial<CalibrationParams>) => void;
  onReset: () => void;
  onSaveConfig: () => void;
  isSaved?: boolean;
}

export const CalibrationControls: React.FC<CalibrationControlsProps> = ({
  params,
  onChange,
  onReset,
  onSaveConfig,
  isSaved
}) => {
  return (
    <div className="fixed top-4 left-4 z-40 max-w-sm w-full bg-slate-900/95 backdrop-blur-xl border border-slate-700/90 rounded-2xl shadow-2xl p-5 text-xs text-slate-200 overflow-y-auto max-h-[92vh]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Back to Explorer"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>Layout Calibration Studio</span>
            </h2>
            <span className="text-[10px] text-cyan-400 font-mono">Dev Alignment Mode</span>
          </div>
        </div>
      </div>

      <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">
        Use this tool to precisely overlay and calibrate the original architect masterplan drawing with real-world satellite imagery.
      </p>

      {/* Main Overlay Sliders */}
      <div className="mt-4 space-y-4">
        {/* Opacity Slider */}
        <div>
          <div className="flex items-center justify-between text-xs font-semibold mb-1">
            <span className="flex items-center gap-1 text-slate-300">
              <Eye className="w-3.5 h-3.5 text-emerald-400" /> Reference Image Opacity
            </span>
            <span className="font-mono text-emerald-400">{Math.round(params.opacity * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.02"
            value={params.opacity}
            onChange={e => onChange({ opacity: parseFloat(e.target.value) })}
            className="w-full accent-emerald-500 cursor-pointer"
          />
        </div>

        {/* Translation X (Longitude Delta) */}
        <div>
          <div className="flex items-center justify-between text-xs font-semibold mb-1">
            <span className="flex items-center gap-1 text-slate-300">
              <Move className="w-3.5 h-3.5 text-cyan-400" /> Longitude Offset (X)
            </span>
            <span className="font-mono text-cyan-400">{params.offsetX.toFixed(5)}</span>
          </div>
          <input
            type="range"
            min="-0.0050"
            max="0.0050"
            step="0.00005"
            value={params.offsetX}
            onChange={e => onChange({ offsetX: parseFloat(e.target.value) })}
            className="w-full accent-cyan-500 cursor-pointer"
          />
        </div>

        {/* Translation Y (Latitude Delta) */}
        <div>
          <div className="flex items-center justify-between text-xs font-semibold mb-1">
            <span className="flex items-center gap-1 text-slate-300">
              <Move className="w-3.5 h-3.5 text-cyan-400" /> Latitude Offset (Y)
            </span>
            <span className="font-mono text-cyan-400">{params.offsetY.toFixed(5)}</span>
          </div>
          <input
            type="range"
            min="-0.0050"
            max="0.0050"
            step="0.00005"
            value={params.offsetY}
            onChange={e => onChange({ offsetY: parseFloat(e.target.value) })}
            className="w-full accent-cyan-500 cursor-pointer"
          />
        </div>

        {/* Scale Multiplier */}
        <div>
          <div className="flex items-center justify-between text-xs font-semibold mb-1">
            <span className="flex items-center gap-1 text-slate-300">
              <ZoomIn className="w-3.5 h-3.5 text-amber-400" /> Scale Multiplier
            </span>
            <span className="font-mono text-amber-400">{params.scale.toFixed(3)}x</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.01"
            value={params.scale}
            onChange={e => onChange({ scale: parseFloat(e.target.value) })}
            className="w-full accent-amber-500 cursor-pointer"
          />
        </div>

        {/* Rotation */}
        <div>
          <div className="flex items-center justify-between text-xs font-semibold mb-1">
            <span className="flex items-center gap-1 text-slate-300">
              <RotateCw className="w-3.5 h-3.5 text-purple-400" /> Rotation Angle
            </span>
            <span className="font-mono text-purple-400">{params.rotation.toFixed(1)}°</span>
          </div>
          <input
            type="range"
            min="-180"
            max="180"
            step="0.5"
            value={params.rotation}
            onChange={e => onChange({ rotation: parseFloat(e.target.value) })}
            className="w-full accent-purple-500 cursor-pointer"
          />
        </div>
      </div>

      {/* Layer Visibility Toggles */}
      <div className="mt-5 pt-4 border-t border-slate-800">
        <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-2.5">
          <Layers className="w-3.5 h-3.5 text-emerald-400" />
          <span>Layer Visibility Toggles</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <button
            onClick={() => onChange({ showReference: !params.showReference })}
            className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
              params.showReference ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200' : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
          >
            <span>Reference PNG</span>
            {params.showReference ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          </button>

          <button
            onClick={() => onChange({ showGeoJson: !params.showGeoJson })}
            className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
              params.showGeoJson ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200' : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
          >
            <span>Vector Plots</span>
            {params.showGeoJson ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          </button>

          <button
            onClick={() => onChange({ showRoads: !params.showRoads })}
            className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
              params.showRoads ? 'bg-amber-500/20 border-amber-500/50 text-amber-200' : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
          >
            <span>Road Vectors</span>
            {params.showRoads ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          </button>

          <button
            onClick={() => onChange({ showBoundary: !params.showBoundary })}
            className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
              params.showBoundary ? 'bg-purple-500/20 border-purple-500/50 text-purple-200' : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
          >
            <span>Boundary</span>
            {params.showBoundary ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-5 pt-4 border-t border-slate-800 flex gap-2">
        <button
          onClick={onReset}
          className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
        >
          Reset
        </button>
        <button
          onClick={onSaveConfig}
          className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all hover:brightness-110"
        >
          {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          <span>{isSaved ? 'Calibration Saved!' : 'Save Calibration'}</span>
        </button>
      </div>
    </div>
  );
};
