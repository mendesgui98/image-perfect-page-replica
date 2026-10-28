import { SCHEDULE_DISCLAIMER, type ProposalData } from "../../../src/lib/proposal.ts";
import { loadAssets } from "./assets.ts";
import { contractHtml } from "./contract-html.ts";
import { proposalHtml } from "./proposal-html.ts";
import { htmlToPdf } from "./render.ts";

// Serviço de documentos da API: recebe os dados já montados (proposal.ts) e devolve o PDF.

export type PdfService = {
  proposal(data: ProposalData): Promise<Buffer>;
  contract(data: ProposalData, today: string): Promise<Buffer>;
};

const footer = (d: ProposalData) =>
  `${d.company.name} · CNPJ ${d.company.cnpj} · ${d.company.phone} · ${d.company.instagram}`;

export function createPdfService(): PdfService {
  return {
    proposal: (d) => {
      const assets = loadAssets();
      return htmlToPdf(proposalHtml(d, assets, SCHEDULE_DISCLAIMER), assets, {
        headerRight: `${d.number} · ${d.client.name}`,
        footerLeft: footer(d),
      });
    },
    contract: (d, today) => {
      const assets = loadAssets();
      return htmlToPdf(contractHtml(d, assets, today), assets, {
        headerRight: `Contrato · ${d.number} · ${d.client.name}`,
        footerLeft: footer(d),
      });
    },
  };
}
