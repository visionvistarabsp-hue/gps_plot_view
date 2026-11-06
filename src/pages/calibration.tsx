import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import { CalibrationControls } from '@/components/calibration/CalibrationControls';
import { CalibrationParams } from '@/types/property';
import { INITIAL_PROPERTIES } from '@/lib/property-store';

const PropertyMap = dynamic(
  () => import('@/components/map/PropertyMap').then(mod => mod.PropertyMap),
  { ssr: false }
);

export default function CalibrationPage() {
  const [params, setParams] = useState<CalibrationParams>({
    enabled: true,
    opacity: 0.65,
    offsetX: 0,
    offsetY: 0,
    scale: 1.0,
    rotation: 0,
    showSatellite: true,
    showGeoJson: true,
    showReference: true,
    showBoundary: true,
    showRoads: true,
    showPlots: true,
    showAmenities: true,
    showLabels: true
  });

  const [isSaved, setIsSaved] = useState(false);

  const handleParamChange = (updated: Partial<CalibrationParams>) => {
    setParams(prev => ({ ...prev, ...updated }));
    setIsSaved(false);
  };

  const handleReset = () => {
    setParams({
      enabled: true,
      opacity: 0.65,
      offsetX: 0,
      offsetY: 0,
      scale: 1.0,
      rotation: 0,
      showSatellite: true,
      showGeoJson: true,
      showReference: true,
      showBoundary: true,
      showRoads: true,
      showPlots: true,
      showAmenities: true,
      showLabels: true
    });
    setIsSaved(false);
  };

  const handleSaveConfig = () => {
    // Save to local storage for persistence across reloads
    if (typeof window !== 'undefined') {
      localStorage.setItem('map_calibration_settings', JSON.stringify(params));
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans">
      <Head>
        <title>Masterplan Calibration Studio | Greenfield Meadows</title>
      </Head>

      {/* MapLibre Canvas with active calibration overlay */}
      <div className="w-full h-full">
        <PropertyMap
          properties={INITIAL_PROPERTIES}
          selectedProperty={null}
          onSelectProperty={() => {}}
          baseLayer="esri"
          calibrationParams={params}
        />
      </div>

      {/* Floating Calibration Studio Panel */}
      <CalibrationControls
        params={params}
        onChange={handleParamChange}
        onReset={handleReset}
        onSaveConfig={handleSaveConfig}
        isSaved={isSaved}
      />
    </div>
  );
}
