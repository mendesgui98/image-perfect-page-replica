import { useEffect } from "react";
import { useSearch } from "@tanstack/react-router";
export function useRecordFocus(ready: unknown) {
  const search = useSearch({ strict: false }) as { entry?: string; record?: string };
  const selected = search.entry || search.record || "";
  useEffect(() => {
    if (!ready || !selected) return;
    document
      .getElementById(`record-${selected}`)
      ?.scrollIntoView({ block: "center", behavior: "instant" });
  }, [selected, ready]);
  return selected;
}
