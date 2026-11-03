import MapControls from "./MapControls";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
type Point = {
  name: string;
  lat: number;
  lng: number;
  kind?: "facility" | "request";
};
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
  const tiles = useRef<L.TileLayer | null>(null);
  const active = useRef<L.Marker | null>(null);
  useEffect(() => {
    if (!el.current) return;
    const map = L.map(el.current).setView([-6.23, 106.85], 10);
    mapRef.current = map;
    markerLayer.current = L.layerGroup().addTo(map);
    tiles.current = L.tileLayer(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 18,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
      },
    )
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
      const request = p.kind === "request";
      const icon = L.divIcon({
        className:
          "location-map-icon " + (request ? "request-pin" : "facility-pin"),
        iconSize: [44, 44],
        iconAnchor: [22, 22],
        html: request
          ? '<svg viewBox="0 0 44 44" aria-hidden="true"><path d="M22 2C9 2 4 12 7 22l15 20 15-20C40 12 35 2 22 2Z" fill="#102a43" stroke="white" stroke-width="2"/><circle cx="22" cy="17" r="6" fill="white"/></svg>'
          : '<svg viewBox="0 0 44 44" aria-hidden="true"><rect x="3" y="3" width="38" height="38" rx="10" fill="#087f8c" stroke="white" stroke-width="2"/><path d="M22 12v20M12 22h20" stroke="white" stroke-width="5"/></svg>',
      });
      const marker = L.marker([p.lat, p.lng], {
        icon,
        title: "Buka lokasi " + p.name,
      })
        .bindPopup(
          Object.assign(document.createElement("span"), {
            textContent: p.name,
          }),
        )
        .addTo(layer);
      marker.on("click", () => {
        active.current?.getElement()?.classList.remove("is-selected");
        active.current?.setZIndexOffset(0);
        active.current = marker;
        marker.getElement()?.classList.add("is-selected");
        marker.setZIndexOffset(1000);
      });
      const target = marker.getElement();
      target?.setAttribute("tabindex", "0");
      target?.setAttribute("role", "button");
      target?.setAttribute("aria-label", `Buka lokasi ${p.name}`);
      target?.addEventListener("keydown", (event) => {
        if (["Enter", " "].includes((event as KeyboardEvent).key)) {
          event.preventDefault();
          marker.openPopup();
        }
      });
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
      <MapControls
        focus={() => {
          const point = selected
            ? L.latLng(selected[0], selected[1])
            : active.current?.getLatLng();
          if (point) mapRef.current?.panTo(point);
        }}
        fit={() => {
          const points = locations
            .filter(
              (p) =>
                Number.isFinite(p.lat) &&
                Number.isFinite(p.lng) &&
                Math.abs(p.lat) <= 90 &&
                Math.abs(p.lng) <= 180,
            )
            .map((p) => L.latLng(p.lat, p.lng));
          if (selected) points.push(L.latLng(...selected));
          if (points.length)
            mapRef.current?.fitBounds(L.latLngBounds(points), {
              padding: [32, 32],
              maxZoom: 13,
            });
        }}
      >
        <span>
          <i className="facility-symbol" />
          Fasilitas kesehatan
        </span>
        <span>
          <i className="request-symbol" />
          Lokasi permohonan
        </span>
        {onPick && <span>Pilihan lokasi: lingkaran berbingkai</span>}
      </MapControls>
      <div ref={el} className="map" aria-label="Peta lokasi sintetis" />
      {failed && (
        <p role="status">
          Tile peta tidak tersedia. Gunakan daftar lokasi dan koordinat manual.{" "}
          <button
            type="button"
            className="tertiary"
            onClick={() => {
              setFailed(false);
              tiles.current?.redraw();
            }}
          >
            Coba muat peta
          </button>
        </p>
      )}
      <small>
        Lokasi bukan bukti kelayakan pendaratan. Tidak ada pelacakan armada
        nyata.
      </small>
    </>
  );
}
