import type { DashboardData, DataMode, MapBounds } from "../types/dashboard";

const apiBase = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/api";

type Filters = { startDate: string; endDate: string; mode: DataMode; bounds: MapBounds | null };
type ActivityPoint = { period: string; activity: number };
type CalendarCell = { year: number; period: number; activity: number };

function searchParams(filters: Filters, includeDates = true) {
  const params = new URLSearchParams({ sensor: filters.mode });
  if (includeDates) {
    params.set("start_date", filters.startDate);
    params.set("end_date", filters.endDate);
  }
  if (filters.bounds) {
    params.set("min_lat", String(filters.bounds.minLat));
    params.set("min_lng", String(filters.bounds.minLng));
    params.set("max_lat", String(filters.bounds.maxLat));
    params.set("max_lng", String(filters.bounds.maxLng));
  }
  return params;
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBase}${path}`);
  if (!response.ok) throw new Error(`API request failed (${response.status})`);
  return response.json() as Promise<T>;
}

function toMonthLabel(period: string) {
  const month = Number(period.slice(-2));
  return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][month - 1] ?? period;
}

export async function loadDashboardData(filters: Filters, selectedArea: string): Promise<DashboardData> {
  const selected = searchParams(filters).toString();
  const historical = searchParams(filters, false).toString();
  const [hotspots, summary, trend, calendar, weeklyCalendar, comparison, modisYears, viirsYears, combinedYears] = await Promise.all([
    getJson<{ total: number; items: Array<{ id: string; latitude: number; longitude: number; sensor: "MODIS" | "VIIRS"; frp: number | null; acq_date: string; acq_time: string | null; confidence: string | null; daynight: "D" | "N" | null }> }>(`/hotspots?${selected}&limit=2000`),
    getJson<{ total_detections: number; historical_annual_median: number; anomaly_percent: number; anomaly_label: "Low" | "Normal" | "High" }>(`/analytics/summary?${selected}`),
    getJson<ActivityPoint[]>(`/analytics/trends?${selected}&granularity=month`),
    getJson<CalendarCell[]>(`/analytics/calendar?${historical}&granularity=month`),
    getJson<CalendarCell[]>(`/analytics/calendar?${historical}&granularity=week`),
    getJson<{ modis: number; viirs: number; combined: number }>(`/analytics/compare-sensors?${selected}`),
    getJson<ActivityPoint[]>(`/analytics/trends?${searchParams({ ...filters, mode: "modis" }, false)}&granularity=year`),
    getJson<ActivityPoint[]>(`/analytics/trends?${searchParams({ ...filters, mode: "viirs" }, false)}&granularity=year`),
    getJson<ActivityPoint[]>(`/analytics/trends?${historical}&granularity=year`),
  ]);

  const years = new Map<number, { modis: number; viirs: number; harmonized: number }>();
  for (const [key, source] of [["modis", modisYears], ["viirs", viirsYears], ["harmonized", combinedYears]] as const) {
    for (const point of source) {
      const year = Number(point.period);
      const values = years.get(year) ?? { modis: 0, viirs: 0, harmonized: 0 };
      values[key] = point.activity;
      years.set(year, values);
    }
  }

  return {
    selectedArea,
    selectedPeriod: `${filters.startDate} to ${filters.endDate}`,
    summary: { harmonizedActivity: summary.total_detections, historicalMedian: summary.historical_annual_median, anomalyPercent: summary.anomaly_percent, anomalyLabel: summary.anomaly_label },
    trend: trend.map((point) => ({ month: toMonthLabel(point.period), activity: point.activity })),
    calendar: calendar.map((cell) => ({ year: cell.year, month: cell.period, activity: cell.activity })),
    weeklyActivity: weeklyCalendar.map((cell) => ({ year: cell.year, week: cell.period, activity: cell.activity })),
    hotspots: hotspots.items.map((item) => ({ id: item.id, latitude: item.latitude, longitude: item.longitude, sensor: item.sensor, frpMw: item.frp ?? 0, acquisitionDate: item.acq_date, acquisitionTime: item.acq_time ?? "Unknown", confidence: item.confidence ?? "unknown", daynight: item.daynight ?? "D" })),
    yearlyActivity: [...years.entries()].sort(([left], [right]) => left - right).map(([year, values]) => ({ year, ...values })),
    sensorComparison: comparison,
    alerts: [
      { level: summary.anomaly_label === "High" ? "High" : "Moderate", title: `${summary.anomaly_label} activity`, detail: `${summary.anomaly_percent > 0 ? "+" : ""}${summary.anomaly_percent}% compared with the historical annual median.` },
      { level: "Moderate", title: `${hotspots.total.toLocaleString()} matching records`, detail: `The map shows the newest ${hotspots.items.length.toLocaleString()} records.` },
    ],
    methodVersion: "PostgreSQL FIRMS source data",
  };
}

export function exportUrl(kind: "hotspots" | "statistics", filters: Filters) {
  return `${apiBase}/exports/${kind === "hotspots" ? "hotspots.csv" : "statistics.csv"}?${searchParams(filters)}`;
}
