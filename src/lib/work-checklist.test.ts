import { describe, it, expect } from "vitest";
import {
  checklistByStage,
  checklistCount,
  nextChecklistSort,
  type ChecklistItem,
} from "./work-checklist";

const item = (over: Partial<ChecklistItem>): ChecklistItem => ({
  id: crypto.randomUUID(),
  work_id: "w",
  stage_id: "s1",
  service_id: null,
  description: "Item",
  sort: 0,
  checked: false,
  checked_at: null,
  checked_by: null,
  note: null,
  created_by: null,
  updated_by: null,
  created_at: "2026-10-28T10:00:00Z",
  updated_at: "2026-10-28T10:00:00Z",
  ...over,
});

describe("checklist da obra", () => {
  it("conta itens conferidos", () =>
    expect(checklistCount([{ checked: true }, { checked: false }, { checked: true }])).toEqual({
      done: 2,
      total: 3,
      pct: 67,
    }));
  it("etapa sem itens fica em 0%", () =>
    expect(checklistCount([])).toEqual({ done: 0, total: 0, pct: 0 }));
  it("agrupa pela ordem das etapas e ignora etapa removida", () => {
    const groups = checklistByStage(
      [{ id: "s2" }, { id: "s1" }],
      [
        item({ stage_id: "s1", sort: 2, description: "B" }),
        item({ stage_id: "s1", sort: 1, description: "A", checked: true }),
        item({ stage_id: "removida", description: "X" }),
      ],
    );
    expect(groups.map((g) => g.stage.id)).toEqual(["s2", "s1"]);
    expect(groups[0]!.total).toBe(0);
    expect(groups[1]!.items.map((i) => i.description)).toEqual(["A", "B"]);
    expect(groups[1]!.done).toBe(1);
  });
  it("item avulso entra no fim da etapa", () =>
    expect(nextChecklistSort([{ sort: 3 }, { sort: 7 }])).toBe(8));
});
