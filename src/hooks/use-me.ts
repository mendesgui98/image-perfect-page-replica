import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Role = "admin" | "financeiro" | "equipe";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const [{ data: roles }, { data: profile }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", u.user.id),
        supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle(),
      ]);
      const list = (roles ?? []).map((r) => r.role as Role);
      return {
        id: u.user.id,
        email: u.user.email ?? "",
        name: profile?.full_name || u.user.email || "",
        roles: list,
        isAdmin: list.includes("admin"),
        canSeeCosts: list.includes("admin") || list.includes("financeiro"),
      };
    },
    staleTime: 60_000,
  });
}
