import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden lg:block">
        <img
          src="/proposta-capa.jpg"
          alt="Ambiente reformado pela JMG"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-y-0 left-0 w-10 bg-primary" />
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary p-2">
              <img src="/jmg-logo-white.png" alt="JMG" className="h-full w-full object-contain" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-primary">JMG Reformas</h1>
              <p className="text-sm text-muted-foreground">Gestão de obras</p>
            </div>
          </div>
          <h2 className="text-lg font-semibold">
            {mode === "in" ? "Entrar" : mode === "up" ? "Criar conta" : "Recuperar senha"}
          </h2>
          {mode === "up" && (
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {mode !== "reset" && (
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          )}
          <Button type="submit" className="w-full" size="lg" disabled={busy}>
            {mode === "in" ? "Entrar" : mode === "up" ? "Criar conta" : "Enviar link"}
          </Button>
          <div className="flex justify-between text-sm">
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() => setMode(mode === "up" ? "in" : "up")}
            >
              {mode === "up" ? "Já tenho conta" : "Criar conta"}
            </button>
            <button
              type="button"
              className="text-muted-foreground hover:underline"
              onClick={() => setMode("reset")}
            >
              Esqueci a senha
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Novas contas precisam de liberação do administrador para acessar os dados da empresa.
          </p>
        </form>
      </div>
    </div>
  );
}
