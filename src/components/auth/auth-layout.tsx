import { useState, type ReactNode } from "react";
import { CalendarCheck, Eye, EyeOff, HardHat, Wallet } from "lucide-react";
import { Input } from "@/components/ui/input";

const HIGHLIGHTS = [
  { icon: HardHat, text: "Obras, etapas e diário com fotos" },
  { icon: CalendarCheck, text: "Cronogramas previstos e realizados" },
  { icon: Wallet, text: "Orçamentos, contratos e financeiro" },
];

/** Tela dividida das páginas de acesso: imagem da marca à esquerda, formulário à direita. */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden lg:block">
        <img
          src="/proposta-capa.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.3_0.12_258/0.92)] via-[oklch(0.35_0.14_258/0.75)] to-[oklch(0.2_0.05_262/0.55)]" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 p-2 ring-1 ring-white/25 backdrop-blur">
              <img src="/jmg-logo-white.png" alt="" className="h-full w-full object-contain" />
            </span>
            <span className="font-brand text-lg font-extrabold tracking-tight">JMG Reformas</span>
          </div>
          <div className="max-w-md space-y-6">
            <h2 className="text-3xl font-semibold leading-tight tracking-tight">
              Do orçamento à entrega, cada obra em um só lugar.
            </h2>
            <ul className="space-y-3 text-sm text-white/85">
              {HIGHLIGHTS.map((h) => (
                <li key={h.text} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/20">
                    <h.icon className="h-4 w-4" />
                  </span>
                  {h.text}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-white/60">© {new Date().getFullYear()} JMG Reformas</p>
        </div>
      </aside>
      <main className="flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary p-2">
              <img src="/jmg-logo-white.png" alt="" className="h-full w-full object-contain" />
            </span>
            <span className="font-brand text-lg font-extrabold tracking-tight">JMG Reformas</span>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

/** Campo de senha com botão para mostrar/ocultar. */
export function PasswordInput(props: React.ComponentProps<typeof Input>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={show ? "text" : "password"} className="pr-10" />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
        aria-label={show ? "Ocultar senha" : "Mostrar senha"}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
