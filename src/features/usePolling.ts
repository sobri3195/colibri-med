import { useCallback, useEffect, useRef, useState } from "react";
export function usePolling(load: () => Promise<void>, interval = 30000) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [updated, setUpdated] = useState("");
  const failures = useRef(0);
  const tail = useRef<Promise<void>>(Promise.resolve());
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const refresh = useCallback(() => {
    const pending = tail.current.then(async () => {
      if (!active.current) return;
      setLoading(true);
      try {
        await load();
        setError("");
        failures.current = 0;
        setUpdated(new Date().toISOString());
      } catch (e) {
        setError(String(e));
        failures.current++;
      } finally {
        if (active.current) setLoading(false);
      }
    });
    tail.current = pending.catch(() => {});
    return pending;
  }, [load]);
  useEffect(() => {
    void refresh();
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    const tick = () => {
      timer = setTimeout(
        async () => {
          if (!document.hidden && navigator.onLine) await refresh();
          if (!stopped) tick();
        },
        Math.min(interval * 2 ** failures.current, 300000),
      );
    };
    tick();
    const visible = () => {
      if (!document.hidden && navigator.onLine) void refresh();
    };
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("online", visible);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("online", visible);
    };
  }, [refresh, interval]);
  return { error, loading, updated, refresh };
}
