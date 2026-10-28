import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { chromium, type Browser } from "playwright-core";
import type { Assets } from "./assets.ts";

// HTML → PDF no Chromium (Playwright) e, depois, cabeçalho e rodapé carimbados com pdf-lib em
// todas as páginas menos a capa: logo + "JMG REFORMAS" + documento/cliente no topo; dados da
// empresa e paginação "n / total" embaixo (a capa conta como página 1).

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

export type Stamp = { headerRight: string; footerLeft: string };

/** Helvetica padrão do PDF só tem WinAnsi: troca o que estiver fora por "?". */
const winAnsi = (s: string) =>
  s.replace(/[^\x20-\x7e\u00a0-\u00ff\u2013\u2014\u2018\u2019\u201c\u201d\u2022]/g, "?");

const MM = 72 / 25.4;
const NAVY = rgb(0x11 / 255, 0x24 / 255, 0x40 / 255);
const GREY = rgb(0x8a / 255, 0x93 / 255, 0xa1 / 255);
const LINE = rgb(0xe3 / 255, 0xe6 / 255, 0xea / 255);

export async function htmlToPdf(html: string, assets: Assets, stamp: Stamp): Promise<Buffer> {
  const page = await (await getBrowser()).newPage();
  let raw: Buffer;
  try {
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    raw = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
  } finally {
    await page.close();
  }
  const pdf = await PDFDocument.load(raw);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await pdf.embedPng(assets.logoBlue);
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
  return Buffer.from(await pdf.save());
}
