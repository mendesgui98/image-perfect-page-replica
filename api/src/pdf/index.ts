import type { ContractClause } from "../../../src/lib/contract-clauses.ts";
import {
  SCHEDULE_DISCLAIMER,
  type PdfLayout,
  type ProposalData,
} from "../../../src/lib/proposal.ts";
import { loadAssets } from "./assets.ts";
import { contractHtml } from "./contract-html.ts";
import { proposalHtml } from "./proposal-html.ts";
import { htmlToPdf } from "./render.ts";

// Serviço de documentos da API: recebe os dados já montados (proposal.ts) e devolve o PDF.

export type PdfService = {
  proposal(data: ProposalData, layout: PdfLayout): Promise<Buffer>;
  contract(
    data: ProposalData,
    today: string,
    clauses: ContractClause[],
    layout: PdfLayout,
  ): Promise<Buffer>;
};

const footer = (d: ProposalData) =>
  `${d.company.name} · CNPJ ${d.company.cnpj} · ${d.company.phone} · ${d.company.instagram}`;

export function createPdfService(): PdfService {
  return {
    proposal: (d, layout) => {
      const assets = loadAssets();
      const title = `${d.number} · ${d.client.name}`;
      return htmlToPdf(
        proposalHtml(d, assets, SCHEDULE_DISCLAIMER, layout),
        title,
        layout,
        { headerRight: title, footerLeft: footer(d) },
        assets.logoBlue,
      );
    },
    contract: (d, today, clauses, layout) => {
      const assets = loadAssets();
      const title = `Contrato · ${d.number} · ${d.client.name}`;
      return htmlToPdf(
        contractHtml(d, assets, today, clauses, layout),
        title,
        layout,
        { headerRight: title, footerLeft: footer(d) },
        assets.logoBlue,
      );
    },
  };
}
