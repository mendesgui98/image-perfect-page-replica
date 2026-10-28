import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { qrSource, useMfa } from "@/hooks/use-mfa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconBubble } from "@/components/kpi";

const codeProps = {
  inputMode: "numeric" as const,
  autoComplete: "one-time-code",
  pattern: "[0-9]{6}",
  maxLength: 6,
  required: true,
};

/** Tela exibida após o login quando a conta tem 2FA: pede o código do aplicativo. */
export function MfaChallenge({ onSignOut }: { onSignOut: () => void }) {
  const qc = useQueryClient();
  const { data } = useMfa();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    const factor = data?.factors[0];
    if (!factor) return;
    setBusy(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
    setBusy(false);
    if (error) {
      toast.error("Código inválido ou expirado. Tente o código atual do aplicativo.");
      setCode("");
      return;
    }
    await qc.invalidateQueries();
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={verify} className="w-full max-w-sm space-y-4">
        <IconBubble icon={ShieldCheck} tone="brand" className="h-12 w-12 rounded-2xl" />
        <h1 className="text-xl font-bold">Verificação em duas etapas</h1>
        <p className="text-sm text-muted-foreground">
          Digite o código de 6 dígitos do seu aplicativo autenticador.
        </p>
        <div className="space-y-2">
          <Label htmlFor="mfa-code">Código</Label>
          <Input
            id="mfa-code"
            {...codeProps}
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          />
        </div>
        <Button type="submit" className="w-full" disabled={busy || code.length !== 6}>
          {busy ? "Verificando…" : "Confirmar"}
        </Button>
        <button
          type="button"
          className="min-h-10 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          onClick={onSignOut}
        >
          Sair
        </button>
      </form>
    </div>
  );
}

/** Configurações > Segurança: ativar ou remover o 2FA (TOTP). */
export function MfaSettings({ required }: { required: boolean }) {
  const qc = useQueryClient();
  const { data, error } = useMfa();
  const [enrolling, setEnrolling] = useState<{ id: string; qr: string; secret: string } | null>(
    null,
  );
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["mfa"] });

  async function start() {
    setBusy(true);
    // Remove tentativas anteriores não confirmadas para não acumular fatores pendentes.
    const listed = await supabase.auth.mfa.listFactors();
    for (const f of listed.data?.all ?? []) {
      if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    const { data: enrolled, error: err } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `JMG ${new Date().toISOString().slice(0, 10)}`,
    });
    setBusy(false);
    if (err || !enrolled) {
      toast.error(err?.message ?? "Não foi possível iniciar o cadastro.");
      return;
    }
    setEnrolling({ id: enrolled.id, qr: enrolled.totp.qr_code, secret: enrolled.totp.secret });
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (!enrolling) return;
    setBusy(true);
    const { error: err } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enrolling.id,
      code,
    });
    setBusy(false);
    if (err) {
      toast.error("Código inválido. Confira a hora do celular e tente de novo.");
      return;
    }
    toast.success("Verificação em duas etapas ativada.");
    setEnrolling(null);
    setCode("");
    refresh();
  }

  async function remove(factorId: string) {
    if (!window.confirm("Desativar a verificação em duas etapas desta conta?")) return;
    const { error: err } = await supabase.auth.mfa.unenroll({ factorId });
    if (err) {
      toast.error(err.message);
      return;
    }
    toast.success("Verificação em duas etapas desativada.");
    refresh();
  }

  return (
    <Card className="mt-4">
      <CardHeader className="flex-row items-center gap-3 space-y-0 p-4 sm:p-5">
        {data?.enabled ? (
          <IconBubble icon={ShieldCheck} tone="positive" />
        ) : (
          <IconBubble icon={ShieldAlert} tone="alert" />
        )}
        <CardTitle className="flex flex-wrap items-center gap-2">
          Verificação em duas etapas
          {data?.enabled && <Badge variant="positive">Ativa</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-0 text-sm sm:p-5 sm:pt-0">
        {error && <p className="text-destructive">{(error as Error).message}</p>}
        {data?.enabled ? (
          <>
            <p>
              Ativa. Ao entrar, o sistema pede o código do aplicativo autenticador (Google
              Authenticator, Microsoft Authenticator, 1Password etc.).
            </p>
            {data.factors.map((f) => (
              <div
                key={f.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/50 px-3 py-2.5"
              >
                <span className="font-medium">{f.friendly_name || "Aplicativo autenticador"}</span>
                <Button variant="danger" size="sm" onClick={() => remove(f.id)}>
                  Desativar
                </Button>
              </div>
            ))}
          </>
        ) : enrolling ? (
          <form onSubmit={confirm} className="space-y-3">
            <p>1. Abra o aplicativo autenticador no celular e leia o QR code.</p>
            <img
              src={qrSource(enrolling.qr)}
              alt="QR code para o aplicativo autenticador"
              className="h-44 w-44 rounded-xl border border-border/70 bg-white p-2"
            />
            <p className="text-xs text-muted-foreground">
              Sem câmera? Digite a chave: <code className="break-all">{enrolling.secret}</code>
            </p>
            <p>2. Digite o código de 6 dígitos que aparece no aplicativo.</p>
            <div className="flex max-w-xs gap-2">
              <Input
                {...codeProps}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                aria-label="Código do aplicativo"
              />
              <Button type="submit" disabled={busy || code.length !== 6}>
                Ativar
              </Button>
            </div>
          </form>
        ) : (
          <>
            <p>
              {required
                ? "Recomendado para administradores: protege orçamentos, custos e usuários mesmo se a senha vazar."
                : "Protege sua conta mesmo se a senha vazar."}
            </p>
            <Button onClick={start} disabled={busy}>
              Ativar verificação em duas etapas
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
