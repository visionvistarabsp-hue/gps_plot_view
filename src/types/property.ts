export type PlotStatus = 'available' | 'reserved' | 'hold' | 'sold' | 'blocked';

export type PropertyType = 'residential' | 'lig' | 'ews';

export type FacingDirection = 'North' | 'South' | 'East' | 'West' | 'North-East' | 'North-West' | 'South-East' | 'South-West';

export interface PropertyData {
  id: string;
  project_id?: string;
  plotNumber: string;
  type: PropertyType;
  status: PlotStatus;
  area: number | null;
  price: number | null;
  facing: FacingDirection | string | null;
  dimensions?: string;
  roadWidth?: number;
  model_object_id?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AmenityData {
  id: string;
  name: string;
  type: 'garden' | 'clubhouse' | 'transformer' | 'road' | 'other';
  category: string;
  area?: number;
  description?: string;
  model_object_id?: string;
}

export interface RoadData {
  id: string;
  name: string;
  width_ft: number;
  road_type: string;
}

export interface FilterOptions {
  searchQuery: string;
  types: PropertyType[];
  statuses: PlotStatus[];
  minPrice: number;
  maxPrice: number;
  minArea: number;
  maxArea: number;
  facing: string[];
}

export interface CalibrationParams {
  enabled: boolean;
  opacity: number;
  offsetX: number;
  offsetY: number;
  scale: number;
  rotation: number;
  showSatellite: boolean;
  showGeoJson: boolean;
  showReference: boolean;
  showBoundary: boolean;
  showRoads: boolean;
  showPlots: boolean;
  showAmenities: boolean;
  showLabels: boolean;
}

export interface MapViewState {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
}
