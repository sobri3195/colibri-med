import { useEffect, useState } from "react";
import type { Actor } from "../types";
import { outboxOwner } from "../services/api";
import { outbox } from "../services/storage";
export function useConnection(actor: Actor | null, path: string) {
  const [online, setOnline] = useState(navigator.onLine);
  const [pending, setPending] = useState<number | null>(null);
  const owner = outboxOwner(actor);
  useEffect(() => {
    let active = true;
    const update = () => {
      setOnline(navigator.onLine);
      void outbox(owner)
        .then((rows) => active && setPending(rows.length))
        .catch(() => active && setPending(null));
    };
    update();
    for (const event of ["online", "offline", "colibri-outbox-changed"])
      window.addEventListener(event, update);
    return () => {
      active = false;
      for (const event of ["online", "offline", "colibri-outbox-changed"])
        window.removeEventListener(event, update);
    };
  }, [owner, path]);
  return { online, pending };
}
