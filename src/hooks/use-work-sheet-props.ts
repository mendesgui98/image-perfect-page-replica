import { useQuery } from "@tanstack/react-query";
import type { ScheduleSheetsProps } from "@/components/works/schedule-sheets";
import { useMe } from "@/hooks/use-me";
import { businessDate } from "@/lib/dashboard-math";
import { proposalNumber } from "@/lib/proposal";
import type { ScheduleStage } from "@/lib/work-schedule";
import {
  clientMaterialsOptions,
  scheduleFinanceOptions,
  scheduleVersionsOptions,
  workClientOptions,
} from "@/lib/work-data";

const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * Dados das folhas para uma obra: etapas (versão escolhida ou atuais), contas a receber (só
 * admin/financeiro), materiais do cliente, cliente e códigos do orçamento/contrato vinculados.
 */
export function useWorkSheetProps(o: {
  workId: string;
  work: { name: string; address: string | null; linked_budget_id: string | null };
  stages: ScheduleStage[];
  version?: number | undefined;
}): ScheduleSheetsProps {
  const { data: me } = useMe();
  const { data: finance } = useQuery(
    scheduleFinanceOptions(o.workId, o.work.linked_budget_id, !!me?.canSeeCosts),
  );
  const { data: materials = [] } = useQuery(clientMaterialsOptions(o.workId));
  const { data: client = null } = useQuery(workClientOptions(o.workId));
  const { data: versions = [] } = useQuery(scheduleVersionsOptions(o.workId));
  const b = finance?.budget;
  const orc = b ? proposalNumber(b.number, b.issue_date) : null;
  const revision = Math.max(0, (o.version ?? versions.at(-1)?.version ?? 1) - 1);
  return {
    title: o.work.name,
    client,
    address: o.work.address,
    codes: orc ? [orc.replace(/^ORC-/, "CT-"), orc] : [],
    revision: `Rev. ${pad2(revision)}`,
    issued: businessDate(),
    // Etapa sem datas (ex.: "Avanço inicial" das obras cadastradas direto) não entra nas folhas.
    stages: [...o.stages]
      .filter((s) => s.planned_start)
      .sort((a, b) => a.sort - b.sort)
      .map((s) => ({ id: s.id, name: s.name, start: s.planned_start, end: s.planned_end })),
    payments: finance?.payments ?? [],
    materials: materials.map((m) => ({
      id: m.id,
      stageId: m.stage_id,
      description: m.description,
      due: m.due_date,
    })),
  };
}
