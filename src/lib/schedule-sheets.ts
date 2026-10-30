// Cronograma físico-financeiro em folhas (modelo JMG, A4 deitado): cada folha mostra 10 semanas
// a partir da segunda-feira da semana de início. Módulo puro, usado pelo documento impresso e pela
// aba Cronograma da obra. Etapas fora da folha viram "concluída na Sx" ou "inicia na Sx"; a última
// folha completa as 10 colunas com semanas vazias (em cinza).

export const WEEKS_PER_SHEET = 10;

export interface SheetStageInput {
  id: string;
  name: string;
  start: string | null;
  end: string | null;
}
export interface SheetPaymentInput {
  date: string;
  label: string;
  amount: number;
}
export interface SheetMaterialInput {
  id: string;
  stageId: string | null;
  description: string;
  due: string;
}

export type SheetCell =
  | { kind: "bar"; from: number; to: number; left: boolean; right: boolean; label: string }
  | { kind: "done"; label: string }
  | { kind: "future"; label: string }
  | { kind: "none" };

export interface ScheduleSheet {
  index: number;
  weeks: { label: string; date: string; filler: boolean }[];
  months: { label: string; span: number }[];
  /** Colunas reais (o resto da folha é cinza). */
  realWeeks: number;
  from: string;
  to: string;
  firstWeek: number;
  lastWeek: number;
  rows: {
    id: string;
    number: number;
    name: string;
    start: string | null;
    end: string | null;
    weeks: number;
    cell: SheetCell;
    /** Entregas de material da etapa nesta folha, em % da largura das 10 colunas. */
    materials: number[];
  }[];
  payments: { label: string; date: string; amount: number; pct: number; at: number }[];
  materials: { stage: number | null; description: string; due: string }[];
}

const DAY = 86_400_000;
const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const t = (iso: string) => Date.parse(`${iso.slice(0, 10)}T12:00:00Z`);
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function buildScheduleSheets(input: {
  stages: SheetStageInput[];
  payments?: SheetPaymentInput[];
  materials?: SheetMaterialInput[];
}): { start: string; end: string; totalWeeks: number; sheets: ScheduleSheet[] } | null {
  const dated = input.stages.filter((s) => s.start);
  if (!dated.length) return null;
  const start = dated.map((s) => s.start!).sort()[0]!;
  const end = dated
    .map((s) => s.end || s.start!)
    .sort()
    .at(-1)!;
  const first = t(start) - ((new Date(t(start)).getUTCDay() + 6) % 7) * DAY;
  const weekOf = (d: string) => Math.floor((t(d) - first) / (7 * DAY));
  const totalWeeks = weekOf(end) + 1;
  const total = (input.payments ?? []).reduce((n, p) => n + p.amount, 0);
  const number = new Map(input.stages.map((s, i) => [s.id, i + 1]));
  const sheets: ScheduleSheet[] = [];
  for (let k = 0; k * WEEKS_PER_SHEET < totalWeeks; k++) {
    const w0 = k * WEEKS_PER_SHEET;
    const realWeeks = Math.min(WEEKS_PER_SHEET, totalWeeks - w0);
    const w1 = w0 + realWeeks - 1;
    const sheetStart = first + w0 * 7 * DAY;
    const weeks = Array.from({ length: WEEKS_PER_SHEET }, (_, i) => ({
      label: `S${w0 + i + 1}`,
      date: iso(sheetStart + i * 7 * DAY),
      filler: i >= realWeeks,
    }));
    const months: { label: string; span: number }[] = [];
    let key = "";
    for (const w of weeks.slice(0, realWeeks)) {
      const m = w.date.slice(0, 7);
      if (m === key) months.at(-1)!.span++;
      else months.push({ label: m, span: 1 });
      key = m;
    }
    for (const m of months) {
      const [y, mm] = m.label.split("-");
      const name = MONTHS[Number(mm) - 1]!;
      m.label =
        m.span >= 3
          ? `${name} de ${y}`
          : m.span === 2
            ? `${name.slice(0, 3)}/${y!.slice(2)}`
            : name.slice(0, 3);
    }
    // Posição de uma data dentro das 10 colunas da folha (0 a 100%).
    const at = (d: string) => ((t(d) - sheetStart) / (WEEKS_PER_SHEET * 7 * DAY)) * 100;
    const inSheet = (d: string) => weekOf(d) >= w0 && weekOf(d) <= w1;
    const rows = input.stages.map((s, i) => {
      const sw = s.start ? weekOf(s.start) : null;
      const ew = s.start ? weekOf(s.end || s.start) : null;
      let cell: SheetCell = { kind: "none" };
      if (sw !== null && ew !== null) {
        if (ew < w0) cell = { kind: "done", label: `concluída na S${ew + 1}` };
        else if (sw > w1) cell = { kind: "future", label: `inicia na S${sw + 1}` };
        else {
          const right = ew > w1;
          const n = ew - sw + 1;
          cell = {
            kind: "bar",
            from: Math.max(sw, w0) - w0,
            to: Math.min(ew, w1) - w0,
            left: sw < w0,
            right,
            label: `${n} sem.${right ? " · continua" : ""}`,
          };
        }
      }
      return {
        id: s.id,
        number: i + 1,
        name: s.name,
        start: s.start,
        end: s.end,
        weeks: sw !== null && ew !== null ? ew - sw + 1 : 0,
        cell,
        materials: (input.materials ?? [])
          .filter((m) => m.stageId === s.id && inSheet(m.due))
          .map((m) => at(m.due)),
      };
    });
    const sheetTo =
      k * WEEKS_PER_SHEET + WEEKS_PER_SHEET >= totalWeeks ? end : iso(first + (w1 * 7 + 4) * DAY);
    sheets.push({
      index: k,
      weeks,
      months,
      realWeeks,
      from: k === 0 ? start : iso(sheetStart),
      to: sheetTo,
      firstWeek: w0 + 1,
      lastWeek: w1 + 1,
      rows,
      payments: (input.payments ?? [])
        .filter((p) => inSheet(p.date) || (k === 0 && t(p.date) < sheetStart))
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((p) => ({
          ...p,
          pct: total > 0 ? Math.round((p.amount / total) * 1000) / 10 : 0,
          at: Math.max(0, at(p.date)),
        })),
      materials: (input.materials ?? [])
        .filter((m) => inSheet(m.due) || (k === 0 && t(m.due) < sheetStart))
        .sort((a, b) => a.due.localeCompare(b.due))
        .map((m) => ({
          stage: m.stageId ? (number.get(m.stageId) ?? null) : null,
          description: m.description,
          due: m.due,
        })),
    });
  }
  // Datas depois do término (pagamento final atrasado na planilha) entram na última folha.
  const last = sheets.at(-1)!;
  for (const p of input.payments ?? [])
    if (weekOf(p.date) > last.lastWeek - 1)
      last.payments.push({
        ...p,
        pct: total > 0 ? Math.round((p.amount / total) * 1000) / 10 : 0,
        at: Math.min(
          100,
          ((t(p.date) - (first + (last.firstWeek - 1) * 7 * DAY)) / (70 * DAY)) * 100,
        ),
      });
  return { start, end, totalWeeks, sheets };
}
