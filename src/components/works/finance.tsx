import { businessDate, periodRange, inPeriod } from "@/lib/dashboard-math";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeftRight, Plus, Wallet, Check, Undo2, Ban, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  accountBalances,
  accountStatus,
  cashMovements,
  cashSummary,
  type AccountStatus,
} from "@/lib/operations";
import { fmtBRL, fmtDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog";
import { Field, selectClass, Attachment } from "./fields";
import { text, number } from "@/lib/form-values";
import { uploadDocument } from "@/lib/work-data";
import { financeOptions } from "@/lib/finance-data";
import { dashboardOptions } from "@/lib/dashboard-data";
import { paymentStages, stageDescription } from "@/lib/payment-stages";
import { Installments } from "./installments";
import { DraftForm } from "./draft-form";
import { useRecordFocus } from "@/hooks/use-record-focus";
import { Link } from "@tanstack/react-router";
import { useNavigate, useSearch } from "@tanstack/react-router";
import type { Database } from "@/integrations/supabase/types";
import { EmptyState } from "@/components/feedback";
type Entry = Database["public"]["Tables"]["financial_entries"]["Row"];
type Tab = "caixa" | "receber" | "pagar";

const PAYMENT_METHODS = ["Pix", "Dinheiro", "Cartão", "Boleto", "Transferência"];
const STATUS_LABEL: Record<AccountStatus, string> = {
  pendente: "Pendente",
  vencida: "Vencida",
  parcial: "Parcial",
  recebida: "Recebida",
  paga: "Paga",
  cancelada: "Cancelada",
};
const STATUS_CLASS: Record<AccountStatus, string> = {
  pendente: "bg-muted text-foreground",
  vencida: "bg-destructive/15 text-destructive",
  parcial: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  recebida: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  paga: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  cancelada: "bg-muted text-muted-foreground line-through",
};

export function Finance({ workId }: { workId?: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { work?: string; entry?: string };
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const { data, error } = useQuery(financeOptions);
  const [dialog, setDialog] = useState("");
  const [entry, setEntry] = useState<Entry | null>(null);
  const [busy, setBusy] = useState(false);
  const [entryDirection, setEntryDirection] = useState("entrada");
  const filterWork = search.work || "";
  const setFilterWork = (work: string) =>
    navigate({ to: "/financeiro", search: (prev) => ({ ...prev, work }) });
  const selectedRecord = useRecordFocus(data);
  const focused = data?.entries.find((e) => e.id === selectedRecord);
  const [tab, setTab] = useState<Tab>(() =>
    !focused || focused.cash_only ? "caixa" : focused.direction === "entrada" ? "receber" : "pagar",
  );
  const [period, setPeriod] = useState("todos");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("abertas");
  const [type, setType] = useState("");
  const today = businessDate();
  const range =
    period === "personalizado" ? { from: customFrom, to: customTo } : periodRange(period);

  const scopeWork = workId || filterWork;
  const allEntries = (data?.entries ?? []).filter((e) => !scopeWork || e.work_id === scopeWork);
  const settlements = data?.settlements ?? [];
  const opening = data?.openings.find((o) => o.work_id === scopeWork);
  const accountsOpening = (data?.accounts ?? []).reduce((t, a) => t + a.opening_balance, 0);
  // Saldo inicial: posição inicial da obra ou saldo inicial das contas da empresa.
  const initial = scopeWork ? (opening?.received ?? 0) - (opening?.paid ?? 0) : accountsOpening;
  const base = cashSummary(allEntries, settlements, today, initial);
  const openingPayable = scopeWork ? (opening?.pending_payable ?? 0) : 0;
  const summary = {
    ...base,
    payable: base.payable + openingPayable,
    forecast: base.forecast - openingPayable,
  };

  const movements = cashMovements(allEntries, settlements).filter(
    (m) =>
      inPeriod(m.date, range.from, range.to) &&
      (!category || m.category === category) &&
      (!type || m.direction === type),
  );
  const accounts = (direction: "entrada" | "saida") =>
    allEntries
      .filter((e) => e.direction === direction && !e.cash_only)
      .map((e) => ({ e, st: accountStatus(e, settlements, today) }))
      .filter(
        ({ e, st }) =>
          inPeriod(e.due_date, range.from, range.to) &&
          (!category || e.category === category) &&
          (status === "abertas"
            ? st.pending > 0
            : status === "quitadas"
              ? st.status === "recebida" || st.status === "paga"
              : status === "todas"
                ? st.status !== "cancelada"
                : st.status === status),
      )
      .sort((a, b) => a.e.due_date.localeCompare(b.e.due_date));

  // Etapas da forma de pagamento (orçamento) para as contas a receber da obra.
  const { data: dash } = useQuery({ ...dashboardOptions, enabled: !!workId });
  const workSummary = dash?.works.find((w) => w.work.id === workId);
  const stages = workSummary
    ? paymentStages(
        workSummary.budget.terms,
        workSummary.base.saleNet,
        allEntries
          .filter((e) => e.direction === "entrada" && !e.canceled)
          .map((e) => e.description),
      )
    : [];
  function applyStage(form: HTMLFormElement | null, label: string) {
    const stage = stages.find((s) => s.label === label);
    if (!form || !stage || !workSummary) return;
    const set = (name: string, value: string) => {
      const el = form.elements.namedItem(name);
      if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) el.value = value;
    };
    set("description", stageDescription(stage.label, workSummary.work.name));
    if (stage.amount !== null) set("amount", String(stage.amount));
    set("category", "Contrato");
    if (workSummary.work.client_id) set("person", workSummary.work.client_id);
    form.dispatchEvent(new Event("input", { bubbles: true }));
  }

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["finance"] });
    qc.invalidateQueries({ queryKey: ["work-result"] });
    qc.invalidateQueries({ queryKey: ["financial-dashboard"] });
  };
  function open(name: string, direction = "entrada") {
    setEntryDirection(direction);
    setRequestId(crypto.randomUUID());
    setDialog(name);
  }
  async function save(d: FormData) {
    setBusy(true);
    try {
      let r: { error: { message: string } | null };
      if (dialog === "account") {
        r = await supabase
          .from("financial_accounts")
          .insert({ name: text(d, "name"), opening_balance: number(d, "opening") });
      } else if (dialog === "cash") {
        r = await supabase.rpc("register_cash_movement", {
          _request_id: requestId,
          _direction: entryDirection,
          _movement_date: text(d, "date"),
          _description: text(d, "description"),
          _amount: number(d, "amount"),
          _category: text(d, "category"),
          _payment_method: text(d, "method"),
          _account_id: (text(d, "account") || null) as string,
          _work_id: (workId || text(d, "work") || null) as string,
          _person_id: (text(d, "person") || null) as string,
          _notes: text(d, "notes"),
        });
      } else if (dialog === "entry") {
        r = await supabase.rpc("create_financial_installments", {
          _request_id: requestId,
          _work_id: workId || text(d, "work") || "00000000-0000-0000-0000-000000000000",
          _source: "manual",
          _category: text(d, "category"),
          _description: text(d, "description"),
          _person_id: text(d, "person") || "00000000-0000-0000-0000-000000000000",
          _direction: entryDirection,
          _total: number(d, "amount"),
          _rows: JSON.parse(text(d, "installments") || "[]"),
          _incurred: d.get("incurred") === "on",
          _payment_method: text(d, "method"),
          _notes: text(d, "notes"),
          _cost_center: text(d, "center"),
          _file_path: "",
        });
      } else if (dialog === "settle" && entry) {
        const f = d.get("proof");
        const path = f instanceof File && f.size ? await uploadDocument(f, "finance") : null;
        r = await supabase.from("financial_settlements").insert({
          entry_id: entry.id,
          account_id: text(d, "account") || null,
          amount: number(d, "amount"),
          paid_date: text(d, "date"),
          file_path: path,
          payment_method: text(d, "method"),
          notes: text(d, "notes"),
        });
      } else if (dialog === "transfer") {
        r = await supabase.from("account_transfers").insert({
          from_account_id: text(d, "from"),
          to_account_id: text(d, "to"),
          amount: number(d, "amount"),
          transfer_date: text(d, "date"),
          description: text(d, "description"),
        });
      } else if (dialog === "allocate" && entry) {
        r = await supabase.from("expense_allocations").insert({
          entry_id: entry.id,
          work_id: text(d, "work"),
          amount: number(d, "amount"),
          rule: text(d, "rule"),
        });
      } else throw Error("Selecione um lançamento.");
      if (r.error) throw Error(r.error.message);
      const { data: u } = await supabase.auth.getUser();
      if (u.user)
        localStorage.removeItem(`jmg-draft:${u.user.id}:finance-${workId || "general"}-${dialog}`);
      setRequestId(crypto.randomUUID());
      setDialog("");
      setEntry(null);
      refresh();
      toast.success(
        dialog === "settle"
          ? entry?.direction === "entrada"
            ? "Recebimento registrado no caixa."
            : "Pagamento registrado no caixa."
          : "Registro financeiro salvo.",
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function rpc(p: PromiseLike<{ error: { message: string } | null }>, ok: string) {
    const r = await p;
    if (r.error) toast.error(r.error.message);
    else {
      toast.success(ok);
      refresh();
    }
  }
  const undo = (settlementId: string, manual: boolean) =>
    confirm(
      manual
        ? "Desfazer esta movimentação? Ela sai do caixa."
        : "Desfazer esta baixa? A movimentação sai do caixa e a conta volta a ficar em aberto.",
    ) &&
    rpc(
      supabase.rpc("undo_settlement", { _settlement_id: settlementId }),
      manual ? "Movimentação desfeita." : "Baixa desfeita.",
    );
  const cancel = (e: Entry) =>
    confirm(
      e.installment_count > 1
        ? `Cancelar a conta "${e.description}"? As ${e.installment_count} parcelas deste lançamento serão canceladas.`
        : `Cancelar a conta "${e.description}"?`,
    ) && rpc(supabase.rpc("cancel_financial_entry", { _entry_id: e.id }), "Conta cancelada.");
  async function incur(e: Entry) {
    const r = await supabase.from("financial_entries").update({ incurred: true }).eq("id", e.id);
    if (r.error) toast.error(r.error.message);
    else refresh();
  }

  const accountSelect = (name: string, label: string, optional = false) => (
    <label className="block text-sm">
      {label}
      <select name={name} required={!optional} className={selectClass}>
        <option value="">{optional ? "Não informar" : "Selecionar conta"}</option>
        {data?.accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
    </label>
  );
  const methodSelect = (defaultValue = "") => (
    <label className="block text-sm">
      Forma de pagamento
      <select name="method" defaultValue={defaultValue} className={selectClass}>
        <option value="">Não informar</option>
        {PAYMENT_METHODS.map((m) => (
          <option key={m}>{m}</option>
        ))}
      </select>
    </label>
  );
  const categorySelect = (
    <label className="block text-sm">
      Categoria
      <select
        name="category"
        defaultValue={entryDirection === "entrada" ? "Contrato" : undefined}
        className={selectClass}
      >
        {data?.categories.map((c) => (
          <option key={c.name}>{c.name}</option>
        ))}
        <option>Contrato</option>
        <option>Comissão da arquiteta</option>
        <option>Tributos</option>
      </select>
    </label>
  );
  const personSelect = (label: string) => (
    <label className="block text-sm">
      {label}
      <select name="person" className={selectClass}>
        <option value="">Selecionar</option>
        {data?.people
          .filter((p) => !p.deleted_at)
          .map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
      </select>
    </label>
  );
  const workSelect = (required: boolean, label = "Obra") => (
    <label className="block text-sm">
      {label}
      <select name="work" required={required} className={selectClass}>
        <option value="">{required ? "Selecionar obra" : "Despesas gerais da JMG"}</option>
        {data?.works
          .filter((w) => !w.deleted_at)
          .map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
      </select>
    </label>
  );
  const categories = Array.from(
    new Set([
      ...(data?.categories.map((c) => c.name) ?? []),
      "Contrato",
      ...allEntries.map((e) => e.category),
    ]),
  );

  if (error) return <p className="text-destructive">{error.message}</p>;
  const receivableRows = tab === "receber" ? accounts("entrada") : [];
  const payableRows = tab === "pagar" ? accounts("saida") : [];
  const rows = tab === "receber" ? receivableRows : payableRows;
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap justify-between gap-3">
        <h2 className="font-bold">Financeiro{workId ? " da obra" : ""}</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => open("account")}>
            <Wallet className="h-4 w-4" />
            Conta bancária
          </Button>
          <Button variant="outline" onClick={() => open("transfer")}>
            <ArrowLeftRight className="h-4 w-4" />
            Transferência
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 border-y py-4 lg:grid-cols-4">
        <SummaryCard
          label="Saldo atual"
          value={summary.current}
          hint="Só o que já entrou ou saiu"
        />
        <SummaryCard
          label="A receber"
          value={summary.receivable}
          hint={
            summary.receivableOverdue > 0
              ? `${fmtBRL(summary.receivableOverdue)} vencido`
              : "Nada vencido"
          }
          alert={summary.receivableOverdue > 0}
        />
        <SummaryCard
          label="A pagar"
          value={summary.payable}
          hint={
            summary.payableOverdue > 0
              ? `${fmtBRL(summary.payableOverdue)} vencido`
              : "Nada vencido"
          }
          alert={summary.payableOverdue > 0}
        />
        <SummaryCard
          label="Saldo previsto"
          value={summary.forecast}
          hint="Atual + a receber − a pagar"
        />
      </div>
      {!workId && (
        <div className="flex flex-wrap gap-4">
          {data &&
            accountBalances(data.accounts, data.entries, data.settlements, data.transfers).map(
              (a) => (
                <div key={a.id} className="border-l-2 border-primary pl-3">
                  <p className="text-xs text-muted-foreground">
                    {data.accounts.find((x) => x.id === a.id)?.name}
                  </p>
                  <p className="font-semibold num">{fmtBRL(a.balance)}</p>
                </div>
              ),
            )}
        </div>
      )}
      {opening && (
        <p className="text-xs text-muted-foreground">
          Posição inicial em {fmtDate(opening.reference_date)}: recebido {fmtBRL(opening.received)},
          despesas {fmtBRL(opening.paid)}, pendências a pagar {fmtBRL(opening.pending_payable)} (já
          incluídas nos cards).
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
          {(
            [
              ["caixa", "Caixa"],
              ["receber", "Contas a receber"],
              ["pagar", "Contas a pagar"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${tab === key ? "bg-background shadow-sm" : "text-muted-foreground"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {tab === "caixa" && (
            <>
              <Button onClick={() => open("cash", "entrada")}>
                <Plus className="h-4 w-4" />
                Nova entrada
              </Button>
              <Button variant="outline" onClick={() => open("cash", "saida")}>
                <Minus className="h-4 w-4" />
                Nova saída
              </Button>
            </>
          )}
          {tab === "receber" && (
            <Button onClick={() => open("entry", "entrada")}>
              <Plus className="h-4 w-4" />
              Nova conta a receber
            </Button>
          )}
          {tab === "pagar" && (
            <Button onClick={() => open("entry", "saida")}>
              <Plus className="h-4 w-4" />
              Nova conta a pagar
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {!workId && (
          <label className="text-xs">
            Obra
            <select
              className={selectClass}
              value={filterWork}
              onChange={(e) => setFilterWork(e.target.value)}
            >
              <option value="">Todas</option>
              {data?.works
                .filter((w) => !w.deleted_at)
                .map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
            </select>
          </label>
        )}
        <label className="text-xs">
          Período{tab === "caixa" ? " (data)" : " (vencimento)"}
          <select
            className={selectClass}
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="todos">Todos</option>
            <option value="hoje">Hoje</option>
            <option value="semana">Esta semana</option>
            <option value="mes">Este mês</option>
            <option value="personalizado">Personalizado</option>
          </select>
        </label>
        {period === "personalizado" && (
          <>
            <label className="text-xs">
              De
              <input
                type="date"
                className={selectClass}
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
            </label>
            <label className="text-xs">
              Até
              <input
                type="date"
                className={selectClass}
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
              />
            </label>
          </>
        )}
        <label className="text-xs">
          Categoria
          <select
            className={selectClass}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        {tab === "caixa" ? (
          <label className="text-xs">
            Tipo
            <select className={selectClass} value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">Entradas e saídas</option>
              <option value="entrada">Entradas</option>
              <option value="saida">Saídas</option>
            </select>
          </label>
        ) : (
          <label className="text-xs">
            Status
            <select
              className={selectClass}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="abertas">Em aberto</option>
              <option value="pendente">Pendentes</option>
              <option value="vencida">Vencidas</option>
              <option value="parcial">Parciais</option>
              <option value="quitadas">{tab === "receber" ? "Recebidas" : "Pagas"}</option>
              <option value="cancelada">Canceladas</option>
              <option value="todas">Todas (sem canceladas)</option>
            </select>
          </label>
        )}
      </div>

      {tab === "caixa" ? (
        <div className="divide-y">
          {movements.map((m) => (
            <article key={m.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <h3 className="font-medium">{m.description}</h3>
                <p className="text-xs text-muted-foreground">
                  {fmtDate(m.date)} · {m.direction === "entrada" ? "Entrada" : "Saída"} ·{" "}
                  {m.category} · {m.payment_method || "Forma não informada"}
                  {m.account_id &&
                    ` · ${data?.accounts.find((a) => a.id === m.account_id)?.name ?? "Conta"}`}
                  {!workId &&
                    ` · ${data?.works.find((w) => w.id === m.work_id)?.name || "Geral JMG"}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {m.origin === "manual" ? (
                    "Lançamento manual"
                  ) : (
                    <button
                      type="button"
                      className="text-primary hover:underline"
                      onClick={() => {
                        setTab(m.direction === "entrada" ? "receber" : "pagar");
                        setStatus("todas");
                        setTimeout(
                          () =>
                            document
                              .getElementById(`record-${m.entry_id}`)
                              ?.scrollIntoView({ block: "center" }),
                          50,
                        );
                      }}
                    >
                      Baixa de conta · ver conta
                    </button>
                  )}
                  {m.notes ? ` · ${m.notes}` : ""}
                </p>
              </div>
              <Attachment path={m.file_path} />
              <p
                className={`font-semibold num ${m.direction === "entrada" ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}
              >
                {m.direction === "entrada" ? "+" : "−"} {fmtBRL(m.amount)}
              </p>
              <Button size="sm" variant="ghost" onClick={() => undo(m.id, m.origin === "manual")}>
                <Undo2 className="h-4 w-4" />
                Desfazer
              </Button>
            </article>
          ))}
          {!movements.length && (
            <EmptyState compact icon={Wallet} title="Nenhuma movimentação neste período" />
          )}
        </div>
      ) : (
        <div className="divide-y">
          {rows.map(({ e, st }) => {
            const own = settlements.filter((s) => s.entry_id === e.id);
            return (
              <article
                key={e.id}
                id={`record-${e.id}`}
                className={`scroll-mt-6 py-4 ${selectedRecord === e.id ? "border-l-4 border-primary bg-accent/40 pl-3" : ""} ${st.status === "vencida" ? "border-l-4 border-destructive pl-3" : st.dueSoon ? "border-l-4 border-amber-500 pl-3" : ""}`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{e.description}</h3>
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[st.status]}`}
                      >
                        {STATUS_LABEL[st.status]}
                      </span>
                      {st.dueSoon && (
                        <span className="rounded bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                          Vence em até 3 dias
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Vence {fmtDate(e.due_date)} · {e.category}
                      {e.installment_count > 1 &&
                        ` · parcela ${e.installment_index}/${e.installment_count}`}
                      {!workId &&
                        ` · ${data?.works.find((w) => w.id === e.work_id)?.name || "Geral JMG"}`}
                      {e.notes ? ` · ${e.notes}` : ""}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs">
                      {e.person_id && (
                        <Link
                          to="/cadastros/$id"
                          params={{ id: e.person_id }}
                          className="text-primary"
                        >
                          {data?.people.find((p) => p.id === e.person_id)?.name || "Cadastro"}
                        </Link>
                      )}
                      {e.work_id && !workId && (
                        <Link to="/obras/$id" params={{ id: e.work_id }} className="text-primary">
                          Ver obra
                        </Link>
                      )}
                      {(e.purchase_order_id || e.payable_order_id) && e.work_id && (
                        <Link
                          to="/obras/$id"
                          params={{ id: e.work_id }}
                          search={{
                            tab: "compras",
                            record: e.purchase_order_id || e.payable_order_id || "",
                          }}
                          className="text-primary"
                        >
                          Pedido de origem
                        </Link>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold num">{fmtBRL(e.amount)}</p>
                    {st.paid > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {e.direction === "entrada" ? "Recebido" : "Pago"} {fmtBRL(st.paid)}
                      </p>
                    )}
                    {st.pending > 0 && st.paid > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Em aberto {fmtBRL(st.pending)}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {st.pending > 0 && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setEntry(e);
                          open("settle", e.direction);
                        }}
                      >
                        <Check className="h-4 w-4" />
                        {e.direction === "entrada" ? "Recebi" : "Paguei"}
                      </Button>
                    )}
                    {!e.incurred &&
                      e.direction === "saida" &&
                      !e.canceled &&
                      !e.purchase_order_id &&
                      !e.payable_order_id && (
                        <Button size="sm" variant="outline" onClick={() => incur(e)}>
                          Custo incorrido
                        </Button>
                      )}
                    {!e.work_id && e.direction === "saida" && !e.canceled && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEntry(e);
                          open("allocate", "saida");
                        }}
                      >
                        Ratear
                      </Button>
                    )}
                    {!e.canceled &&
                      own.length === 0 &&
                      !e.purchase_order_id &&
                      !e.payable_order_id && (
                        <Button size="sm" variant="ghost" onClick={() => cancel(e)}>
                          <Ban className="h-4 w-4" />
                          Cancelar
                        </Button>
                      )}
                  </div>
                </div>
                {own.map((s) => (
                  <div
                    key={s.id}
                    className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
                  >
                    {e.direction === "entrada" ? "Recebido" : "Pago"} em {fmtDate(s.paid_date)} ·{" "}
                    {fmtBRL(s.amount)} · {s.payment_method || "Forma não informada"}
                    {s.account_id &&
                      ` · ${data?.accounts.find((a) => a.id === s.account_id)?.name ?? "Conta"}`}
                    <Attachment path={s.file_path} />
                    <button
                      type="button"
                      className="text-primary hover:underline"
                      onClick={() => undo(s.id, false)}
                    >
                      Desfazer baixa
                    </button>
                  </div>
                ))}
                {data?.allocations
                  .filter((a) => a.entry_id === e.id)
                  .map((a) => (
                    <p key={a.id} className="mt-1 text-xs text-muted-foreground">
                      Rateio: {data.works.find((w) => w.id === a.work_id)?.name} ·{" "}
                      {fmtBRL(a.amount)} · {a.rule}
                    </p>
                  ))}
              </article>
            );
          })}
          {!rows.length && (
            <EmptyState
              compact
              icon={Wallet}
              title={tab === "receber" ? "Nenhuma conta a receber" : "Nenhuma conta a pagar"}
            />
          )}
        </div>
      )}

      <Dialog open={!!dialog} onOpenChange={(v) => !v && setDialog("")}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {
                {
                  account: "Nova conta bancária",
                  cash:
                    entryDirection === "entrada" ? "Nova entrada no caixa" : "Nova saída do caixa",
                  entry:
                    entryDirection === "entrada" ? "Nova conta a receber" : "Nova conta a pagar",
                  settle: entry?.direction === "entrada" ? "Recebi" : "Paguei",
                  transfer: "Transferência entre contas",
                  allocate: "Ratear despesa geral",
                }[dialog]
              }
            </DialogTitle>
          </DialogHeader>
          <DraftForm
            key={`${dialog}-${entryDirection}-${entry?.id ?? ""}`}
            scope={`finance-${workId || "general"}-${dialog}${dialog === "cash" || dialog === "entry" ? `-${entryDirection}` : ""}`}
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              save(new FormData(e.currentTarget));
            }}
          >
            {dialog === "account" && (
              <>
                <Field name="name" label="Nome da conta / caixa" required />
                <Field name="opening" label="Saldo inicial (R$)" type="number" />
              </>
            )}
            {dialog === "cash" && (
              <>
                <p className="text-xs text-muted-foreground">
                  Lançamento à vista: entra direto no caixa, sem passar por contas a{" "}
                  {entryDirection === "entrada" ? "receber" : "pagar"}.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Field name="date" label="Data" type="date" value={today} required />
                  <Field name="amount" label="Valor (R$)" type="number" required />
                </div>
                <Field name="description" label="Descrição" required />
                {!workId &&
                  workSelect(
                    entryDirection === "entrada",
                    entryDirection === "entrada" ? "Obra" : "Obra (opcional)",
                  )}
                <div className="grid grid-cols-2 gap-3">
                  {categorySelect}
                  {methodSelect("Pix")}
                </div>
                {accountSelect("account", "Conta / banco", true)}
                {personSelect(
                  entryDirection === "entrada"
                    ? "Cliente (opcional)"
                    : "Fornecedor / prestador (opcional)",
                )}
                <Field name="notes" label="Observação" />
              </>
            )}
            {dialog === "entry" && (
              <>
                <Field name="description" label="Descrição" required />
                {!workId &&
                  workSelect(
                    entryDirection === "entrada",
                    entryDirection === "entrada" ? "Obra" : "Obra (opcional)",
                  )}
                {categorySelect}
                {entryDirection === "entrada" && stages.length > 0 && (
                  <label className="block text-sm">
                    Etapa do pagamento
                    <select
                      name="stage"
                      className={selectClass}
                      defaultValue=""
                      onChange={(e) => applyStage(e.currentTarget.form, e.target.value)}
                    >
                      <option value="">Conta avulsa (sem etapa)</option>
                      {stages.map((st) => (
                        <option key={st.label} value={st.label}>
                          {st.label}
                          {st.amount !== null ? ` — ${fmtBRL(st.amount)}` : ""}
                          {st.launched ? " (já lançada)" : ""}
                        </option>
                      ))}
                    </select>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Preenche descrição, categoria, cliente
                      {stages.some((st) => st.amount !== null) ? " e valor" : ""} pela forma de
                      pagamento.
                    </span>
                  </label>
                )}
                {personSelect(entryDirection === "entrada" ? "Cliente" : "Fornecedor / prestador")}
                <Field name="amount" label="Valor (R$)" type="number" required />
                <Installments />
                {methodSelect()}
                <Field name="center" label="Centro de custo" />
                <Field name="notes" label="Observação" />
                {entryDirection === "saida" && (
                  <label className="flex gap-2 text-sm">
                    <input name="incurred" type="checkbox" />
                    Despesa já incorrida (serviço prestado)
                  </label>
                )}
              </>
            )}
            {dialog === "settle" && entry && (
              <>
                <p className="text-sm">
                  {entry.description} · em aberto{" "}
                  {fmtBRL(accountStatus(entry, settlements, today).pending)}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Field name="date" label="Data do pagamento" type="date" value={today} required />
                  <Field
                    name="amount"
                    label="Valor efetivo (R$)"
                    type="number"
                    value={accountStatus(entry, settlements, today).pending}
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Valor menor deixa a conta parcial, com o restante em aberto.
                </p>
                {methodSelect(entry.payment_method || "Pix")}
                {accountSelect("account", "Conta / banco", true)}
                <Field name="notes" label="Observação" />
                <Field name="proof" label="Comprovante" type="file" />
              </>
            )}
            {dialog === "transfer" && (
              <>
                {accountSelect("from", "Conta de origem")}
                {accountSelect("to", "Conta de destino")}
                <Field name="amount" label="Valor (R$)" type="number" required />
                <Field name="date" label="Data" type="date" value={today} required />
                <Field name="description" label="Descrição" />
              </>
            )}
            {dialog === "allocate" && (
              <>
                <p className="text-sm">
                  {entry?.description} · {fmtBRL(entry?.amount)}
                </p>
                {workSelect(true)}
                <Field name="amount" label="Parcela atribuída à obra (R$)" type="number" required />
                <Field name="rule" label="Regra explícita do rateio" required />
              </>
            )}
            <Button type="submit" disabled={busy}>
              {busy
                ? "Salvando…"
                : dialog === "settle"
                  ? entry?.direction === "entrada"
                    ? "Confirmar recebimento"
                    : "Confirmar pagamento"
                  : "Salvar"}
            </Button>
          </DraftForm>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  alert = false,
}: {
  label: string;
  value: number;
  hint: string;
  alert?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold num ${value < 0 ? "text-destructive" : ""}`}>
        {fmtBRL(value)}
      </p>
      <p className={`text-xs ${alert ? "font-medium text-destructive" : "text-muted-foreground"}`}>
        {hint}
      </p>
    </div>
  );
}
