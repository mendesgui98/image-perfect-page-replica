import type { ContractClause } from "../../../src/lib/contract-clauses.ts";
import { SCHEDULE_DISCLAIMER, type ProposalData } from "../../../src/lib/proposal.ts";
import { loadAssets } from "./assets.ts";
import { contractHtml } from "./contract-html.ts";
import { proposalHtml } from "./proposal-html.ts";
import { htmlToPdf } from "./render.ts";

// Serviço de documentos da API: recebe os dados já montados (proposal.ts) e devolve o PDF.

export type PdfService = {
  proposal(data: ProposalData): Promise<Buffer>;
  contract(data: ProposalData, today: string, clauses: ContractClause[]): Promise<Buffer>;
};

export function createPdfService(): PdfService {
  return {
    proposal: (d) =>
      htmlToPdf(
        proposalHtml(d, loadAssets(), SCHEDULE_DISCLAIMER),
        `${d.number} · ${d.client.name}`,
      ),
    contract: (d, today, clauses) =>
      htmlToPdf(
        contractHtml(d, loadAssets(), today, clauses),
        `Contrato · ${d.number} · ${d.client.name}`,
      ),
  };
}
