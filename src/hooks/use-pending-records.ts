import { useEffect, useState } from "react";
import { pendingRecords, subscribePending, type PendingRecord } from "@/lib/offline-records";
import type { QueuedItem } from "@/lib/offline-queue";

/** Registros salvos no aparelho que ainda não chegaram ao servidor. */
export function usePendingRecords(workId?: string) {
  const [items, setItems] = useState<QueuedItem<PendingRecord>[]>([]);
  useEffect(() => {
    let alive = true;
    const load = () =>
      pendingRecords()
        .then((all) => alive && setItems(all))
        .catch(() => alive && setItems([]));
    load();
    const unsubscribe = subscribePending(load);
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);
  return workId ? items.filter((i) => i.data.payload.work_id === workId) : items;
}
