import type { DashboardData, DataMode, MapBounds, MapLayer } from "../types/dashboard";

// In production, Vercel proxies /api to Render. This keeps the browser on one
// origin and avoids CORS errors when Render is starting or temporarily busy.
const apiBase = import.meta.env.PROD
  ? "/api"
  : (import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/api");

type Filters = { startDate: string; endDate: string; mode: DataMode; mapLayer: MapLayer; daynight: "D" | "N" | null; bounds: MapBounds | null };
type ActivityPoint = { period: string; activity: number };
type CalendarCell = { year: number; period: number; activity: number };
export type RiskPrediction = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: { grid_id: string; prediction_date: string; horizon_days: number; probability: number; risk_level: "Low" | "Medium" | "High"; fire_count_7d: number };
    geometry: { type: "Polygon"; coordinates: number[][][] };
  }>;
};

function searchParams(filters: Filters, includeDates = true) {
  const params = new URLSearchParams({ sensor: filters.mode });
  if (includeDates && filters.startDate) params.set("start_date", filters.startDate);
  if (includeDates && filters.endDate) params.set("end_date", filters.endDate);
  if (filters.daynight) params.set("daynight", filters.daynight);
  if (filters.bounds) {
    params.set("min_lat", String(filters.bounds.minLat));
    params.set("min_lng", String(filters.bounds.minLng));
    params.set("max_lat", String(filters.bounds.maxLat));
    params.set("max_lng", String(filters.bounds.maxLng));
  }
  return params;
}

async function getJson<T>(path: string): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(`${apiBase}${path}`);
      if (response.ok) return response.json() as Promise<T>;
      // Invalid filters and missing routes will not improve by retrying.
      if (response.status < 500) throw new Error(`API request failed (${response.status})`);
      lastError = new Error(`API request failed (${response.status})`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("API request failed");
    }
    if (attempt < 2) await new Promise((resolve) => window.setTimeout(resolve, 1_000 * (attempt + 1)));
  }
  throw lastError ?? new Error("API request failed");
}

export function loadRiskPrediction() {
  return getJson<RiskPrediction>("/predictions/fire-risk");
}

function toMonthLabel(period: string) {
  const month = Number(period.slice(-2));
  return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][month - 1] ?? period;
}

export async function loadDashboardData(filters: Filters, selectedArea: string): Promise<DashboardData> {
  const selected = searchParams(filters).toString();
  const mapParams = searchParams({ ...filters, mode: filters.mapLayer === "combined" || filters.mapLayer === "events" ? "harmonized" : filters.mapLayer, daynight: filters.mapLayer === "events" ? null : filters.daynight }).toString();
  const eventLayer = filters.mapLayer === "events";
  const eventSelected = searchParams({ ...filters, daynight: null }).toString();
  const activitySelected = eventLayer ? eventSelected : selected;
  const activityPath = eventLayer ? "/analytics/event-trends" : "/analytics/trends";
  const calendarPath = eventLayer ? "/analytics/event-calendar" : "/analytics/calendar";
  const mapRequest = eventLayer
    ? getJson<{ total: number; items: Array<{ id: string; latitude: number; longitude: number; acq_date: string; detection_count: number; modis_detections: number; viirs_detections: number; sensor_agreement: "both" | "modis_only" | "viirs_only"; total_frp: number | null; confidence_score: number | null; daynight: "D" | "N" | "M" | null }> }>(`/events?${mapParams}&limit=750`)
    : getJson<{ total: number; items: Array<{ id: string; latitude: number; longitude: number; acq_date: string; acq_time: string | null; sensor: "MODIS" | "VIIRS"; frp: number | null; confidence: string | null; daynight: "D" | "N" | null }> }>(`/hotspots?${mapParams}&limit=750`);
  const [mapRecords, summary, trend, calendar, weeklyCalendar, comparison, modisYears, viirsYears, combinedYears, eventYears] = await Promise.all([
    mapRequest,
    getJson<{ total_detections: number; historical_annual_median: number; anomaly_percent: number; anomaly_label: "Low" | "Normal" | "High" }>(`/analytics/summary?${activitySelected}&source=${eventLayer ? "events" : "raw"}`),
    getJson<ActivityPoint[]>(`${activityPath}?${activitySelected}&granularity=month`),
    getJson<CalendarCell[]>(`${calendarPath}?${activitySelected}&granularity=month`),
    getJson<CalendarCell[]>(`${calendarPath}?${activitySelected}&granularity=week`),
    getJson<{ modis: number; viirs: number; combined: number }>(`/analytics/compare-sensors?${selected}`),
    getJson<ActivityPoint[]>(`/analytics/trends?${searchParams({ ...filters, mode: "modis" })}&granularity=year`),
    getJson<ActivityPoint[]>(`/analytics/trends?${searchParams({ ...filters, mode: "viirs" })}&granularity=year`),
    getJson<ActivityPoint[]>(`/analytics/trends?${selected}&granularity=year`),
    eventLayer ? getJson<ActivityPoint[]>(`/analytics/event-trends?${eventSelected}&granularity=year`) : Promise.resolve([] as ActivityPoint[]),
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

  const rawYearlyActivity = [...years.entries()].sort(([left], [right]) => left - right).map(([year, values]) => ({ year, ...values }));
  const yearlyActivity = eventLayer
    ? rawYearlyActivity.map((item) => ({ ...item, harmonized: eventYears.find((point) => Number(point.period) === item.year)?.activity ?? 0 }))
    : rawYearlyActivity;
  return {
    selectedArea,
    selectedPeriod: `${filters.startDate} to ${filters.endDate}`,
    summary: { harmonizedActivity: summary.total_detections, historicalMedian: summary.historical_annual_median, anomalyPercent: summary.anomaly_percent, anomalyLabel: summary.anomaly_label },
    trend: trend.map((point) => ({ month: toMonthLabel(point.period), activity: point.activity })),
    calendar: calendar.map((cell) => ({ year: cell.year, month: cell.period, activity: cell.activity })),
    weeklyActivity: weeklyCalendar.map((cell) => ({ year: cell.year, week: cell.period, activity: cell.activity })),
    hotspots: eventLayer
      ? (mapRecords as Awaited<typeof mapRequest>).items.map((item: any) => ({ id: item.id, latitude: item.latitude, longitude: item.longitude, sensor: item.sensor_agreement === "modis_only" ? "MODIS" : "VIIRS", agreement: item.sensor_agreement, detectionCount: item.detection_count, modisDetections: item.modis_detections, viirsDetections: item.viirs_detections, frpMw: item.total_frp ?? 0, acquisitionDate: item.acq_date, acquisitionTime: "Event", confidence: item.confidence_score === null ? "Unknown" : `${Math.round(item.confidence_score)} / 100`, confidenceScore: item.confidence_score ?? undefined, daynight: item.daynight ?? "D" }))
      : (mapRecords as Awaited<typeof mapRequest>).items.map((item: any) => ({ id: item.id, latitude: item.latitude, longitude: item.longitude, sensor: item.sensor, frpMw: item.frp ?? 0, acquisitionDate: item.acq_date, acquisitionTime: item.acq_time ?? "Unknown", confidence: item.confidence ?? "Unknown", daynight: item.daynight ?? "D" })),
    yearlyActivity,
    rawYearlyActivity,
    sensorComparison: comparison,
    alerts: [
      { level: summary.anomaly_label === "High" ? "High" : "Moderate", title: `${summary.anomaly_label} activity`, detail: `${summary.anomaly_percent > 0 ? "+" : ""}${summary.anomaly_percent}% compared with the historical annual median.` },
      { level: "Moderate", title: `${mapRecords.total.toLocaleString()} matching ${eventLayer ? "fire events" : "observations"}`, detail: `The map shows the newest ${mapRecords.items.length.toLocaleString()} ${eventLayer ? "harmonized events" : "raw observations"}.` },
    ],
    methodVersion: "PostgreSQL FIRMS source data",
  };
}

export function exportUrl(kind: "hotspots" | "statistics", filters: Filters) {
  return `${apiBase}/exports/${kind === "hotspots" ? "hotspots.csv" : "statistics.csv"}?${searchParams(filters)}`;
}
