export const STATUS_LABEL: Record<string, string> = {
  elaboracao: "Em elaboração",
  enviado: "Enviado",
  aprovado: "Aprovado",
  recusado: "Recusado",
  cancelado: "Cancelado",
  substituido: "Substituído",
};

/** Situações em que o orçamento não muda mais (trava no banco: guard_budget_locked). */
export const isLockedStatus = (status: string) =>
  status === "aprovado" || status === "recusado" || status === "substituido";

type FamilyBudget = {
  id: string;
  revision: number;
  status: string;
  deleted_at: string | null;
};

const openStatus = (status: string) => status === "elaboracao" || status === "enviado";

/** "Reabrir para edição": se já existe revisão mais nova em aberto, reabre nela em vez de criar
 * outra. Devolve a revisão em aberto mais recente, ou null para criar uma nova. */
export function openRevision(family: FamilyBudget[], currentId: string) {
  const current = family.find((b) => b.id === currentId);
  if (!current) return null;
  return (
    family
      .filter((b) => !b.deleted_at && openStatus(b.status) && b.revision > current.revision)
      .sort((a, b) => b.revision - a.revision)[0] ?? null
  );
}

/** Versão aprovada vigente da família (a que a obra usa), exceto o próprio orçamento. */
export function approvedVersion(family: FamilyBudget[], currentId: string) {
  return family.find((b) => b.id !== currentId && !b.deleted_at && b.status === "aprovado") ?? null;
}
