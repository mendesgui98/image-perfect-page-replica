import { dataPorExtenso, numeroPorExtenso } from "../../../src/lib/extenso.ts";
import type { ProposalData } from "../../../src/lib/proposal.ts";
import type { Assets } from "./assets.ts";
import {
  BLUE,
  NAVY,
  baseCss,
  coverHtml,
  dmy,
  esc,
  eyebrow,
  money,
  pad2,
  pct,
  stageColor,
} from "./layout.ts";

// Contrato de prestação de serviços no visual do orçamento. Cláusulas do contrato antigo da JMG
// (modelo CONTRATO.ELIANA, escolhido pelo Guilherme) com o texto jurídico mantido; entram os
// dados do orçamento aprovado (partes, endereço, escopo, valor por extenso, parcelas, prazo e
// início). Ajustes no texto: a referência ao anexo vira o número do orçamento, o prazo vem do
// cronograma e 4.1/7.2 ressalvam os materiais que o orçamento já inclui.

const css = `
.parties { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; margin-top: 7mm; }
.party { background: #F4F5F7; border-radius: 3mm; padding: 5mm 5mm; font-size: 9.6pt; line-height: 1.6; color: #3E4757; }
.party .lbl { font-size: 7.4pt; letter-spacing: .14em; color: ${BLUE}; font-weight: 700; text-transform: uppercase; }
.party b { display: block; color: #16233F; font-size: 11pt; margin: 1.5mm 0 1mm; }
.clause { margin-top: 8mm; }
.clause h3 { margin: 0 0 3mm; font-size: 13pt; color: #16233F; display: flex; align-items: center; gap: 3mm; break-after: avoid; }
.clause h3 span { width: 8mm; height: 8mm; border-radius: 2mm; background: ${BLUE}; color: #fff; font-size: 9pt;
  display: inline-flex; align-items: center; justify-content: center; flex: none; }
.clause p { margin: 0 0 2.6mm; text-align: justify; line-height: 1.65; font-size: 10pt; color: #2F3848; }
.clause p.sub { padding-left: 6mm; }
.tbl { margin: 3mm 0 4mm; border: 1px solid #E3E6EA; border-radius: 2.5mm; overflow: hidden; }
.tbl th { background: ${NAVY}; color: #fff; padding: 2.6mm 4mm; letter-spacing: .1em; }
.tbl td { padding: 2.6mm 4mm; border-top: 1px solid #ECEEF1; font-size: 9.6pt; }
.tbl tr.t td { font-weight: 700; background: #F4F5F7; }
.tbl .dot { display: inline-flex; width: 4.6mm; height: 4.6mm; border-radius: 99px; font-size: 6pt; margin-right: 2.5mm; vertical-align: -.8mm; }
.bank { margin: 3mm 0 4mm; background: #EEF4FD; border: 1px solid #C9D9F2; border-radius: 3mm; padding: 4mm 5mm;
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; font-size: 9.4pt; break-inside: avoid; }
.bank span { display: block; font-size: 7.2pt; letter-spacing: .12em; color: #6B7280; text-transform: uppercase; }
.bank b { color: #16233F; }
.closing { margin-top: 10mm; break-inside: avoid; }
.closing p { line-height: 1.65; }
.signs { display: grid; grid-template-columns: 1fr 1fr; gap: 14mm; margin-top: 32mm; }
.signs div { border-top: 1.5px solid ${NAVY}; padding-top: 3.5mm; font-size: 9pt; color: #5B6472; line-height: 1.5; }
.signs b { display: block; color: #16233F; font-size: 10.5pt; }
`;

function clause(n: number, title: string, body: string) {
  return `<div class="clause"><h3><span>${n}</span>${esc(title)}</h3>${body}</div>`;
}
const p = (t: string, sub = false) => `<p${sub ? ` class="sub"` : ""}>${t}</p>`;

export function contractHtml(d: ProposalData, assets: Assets, today: string) {
  const orc = `<b>orçamento ${esc(d.number)} (Anexo 1)</b>`;
  const weeks = d.weeks
    ? `${d.weeks} (${numeroPorExtenso(d.weeks)}) ${d.weeks === 1 ? "semana" : "semanas"}`
    : "a definir no cronograma definitivo";
  const client = d.client;
  const cover = coverHtml(assets, {
    code: d.number,
    kicker: "Contrato",
    title: `Contrato de<br>prestação de <em>serviços</em>`,
    subtitle: d.title,
    chips: [
      d.property,
      d.startDate ? `Início previsto ${dmy(d.startDate)}` : null,
      money(d.totals.total),
    ].filter((x): x is string => !!x),
    client: {
      name: client.name,
      ...(client.document ? { sub: `${client.documentLabel} ${client.document}` } : {}),
    },
    site: d.site,
    facts: [
      { label: "Data", value: dmy(today) },
      { label: "Orçamento", value: d.number },
      { label: "Prazo estimado", value: d.weeks ? `${d.weeks} semanas` : "a definir" },
      { label: "Responsável", value: d.responsible },
    ],
  });
  const parties = `<div class="parties">
  <div class="party"><div class="lbl">Contratante</div><b>${esc(client.name)}</b>
    ${client.rg ? `RG: ${esc(client.rg)}<br>` : ""}${client.document ? `${client.documentLabel}: ${esc(client.document)}<br>` : ""}
    ${client.address.map(esc).join("<br>")}</div>
  <div class="party"><div class="lbl">Contratado</div><b>${esc(d.company.name)}</b>
    CNPJ: ${esc(d.company.cnpj)}<br>${esc(d.company.street)} – Casa<br>${esc(d.company.district)}<br>${esc(d.company.city)}<br>CEP ${esc(d.company.cep)}</div>
</div>`;
  const scope = `<table class="tbl"><thead><tr><th>Etapa</th><th class="r">Início</th><th class="r">Duração</th></tr></thead><tbody>
${d.stages.map((s) => `<tr><td><span class="badge dot" style="background:${stageColor(s.number)}">${pad2(s.number)}</span>${esc(s.title)}</td><td class="r">semana ${s.startWeek}</td><td class="r">${s.weeks} sem.</td></tr>`).join("")}
</tbody></table>`;
  const pay = `<table class="tbl"><thead><tr><th>Etapas</th><th class="r">%</th><th class="r">Valor</th></tr></thead><tbody>
${d.payments.map((r) => `<tr><td><b>${esc(r.label)}</b>${r.when ? ` · ${esc(r.when)}` : ""}</td><td class="r">${pct(r.pct)}</td><td class="r nb">${money(r.value)}</td></tr>`).join("")}
<tr class="t"><td>Total</td><td class="r">100%</td><td class="r nb">${money(d.totals.total)}</td></tr></tbody></table>`;
  const c = d.company;
  const body = `<section class="page">
  ${eyebrow("Contrato de prestação de serviços")}
  <h2>Partes e objeto</h2>
  ${parties}
  ${clause(
    1,
    "Objetivo",
    p(
      `1.1. Execução de obra civil de reforma residencial, situada no endereço <b>${esc(d.site.full)}</b>;`,
    ) +
      p(
        `1.2. Todos os serviços objeto desse contrato, assim como suas especificações, quantidades e materiais inclusos, estão especificados e representados no ${orc}, e de acordo com o projeto executivo;`,
      ) +
      p(
        `1.3. Fornecimento de mão de obra qualificada para execução dos serviços, quantificados e descritos no ${orc}, organizados nas etapas abaixo:`,
      ) +
      scope,
  )}
  ${clause(
    2,
    "Valor",
    p(
      `2.1. O valor a pagar pelo CONTRATANTE para a execução dos serviços listados no item 1 (OBJETIVO) deste contrato é de <b>${money(d.totals.total)} (${esc(d.totals.totalWords)})</b>;`,
    ),
  )}
  ${clause(
    3,
    "Pagamento",
    p("3.1. Os pagamentos deverão ser efetuados conforme o fluxo financeiro a seguir:") +
      pay +
      p(
        "3.2. A confirmação dos pagamentos se dará após recebimento de comprovante de transferência.",
      ) +
      p(
        "3.3. Todos e quaisquer serviços extraordinários, que não constem do presente contrato, deverão ser objeto de propostas adicionais, e após acordado o preço e prazo. As modificações na planta original serão executadas somente após concordância das partes (contratante e contratado), tanto com relação a aumento do prazo inicialmente determinado quanto com relação a preços de montagem. Ficando por conta e responsabilidade do contratante o fornecimento dos materiais necessários.",
      ) +
      p(
        "3.4. Os pagamentos serão realizados através de PIX, transferência bancária ou boleto, para a conta corrente em nome da contratada:",
      ) +
      `<div class="bank"><div><span>Favorecido</span><b>${esc(c.name.toUpperCase())}</b></div><div><span>CNPJ / Chave PIX</span><b>${esc(c.pix)}</b></div><div><span>Banco</span><b>${esc(c.bank)}</b></div><div><span>Agência</span><b>${esc(c.agency)}</b></div><div><span>Conta corrente</span><b>${esc(c.account)}</b></div></div>`,
  )}
  ${clause(
    4,
    "Não inclusos",
    p(
      `4.1. O presente contrato não obriga o CONTRATADO a fornecer quaisquer materiais de acabamento previstos no projeto que não estejam relacionados no ${orc}, sendo que a compra desses materiais de acabamento é de responsabilidade do CONTRATANTE;`,
    ) +
      p(
        `4.2. O CONTRATADO é responsável pela instalação desses materiais de acabamento, desde que especificados no ${orc};`,
      ) +
      p(
        "4.3. O presente contrato não obriga o CONTRATADO a fornecer e instalar qualquer tipo de equipamento eletroeletrônico, sendo que a compra e a instalação desses é de responsabilidade do CONTRATANTE e o fornecedor escolhido.",
      ),
  )}
  ${clause(
    5,
    "Prazo de execução",
    p("5.1. A obra terá início quando todos os requisitos estiverem atendidos:") +
      p("5.1.1. Assinatura desse Contrato;", true) +
      p("5.1.2. Comprovação do pagamento do Sinal;", true) +
      p("5.1.3. Emissão de RRT (Registro de Responsabilidade Técnica).", true) +
      p(
        `5.2. A data estipulada para início e para que todos os requisitos acima estejam em acordo é <b>${d.startDate ? dmy(d.startDate) : "a definir entre as partes"}</b>;`,
      ) +
      p(
        "5.2.1. A data de início pode sofrer alteração por conta de caso fortuito e força maior, na forma da lei civil; ou não cumprimento de todos os requisitos acima;",
        true,
      ) +
      p(
        `5.3. A obra será executada conforme o Cronograma Físico-Financeiro, cujo prazo estimado é de <b>${weeks}</b> para conclusão dos serviços. Ficando desde já pactuada uma tolerância suplementar de até 20% (vinte por cento) sobre o prazo total, sem que isso configure atraso ou inadimplemento por parte do CONTRATADO.`,
      ) +
      p(
        "5.3.1. O prazo contratual será automaticamente prorrogado, sem necessidade de aditivo, nas seguintes hipóteses:",
        true,
      ) +
      [
        "I – atraso na entrega de materiais sob responsabilidade do CONTRATANTE;",
        "II – indecisão do CONTRATANTE quanto a acabamentos, cores, paginações, detalhes ou qualquer definição necessária para continuidade da obra;",
        "III – incompatibilização entre projetos (arquitetura, marcenaria, elétrica, hidráulica, climatização ou automação);",
        "IV – impedimento de acesso ao local pela administração do condomínio;",
        "V – chuvas, condições climáticas adversas, caso fortuito ou força maior;",
        "VI – paralisações determinadas por terceiros contratados diretamente pelo CONTRATANTE;",
        "VII – serviços extras solicitados pelo CONTRATANTE e formalizados via Ordem de Serviço Extra.",
      ]
        .map((t) => p(t, true))
        .join("") +
      p(
        "5.3.2. O atraso injustificado no cumprimento das obrigações contratuais sujeitará o contratado à multa de 1% (um por cento) ao dia, incidente sobre o valor total do contrato, limitada a 20% (vinte por cento), sem prejuízo das demais penalidades previstas.",
        true,
      ) +
      p(
        "5.3.3. Em qualquer hipótese de suspensão ou impossibilidade de continuidade da obra por motivos atribuíveis ao CONTRATANTE, o prazo ficará congelado até a completa regularização da pendência, acrescido de prazo suplementar proporcional.",
        true,
      ) +
      p(
        "5.3.4. O prazo final de entrega será revalidado no Termo de Início de Obra (ANEXO 2), podendo ser ajustado de acordo com o cronograma definitivo.",
        true,
      ),
  )}
  ${clause(
    6,
    "Obrigação do contratado",
    p(
      "6.1. O CONTRATADO deverá executar todos os serviços com o cumprimento da qualidade requerida no projeto, demonstrando conhecimento técnico e capacidade de leitura e interpretação dos projetos, aplicar mão de obra devidamente qualificada e treinada, visando obter alta qualidade geral da obra, maior durabilidade, baixa manutenção das instalações, economia de recursos e evitando desperdícios dos materiais fornecidos;",
    ) +
      p(
        "6.2. O CONTRATADO se obriga a manter vigente e regular o seguro de acidentes de trabalho para seus funcionários. Obriga-se ainda a respeitar e cumprir todas as normas de segurança de trabalho e medicina do trabalho (vide portaria nº 3214 de 08/06/78 do Ministério do Trabalho), tomando todas as medidas necessárias de proteção aos empregados e terceiros durante as obras em construção, inclusive fornecer todos os materiais de proteção exigidos pela legislação vigente;",
      ) +
      p(
        "6.3. Fica expressamente acordado que não se estabelece por força deste contrato qualquer relação de emprego entre o CONTRATANTE e o CONTRATADO, sendo única e exclusiva responsabilidade do CONTRATADO toda e qualquer reclamação que porventura advier de seus funcionários;",
      ),
  )}
  ${clause(
    7,
    "Obrigação do contratante",
    p(
      "7.1. O CONTRATANTE deverá fornecer todos os projetos executivos desenvolvidos por arquitetos ou engenheiros;",
    ) +
      p(
        `7.2. O CONTRATANTE deverá fornecer os materiais de acabamento não relacionados no ${orc}, com insumos inerentes às tarefas a serem desenvolvidas pelo CONTRATADO;`,
      ),
  )}
  ${clause(
    8,
    "Garantia",
    p(
      "8.1. Todos os serviços contratados terão garantia de 12 meses, contados a partir da entrega da obra;",
    ) +
      p(
        "8.2. A CONTRATADA não será responsabilizada diretamente por defeitos causados pela má utilização ou utilização indevida de nenhum dos materiais e insumos empregados na obra;",
      ),
  )}
  ${clause(
    9,
    "Rescisão contratual",
    p("9.1. Serão motivos de rescisão contratual:") +
      p(
        "9.1.1. A solicitação por requerimento das partes, com justificativa formal e por escrito;",
        true,
      ) +
      p("9.1.2. O não pagamento de quaisquer das parcelas convencionadas;", true) +
      p("9.1.3. A não execução dos serviços dentro dos prazos estipulados;", true) +
      p(
        "9.1.4. O não cumprimento de quaisquer das cláusulas e condições estabelecidas no presente instrumento.",
        true,
      ) +
      p(
        "9.2. Na ocorrência de quaisquer das situações contempladas descritas acima, considerar-se-á rescindido o presente contrato independente de qualquer notificação ou interpelação judicial ou extrajudicial.",
      ) +
      p(
        "9.3. Ocorrendo a rescisão contratual pelos motivos contemplados acima, será efetuada medição dos serviços realizados, e avaliados para pagamento ou devolução à parte prejudicada (contratante ou contratado).",
      ) +
      p(
        "9.4. Fica estipulada ao CONTRATADO uma multa de 10% sobre o saldo restante a receber caso haja infração de qualquer uma das regras ou rescisão desse contrato sem prévio consentimento da outra parte;",
      ) +
      p(
        "9.5. Fica estipulada ao CONTRATANTE uma multa de 10% sobre o valor já pago caso haja infração de qualquer uma das regras ou rescisão desse contrato sem prévio consentimento da outra parte;",
      ),
  )}
  ${clause(
    10,
    "Condições gerais",
    p("10.1. A CONTRATADA será totalmente responsável pela execução da obra civil;") +
      p(
        "10.2. A CONTRATADA não é responsável pelos serviços executados por terceiros contratados diretamente pelo CONTRATANTE, nem da compatibilização dos serviços prestados por tais terceiros com os serviços firmados por este contrato e que não estejam previstos no projeto;",
      ) +
      p(
        "10.3. Durante o período vigente deste contrato, em caso de desastre natural, pandemia, mudança repentina do tempo climático ou prolongação do mesmo (chuvas), que dificulte ou impeça o acesso do local ou andamento do serviço proposto, fica o tempo estimado para o término da obra suspenso, até que haja condições seguras para realização do serviço;",
      ) +
      p(
        "10.4. Todas as situações descritas acima, entre outras que se encaixarem, deverão ser expressamente acordadas entre CONTRATADO e CONTRATANTE, a fim de extinguir qualquer tipo de dúvida de ambas as partes;",
      ) +
      p(
        "10.5. Ao término, será assinado o Termo de Conclusão de Obra, condição obrigatória para liberação da última parcela.",
      ),
  )}
  <div class="closing clause">
    <p>E por estarem justas e avençadas, as partes assinam o presente instrumento em 02 vias de igual teor e forma.</p>
    <p>${esc(d.site.city || "São Paulo")}, ${dataPorExtenso(today)}.</p>
    <div class="signs">
      <div><b>${esc(c.name.toUpperCase())}</b>CNPJ: ${esc(c.cnpj)}<br>${esc(d.responsible.toUpperCase())}</div>
      <div><b>${esc(client.name.toUpperCase())}</b>${client.document ? `${client.documentLabel}: ${esc(client.document)}` : ""}</div>
    </div>
  </div>
</section>`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Contrato ${esc(d.number)}</title>
<style>${baseCss(assets)}${css}</style></head><body>${cover}${body}</body></html>`;
}
