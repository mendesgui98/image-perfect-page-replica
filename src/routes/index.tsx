import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "JMG Reformas — Plataforma de gestão" },
      { name: "description", content: "Do orçamento à entrega: a gestão das obras da JMG Reformas em um só lugar." },
      { property: "og:title", content: "JMG Reformas — Plataforma de gestão" },
      { property: "og:description", content: "Do orçamento à entrega: a gestão das obras da JMG Reformas." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <img src="/proposta-capa.jpg" alt="Sala reformada pela JMG" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/70 to-transparent" />
      <div className="relative flex min-h-screen flex-col justify-end p-8 text-primary-foreground md:p-16">
        <img src="/jmg-logo-white.png" alt="JMG" className="mb-6 h-16 w-16 object-contain" />
        <h1 className="max-w-2xl text-5xl font-black leading-[0.95] md:text-7xl">Gestão de obras</h1>
        <p className="mt-4 max-w-md text-lg opacity-90">Orçamento, contrato, obra, compras, financeiro e entrega — tudo conectado.</p>
        <div className="mt-8">
          <Button asChild size="lg" variant="secondary">
            <Link to="/painel">Entrar na plataforma</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
