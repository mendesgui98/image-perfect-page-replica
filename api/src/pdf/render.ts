import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { PdfLayout } from "../../../src/lib/proposal.ts";
import { chromium, type Browser } from "playwright-core";

// HTML → PDF no Chromium (Playwright) em dois formatos (PdfLayout):
// - "continuo": página única na largura A4 com a altura medida a partir do conteúdo;
// - "paginado": folhas A4 e, com pdf-lib, cabeçalho e rodapé carimbados em todas as páginas menos
//   a capa (logo + "JMG REFORMAS" + documento/cliente no topo; empresa e "n / total" embaixo).

let browser: Promise<Browser> | null = null;

function getBrowser() {
  browser ??= chromium.launch({ args: ["--font-render-hinting=none"] }).catch((e: unknown) => {
    browser = null;
    throw e;
  });
  return browser;
}

export async function closeBrowser() {
  const b = browser;
  browser = null;
  if (b) await (await b).close().catch(() => {});
}

const WIDTH_PX = 794; // 210 mm a 96 dpi

export type Stamp = { headerRight: string; footerLeft: string };

export async function htmlToPdf(
  html: string,
  title: string,
  layout: PdfLayout,
  stamp: Stamp,
  logoPng: Uint8Array,
): Promise<Buffer> {
  const page = await (await getBrowser()).newPage({ viewport: { width: WIDTH_PX, height: 1123 } });
  let pdf: PDFDocument | null = null;
  try {
    await page.setContent(html, { waitUntil: "load" });
    await page.emulateMedia({ media: "print" });
    await page.evaluate(() => document.fonts.ready);
    if (layout === "paginado") {
      const raw = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
      pdf = await PDFDocument.load(raw);
      await stampPages(pdf, stamp, logoPng);
    } else {
      const height = await page.evaluate(() => Math.ceil(document.documentElement.scrollHeight));
      // Arredondamentos do Chromium podem empurrar 1 px para uma segunda página: folga crescente.
      for (const slack of [0, 2, 8, 32]) {
        const raw = await page.pdf({
          // Mesma largura da janela: com "210mm" o Chromium arredonda a página para cima e
          // sobra um fio branco na borda direita da capa e da faixa final.
          width: `${WIDTH_PX}px`,
          height: `${height + slack}px`,
          printBackground: true,
          margin: { top: 0, right: 0, bottom: 0, left: 0 },
        });
        const doc = await PDFDocument.load(raw);
        if (doc.getPageCount() === 1) {
          pdf = doc;
          break;
        }
      }
    }
  } finally {
    await page.close();
  }
  if (!pdf) throw new Error("O PDF contínuo não coube em uma página.");
  pdf.setTitle(title);
  return Buffer.from(await pdf.save());
}

/** Helvetica padrão do PDF só tem WinAnsi: troca o que estiver fora por "?". */
const winAnsi = (s: string) =>
  s.replace(/[^\x20-\x7e\u00a0-\u00ff\u2013\u2014\u2018\u2019\u201c\u201d\u2022]/g, "?");

const MM = 72 / 25.4;
const NAVY = rgb(0x11 / 255, 0x24 / 255, 0x40 / 255);
const GREY = rgb(0x8a / 255, 0x93 / 255, 0xa1 / 255);
const LINE = rgb(0xe3 / 255, 0xe6 / 255, 0xea / 255);

async function stampPages(pdf: PDFDocument, stamp: Stamp, logoPng: Uint8Array) {
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await pdf.embedPng(logoPng);
  const pages = pdf.getPages();
  const total = pages.length;
  pages.forEach((p, i) => {
    if (i === 0) return;
    const { width, height } = p.getSize();
    const left = 16 * MM;
    const right = width - 16 * MM;
    const logoH = 9 * MM;
    const logoW = (logo.width / logo.height) * logoH;
    p.drawImage(logo, { x: left, y: height - 15.5 * MM, width: logoW, height: logoH });
    p.drawText("JMG REFORMAS", {
      x: left + logoW + 2.5 * MM,
      y: height - 12 * MM,
      size: 7.5,
      font: bold,
      color: NAVY,
    });
    const hr = winAnsi(stamp.headerRight);
    p.drawText(hr, {
      x: right - regular.widthOfTextAtSize(hr, 7.5),
      y: height - 12 * MM,
      size: 7.5,
      font: regular,
      color: GREY,
    });
    p.drawLine({
      start: { x: left, y: height - 17.5 * MM },
      end: { x: right, y: height - 17.5 * MM },
      thickness: 0.6,
      color: LINE,
    });
    p.drawText(winAnsi(stamp.footerLeft), {
      x: left,
      y: 9 * MM,
      size: 7,
      font: regular,
      color: GREY,
    });
    const pg = `${i + 1} / ${total}`;
    p.drawText(pg, {
      x: right - bold.widthOfTextAtSize(pg, 7.5),
      y: 9 * MM,
      size: 7.5,
      font: bold,
      color: NAVY,
    });
  });
}
