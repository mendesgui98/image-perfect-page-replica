import { pageMeta } from "@/lib/page-meta";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Download, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/kpi";
import { PageSkeleton } from "@/components/feedback";
import { apiConfigured, apiFile } from "@/lib/api-client";
import { pdfLayout, type PdfLayout } from "@/lib/proposal";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-me";

// Visualiza o PDF oficial gerado pela API (modelo JMG): orçamento ou, com ?doc=contrato, o
// contrato do orçamento aprovado; em página contínua ou, com ?layout=paginado, em folhas A4.
// Custos internos nunca entram nesses documentos.

type Doc = "orcamento" | "contrato";

const LAYOUTS: { value: PdfLayout; label: string }[] = [
  { value: "continuo", label: "Página contínua" },
  { value: "paginado", label: "Com quebra de página" },
];

export const Route = createFileRoute("/_authenticated/orcamentos/$id/pdf")({
  head: () => pageMeta("PDF do orçamento", "Documento oficial da JMG gerado pelo sistema."),
  validateSearch: (s: Record<string, unknown>): { doc?: Doc; layout?: "paginado" } => ({
    ...(s["doc"] === "contrato" ? { doc: "contrato" as const } : {}),
    ...(pdfLayout(s["layout"]) === "paginado" ? { layout: "paginado" as const } : {}),
  }),
  component: Pdf,
});

function Pdf() {
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const { doc = "orcamento" } = search;
  const layout = pdfLayout(search.layout);
  const label = doc === "contrato" ? "Contrato" : "Orçamento";
  const { data, error, isFetching, refetch } = useQuery({
    queryKey: ["budget-pdf", id, doc, layout],
    enabled: apiConfigured,
    retry: false,
    gcTime: 0,
    queryFn: () =>
      apiFile(
        "POST",
        `/v1/orcamentos/${id}/${doc === "contrato" ? "contrato" : "pdf"}${layout === "paginado" ? "?layout=paginado" : ""}`,
        `${label}.pdf`,
      ),
  });
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!data) return;
    const u = URL.createObjectURL(data.blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [data]);
  // Contrato gerado entra no menu Contratos: o PDF vai para o bucket privado e o banco registra o
  // contrato da obra (novo = aguardando assinatura; assinado não muda).
  const { data: me } = useMe();
  const registered = useRef<Blob | null>(null);
  const [contractState, setContractState] = useState<"" | "ok" | "sem-obra" | string>("");
  useEffect(() => {
    if (doc !== "contrato" || !data || !me?.canSeeCosts || registered.current === data.blob) return;
    registered.current = data.blob;
    void (async () => {
      try {
        const path = `contracts/generated/${id}/${crypto.randomUUID()}.pdf`;
        const up = await supabase.storage
          .from("jmg-documents")
          .upload(path, data.blob, { contentType: "application/pdf" });
        if (up.error) throw up.error;
        const code = /ORC-(\d{4}-\d+)/.exec(data.name)?.[1];
        const r = await supabase.rpc("register_generated_contract", {
          _budget_id: id,
          _path: path,
          _code: code ? `CT-${code}` : "",
        });
        if (r.error) throw r.error;
        setContractState(r.data ? "ok" : "sem-obra");
      } catch (e) {
        setContractState((e as Error).message);
      }
    })();
  }, [doc, data, id, me?.canSeeCosts]);

  // Rotas /pdf ficam fora do menu do app (route.tsx), então a página tem a própria margem.
  return (
    <div className="mx-auto min-h-screen max-w-6xl space-y-4 bg-background p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to="/orcamentos/$id"
            params={{ id }}
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Voltar ao orçamento
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {label} em PDF {data && <span className="text-muted-foreground">· {data.name}</span>}
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerado agora com os dados do sistema. Emissão = hoje. Gerar não envia nada ao cliente.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div
            role="group"
            aria-label="Formato do PDF"
            className="flex gap-1 rounded-lg border p-1"
          >
            {LAYOUTS.map((l) => (
              <Button
                key={l.value}
                size="sm"
                variant={layout === l.value ? "default" : "ghost"}
                aria-pressed={layout === l.value}
                asChild
              >
                <Link
                  to="/orcamentos/$id/pdf"
                  params={{ id }}
                  search={{
                    ...(doc === "contrato" ? { doc } : {}),
                    ...(l.value === "paginado" ? { layout: "paginado" as const } : {}),
                  }}
                  replace
                >
                  {l.label}
                </Link>
              </Button>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} /> Gerar de novo
          </Button>
          {url && (
            <Button variant="outline" asChild>
              <a href={url} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" /> Abrir em nova aba
              </a>
            </Button>
          )}
          {url && data && (
            <Button asChild>
              <a href={url} download={data.name}>
                <Download className="h-4 w-4" /> Baixar PDF
              </a>
            </Button>
          )}
        </div>
      </div>
      {contractState === "ok" && (
        <p className="rounded-xl bg-positive/10 p-4 text-sm text-positive">
          Contrato registrado em{" "}
          <Link to="/contratos" className="font-semibold underline">
            Contratos
          </Link>
          . Lá você acompanha a situação e guarda o contrato assinado.
        </p>
      )}
      {contractState === "sem-obra" && (
        <Notice tone="alert">
          Este orçamento ainda não virou obra: o contrato entra em Contratos depois da conversão
          (gere o PDF de novo depois de converter).
        </Notice>
      )}
      {contractState && contractState !== "ok" && contractState !== "sem-obra" && (
        <Notice tone="negative">Não foi possível registrar o contrato: {contractState}</Notice>
      )}
      {!apiConfigured && (
        <Notice tone="negative">A API não está configurada (VITE_API_URL).</Notice>
      )}
      {error && !isFetching && (
        <Notice tone="negative">Não foi possível gerar o PDF: {(error as Error).message}</Notice>
      )}
      {isFetching && !url && <PageSkeleton cards={1} />}
      {url && (
        <iframe
          title={`${label} em PDF`}
          src={url}
          className="h-[calc(100vh-220px)] min-h-[520px] w-full rounded-2xl border bg-muted"
        />
      )}
    </div>
  );
}
