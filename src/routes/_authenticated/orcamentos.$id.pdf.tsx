import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { budgetKey, loadBudget } from "@/lib/budget-data";
import { computeBudget, splitPayments } from "@/lib/pricing";
import { fmtBRL, fmtDate, fmtNum, reaisPorExtenso, UNIT_LABEL } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/orcamentos/$id/pdf")({
  head: () => ({ meta: [{ title: "Proposta Comercial — JMG Reformas" }] }),
  component: Pdf,
});

const BLUE = "var(--primary)";

function Pdf() {
  const { id } = Route.useParams();
  const { data } = useQuery({ queryKey: budgetKey(id), queryFn: () => loadBudget(id) });
  const { data: company } = useQuery({ queryKey: ["company"], queryFn: async () => (await supabase.from("company_settings").select("*").maybeSingle()).data });
  const [opt, setOpt] = useState({ about: true, materials: true, qty: false, split: true, notes: true });

  if (!data || !company) return <p className="p-8 text-muted-foreground">Carregando…</p>;
  const { budget, sections, items, terms } = data;
  const r = computeBudget(items, data.params, budget.general_discount);
  const { rows, pctSum } = splitPayments(r.saleNet, terms);
  const addr = [budget.endereco, budget.bairro, [budget.cidade, budget.uf].filter(Boolean).join(" - "), budget.cep ? `Cep: ${budget.cep}` : ""].filter(Boolean);

  const missing: string[] = [];
  if (!budget.client_display) missing.push("nome do cliente");
  if (!budget.endereco) missing.push("endereço da obra");
  if (!sections.length) missing.push("etapas e serviços");
  if (Math.abs(pctSum - 100) > 1e-9) missing.push("parcelas somando 100%");
  if (r.saleNet <= 0) missing.push("valor total");

  const footer = (
    <div className="absolute inset-x-0 bottom-0 py-2.5 text-center text-[13px]" style={{ background: BLUE, color: "white", fontFamily: "DM Sans" }}>
      {budget.client_display} {budget.endereco ? `/ ${budget.endereco}` : ""}
    </div>
  );

  return (
    <div className="min-h-screen bg-muted py-6">
      <div className="no-print mx-auto mb-6 max-w-[210mm] space-y-3 rounded-lg border bg-card p-4 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link to="/orcamentos/$id" params={{ id }} className="text-sm text-primary hover:underline">← Voltar ao orçamento</Link>
          <Button onClick={() => window.print()} disabled={missing.length > 0}>
            <Printer className="h-4 w-4" /> Salvar como PDF
          </Button>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          {([
            ["about", "Página Quem somos"], ["materials", "Materiais inclusos"], ["qty", "Mostrar quantidades"],
            ["split", "Separar serviços e materiais no valor"], ["notes", "Observações e exclusões"],
          ] as const).map(([k, l]) => (
            <label key={k} className="flex items-center gap-2">
              <Switch checked={opt[k]} onCheckedChange={(v) => setOpt({ ...opt, [k]: v })} /> {l}
            </label>
          ))}
        </div>
        {missing.length > 0 ? (
          <p className="text-sm text-destructive">Antes de exportar, preencha: {missing.join(", ")}.</p>
        ) : (
          <p className="text-xs text-muted-foreground">Custos, comissões e margens nunca entram neste documento. Na janela de impressão, escolha "Salvar como PDF". Exportar não envia nada ao cliente.</p>
        )}
      </div>

      {/* Capa */}
      <section className="doc-page">
        <div className="absolute inset-y-0 left-0 w-[10%]" style={{ background: "oklch(0.52 0.19 260)" }} />
        <img src="/proposta-capa.jpg" alt="" className="absolute right-0 top-0 h-[57%] w-[90%] object-cover" />
        <div className="absolute bottom-[8%] left-[21%] right-[8%]">
          <h1 className="text-[64px] font-black leading-[0.95]" style={{ color: BLUE }}>Proposta<br />Comercial</h1>
          <p className="mt-8 text-[26px] font-semibold" style={{ fontFamily: "DM Sans", color: "oklch(0.4 0 0)" }}>Cliente: {budget.client_display}</p>
          <div className="mt-4 text-[18px] leading-relaxed">{addr.map((a) => <div key={a}>{a}</div>)}</div>
        </div>
      </section>

      {opt.about && company.sobre && (
        <section className="doc-page px-[10%] pt-[18%]">
          <h2 className="text-[54px] font-black leading-none" style={{ color: BLUE }}>Quem<br />Somos?</h2>
          <div className="mt-12 space-y-6 text-[17px] leading-relaxed text-justify">
            {company.sobre.split(/\n+/).map((p, i) => <p key={i}>{p}</p>)}
          </div>
          {footer}
        </section>
      )}

      <section className="doc-page px-[10%] pb-20 pt-14">
        <h2 className="mb-10 text-center text-[28px] font-bold" style={{ color: "oklch(0.35 0 0)" }}>{budget.title}.</h2>
        {sections.map((s, i) => {
          const its = items.filter((x) => x.section_id === s.id);
          return (
            <div key={s.id} className="mb-10 break-inside-avoid-page">
              <h3 className="mb-4 text-[21px] font-bold uppercase" style={{ color: "oklch(0.35 0 0)" }}>{i + 1}.{s.title.replace(/\.$/, "")}.</h3>
              <ul className="ml-6 list-disc space-y-1 text-[15px]">
                {its.map((it) => (
                  <li key={it.id}>
                    {it.description}
                    {opt.qty && it.unit !== "vb" ? ` — ${fmtNum(it.quantity)} ${UNIT_LABEL[it.unit]}` : ""}
                  </li>
                ))}
              </ul>
              {opt.materials && s.materials_text && (
                <>
                  <h4 className="mb-2 mt-5 text-[15px] font-bold">Materiais Inclusos.</h4>
                  <p className="text-[15px] leading-relaxed">{s.materials_text}</p>
                </>
              )}
            </div>
          );
        })}
        {opt.notes && (budget.notes || budget.exclusions) && (
          <div className="mt-8 space-y-4 text-[15px]">
            {budget.notes && (<div><h4 className="mb-1 font-bold">Observações.</h4><p className="whitespace-pre-line">{budget.notes}</p></div>)}
            {budget.exclusions && (<div><h4 className="mb-1 font-bold">Não inclusos.</h4><p className="whitespace-pre-line">{budget.exclusions}</p></div>)}
          </div>
        )}
        {footer}
      </section>

      <section className="doc-page px-[10%] pb-28 pt-14">
        <h2 className="mb-8 text-center text-[34px] font-semibold" style={{ color: "oklch(0.35 0 0)" }}>INVESTIMENTO.</h2>
        <p className="text-justify text-[18px] font-bold leading-snug" style={{ color: BLUE }}>
          {opt.split && r.materialsNet > 0
            ? `O valor total dos serviços é de ${fmtBRL(r.laborNet)} (${reaisPorExtenso(r.laborNet)}), acrescido de ${fmtBRL(r.materialsNet)} (${reaisPorExtenso(r.materialsNet)}) referente ao fornecimento dos materiais, totalizando o montante de ${fmtBRL(r.saleNet)} (${reaisPorExtenso(r.saleNet)}).`
            : `O valor total é de ${fmtBRL(r.saleNet)} (${reaisPorExtenso(r.saleNet)}).`}
        </p>
        <h3 className="mb-6 mt-6 text-[18px] font-bold" style={{ color: BLUE }}>Forma de pagamento:</h3>
        <table className="w-full border-collapse text-center text-[14px]">
          <thead>
            <tr style={{ background: BLUE, color: "white" }}>
              <th className="border p-2.5">ETAPAS</th><th className="border p-2.5">%</th><th className="border p-2.5">Valor</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t, i) => (
              <tr key={i}><td className="border p-2.5">{t.label}</td><td className="border p-2.5">{fmtNum(t.pct)}%</td><td className="border p-2.5">{fmtBRL(t.value)}</td></tr>
            ))}
            <tr><td className="border p-2.5">TOTAL</td><td className="border p-2.5">{fmtNum(pctSum)}%</td><td className="border p-2.5">{fmtBRL(r.saleNet)}</td></tr>
          </tbody>
        </table>
        {(budget.validity_date || budget.estimated_term) && (
          <p className="mt-6 text-[14px]">
            {budget.estimated_term && <>Prazo estimado: {budget.estimated_term}. </>}
            {budget.validity_date && <>Proposta válida até {fmtDate(budget.validity_date)}.</>}
          </p>
        )}
        <div className="mt-8 space-y-5 text-[16px] leading-relaxed">
          {(budget.closing_text ?? "").split(/\n+/).filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
        </div>
        <div className="mt-8 text-[16px] italic leading-relaxed">
          {company.responsavel && <div>Atenciosamente: {company.responsavel.split(" ").filter((_, i, a) => i === 0 || i === a.length - 1).join(" ")}</div>}
          {company.telefone && <div>Contato : {company.telefone}</div>}
          {company.instagram && <div>{company.instagram}</div>}
        </div>
        <p className="mt-10 text-center text-[16px] italic" style={{ fontFamily: "Arial" }}>{(company.nome_fantasia ?? "").toUpperCase()} - CNPJ: {company.cnpj}</p>
        <div className="absolute inset-x-0 bottom-0 flex h-[70px] items-center justify-center" style={{ background: BLUE }}>
          <img src="/jmg-logo-white.png" alt="JMG" className="h-12" />
        </div>
      </section>
    </div>
  );
}
