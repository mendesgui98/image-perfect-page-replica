import { describe, expect, it } from "vitest";
import { fieldAgenda } from "./field-agenda";

const today = "2026-10-25";
const works = [
  { id: "w1", name: "Apto Moema", status: "andamento" },
  { id: "w2", name: "Casa Alphaville", status: "andamento" },
  { id: "w3", name: "Obra entregue", status: "concluida" },
];
const stage = (over: object) => ({
  id: "s",
  work_id: "w1",
  name: "Etapa",
  progress: 0,
  weight: 1,
  status: null,
  planned_start: "2026-10-20",
  planned_end: "2026-10-30",
  removed: false,
  ...over,
});

describe("agenda da equipe de campo", () => {
  it("lista etapas do dia e atrasadas, com as atrasadas primeiro", () => {
    const agenda = fieldAgenda(
      works,
      [
        stage({ id: "hoje", name: "Pintura" }),
        stage({ id: "late", name: "Forro", planned_end: "2026-10-24" }),
        stage({ id: "futura", planned_start: "2026-11-01", planned_end: "2026-11-10" }),
        stage({ id: "feita", progress: 100 }),
        stage({ id: "removida", removed: true }),
        stage({ id: "pausada", status: "pausado" }),
      ],
      [],
      today,
    );
    expect(agenda).toHaveLength(1);
    expect(agenda[0]?.stages.map((s) => [s.id, s.situation])).toEqual([
      ["late", "atrasada"],
      ["hoje", "hoje"],
    ]);
  });

  it("inclui pendências vencidas e ignora obras concluídas", () => {
    const agenda = fieldAgenda(
      works,
      [stage({ id: "x", work_id: "w3" })],
      [
        {
          id: "r1",
          work_id: "w2",
          title: "Medir janela",
          due_date: "2026-10-25",
          status: "pendente",
        },
        { id: "r2", work_id: "w2", title: "Ok", due_date: "2026-10-20", status: "concluido" },
        { id: "r3", work_id: "w2", title: "Futuro", due_date: "2026-11-02", status: "pendente" },
      ],
      today,
    );
    expect(agenda.map((a) => a.work.id)).toEqual(["w2"]);
    expect(agenda[0]?.dueRecords.map((r) => r.id)).toEqual(["r1"]);
  });

  it("ordena obras com mais atrasos primeiro", () => {
    const agenda = fieldAgenda(
      works,
      [
        stage({ id: "a", work_id: "w1" }),
        stage({ id: "b", work_id: "w2", planned_end: "2026-10-01" }),
      ],
      [],
      today,
    );
    expect(agenda.map((a) => a.work.id)).toEqual(["w2", "w1"]);
  });
});
