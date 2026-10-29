import { useEffect, useState } from "react";
import type { Actor } from "../types";
import { getLocal, putLocal } from "../services/storage";
import { outboxOwner } from "../services/api";
export function usePreferences(actor: Actor) {
  const [interval, setInterval] = useState(30000);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const key = outboxOwner(actor) + ":preferences";
  useEffect(() => {
    let active = true;
    void getLocal("drafts", key)
      .then((p) => {
        if (active && [30000, 60000, 120000].includes(p?.interval))
          setInterval(p.interval);
      })
      .catch(
        () => active && setError("Preferensi perangkat belum dapat dibaca."),
      );
    return () => {
      active = false;
    };
  }, [key]);
  return {
    interval,
    error,
    saving,
    change: async (value: number) => {
      if (![30000, 60000, 120000].includes(value)) return;
      setInterval(value);
      setSaving(true);
      try {
        await putLocal("drafts", key, { interval: value });
        setError("");
      } catch {
        setError(
          "Pengaturan berlaku untuk sesi ini; penyimpanan perangkat gagal.",
        );
      } finally {
        setSaving(false);
      }
    },
  };
}
