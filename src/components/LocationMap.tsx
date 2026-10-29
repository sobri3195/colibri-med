import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
export default function LocationMap({
  locations = [],
  onPick,
}: {
  locations?: { name: string; lat: number; lng: number }[];
  onPick?: (lat: number, lng: number) => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!el.current) return;
    const map = L.map(el.current).setView([-6.23, 106.85], 10);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
    })
      .on("tileerror", () => setFailed(true))
      .addTo(map);
    for (const p of locations)
      L.circleMarker([p.lat, p.lng], { radius: 8, color: "#0d9488" })
        .bindPopup(
          Object.assign(document.createElement("span"), {
            textContent: p.name,
          }),
        )
        .addTo(map);
    map.on("click", (e: L.LeafletMouseEvent) =>
      onPick?.(e.latlng.lat, e.latlng.lng),
    );
    return () => {
      map.remove();
    };
  }, [locations, onPick]);
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
