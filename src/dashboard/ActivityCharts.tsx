import { useMemo } from "react";
import ReactECharts from "echarts-for-react";

import type { DashboardData, DataMode } from "../types/dashboard";

const modeLabel = { modis: "Raw MODIS", viirs: "Raw VIIRS", harmonized: "Combined sources" };
const modeColor = { modis: "#2563EB", viirs: "#0D9488", harmonized: "#EA580C" };
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function NoObservations({ height = 280 }: { height?: number }) {
  return <div className="no-observations" style={{ height }}><strong>No observations</strong><span>Try another sensor, detection type, date range, or map area.</span></div>;
}

export function ActivityVisualization({ data, mode, timeView, scale = 1 }: { data: DashboardData; mode: DataMode; timeView: "week" | "year"; scale?: number }) {
  const hasObservations = timeView === "year" ? data.yearlyActivity.some((item) => item[mode] > 0) : data.weeklyActivity.some((item) => item.activity > 0);
  const option = useMemo(() => {
    if (timeView === "year") {
      return {
        color: [modeColor[mode]], tooltip: { trigger: "axis" }, grid: { top: 22, right: 18, bottom: 34, left: 50 },
        xAxis: { type: "category", data: data.yearlyActivity.map((item) => String(item.year)), axisLine: { lineStyle: { color: "#cbd5e1" } } },
        yAxis: { type: "value", splitLine: { lineStyle: { color: "#e2e8f0" } } },
        series: [{ name: modeLabel[mode], type: "bar", barMaxWidth: 28, data: data.yearlyActivity.map((item) => Math.round(item[mode] * scale)), itemStyle: { borderRadius: [5, 5, 0, 0] } }],
      };
    }
    const years = [...new Set(data.weeklyActivity.map((item) => item.year))].sort((left, right) => left - right);
    const maxWeek = Math.max(1, ...data.weeklyActivity.map((item) => item.week));
    const weeks = Array.from({ length: maxWeek }, (_, index) => index + 1);
    const values = data.weeklyActivity.map((item) => [item.week, String(item.year), Math.round(item.activity * scale)]);
    const maximum = Math.max(1, ...data.weeklyActivity.map((item) => item.activity * scale));
    return {
      tooltip: { position: "top", formatter: (item: { value: [number, string, number] }) => `Year ${item.value[1]}<br />Week ${item.value[0]}<br /><b>${item.value[2]} detections</b>` },
      grid: { top: 22, right: 18, bottom: 76, left: 52 },
      xAxis: { type: "category", data: weeks, name: "Week", nameLocation: "middle", nameGap: 30, axisLabel: { interval: 3, color: "#64748b" }, axisLine: { lineStyle: { color: "#cbd5e1" } } },
      yAxis: { type: "category", data: years.map(String), axisLabel: { color: "#64748b" }, axisLine: { lineStyle: { color: "#cbd5e1" } } },
      visualMap: { min: 0, max: maximum, calculable: false, orient: "horizontal", left: "center", bottom: 8, text: ["More", "Less"], inRange: { color: ["#fff7ed", "#fdba74", "#ea580c", "#9a3412"] }, textStyle: { color: "#64748b" } },
      series: [{ name: modeLabel[mode], type: "heatmap", data: values, itemStyle: { borderColor: "#fff", borderWidth: 1 } }],
    };
  }, [data.weeklyActivity, data.yearlyActivity, mode, scale, timeView]);
  return hasObservations ? <ReactECharts option={option} style={{ height: 360, width: "100%" }} notMerge lazyUpdate /> : <NoObservations height={360} />;
}

export function SeasonalChart({ data, mode, scale = 1 }: { data: DashboardData; mode: DataMode; scale?: number }) {
  if (!data.trend.some((item) => item.activity > 0)) return <NoObservations />;
  const option = {
    color: [modeColor[mode]], tooltip: { trigger: "axis" }, grid: { top: 24, right: 18, bottom: 34, left: 45 },
    xAxis: { type: "category", data: data.trend.map((item) => item.month), axisLine: { lineStyle: { color: "#cbd5e1" } } },
    yAxis: { type: "value", splitLine: { lineStyle: { color: "#e2e8f0" } } },
    series: [{ name: modeLabel[mode], type: "line", smooth: true, lineStyle: { width: 3 }, data: data.trend.map((item) => Math.round(item.activity * scale)), symbol: "none" }],
  };
  return <ReactECharts option={option} style={{ height: 280, width: "100%" }} notMerge lazyUpdate />;
}

export function MonthlyCalendar({ data, mode, selectedMonth, onMonthSelect, scale = 1 }: { data: DashboardData; mode: DataMode; selectedMonth: number; onMonthSelect: (month: number) => void; scale?: number }) {
  if (!data.calendar.some((item) => item.activity > 0)) return <NoObservations height={350} />;
  const years = [...new Set(data.calendar.map((item) => item.year))].sort((left, right) => left - right);
  const values = data.calendar.map((item) => [item.month - 1, String(item.year), Math.round(item.activity * scale)]);
  const maximum = Math.max(1, ...data.calendar.map((item) => item.activity * scale));
  const option = {
    tooltip: { position: "top", formatter: (item: { value: [number, string, number] }) => `${monthNames[item.value[0]]} ${item.value[1]}<br /><b>${item.value[2]} detections</b>` },
    grid: { top: 15, right: 12, bottom: 76, left: 52 },
    xAxis: { type: "category", data: monthNames, axisLine: { lineStyle: { color: "#cbd5e1" } } },
    yAxis: { type: "category", data: years.map(String), axisLabel: { color: "#64748b" }, axisLine: { lineStyle: { color: "#cbd5e1" } } },
    visualMap: { min: 0, max: maximum, orient: "horizontal", left: "center", bottom: 8, calculable: false, text: ["More", "Less"], inRange: { color: ["#fff7ed", "#fed7aa", "#fb923c", "#c2410c"] }, textStyle: { color: "#64748b" } },
    series: [{ name: modeLabel[mode], type: "heatmap", data: values, itemStyle: { borderColor: "#fff", borderWidth: 2 }, emphasis: { itemStyle: { borderColor: selectedMonth >= 0 ? "#0F766E" : "#fff", borderWidth: 3 } } }],
  };
  return <ReactECharts option={option} style={{ height: 380, width: "100%" }} onEvents={{ click: (params: { value: [number] }) => onMonthSelect(params.value[0]) }} notMerge lazyUpdate />;
}

export function SameMonthComparison({ data, mode, month, scale = 1 }: { data: DashboardData; mode: DataMode; month: number; scale?: number }) {
  const values = data.calendar.filter((item) => item.month === month + 1).sort((left, right) => left.year - right.year);
  if (!values.some((item) => item.activity > 0)) return <NoObservations height={250} />;
  const option = {
    color: [modeColor[mode]], tooltip: { trigger: "axis" }, grid: { top: 20, right: 10, bottom: 35, left: 42 },
    xAxis: { type: "category", data: values.map((item) => String(item.year)), axisLabel: { color: "#64748b" }, axisLine: { lineStyle: { color: "#cbd5e1" } } },
    yAxis: { type: "value", splitLine: { lineStyle: { color: "#e2e8f0" } } },
    series: [{ name: `${monthNames[month]} activity`, type: "bar", data: values.map((item) => Math.round(item.activity * scale)), barMaxWidth: 20, itemStyle: { borderRadius: [4, 4, 0, 0] } }],
  };
  return <ReactECharts option={option} style={{ height: 250, width: "100%" }} notMerge lazyUpdate />;
}

export function HarmonizationEvidenceChart({ data }: { data: DashboardData }) {
  if (!data.rawYearlyActivity.some((item) => item.modis > 0 || item.viirs > 0)) return <NoObservations height={230} />;
  const option = {
    color: ["#2563EB", "#0D9488", "#EA580C"], tooltip: { trigger: "axis" }, legend: { bottom: 0, textStyle: { color: "#475569" } }, grid: { top: 22, right: 18, bottom: 44, left: 50 },
    xAxis: { type: "category", data: data.rawYearlyActivity.map((item) => String(item.year)), axisLabel: { color: "#64748b" }, axisLine: { lineStyle: { color: "#cbd5e1" } } }, yAxis: { type: "value", splitLine: { lineStyle: { color: "#e2e8f0" } } },
    series: [
      { name: "MODIS observations", type: "line", smooth: true, symbol: "circle", symbolSize: 7, lineStyle: { width: 3 }, data: data.rawYearlyActivity.map((item) => item.modis) },
      { name: "VIIRS observations", type: "line", smooth: true, symbol: "circle", symbolSize: 7, lineStyle: { width: 3 }, data: data.rawYearlyActivity.map((item) => item.viirs) },
      { name: "Combined observations", type: "line", smooth: true, symbol: "circle", symbolSize: 7, lineStyle: { width: 3 }, data: data.rawYearlyActivity.map((item) => item.harmonized) },
    ],
  };
  return <ReactECharts option={option} style={{ height: 230, width: "100%" }} notMerge lazyUpdate />;
}

export function RegionalComparisonChart({ region }: { region: string }) {
  const option = {
    title: { text: `No ${region} reference data yet`, subtext: "Import a regional FIRMS archive to enable this comparison.", left: "center", top: "middle", textStyle: { color: "#475569", fontSize: 14 }, subtextStyle: { color: "#94a3b8", fontSize: 11 } },
    xAxis: { show: false, type: "category", data: [] }, yAxis: { show: false, type: "value" }, series: [],
  };
  return <ReactECharts option={option} style={{ height: 230, width: "100%" }} notMerge lazyUpdate />;
}
