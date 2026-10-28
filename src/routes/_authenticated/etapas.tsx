import { pageMeta } from "@/lib/page-meta";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Layers, Plus, Tags, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-me";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { commitOnEnter } from "@/lib/enter-submit";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconBubble } from "@/components/kpi";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/etapas")({
  head: () =>
    pageMeta("Etapas e categorias", "Organização de serviços e categorias das obras JMG."),
  component: Etapas,
});

function Etapas() {
  return (
    <div>
      <PageHeader
        title="Etapas e categorias"
        subtitle="Renomeie ou desative sem afetar registros antigos — itens já salvos guardam o nome original."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <EditableList table="stages" title="Etapas da obra" icon={Layers} />
        <EditableList table="cost_categories" title="Categorias de custo" icon={Tags} />
      </div>
    </div>
  );
}

function EditableList({
  table,
  title,
  icon,
}: {
  table: "stages" | "cost_categories";
  title: string;
  icon: LucideIcon;
}) {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const [newName, setNewName] = useState("");
  const { data = [] } = useQuery({
    queryKey: [table],
    queryFn: async () => (await supabase.from(table).select("*").order("sort")).data ?? [],
  });
  const upd = useMutation({
    mutationFn: async ({
      id,
      ...p
    }: {
      id?: string;
      name?: string;
      active?: boolean;
      sort?: number;
    }) => {
      const { error } = id
        ? await supabase.from(table).update(p).eq("id", id)
        : await supabase.from(table).insert(p as { name: string });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [table] }),
    onError: (e) => toast.error((e as Error).message),
  });
  const ro = !me?.isAdmin;

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 space-y-0 p-4 sm:p-5">
        <IconBubble icon={icon} tone="neutral" />
        <div className="min-w-0">
          <CardTitle>{title}</CardTitle>
          {ro && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Somente o administrador pode alterar.
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 p-4 pt-0 sm:p-5 sm:pt-0">
        {data.map((s) => (
          <div key={s.id} className="flex items-center gap-2">
            <Input
              onKeyDown={commitOnEnter}
              className="w-14 shrink-0 text-center num"
              type="number"
              defaultValue={s.sort}
              disabled={ro}
              onBlur={(e) =>
                Number(e.target.value) !== s.sort &&
                upd.mutate({ id: s.id, sort: Number(e.target.value) })
              }
            />
            <Input
              onKeyDown={commitOnEnter}
              defaultValue={s.name}
              disabled={ro}
              className={cn("min-w-0", !s.active && "text-muted-foreground opacity-60")}
              onBlur={(e) =>
                e.target.value.trim() &&
                e.target.value !== s.name &&
                upd.mutate({ id: s.id, name: e.target.value.trim() })
              }
            />
            <Switch
              checked={s.active}
              disabled={ro}
              onCheckedChange={(v) => upd.mutate({ id: s.id, active: v })}
            />
          </div>
        ))}
        {!ro && (
          <form
            className="flex gap-2 pt-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newName.trim()) return;
              upd.mutate({ name: newName.trim(), sort: (data.at(-1)?.sort ?? 0) + 1 });
              setNewName("");
            }}
          >
            <Input
              placeholder="Nova"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <Button type="submit" size="icon" aria-label="Adicionar">
              <Plus className="h-4 w-4" />
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
