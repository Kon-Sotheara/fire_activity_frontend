import type { DashboardData } from "../types/dashboard";

export const dashboardMock: DashboardData = {
  selectedArea: "Cambodia",
  selectedPeriod: "January - November 2026",
  summary: {
    harmonizedActivity: 842,
    historicalMedian: 518,
    anomalyPercent: 62.5,
    anomalyLabel: "High",
  },
  trend: [
    { month: "Jan", activity: 42 }, { month: "Feb", activity: 57 }, { month: "Mar", activity: 83 },
    { month: "Apr", activity: 121 }, { month: "May", activity: 106 }, { month: "Jun", activity: 74 },
    { month: "Jul", activity: 49 }, { month: "Aug", activity: 38 }, { month: "Sep", activity: 46 },
    { month: "Oct", activity: 71 }, { month: "Nov", activity: 98 }, { month: "Dec", activity: 63 },
  ],
  calendar: [
    { year: 2024, month: 1, activity: 44 }, { year: 2024, month: 2, activity: 68 }, { year: 2024, month: 3, activity: 84 },
    { year: 2025, month: 1, activity: 53 }, { year: 2025, month: 2, activity: 72 }, { year: 2025, month: 3, activity: 95 },
    { year: 2026, month: 1, activity: 42 }, { year: 2026, month: 2, activity: 57 }, { year: 2026, month: 3, activity: 83 },
  ],
  weeklyActivity: [],
  hotspots: [
    { id: "mock-1", latitude: 13.04175, longitude: 106.4558, sensor: "VIIRS", frpMw: 3.5, acquisitionDate: "2025-01-01", acquisitionTime: "05:57 UTC", confidence: "nominal", daynight: "D" },
    { id: "mock-2", latitude: 13.1, longitude: 105.4, sensor: "VIIRS", frpMw: 6.3, acquisitionDate: "2025-03-17", acquisitionTime: "06:04 UTC", confidence: "high", daynight: "D" },
    { id: "mock-3", latitude: 11.9, longitude: 104.2, sensor: "MODIS", frpMw: 12.1, acquisitionDate: "2025-05-09", acquisitionTime: "18:22 UTC", confidence: "78", daynight: "N" },
  ],
  yearlyActivity: [
    { year: 2019, modis: 820, viirs: 0, harmonized: 820 },
    { year: 2020, modis: 790, viirs: 270, harmonized: 860 },
    { year: 2021, modis: 660, viirs: 420, harmonized: 790 },
    { year: 2022, modis: 710, viirs: 510, harmonized: 910 },
    { year: 2023, modis: 610, viirs: 570, harmonized: 880 },
    { year: 2024, modis: 520, viirs: 640, harmonized: 900 },
    { year: 2025, modis: 490, viirs: 700, harmonized: 920 },
    { year: 2026, modis: 430, viirs: 760, harmonized: 842 },
  ],
  rawYearlyActivity: [
    { year: 2019, modis: 820, viirs: 0, harmonized: 820 },
    { year: 2020, modis: 790, viirs: 270, harmonized: 860 },
    { year: 2021, modis: 660, viirs: 420, harmonized: 790 },
    { year: 2022, modis: 710, viirs: 510, harmonized: 910 },
    { year: 2023, modis: 610, viirs: 570, harmonized: 880 },
    { year: 2024, modis: 520, viirs: 640, harmonized: 900 },
    { year: 2025, modis: 490, viirs: 700, harmonized: 920 },
    { year: 2026, modis: 430, viirs: 760, harmonized: 842 },
  ],
  sensorComparison: { modis: 430, viirs: 760, combined: 842 },
  alerts: [
    { level: "High", title: "Above normal activity", detail: "This week is 62.5% above the historical median." },
    { level: "Moderate", title: "Three hotspots in selected area", detail: "Two VIIRS and one MODIS detection need review." },
  ],
  methodVersion: "mock-harmonization-v1",
};
