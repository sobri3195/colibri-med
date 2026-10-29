import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
export interface AircraftMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
  path: [number, number][];
}
const helicopterIcon = L.divIcon({
  className: "aircraft-map-icon",
  iconSize: [42, 42],
  iconAnchor: [21, 21],
  html: '<svg viewBox="0 0 48 48" width="42" height="42" aria-hidden="true"><circle cx="24" cy="24" r="21" fill="#12324b" stroke="#fff" stroke-width="2"/><g fill="none" stroke="#b1e4d6" stroke-width="2.5" stroke-linecap="round"><path d="M12 13h24M24 13v7M17 34h16M20 30v4M30 29v5M15 24l-5-4v10l5-2"/><path d="M15 21h12c6 0 10 4 10 7H16z"/><path d="M29 22v6"/></g></svg>',
});
export default function AircraftMap({
  aircraft,
  selected,
  select,
  playback,
}: {
  aircraft: AircraftMarker[];
  selected: string;
  select: (id: string) => void;
  playback: boolean;
}) {
  const element = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markers = useRef(new Map<string, L.Marker>());
  const trails = useRef<L.LayerGroup | null>(null);
  const selectRef = useRef(select);
  selectRef.current = select;
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!element.current) return;
    const map = L.map(element.current).setView([-6.25, 106.88], 12);
    mapRef.current = map;
    trails.current = L.layerGroup().addTo(map);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
    })
      .on("tileerror", () => setFailed(true))
      .addTo(map);
    return () => {
      map.remove();
      mapRef.current = null;
      trails.current = null;
      markers.current.clear();
    };
  }, []);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const ids = new Set(aircraft.map((a) => a.id));
    for (const [id, marker] of markers.current)
      if (!ids.has(id)) {
        marker.remove();
        markers.current.delete(id);
      }
    for (const a of aircraft) {
      let marker = markers.current.get(a.id);
      if (!marker) {
        marker = L.marker([a.lat, a.lng], {
          icon: helicopterIcon,
          keyboard: true,
          title: a.name + " — SIMULASI",
          alt: a.name + " — SIMULASI",
        })
          .on("click", () => selectRef.current(a.id))
          .addTo(map);
        markers.current.set(a.id, marker);
      }
      marker.setLatLng([a.lat, a.lng]);
      marker.setZIndexOffset(a.id === selected ? 1000 : 0);
      marker.bindPopup(
        Object.assign(document.createElement("span"), {
          textContent:
            a.name +
            " — " +
            (playback ? "POSISI ILUSTRASI" : "POSISI DILAPORKAN SINTETIS"),
        }),
      );
    }
    trails.current?.clearLayers();
    if (playback)
      for (const a of aircraft)
        if (a.path.length > 1)
          L.polyline(a.path, {
            color: "#d39135",
            weight: 2,
            dashArray: "5 7",
          }).addTo(trails.current!);
  }, [aircraft, selected, playback]);
  useEffect(() => {
    const marker = markers.current.get(selected);
    if (marker && mapRef.current) mapRef.current.panTo(marker.getLatLng());
  }, [selected]);
  return (
    <>
      <div
        className="aircraft-map"
        ref={element}
        aria-label="Peta helikopter simulasi"
      />
      {failed && (
        <p role="status" className="notice">
          Tile peta tidak tersedia. Daftar koordinat, kontrol simulasi, dan
          laporan tetap dapat digunakan.
        </p>
      )}
      <small>
        SIMULASI. Jejak ilustrasi bukan rute penerbangan, ETA, atau bukti
        kelayakan pendaratan.
      </small>
    </>
  );
}
