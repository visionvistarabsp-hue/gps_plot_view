import { PropertyData, PlotStatus, PropertyType, FacingDirection } from '@/types/property';

// Pre-seeded database records matching all 69 plots from reference layout
export const INITIAL_PROPERTIES: PropertyData[] = [];

// Residential plots 1 to 59
for (let num = 1; num <= 59; num++) {
  let status: PlotStatus = 'available';
  if ([2, 8, 24, 31, 42, 45, 57].includes(num)) status = 'sold';
  else if ([5, 12, 28, 38, 54].includes(num)) status = 'reserved';
  else if ([10, 20, 29, 48].includes(num)) status = 'hold';
  else if ([35, 52].includes(num)) status = 'blocked';

  let facing: FacingDirection = 'East';
  if (num >= 43 && num <= 51) facing = 'West';
  else if (num >= 34 && num <= 42) facing = 'East';
  else if (num >= 29 && num <= 33) facing = 'West';
  else if (num >= 7 && num <= 9) facing = 'West';
  else if (num >= 4 && num <= 6) facing = 'East';
  else if (num >= 1 && num <= 3) facing = 'West';
  else if (num >= 10 && num <= 28) facing = 'North';
  else if (num >= 52 && num <= 59) facing = 'East';

  let area = 1500;
  if (num >= 52 && num <= 59) area = 1200 + (num % 5) * 150;
  else if (num >= 29 && num <= 33) area = 1800 + (num % 3) * 100;
  else if (num >= 10 && num <= 28) area = 1350 + (num % 4) * 100;
  else if (num >= 1 && num <= 9) area = 1650;

  const basePricePerSqFt = 3650 + (num % 6) * 120;
  const price = Math.round(area * basePricePerSqFt / 1000) * 1000;

  INITIAL_PROPERTIES.push({
    id: `plot-${num < 10 ? '0' + num : num}`,
    plotNumber: String(num),
    type: 'residential',
    status,
    area,
    price,
    facing,
    dimensions: `${Math.round(area / 40)}' x 40'`,
    roadWidth: num >= 10 && num <= 28 ? 30 : (num >= 52 && num <= 59 ? 30 : 30),
    model_object_id: `PLOT_${num}`,
    description: `Premium North/East facing residential villa plot situated along high-speed bitumen avenue with ready water & electricity connections.`
  });
}

// LIG plots 1 to 4
const ligFacings: FacingDirection[] = ['South', 'West', 'North', 'East'];
for (let num = 1; num <= 4; num++) {
  INITIAL_PROPERTIES.push({
    id: `lig-0${num}`,
    plotNumber: `LIG-${num}`,
    type: 'lig',
    status: num === 3 ? 'reserved' : 'available',
    area: 850,
    price: 2850000,
    facing: ligFacings[num - 1],
    dimensions: `25' x 34'`,
    roadWidth: 20,
    model_object_id: `LIG_${num}`,
    description: `Government sanctioned Low-Income Group (LIG) residential plot with prime frontage near garden access.`
  });
}

// EWS plots 1 to 6
for (let num = 1; num <= 6; num++) {
  INITIAL_PROPERTIES.push({
    id: `ews-0${num}`,
    plotNumber: `EWS-${num}`,
    type: 'ews',
    status: num === 2 ? 'sold' : (num === 5 ? 'hold' : 'available'),
    area: 450,
    price: 1450000,
    facing: 'South',
    dimensions: `15' x 30'`,
    roadWidth: 20,
    model_object_id: `EWS_${num}`,
    description: `Economically Weaker Section (EWS) residential plot with optimized layout and direct paved access.`
  });
}

// In-memory runtime cache for seamless local editing & fast API responses
let runtimeProperties = [...INITIAL_PROPERTIES];

export function getRuntimeProperties(): PropertyData[] {
  return runtimeProperties;
}

export function updateRuntimeProperty(idOrPlotNum: string, updates: Partial<PropertyData>): PropertyData | null {
  const index = runtimeProperties.findIndex(
    p => p.id === idOrPlotNum || p.plotNumber.toLowerCase() === idOrPlotNum.toLowerCase()
  );
  if (index === -1) return null;

  runtimeProperties[index] = {
    ...runtimeProperties[index],
    ...updates,
    updated_at: new Date().toISOString()
  };

  return runtimeProperties[index];
}

export function resetRuntimeProperties(): void {
  runtimeProperties = [...INITIAL_PROPERTIES];
}
