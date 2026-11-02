import { useRef, useState } from "react";
export function useDraftRestore<T>(initial: T) {
  const baseline = useRef(initial);
  const [pending, setPending] = useState<null | (() => void)>(null);
  const markSaved = (value: T) => {
    baseline.current = structuredClone(value);
  };
  const restore = (current: T, next: T, apply: () => void) => {
    const load = () => {
      apply();
      markSaved(next);
    };
    if (
      JSON.stringify(current) !== JSON.stringify(baseline.current) &&
      JSON.stringify(current) !== JSON.stringify(next)
    )
      setPending(() => load);
    else load();
  };
  const confirmation = pending && (
    <div className="notice" role="group" aria-label="Konfirmasi muat draft">
      <p>
        Isian saat ini berbeda dan belum disimpan sebagai draft terakhir. Muat
        draft akan menggantinya. Batal untuk meninjau atau menyimpan isian
        terlebih dahulu.
      </p>
      <button
        type="button"
        onClick={() => {
          pending();
          setPending(null);
        }}
      >
        Ganti isian dengan draft
      </button>
      <button
        type="button"
        className="secondary"
        onClick={() => setPending(null)}
      >
        Pertahankan isian
      </button>
    </div>
  );
  return { markSaved, restore, confirmation };
}
