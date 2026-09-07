import type { FactorCard, SuitabilityLegendItem } from '../types/prediction';

export const factors: FactorCard[] = [
  {
    id: 'vegetation',
    icon: 'vegetation',
    title: 'Vegetation',
    subtitle: '(NDVI)',
  },
  {
    id: 'slope',
    icon: 'slope',
    title: 'Slope',
    subtitle: '(Terrain)',
  },
  {
    id: 'elevation',
    icon: 'elevation',
    title: 'Elevation',
    subtitle: '(DEM)',
  },
  {
    id: 'water',
    icon: 'water',
    title: 'Water Proximity',
    subtitle: '(Distance)',
  },
  {
    id: 'rainfall',
    icon: 'rainfall',
    title: 'Rainfall',
    subtitle: '(Precipitation)',
  },
  {
    id: 'temperature',
    icon: 'temperature',
    title: 'Temperature',
    subtitle: '(Climate)',
  },
  {
    id: 'soil',
    icon: 'soil',
    title: 'Soil Moisture',
    subtitle: '(Moisture)',
  },
  {
    id: 'landcover',
    icon: 'landcover',
    title: 'Land Cover',
    subtitle: '(LULC)',
  },
  {
    id: 'human',
    icon: 'human',
    title: 'Human Impact',
    subtitle: '(Built-up)',
  },
];

export const legendItems: SuitabilityLegendItem[] = [
  { level: 'very-high', label: 'Very High', range: '(0.8 - 1.0)', color: '#166534' },
  { level: 'high',      label: 'High',      range: '(0.6 - 0.8)', color: '#4ade80' },
  { level: 'moderate',  label: 'Moderate',  range: '(0.4 - 0.6)', color: '#facc15' },
  { level: 'low',       label: 'Low',       range: '(0.2 - 0.4)', color: '#f97316' },
  { level: 'very-low',  label: 'Very Low',  range: '(0 - 0.2)',   color: '#ef4444' },
];
