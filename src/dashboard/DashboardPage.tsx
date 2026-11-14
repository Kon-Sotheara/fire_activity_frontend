import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { BellRing, CalendarDays, Download, Flame, MapPinned, Search } from "lucide-react";

import { exportUrl, loadDashboardData } from "../api/fireApi";
import { dashboardMock } from "../mocks/dashboard";
import type { DataMode, MapBounds } from "../types/dashboard";
import { ActivityVisualization, HarmonizationEvidenceChart, MonthlyCalendar, RegionalComparisonChart, SameMonthComparison, SeasonalChart } from "./ActivityCharts";
import { FireMap } from "./FireMap";
import "./dashboard.css";

const modeLabels: Record<DataMode, string> = { modis: "MODIS", viirs: "VIIRS", harmonized: "Combined" };
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function DashboardPage() {
  const [mode, setMode] = useState<DataMode>("harmonized");
  const [timeView, setTimeView] = useState<"week" | "year">("week");
  const [analysisView, setAnalysisView] = useState<"month" | "season">("month");
  const [evidenceView, setEvidenceView] = useState<"harmonization" | "regional">("harmonization");
  const [comparisonRegion, setComparisonRegion] = useState("South Sumatra");
  const [areaInput, setAreaInput] = useState("Cambodia");
  const [searchRequest, setSearchRequest] = useState("Cambodia");
  const [selectedArea, setSelectedArea] = useState("Cambodia");
  const [startDate, setStartDate] = useState("2025-01-01");
  const [endDate, setEndDate] = useState("2025-12-31");
  const [comparisonMonth, setComparisonMonth] = useState(2);
  const [bounds, setBounds] = useState<MapBounds | null>({ minLat: 10.4, minLng: 102.3, maxLat: 14.7, maxLng: 107.7 });
  const [areaMessage, setAreaMessage] = useState("Cambodia boundary applied. Draw two map corners to narrow the area.");
  const [data, setData] = useState(dashboardMock);
  const [apiStatus, setApiStatus] = useState<"loading" | "connected" | "error">("loading");
  const [apiError, setApiError] = useState("");
  const filters = useMemo(() => ({ startDate, endDate, mode, bounds }), [bounds, endDate, mode, startDate]);

  useEffect(() => {
    let cancelled = false;
    setApiStatus("loading");
    loadDashboardData(filters, selectedArea)
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
  }, [filters, selectedArea]);

  const handleSearchResolved = useCallback((label: string, nextBounds?: MapBounds) => {
    setSelectedArea(label);
    setBounds(nextBounds ?? null);
    setAreaMessage(nextBounds ? "Area boundary applied. All visuals now use this area." : "Map center updated. Draw two corners to set the analysis boundary.");
  }, []);

  function handleAreaChange(message: string, _selectedCount?: number, nextBounds?: MapBounds) {
    setAreaMessage(message);
    if (nextBounds) {
      setSelectedArea("Custom drawn area");
      setBounds(nextBounds);
    }
  }

  function runAreaSearch() {
    if (areaInput.trim()) setSearchRequest(areaInput);
  }

  function downloadCsv(kind: "hotspots" | "statistics") {
    window.open(exportUrl(kind, filters), "_blank", "noopener,noreferrer");
  }

  const anomalyLabel = data.summary.anomalyLabel;
  const anomalyPercent = data.summary.anomalyPercent;

  return (
    <main className="dashboard dashboard--compact">
      <header className="dashboard__header">
        <div className="brand"><span><Flame size={18} /></span> Burn Calendar</div>
        <div className="header-actions">
          <button className="download-button download-button--secondary" type="button" onClick={() => downloadCsv("statistics")}><Download size={15} /> Statistics</button>
          <button className="download-button" type="button" onClick={() => downloadCsv("hotspots")}><Download size={15} /> Hotspots CSV</button>
        </div>
      </header>

      <section className="dashboard__content">
        <div className="compact-intro">
          <div><p className="eyebrow">Historical fire activity</p><h1>Explore MODIS and VIIRS fire records.</h1></div>
          <span className={`mock-badge mock-badge--${apiStatus}`}>{apiStatus === "connected" ? "Live PostgreSQL data" : apiStatus === "loading" ? "Loading data…" : "API unavailable"}</span>
        </div>
        {apiStatus === "error" && <p className="api-error">The dashboard is showing its last result. {apiError}</p>}

        <section className="area-toolbar" aria-label="Area and date filters">
          <div className="area-search"><label htmlFor="area-search">Choose an area</label><div><Search size={16} /><input id="area-search" value={areaInput} onChange={(event) => setAreaInput(event.target.value)} onKeyDown={(event) => event.key === "Enter" && runAreaSearch()} placeholder="Country, place, or 13.04, 106.45" /><button type="button" onClick={runAreaSearch}>Find</button></div></div>
          <label>From<input type="date" value={startDate} max={endDate} onChange={(event) => setStartDate(event.target.value)} /></label>
          <label>To<input type="date" value={endDate} min={startDate} onChange={(event) => setEndDate(event.target.value)} /></label>
          <div className="toolbar-total"><span>Selected area</span><strong>{selectedArea}</strong><small>{areaMessage}</small></div>
        </section>

        <section className="workspace-grid">
          <article className="panel panel--map"><PanelTitle icon={<MapPinned size={18} />} title="Area and detected hotspots" subtitle="Search a country/place or use coordinates. Select two corners to analyze a smaller area." /><FireMap hotspots={data.hotspots} mode={mode} startDate={startDate} endDate={endDate} searchRequest={searchRequest} onAreaChange={handleAreaChange} onSearchResolved={handleSearchResolved} /></article>
          <article className="panel fire-activity-panel">
            <div className="panel__title panel__title--controls"><div><h2><Flame size={18} />Fire activity</h2><p>Switch source views for the same area and period.</p></div><div className="segment-control"><button className={timeView === "week" ? "is-active" : ""} type="button" onClick={() => setTimeView("week")}>Week</button><button className={timeView === "year" ? "is-active" : ""} type="button" onClick={() => setTimeView("year")}>Year</button></div></div>
            <div className="sensor-comparison"><SensorCard mode="modis" active={mode} value={data.sensorComparison.modis} label="MODIS raw" detail="1 km sensor" onChange={setMode} /><SensorCard mode="viirs" active={mode} value={data.sensorComparison.viirs} label="VIIRS raw" detail="375 m sensor" onChange={setMode} /><SensorCard mode="harmonized" active={mode} value={data.sensorComparison.combined} label="Combined view" detail="MODIS + VIIRS" onChange={setMode} /></div>
            <ActivityVisualization data={data} mode={mode} timeView={timeView} scale={1} />
          </article>
        </section>

        <section className="compact-summary" aria-label="Selected area statistics">
          <Summary label={`${modeLabels[mode]} detections`} value={data.summary.harmonizedActivity.toLocaleString()} detail={`${data.hotspots.length.toLocaleString()} newest map points loaded`} accent={mode} />
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
          {evidenceView === "harmonization" ? <div className="evidence-grid"><HarmonizationEvidenceChart comparison={data.sensorComparison} /><div className="explanation-card"><p className="eyebrow">How to read it</p><h3>One area, two source records.</h3><p>MODIS and VIIRS have different spatial resolutions, so their raw counts should not be compared as if they were the same measure.</p><ul><li><span className="legend-dot legend-dot--modis" />MODIS raw: broad, long-running record</li><li><span className="legend-dot legend-dot--viirs" />VIIRS raw: finer, more frequent detections</li><li><span className="legend-dot legend-dot--fire" />Combined: both raw source records</li></ul></div></div> : <div className="evidence-grid"><RegionalComparisonChart region={comparisonRegion} /><div className="explanation-card"><label htmlFor="comparison-region">Compare {selectedArea} with<select id="comparison-region" value={comparisonRegion} onChange={(event) => setComparisonRegion(event.target.value)}><option>South Sumatra</option><option>Central Kalimantan</option><option>Mekong region</option></select></label><h3>Same method, different place.</h3><p>Add the regional reference records to make this comparison live.</p></div></div>}
        </section>

        <footer className="method-note"><strong>Method note:</strong> MODIS and VIIRS raw counts are shown separately. The combined view includes both source records; calibrated harmonization will be added as a separate processing layer.</footer>
      </section>
    </main>
  );
}

function SensorCard({ mode, active, value, label, detail, onChange }: { mode: DataMode; active: DataMode; value: number; label: string; detail: string; onChange: (mode: DataMode) => void }) {
  const accent = mode === "harmonized" ? "fire" : mode;
  return <button className={`sensor-card sensor-card--${accent} ${active === mode ? "is-selected" : ""}`} type="button" onClick={() => onChange(mode)}><span>{label}</span><strong>{value.toLocaleString()}</strong><small>{detail}</small></button>;
}

function Summary({ label, value, detail, accent }: { label: string; value: string; detail: string; accent?: DataMode | "fire" }) {
  return <article className={`summary-card ${accent ? `summary-card--${accent}` : ""}`}><p>{label}</p><strong>{value}</strong><small>{detail}</small></article>;
}

function PanelTitle({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) {
  return <div className="panel__title"><div><h2>{icon}{title}</h2><p>{subtitle}</p></div></div>;
}
