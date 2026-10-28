import { queryOptions } from "@tanstack/react-query";
import { compressImage } from "./image-compress";
import { supabase } from "@/integrations/supabase/client";
export const worksOptions = queryOptions({
  queryKey: ["works"],
  queryFn: async () => {
    const r = await supabase
      .from("work_registry")
      .select("*")
      .eq("archived", false)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (r.error) throw r.error;
    return r.data;
  },
});
export const scheduleVersionsOptions = (id: string) =>
  queryOptions({
    queryKey: ["schedule-versions", id],
    queryFn: async () => {
      const r = await supabase
        .from("work_schedule_versions")
        .select("*")
        .eq("work_id", id)
        .order("version");
      if (r.error) throw r.error;
      return r.data;
    },
  });
export const workOptions = (id: string) =>
  queryOptions({
    queryKey: ["work", id],
    queryFn: async () => {
      const [w, s, r] = await Promise.all([
        supabase.from("work_registry").select("*").eq("id", id).single(),
        supabase
          .from("work_stages")
          .select("*")
          .eq("removed", false)
          .eq("work_id", id)
          .order("sort"),
        supabase
          .from("work_records")
          .select("*")
          .eq("work_id", id)
          .order("record_date", { ascending: false }),
      ]);
      if (w.error) throw w.error;
      if (s.error) throw s.error;
      if (r.error) throw r.error;
      return { work: w.data, stages: s.data, records: r.data };
    },
  });
/** Envia um arquivo ao bucket privado. Fotos grandes são comprimidas antes do envio. */
export async function uploadDocument(original: File, folder: string) {
  const file = await compressImage(original);
  const path = `${folder}/${crypto.randomUUID()}.${
    file.name
      .split(".")
      .at(-1)
      ?.replace(/[^a-zA-Z0-9]/g, "") || "bin"
  }`;
  const r = await supabase.storage.from("jmg-documents").upload(path, file);
  if (r.error) throw r.error;
  return path;
}
export async function openDocument(path: string) {
  const r = await supabase.storage.from("jmg-documents").createSignedUrl(path, 300);
  if (r.error) throw r.error;
  window.open(r.data.signedUrl, "_blank", "noopener,noreferrer");
}
