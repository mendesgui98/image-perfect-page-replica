import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, MailPlus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useMe, type Role } from "@/hooks/use-me";
import { apiDownload, apiGet, apiSend } from "@/lib/api-client";
import { fmtDate } from "@/lib/format";
import { selectClass } from "@/components/works/fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, ListSkeleton, PageSkeleton } from "@/components/feedback";

type AdminUser = {
  id: string;
  email: string;
  full_name: string | null;
  roles: Role[];
  mfa: boolean;
  last_sign_in_at: string | null;
  invited_at: string | null;
  confirmed: boolean;
};

const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrador",
  financeiro: "Financeiro",
  equipe: "Equipe de obra",
};
const ROLES = Object.keys(ROLE_LABEL) as Role[];

/** Gestão de usuários pela API própria: convites, papéis, 2FA e backup. */
export function UsersAdmin() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => apiGet<{ users: AdminUser[] }>("/v1/admin/users").then((r) => r.users),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-users"] });

  const setRoles = useMutation({
    mutationFn: ({ id, roles }: { id: string; roles: Role[] }) =>
      apiSend("PUT", `/v1/admin/users/${id}/roles`, { roles }),
    onSuccess: refresh,
    onError: (e) => toast.error((e as Error).message),
  });

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("equipe");
  const invite = useMutation({
    mutationFn: () =>
      apiSend("POST", "/v1/admin/invites", { email, role, ...(name ? { full_name: name } : {}) }),
    onSuccess: () => {
      toast.success(`Convite enviado para ${email}.`);
      setEmail("");
      setName("");
      refresh();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const [exporting, setExporting] = useState(false);
  async function exportBackup() {
    setExporting(true);
    try {
      await apiDownload("/v1/admin/export", "jmg-backup.json");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="mt-4 space-y-4">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MailPlus className="h-4 w-4" /> Convidar usuário
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 sm:grid-cols-[2fr_2fr_1.5fr_auto] sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              invite.mutate();
            }}
          >
            <div className="space-y-1">
              <Label htmlFor="invite-email">E-mail</Label>
              <Input
                id="invite-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="invite-name">Nome</Label>
              <Input id="invite-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <label className="space-y-1 text-sm">
              Perfil
              <select
                className={selectClass}
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" disabled={invite.isPending}>
              {invite.isPending ? "Enviando…" : "Enviar convite"}
            </Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">
            A pessoa recebe um e-mail para definir a senha e já entra com o perfil escolhido.
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardContent className="divide-y p-0">
          {users.isLoading && <ListSkeleton rows={3} className="rounded-none border-0" />}
          {users.error && (
            <p className="p-4 text-sm text-destructive">{(users.error as Error).message}</p>
          )}
          {users.data?.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 font-medium">
                  {u.full_name || u.email}
                  {u.mfa && <ShieldCheck className="h-4 w-4 text-primary" aria-label="2FA ativo" />}
                </div>
                <div className="text-xs text-muted-foreground">
                  {u.email} ·{" "}
                  {u.last_sign_in_at
                    ? `último acesso ${fmtDate(u.last_sign_in_at.slice(0, 10))}`
                    : u.invited_at && !u.confirmed
                      ? "convite pendente"
                      : "nunca acessou"}
                </div>
              </div>
              {ROLES.map((r) => (
                <label key={r} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={u.roles.includes(r)}
                    disabled={setRoles.isPending || (u.id === me?.id && r === "admin")}
                    onChange={(e) =>
                      setRoles.mutate({
                        id: u.id,
                        roles: e.target.checked ? [...u.roles, r] : u.roles.filter((x) => x !== r),
                      })
                    }
                  />
                  {ROLE_LABEL[r]}
                </label>
              ))}
            </div>
          ))}
          <p className="p-4 text-xs text-muted-foreground">
            Administrador e financeiro veem custos, margens e orçamentos. A equipe de obra não tem
            acesso a esses dados — o bloqueio é aplicado no banco de dados.
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="font-medium">Backup dos dados</p>
            <p className="text-xs text-muted-foreground">
              Baixa todas as tabelas em JSON. Arquivos anexos não entram; o backup completo do
              servidor está no guia de infraestrutura.
            </p>
          </div>
          <Button variant="outline" onClick={exportBackup} disabled={exporting}>
            <Download className="h-4 w-4" />
            {exporting ? "Gerando…" : "Exportar backup"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
