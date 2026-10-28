import { describe, it, expect } from "vitest";
import {
  physicalProgress,
  progressAttention,
  servicesProgress,
  stageStatus,
  statusForProgress,
  workDeadline,
} from "./work-progress";
describe("acompanhamento da obra", () => {
  it("pondera percentuais pelas etapas", () =>
    expect(
      physicalProgress([
        { weight: 30, progress: 100 },
        { weight: 70, progress: 50 },
      ]),
    ).toBe(65));
  it("preserva avanço inicial sem etapas ponderadas", () =>
    expect(physicalProgress([], 40)).toBe(40));
  it("sinaliza custos de 75% para execução de 40%", () =>
    expect(progressAttention(40, 80, 75000, 100000)).toEqual({
      consumed: 75,
      costAhead: true,
      receiptsBehind: false,
    }));
  it("sinaliza recebimentos de 45% para execução de 70%", () =>
    expect(progressAttention(70, 45, 0, null).receiptsBehind).toBe(true));
  it("não presume previsão de custos ausente", () =>
    expect(progressAttention(40, 40, 75000, null).consumed).toBeNull());
  it("etapa completa não permanece atrasada", () =>
    expect(
      stageStatus({ progress: 100, weight: 100, planned_end: "2026-10-01" }, "2026-10-25"),
    ).toBe("concluido"));
  it("prazo vencido e execução incompleta indica atraso", () =>
    expect(workDeadline("2026-10-01", 65, [], "2026-10-25")).toBe("Atrasada"));
});

describe("avanço da etapa pelos serviços", () => {
  it("pondera pelo valor previsto de cada serviço", () => {
    // R$ 2.000 a 50% e R$ 1.000 a 100% → (1000 + 1000) / 3000 = 66,67%
    expect(
      servicesProgress([
        { labor_planned: 1500, material_planned: 500, progress: 50 },
        { labor_planned: 1000, material_planned: 0, progress: 100 },
      ]),
    ).toBe(66.67);
  });
  it("sem valores, cada serviço pesa igual; sem serviços, null", () => {
    expect(
      servicesProgress([
        { labor_planned: 0, material_planned: 0, progress: 20 },
        { labor_planned: 0, material_planned: 0, progress: 60 },
      ]),
    ).toBe(40);
    expect(servicesProgress([])).toBeNull();
  });
  it("situação acompanha o avanço e mantém pausada", () => {
    expect(statusForProgress(100, "pausado")).toBe("concluido");
    expect(statusForProgress(30, "pausado")).toBe("pausado");
    expect(statusForProgress(30, null)).toBe("andamento");
    expect(statusForProgress(0, "andamento")).toBe("nao_iniciado");
  });
});
