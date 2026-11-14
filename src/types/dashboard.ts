export type Sensor = "MODIS" | "VIIRS";
export type DataMode = "modis" | "viirs" | "harmonized";
export type MapLayer = "events" | "modis" | "viirs" | "combined";
export type MapBounds = { minLat: number; minLng: number; maxLat: number; maxLng: number };

export type DashboardData = {
  selectedArea: string;
  selectedPeriod: string;
  summary: {
    harmonizedActivity: number;
    historicalMedian: number;
    anomalyPercent: number;
    anomalyLabel: "Low" | "Normal" | "High" | "Very high";
  };
  trend: Array<{ month: string; activity: number }>;
  calendar: Array<{ year: number; month: number; activity: number }>;
  weeklyActivity: Array<{ year: number; week: number; activity: number }>;
  hotspots: Array<{
    id: string;
    latitude: number;
    longitude: number;
    sensor: Sensor;
    frpMw: number;
    acquisitionDate: string;
    acquisitionTime: string;
    confidence: string;
    daynight: "D" | "N" | "M";
    agreement?: "both" | "modis_only" | "viirs_only";
    detectionCount?: number;
    modisDetections?: number;
    viirsDetections?: number;
    confidenceScore?: number;
  }>;
  yearlyActivity: Array<{ year: number; modis: number; viirs: number; harmonized: number }>;
  rawYearlyActivity: Array<{ year: number; modis: number; viirs: number; harmonized: number }>;
  sensorComparison: { modis: number; viirs: number; combined: number };
  alerts: Array<{ level: "High" | "Moderate"; title: string; detail: string }>;
  methodVersion: string;
};
