import { describe, expect, it } from "vitest";
import { approvedVersion, isLockedStatus, openRevision } from "./budget-status";

const b = (id: string, revision: number, status: string, deleted_at: string | null = null) => ({
  id,
  revision,
  status,
  deleted_at,
});

describe("reabrir orçamento aprovado", () => {
  it("aprovado, recusado e substituído ficam travados", () => {
    expect(["aprovado", "recusado", "substituido"].every(isLockedStatus)).toBe(true);
    expect(isLockedStatus("elaboracao")).toBe(false);
  });

  it("sem revisão em aberto, cria uma nova", () => {
    expect(openRevision([b("r0", 0, "aprovado")], "r0")).toBeNull();
  });

  it("reaproveita a revisão mais nova em aberto, ignorando excluídas e antigas", () => {
    const family = [
      b("r0", 0, "substituido"),
      b("r1", 1, "aprovado"),
      b("r2", 2, "elaboracao"),
      b("r3", 3, "enviado"),
      b("r4", 4, "elaboracao", "2026-10-27"),
    ];
    expect(openRevision(family, "r1")?.id).toBe("r3");
    expect(openRevision(family, "r3")).toBeNull();
  });

  it("revisão em edição mostra qual versão aprovada ela vai substituir", () => {
    const family = [b("r0", 0, "aprovado"), b("r1", 1, "elaboracao")];
    expect(approvedVersion(family, "r1")?.id).toBe("r0");
    expect(approvedVersion(family, "r0")).toBeNull();
  });
});
