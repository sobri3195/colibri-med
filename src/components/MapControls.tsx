import { Crosshair, Expand, Layers } from "lucide-react";
import type { ReactNode } from "react";
export default function MapControls({
  focus,
  fit,
  children,
}: {
  focus: () => void;
  fit: () => void;
  children: ReactNode;
}) {
  return (
    <div className="map-tools">
      <div className="map-tool-actions">
        <button type="button" className="secondary" onClick={focus}>
          <Crosshair size={17} />
          Fokus pilihan
        </button>
        <button type="button" className="secondary" onClick={fit}>
          <Expand size={17} />
          Semua objek
        </button>
      </div>
      <details className="map-key">
        <summary>
          <Layers size={17} />
          Legenda
        </summary>
        <div className="map-legend">{children}</div>
      </details>
    </div>
  );
}
