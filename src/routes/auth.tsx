import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { AuthLayout, PasswordInput } from "@/components/auth/auth-layout";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Entrar — JMG Reformas" },
      { name: "description", content: "Acesso à plataforma de gestão da JMG Reformas." },
      { property: "og:title", content: "Entrar — JMG Reformas" },
      { property: "og:description", content: "Acesso à plataforma de gestão da JMG Reformas." },
    ],
  }),
  component: AuthPage,
});

// Em produção o cadastro é só por convite (VITE_SIGNUP_ENABLED=false).
const signupEnabled = import.meta.env["VITE_SIGNUP_ENABLED"] !== "false";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up" | "reset">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/painel" });
      } else if (mode === "up") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/painel",
            data: { full_name: name },
          },
        });
        if (error) throw error;
        toast.success("Conta criada. Confirme seu e-mail e aguarde a liberação do administrador.");
        setMode("in");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/reset-password",
        });
        if (error) throw error;
        toast.success("Enviamos um link para redefinir a senha.");
        setMode("in");
      }
    } catch (err) {
      const msg = (err as Error).message;
      toast.error(msg.includes("Invalid login") ? "E-mail ou senha incorretos." : msg);
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "in" ? "Entrar" : mode === "up" ? "Criar conta" : "Recuperar senha";
  const subtitle =
    mode === "in"
      ? "Acesse a gestão de obras da JMG."
      : mode === "up"
        ? "Depois do cadastro, o administrador libera seu acesso."
        : "Enviaremos um link para você definir uma nova senha.";

  return (
    <AuthLayout>
      <form onSubmit={submit} className="space-y-5">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {mode === "up" && (
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="voce@jmgreformas.com.br"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        {mode !== "reset" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Senha</Label>
              {mode === "in" && (
                <button
                  type="button"
                  className="text-xs font-medium text-primary hover:underline"
                  onClick={() => setMode("reset")}
                >
                  Esqueci a senha
                </button>
              )}
            </div>
            <PasswordInput
              id="password"
              autoComplete={mode === "up" ? "new-password" : "current-password"}
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {mode === "up" && (
              <p className="text-xs text-muted-foreground">Mínimo de 8 caracteres.</p>
            )}
          </div>
        )}
        <Button type="submit" className="h-10 w-full" disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "in" ? "Entrar" : mode === "up" ? "Criar conta" : "Enviar link"}
        </Button>
        <div className="text-center text-sm text-muted-foreground">
          {mode === "in" && signupEnabled && (
            <>
              Ainda não tem acesso?{" "}
              <button
                type="button"
                className="font-medium text-primary hover:underline"
                onClick={() => setMode("up")}
              >
                Criar conta
              </button>
            </>
          )}
          {mode === "in" && !signupEnabled && "O acesso é feito por convite do administrador."}
          {mode !== "in" && (
            <button
              type="button"
              className="font-medium text-primary hover:underline"
              onClick={() => setMode("in")}
            >
              Voltar para o login
            </button>
          )}
        </div>
      </form>
    </AuthLayout>
  );
}
