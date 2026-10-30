import { PDFDocument } from "pdf-lib";
import { chromium, type Browser } from "playwright-core";

// HTML → PDF no Chromium (Playwright) numa página única e contínua: largura A4 e altura medida
// a partir do conteúdo, então o documento só cresce quando há mais serviços. pdf-lib confere que
// saiu uma página só e grava o título do documento.

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

export async function htmlToPdf(html: string, title: string): Promise<Buffer> {
  const page = await (await getBrowser()).newPage({ viewport: { width: WIDTH_PX, height: 1123 } });
  let pdf: PDFDocument | null = null;
  try {
    await page.setContent(html, { waitUntil: "load" });
    await page.emulateMedia({ media: "print" });
    await page.evaluate(() => document.fonts.ready);
    const height = await page.evaluate(() => Math.ceil(document.documentElement.scrollHeight));
    // Arredondamentos do Chromium podem empurrar 1 px para uma segunda página: folga crescente.
    for (const slack of [0, 2, 8, 32]) {
      const raw = await page.pdf({
        width: "210mm",
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
  } finally {
    await page.close();
  }
  if (!pdf) throw new Error("O PDF contínuo não coube em uma página.");
  pdf.setTitle(title);
  return Buffer.from(await pdf.save());
}
