import { useEffect, useState } from "react";
import { CircleMarker, MapContainer, Popup, Rectangle, TileLayer, ZoomControl, useMap, useMapEvents } from "react-leaflet";
import type { LatLng, LatLngBoundsExpression } from "leaflet";

import type { DashboardData, MapBounds, MapLayer } from "../types/dashboard";

import "leaflet/dist/leaflet.css";

const sensorColors = { MODIS: "#2563EB", VIIRS: "#0D9488" };
const agreementColors = { both: "#7C3AED", modis_only: "#2563EB", viirs_only: "#0D9488" };
const agreementLabels = { both: "Both sensors agree", modis_only: "MODIS only", viirs_only: "VIIRS only" };
const cambodia = { latitude: 12.7, longitude: 105.6 };

type FireMapProps = {
  hotspots: DashboardData["hotspots"];
  layer: MapLayer;
  selectedBounds: MapBounds | null;
  onBoundsChange: (bounds: MapBounds | null) => void;
};

export function FireMap({ hotspots, layer, selectedBounds, onBoundsChange }: FireMapProps) {
  const [selectingArea, setSelectingArea] = useState(false);
  const visibleEvents = hotspots;

  return (
    <div className="fire-map">
      <MapContainer center={[cambodia.latitude, cambodia.longitude]} zoom={6} zoomControl={false} scrollWheelZoom={false} className="fire-map__canvas">
        <MapViewport latitude={cambodia.latitude} longitude={cambodia.longitude} />
        <ZoomControl position="topleft" />
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <AreaSelector enabled={selectingArea} selectedBounds={selectedBounds} onBoundsChange={(bounds) => { onBoundsChange(bounds); setSelectingArea(false); }} />
        {visibleEvents.map((event) => (
          <CircleMarker key={event.id} center={[event.latitude, event.longitude]} radius={8} pathOptions={{ color: "#fff", fillColor: event.agreement ? agreementColors[event.agreement] : sensorColors[event.sensor], fillOpacity: 1, weight: 2 }}>
            <Popup><strong>{event.agreement ? agreementLabels[event.agreement] : `${event.sensor} observation`}</strong><br />Date: {event.acquisitionDate}<br />{event.detectionCount && <>Detections in event: {event.detectionCount}<br /></>}Confidence: {event.confidence}<br />FRP: {event.frpMw} MW<br />Day/night: {event.daynight === "M" ? "Mixed" : event.daynight === "D" ? "Day" : "Night"}<br />{event.latitude.toFixed(4)}, {event.longitude.toFixed(4)}</Popup>
          </CircleMarker>
        ))}
      </MapContainer>
      {visibleEvents.length === 0 && <div className="map-no-observations">No observations for these filters</div>}
      <div className="map-actions"><button type="button" className={selectingArea ? "is-active" : ""} onClick={() => setSelectingArea((current) => !current)}>{selectingArea ? "Cancel selection" : "Select area"}</button>{selectedBounds && <button type="button" onClick={() => onBoundsChange(null)}>Clear selection</button>}</div>
      <div className="fire-map__meta"><span>Map center: Cambodia</span><span>{selectingArea ? "Drag on the map to select an area" : "Drag to pan; use + / − to zoom"}</span></div>
      <div className="fire-map__legend">{layer === "events" ? <><span><i className="dot dot--both" /> Both sensors</span><span><i className="dot dot--viirs" /> VIIRS only</span><span><i className="dot dot--modis" /> MODIS only</span></> : layer === "combined" ? <><span><i className="dot dot--modis" /> MODIS observations</span><span><i className="dot dot--viirs" /> VIIRS observations</span></> : <span><i className={layer === "modis" ? "dot dot--modis" : "dot dot--viirs"} /> {layer.toUpperCase()} observations</span>}</div>
    </div>
  );
}

function MapViewport({ latitude, longitude }: { latitude: number; longitude: number }) {
  const map = useMap();
  useEffect(() => { map.flyTo([latitude, longitude], 6, { duration: 0.8 }); }, [latitude, longitude, map]);
  return null;
}

function AreaSelector({ enabled, selectedBounds, onBoundsChange }: { enabled: boolean; selectedBounds: MapBounds | null; onBoundsChange: (bounds: MapBounds | null) => void }) {
  const [start, setStart] = useState<LatLng | null>(null);
  const [bounds, setBounds] = useState<LatLngBoundsExpression | null>(null);
  const map = useMapEvents({
    mousedown(event) {
      if (!enabled) return;
      map.dragging.disable();
      setStart(event.latlng);
      setBounds([[event.latlng.lat, event.latlng.lng], [event.latlng.lat, event.latlng.lng]]);
    },
    mousemove(event) {
      if (!enabled || !start) return;
      setBounds([[start.lat, start.lng], [event.latlng.lat, event.latlng.lng]]);
    },
    mouseup(event) {
      if (!enabled || !start) return;
      map.dragging.enable();
      const minLat = Math.min(start.lat, event.latlng.lat);
      const maxLat = Math.max(start.lat, event.latlng.lat);
      const minLng = Math.min(start.lng, event.latlng.lng);
      const maxLng = Math.max(start.lng, event.latlng.lng);
      setStart(null);
      if (minLat === maxLat || minLng === maxLng) {
        setBounds(null);
        return;
      }
      onBoundsChange({ minLat, minLng, maxLat, maxLng });
    },
  });

  useEffect(() => () => { map.dragging.enable(); }, [map]);

  useEffect(() => {
    if (!enabled) {
      setStart(null);
      setBounds(null);
      map.dragging.enable();
    }
  }, [enabled, map]);

  const persistedBounds: LatLngBoundsExpression | null = selectedBounds ? [[selectedBounds.minLat, selectedBounds.minLng], [selectedBounds.maxLat, selectedBounds.maxLng]] : null;
  return (bounds ?? persistedBounds) ? <Rectangle bounds={bounds ?? persistedBounds!} pathOptions={{ color: "#0F766E", fillColor: "#0F766E", fillOpacity: 0.12, weight: 2 }} /> : null;
}
