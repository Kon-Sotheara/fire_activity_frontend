import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ArrowLeft, BellRing, CalendarDays, Download, Flame, LoaderCircle, MapPinned } from "lucide-react";

import { exportUrl, loadDashboardData, loadRiskPrediction } from "../api/fireApi";
import type { RiskPrediction } from "../api/fireApi";
import { dashboardMock } from "../mocks/dashboard";
import type { DataMode, MapBounds, MapLayer } from "../types/dashboard";
import { ActivityVisualization, HarmonizationEvidenceChart, MonthlyCalendar, RegionalComparisonChart, RiskDistributionChart, SameMonthComparison, SeasonalChart } from "./ActivityCharts";
import { FireMap } from "./FireMap";
import "./dashboard.css";

const modeLabels: Record<DataMode, string> = { modis: "MODIS", viirs: "VIIRS", harmonized: "Combined" };
const mapLayerLabels: Record<MapLayer, string> = { events: "Harmonized fire events", modis: "MODIS observations", viirs: "VIIRS observations", combined: "Combined observations" };
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DATA_END_DATE = "2025-12-28";

export function DashboardPage() {
  const [mapLayer, setMapLayer] = useState<MapLayer>("events");
  const [timeView, setTimeView] = useState<"week" | "year">("week");
  const [analysisView, setAnalysisView] = useState<"month" | "season">("month");
  const [evidenceView, setEvidenceView] = useState<"harmonization" | "regional">("harmonization");
  const [comparisonRegion, setComparisonRegion] = useState("South Sumatra");
  const [startDate, setStartDate] = useState("2025-01-01");
  const [endDate, setEndDate] = useState(DATA_END_DATE);
  const [daynight, setDaynight] = useState<"D" | "N" | null>(null);
  const [comparisonMonth, setComparisonMonth] = useState(2);
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [showRiskLayer, setShowRiskLayer] = useState(false);
  const [riskPrediction, setRiskPrediction] = useState<RiskPrediction | null>(null);
  const [data, setData] = useState(dashboardMock);
  const [apiStatus, setApiStatus] = useState<"loading" | "connected" | "error">("loading");
  const [apiError, setApiError] = useState("");
  const mode: DataMode = mapLayer === "modis" ? "modis" : mapLayer === "viirs" ? "viirs" : "harmonized";
  const filters = useMemo(() => ({ startDate, endDate, mode, mapLayer, daynight, bounds }), [bounds, daynight, endDate, mapLayer, mode, startDate]);

  useEffect(() => {
    let cancelled = false;
    setApiStatus("loading");
    loadDashboardData(filters, "Cambodia")
      .then((nextData) => {
        if (!cancelled) {
          setData(nextData);
          setApiStatus("connected");
          setApiError("");
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setApiStatus("error");
          setApiError(error instanceof Error ? error.message : "Unable to load the fire activity API.");
        }
      });
    return () => { cancelled = true; };
  }, [filters]);

  useEffect(() => {
    loadRiskPrediction().then(setRiskPrediction).catch(() => setRiskPrediction(null));
  }, []);

  function downloadCsv(kind: "hotspots" | "statistics") {
    window.open(exportUrl(kind, filters), "_blank", "noopener,noreferrer");
  }

  const anomalyLabel = data.summary.anomalyLabel;
  const anomalyPercent = data.summary.anomalyPercent;
  const selectedLayerCount = mapLayer === "events" ? data.summary.harmonizedActivity : mapLayer === "modis" ? data.sensorComparison.modis : mapLayer === "viirs" ? data.sensorComparison.viirs : data.sensorComparison.combined;
  const selectedLayerDetail = mapLayer === "events" ? "Nearby same-day detections grouped into unique fires" : mapLayer === "modis" ? "1 km sensor · raw observations" : mapLayer === "viirs" ? "375 m sensor · raw observations" : "MODIS + VIIRS · raw observations";
  const visibleRiskPrediction = useMemo(() => {
    if (!riskPrediction || !bounds) return riskPrediction;
    return {
      ...riskPrediction,
      features: riskPrediction.features.filter((feature) => {
        const ring = feature.geometry.coordinates[0];
        const longitude = (ring[0][0] + ring[2][0]) / 2;
        const latitude = (ring[0][1] + ring[2][1]) / 2;
        return latitude >= bounds.minLat && latitude <= bounds.maxLat && longitude >= bounds.minLng && longitude <= bounds.maxLng;
      }),
    };
  }, [bounds, riskPrediction]);
  const riskCounts = useMemo(() => ({
    high: visibleRiskPrediction?.features.filter((feature) => feature.properties.risk_level === "High").length ?? 0,
    medium: visibleRiskPrediction?.features.filter((feature) => feature.properties.risk_level === "Medium").length ?? 0,
    low: visibleRiskPrediction?.features.filter((feature) => feature.properties.risk_level === "Low").length ?? 0,
  }), [visibleRiskPrediction]);

  return (
    <main className={`dashboard dashboard--compact ${showRiskLayer ? "dashboard--risk" : ""}`}>
      <header className="dashboard__header">
        <div className="brand"><span><Flame size={18} /></span> Burn Calendar</div>
        <div className="header-actions">
          <a className="download-button download-button--secondary" href="#/"><ArrowLeft size={15} /> Back to home</a>
          <button className="download-button download-button--secondary" type="button" onClick={() => downloadCsv("statistics")}><Download size={15} /> Statistics</button>
          <button className="download-button" type="button" onClick={() => downloadCsv("hotspots")}><Download size={15} /> Hotspots CSV</button>
        </div>
      </header>

      <section className="dashboard__content">
        <div className="compact-intro">
          <div><p className="eyebrow">Historical fire activity</p><h1>Explore MODIS and VIIRS fire records.</h1></div>
          {apiStatus === "loading" && <p className="loading-status" role="status"><LoaderCircle size={15} /> Updating fire data…</p>}
        </div>
        {apiStatus === "error" && <p className="api-error">The dashboard is showing its last result. {apiError}</p>}

        <section className="area-toolbar" aria-label="Fire activity filters">
          <label>From<input type="date" value={startDate} max={endDate} onChange={(event) => setStartDate(event.target.value)} /></label>
          <label>To<input type="date" value={endDate} min={startDate} max={DATA_END_DATE} onChange={(event) => setEndDate(event.target.value)} /></label>
          <label>Observation time<select aria-label="Observation time" disabled={mapLayer === "events"} value={daynight ?? ""} onChange={(event) => setDaynight(event.target.value === "" ? null : event.target.value as "D" | "N")}><option value="">Day and night</option><option value="D">Day</option><option value="N">Night</option></select></label>
          <label>Map layer<select aria-label="Map layer" value={mapLayer} onChange={(event) => setMapLayer(event.target.value as MapLayer)}><option value="events">Harmonized fire events</option><option value="modis">MODIS observations</option><option value="viirs">VIIRS observations</option><option value="combined">Combined observations</option></select></label>
          <label>Prediction<select aria-label="Prediction layer" value={showRiskLayer ? "risk" : "off"} onChange={(event) => setShowRiskLayer(event.target.value === "risk")}><option value="off">No prediction layer</option><option value="risk">3-day fire-risk snapshot</option></select></label>
        </section>

        <section className="workspace-grid">
          <article className="panel panel--map"><PanelTitle icon={<MapPinned size={18} />} title={showRiskLayer ? "Cambodia predicted fire risk" : `Cambodia ${mapLayerLabels[mapLayer]}`} subtitle={showRiskLayer ? bounds ? "3-day risk grid filtered to the selected map area." : "3-day forecast snapshot shown as 0.1° risk grid cells; raw sensor points are hidden." : mapLayer === "events" ? "One marker represents a clustered same-day fire event. Drag on the map to filter an area." : "One marker represents a raw satellite observation. Drag on the map to filter an area."} /><FireMap hotspots={data.hotspots} layer={mapLayer} riskPrediction={visibleRiskPrediction} showRiskLayer={showRiskLayer} isLoading={apiStatus === "loading"} selectedBounds={bounds} onBoundsChange={setBounds} /></article>
          <article className="panel fire-activity-panel">
            <div className="panel__title panel__title--controls"><div><h2><Flame size={18} />{showRiskLayer ? "Predicted fire risk" : "Fire activity"}</h2><p>{showRiskLayer ? "Number of 0.1° grid cells by forecast risk level." : "Observation counts for the selected period and area."}</p></div>{!showRiskLayer && <div className="segment-control"><button className={timeView === "week" ? "is-active" : ""} type="button" onClick={() => setTimeView("week")}>Week</button><button className={timeView === "year" ? "is-active" : ""} type="button" onClick={() => setTimeView("year")}>Year</button></div>}</div>
            {showRiskLayer ? <><div className="risk-summary"><RiskCard level="High" value={riskCounts.high} detail={bounds ? "Selected map area" : "Cambodia-wide snapshot"} /><RiskCard level="Medium" value={riskCounts.medium} detail={bounds ? "Selected map area" : "Cambodia-wide snapshot"} /><RiskCard level="Low" value={riskCounts.low} detail={bounds ? "Selected map area" : "Cambodia-wide snapshot"} /></div><div className="risk-chart"><h3>Risk distribution</h3><p>Grid-cell count by forecast level. Hover for average predicted probability.</p><RiskDistributionChart prediction={visibleRiskPrediction} /></div></> : <><div className="sensor-comparison"><ObservationCard mode={mode} value={selectedLayerCount} label={mapLayer === "events" ? "Unique fire events" : mapLayerLabels[mapLayer]} detail={selectedLayerDetail} /></div><ActivityVisualization data={data} mode={mode} timeView={timeView} scale={1} /></>}
          </article>
        </section>

        <section className="compact-summary" aria-label="Selected area statistics">
          <Summary label={mapLayerLabels[mapLayer]} value={data.summary.harmonizedActivity.toLocaleString()} detail={`${data.hotspots.length.toLocaleString()} newest map markers loaded`} accent={mode} />
          <Summary label="Historical median" value={data.summary.historicalMedian.toLocaleString()} detail="Annual baseline for this area" />
          <Summary label="Anomaly" value={`${anomalyPercent > 0 ? "+" : ""}${anomalyPercent}%`} detail={`${anomalyLabel}: vs historical median`} accent={anomalyLabel === "High" ? "fire" : anomalyLabel === "Low" ? "modis" : undefined} />
          <Summary label="Alert state" value={anomalyLabel} detail="Low, Normal, or High activity" />
        </section>

        <section className="analysis-grid">
          <article className="panel calendar-panel"><PanelTitle icon={<CalendarDays size={18} />} title="Historical burning calendar" subtitle="Each row is a year. Each column is a month. Darker fire color means more detected activity." /><div className="fire-color-legend"><span>Fewer hotspots</span><i /><span>More hotspots</span></div><MonthlyCalendar data={data} mode={mode} selectedMonth={comparisonMonth} onMonthSelect={setComparisonMonth} /></article>
          <article className="panel insight-panel"><div className="panel__title panel__title--controls"><div><h2><BellRing size={18} />Analysis and alerts</h2><p>{analysisView === "month" ? `${monthNames[comparisonMonth]} compared across all years.` : "Selected source’s monthly pattern."}</p></div><div className="segment-control"><button className={analysisView === "month" ? "is-active" : ""} type="button" onClick={() => setAnalysisView("month")}>Month compare</button><button className={analysisView === "season" ? "is-active" : ""} type="button" onClick={() => setAnalysisView("season")}>Season</button></div></div>{analysisView === "month" ? <SameMonthComparison data={data} mode={mode} month={comparisonMonth} /> : <SeasonalChart data={data} mode={mode} />}<div className={`anomaly-state anomaly-state--${anomalyLabel.toLowerCase()}`}><strong>{anomalyLabel} activity</strong><span>{anomalyPercent > 0 ? "+" : ""}{anomalyPercent}% compared with the historical median.</span><p><b>Why flagged:</b> {data.summary.harmonizedActivity.toLocaleString()} detections versus a median of {data.summary.historicalMedian.toLocaleString()}; the alert threshold is ±25%.</p></div></article>
        </section>

        <section className="panel evidence-panel" aria-label="Harmonization and regional comparison evidence">
          <div className="panel__title panel__title--controls"><div><h2><Flame size={18} />Evidence for comparison</h2><p>{evidenceView === "harmonization" ? "Raw source counts for the selected area and period." : "Regional comparison is ready for reference data."}</p></div><div className="segment-control"><button className={evidenceView === "harmonization" ? "is-active" : ""} type="button" onClick={() => setEvidenceView("harmonization")}>Source comparison</button><button className={evidenceView === "regional" ? "is-active" : ""} type="button" onClick={() => setEvidenceView("regional")}>Regions</button></div></div>
          {evidenceView === "harmonization" ? <div className="evidence-grid"><HarmonizationEvidenceChart data={data} /><div className="explanation-card"><p className="eyebrow">How to read it</p><h3>One area, two source records.</h3><p>MODIS and VIIRS have different spatial resolutions, so their raw counts should not be compared as if they were the same measure.</p><ul><li><span className="legend-dot legend-dot--modis" />MODIS raw: broad, long-running record</li><li><span className="legend-dot legend-dot--viirs" />VIIRS raw: finer, more frequent detections</li><li><span className="legend-dot legend-dot--fire" />Combined: both raw source records</li></ul></div></div> : <div className="evidence-grid"><RegionalComparisonChart region={comparisonRegion} /><div className="explanation-card"><label htmlFor="comparison-region">Compare Cambodia with<select id="comparison-region" value={comparisonRegion} onChange={(event) => setComparisonRegion(event.target.value)}><option>South Sumatra</option><option>Central Kalimantan</option><option>Mekong region</option></select></label><h3>Same method, different place.</h3><p>Add the regional reference records to make this comparison live.</p></div></div>}
        </section>

        <footer className="method-note"><strong>Method note:</strong> MODIS and VIIRS raw counts are shown separately. The combined view includes both source records; calibrated harmonization will be added as a separate processing layer.</footer>
      </section>
    </main>
  );
}

function ObservationCard({ mode, value, label, detail }: { mode: DataMode; value: number; label: string; detail: string }) {
  const accent = mode === "harmonized" ? "fire" : mode;
  return <div className={`sensor-card sensor-card--${accent}`}><span>{label}</span><strong>{value.toLocaleString()}</strong><small>{detail}</small></div>;
}

function RiskCard({ level, value, detail }: { level: "Low" | "Medium" | "High"; value: number; detail: string }) {
  return <div className={`risk-card risk-card--${level.toLowerCase()}`}><span>{level} risk cells</span><strong>{value.toLocaleString()}</strong><small>{detail}</small></div>;
}

function Summary({ label, value, detail, accent }: { label: string; value: string; detail: string; accent?: DataMode | "fire" }) {
  return <article className={`summary-card ${accent ? `summary-card--${accent}` : ""}`}><p>{label}</p><strong>{value}</strong><small>{detail}</small></article>;
}

function PanelTitle({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) {
  return <div className="panel__title"><div><h2>{icon}{title}</h2><p>{subtitle}</p></div></div>;
}
