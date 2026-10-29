import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
type Point = { name: string; lat: number; lng: number };
const empty: Point[] = [];
export default function LocationMap({
  locations = empty,
  onPick,
  selected,
}: {
  locations?: Point[];
  onPick?: (lat: number, lng: number) => void;
  selected?: [number, number];
}) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayer = useRef<L.LayerGroup | null>(null);
  const selectedMarker = useRef<L.CircleMarker | null>(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!el.current) return;
    const map = L.map(el.current).setView([-6.23, 106.85], 10);
    mapRef.current = map;
    markerLayer.current = L.layerGroup().addTo(map);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
    })
      .on("tileerror", () => setFailed(true))
      .addTo(map);
    map.on("click", (e: L.LeafletMouseEvent) =>
      pickRef.current?.(e.latlng.lat, e.latlng.lng),
    );
    return () => {
      map.remove();
      mapRef.current = null;
      markerLayer.current = null;
      selectedMarker.current = null;
    };
  }, []);
  useEffect(() => {
    const layer = markerLayer.current;
    if (!layer) return;
    layer.clearLayers();
    for (const p of locations) {
      if (
        !Number.isFinite(p.lat) ||
        !Number.isFinite(p.lng) ||
        Math.abs(p.lat) > 90 ||
        Math.abs(p.lng) > 180
      )
        continue;
      L.circleMarker([p.lat, p.lng], { radius: 8, color: "#0d9488" })
        .bindPopup(
          Object.assign(document.createElement("span"), {
            textContent: p.name,
          }),
        )
        .addTo(layer);
    }
  }, [locations]);
  const lat = selected?.[0],
    lng = selected?.[1];
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (
      lat === undefined ||
      lng === undefined ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      Math.abs(lat) > 90 ||
      Math.abs(lng) > 180
    ) {
      selectedMarker.current?.remove();
      selectedMarker.current = null;
      return;
    }
    if (selectedMarker.current) selectedMarker.current.setLatLng([lat, lng]);
    else
      selectedMarker.current = L.circleMarker([lat, lng], {
        radius: 10,
        color: "#b45309",
      }).addTo(map);
    map.panTo([lat, lng]);
  }, [lat, lng]);
  return (
    <>
      <div ref={el} className="map" aria-label="Peta lokasi sintetis" />
      {failed && (
        <p role="status">
          Tile peta tidak tersedia. Gunakan daftar lokasi dan koordinat manual.
        </p>
      )}
      <small>
        Lokasi bukan bukti kelayakan pendaratan. Tidak ada pelacakan armada
        nyata.
      </small>
    </>
  );
}
