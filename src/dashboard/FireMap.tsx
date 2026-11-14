import { useEffect, useMemo, useState } from "react";
import { CircleMarker, MapContainer, Popup, Rectangle, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { LatLng, LatLngBoundsExpression } from "leaflet";

import type { DataMode, DashboardData, MapBounds } from "../types/dashboard";

import "leaflet/dist/leaflet.css";

const sensorColors = { MODIS: "#2563EB", VIIRS: "#0D9488" };
const fallbackLocations: Record<string, { latitude: number; longitude: number; label: string; bounds: MapBounds }> = {
  cambodia: { latitude: 12.5657, longitude: 104.991, label: "Cambodia", bounds: { minLat: 10.4, minLng: 102.3, maxLat: 14.7, maxLng: 107.7 } },
  thailand: { latitude: 15.87, longitude: 100.9925, label: "Thailand", bounds: { minLat: 5.6, minLng: 97.3, maxLat: 20.5, maxLng: 105.7 } },
  vietnam: { latitude: 14.0583, longitude: 108.2772, label: "Vietnam", bounds: { minLat: 8.2, minLng: 102.1, maxLat: 23.4, maxLng: 109.5 } },
  laos: { latitude: 19.8563, longitude: 102.4955, label: "Laos", bounds: { minLat: 13.9, minLng: 100.1, maxLat: 22.6, maxLng: 107.7 } },
};

type FireMapProps = {
  hotspots: DashboardData["hotspots"];
  mode: DataMode;
  startDate: string;
  endDate: string;
  searchRequest: string;
  onAreaChange: (label: string, selectedCount?: number, bounds?: MapBounds) => void;
  onSearchResolved: (label: string, bounds?: MapBounds) => void;
};

export function FireMap({ hotspots, mode, startDate, endDate, searchRequest, onAreaChange, onSearchResolved }: FireMapProps) {
  const [selectedCount, setSelectedCount] = useState(0);
  const [target, setTarget] = useState({ latitude: 12.7, longitude: 105.6, label: "Cambodia" });
  const [searchState, setSearchState] = useState("");
  const visibleHotspots = hotspots.filter((item) => {
    const matchesMode = mode === "harmonized" || item.sensor.toLowerCase() === mode;
    return matchesMode && item.acquisitionDate >= startDate && item.acquisitionDate <= endDate;
  });

  useEffect(() => {
    const query = searchRequest.trim();
    if (!query) return;
    const coordinate = query.match(/^\s*(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (coordinate) {
      const latitude = Number(coordinate[1]);
      const longitude = Number(coordinate[2]);
      if (latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180) {
        const label = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        setTarget({ latitude, longitude, label });
        onSearchResolved(label);
        setSearchState("");
        return;
      }
    }

    const fallback = fallbackLocations[query.toLowerCase()];
    if (fallback) {
      setTarget(fallback);
      onSearchResolved(fallback.label, fallback.bounds);
      setSearchState("");
      return;
    }

    let cancelled = false;
    setSearchState("Searching map...");
    fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`)
      .then((response) => response.ok ? response.json() : [])
      .then((results: Array<{ lat: string; lon: string; display_name: string; boundingbox?: [string, string, string, string] }>) => {
        if (cancelled) return;
        if (!results[0]) { setSearchState("Area not found. Try a country name or coordinates."); return; }
        const found = results[0];
        setTarget({ latitude: Number(found.lat), longitude: Number(found.lon), label: found.display_name });
        const boundingBox = found.boundingbox;
        const bounds = boundingBox ? { minLat: Number(boundingBox[0]), maxLat: Number(boundingBox[1]), minLng: Number(boundingBox[2]), maxLng: Number(boundingBox[3]) } : undefined;
        onSearchResolved(found.display_name, bounds);
        setSearchState("");
      })
      .catch(() => !cancelled && setSearchState("Search unavailable. Try coordinates such as 13.04, 106.45."));
    return () => { cancelled = true; };
  }, [searchRequest, onSearchResolved]);

  function selectBounds(first: LatLng, second: LatLng) {
    const south = Math.min(first.lat, second.lat);
    const north = Math.max(first.lat, second.lat);
    const west = Math.min(first.lng, second.lng);
    const east = Math.max(first.lng, second.lng);
    const selected = visibleHotspots.filter((point) => point.latitude >= south && point.latitude <= north && point.longitude >= west && point.longitude <= east).length;
    setSelectedCount(selected);
    onAreaChange(`${selected} filtered hotspots inside the drawn area`, selected, { minLat: south, minLng: west, maxLat: north, maxLng: east });
  }

  return (
    <div className="fire-map">
      <MapContainer center={[target.latitude, target.longitude]} zoom={6} scrollWheelZoom className="fire-map__canvas">
        <MapViewport latitude={target.latitude} longitude={target.longitude} />
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <AreaSelector onSelected={selectBounds} onProgress={onAreaChange} />
        {visibleHotspots.map((point) => (
          <CircleMarker key={point.id} center={[point.latitude, point.longitude]} radius={8} pathOptions={{ color: "#fff", fillColor: sensorColors[point.sensor], fillOpacity: 1, weight: 2 }}>
            <Popup><strong>{point.sensor} hotspot</strong><br />Detected: {point.acquisitionDate}, {point.acquisitionTime}<br />Confidence: {point.confidence}<br />FRP: {point.frpMw} MW<br />Day/night: {point.daynight === "D" ? "Day" : "Night"}<br />{point.latitude.toFixed(4)}, {point.longitude.toFixed(4)}</Popup>
          </CircleMarker>
        ))}
      </MapContainer>
      <div className="fire-map__meta"><span>Map center: {target.label}</span>{searchState && <span className="map-search-state">{searchState}</span>}<span>Click two corners to select an area.</span></div>
      <div className="fire-map__legend"><span><i className="dot dot--modis" /> MODIS point</span><span><i className="dot dot--viirs" /> VIIRS point</span>{selectedCount > 0 && <span className="map-selection">{selectedCount} selected</span>}</div>
    </div>
  );
}

function MapViewport({ latitude, longitude }: { latitude: number; longitude: number }) {
  const map = useMap();
  useEffect(() => { map.flyTo([latitude, longitude], 7, { duration: .8 }); }, [latitude, longitude, map]);
  return null;
}

function AreaSelector({ onSelected, onProgress }: { onSelected: (first: LatLng, second: LatLng) => void; onProgress: (message: string) => void }) {
  const [firstCorner, setFirstCorner] = useState<LatLng | null>(null);
  const [bounds, setBounds] = useState<LatLngBoundsExpression | null>(null);

  useMapEvents({ click(event) {
    if (!firstCorner || bounds) { setFirstCorner(event.latlng); setBounds(null); onProgress("First corner selected. Click the opposite corner to finish the area."); return; }
    const nextBounds: LatLngBoundsExpression = [[firstCorner.lat, firstCorner.lng], [event.latlng.lat, event.latlng.lng]];
    setBounds(nextBounds);
    onSelected(firstCorner, event.latlng);
  } });

  return bounds ? <Rectangle bounds={bounds} pathOptions={{ color: "#0F766E", fillColor: "#0F766E", fillOpacity: .12, weight: 2 }} /> : null;
}
