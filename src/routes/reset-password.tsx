import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AuthLayout, PasswordInput } from "@/components/auth/auth-layout";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Nova senha — JMG Reformas" },
      { name: "description", content: "Defina uma nova senha de acesso." },
      { property: "og:title", content: "Nova senha — JMG Reformas" },
      { property: "og:description", content: "Defina uma nova senha de acesso." },
    ],
  }),
  component: Reset,
});

function Reset() {
  const [pw, setPw] = useState("");
  const navigate = useNavigate();
  return (
    <AuthLayout>
      <form
        className="space-y-5"
        onSubmit={async (e) => {
          e.preventDefault();
          const { error } = await supabase.auth.updateUser({ password: pw });
          if (error) {
            toast.error(error.message);
            return;
          }
          toast.success("Senha atualizada.");
          navigate({ to: "/painel" });
        }}
      >
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">Definir nova senha</h1>
          <p className="text-sm text-muted-foreground">
            Escolha uma senha com pelo menos 8 caracteres.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-password">Nova senha</Label>
          <PasswordInput
            id="new-password"
            autoComplete="new-password"
            minLength={8}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            required
          />
        </div>
        <Button className="h-10 w-full">Salvar e entrar</Button>
      </form>
    </AuthLayout>
  );
}
