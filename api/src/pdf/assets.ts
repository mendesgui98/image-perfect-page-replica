import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Fontes Inter e logos embutidas no HTML (base64): o PDF não depende de internet.

const here = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(here, "..", "..", "assets");
const require = createRequire(import.meta.url);

export type Assets = { css: string; logoBlue: Uint8Array; logoWhite: string; logoBlueUri: string };

let cached: Assets | null = null;

export function loadAssets(): Assets {
  if (cached) return cached;
  const fonts = dirname(require.resolve("@fontsource/inter/package.json"));
  const css = [400, 500, 600, 700, 800]
    .map((w) => {
      const data = readFileSync(join(fonts, "files", `inter-latin-${w}-normal.woff2`));
      return `@font-face{font-family:Inter;font-style:normal;font-weight:${w};src:url(data:font/woff2;base64,${data.toString("base64")}) format("woff2");}`;
    })
    .join("\n");
  const blue = readFileSync(join(ASSETS, "jmg-logo-blue.png"));
  const white = readFileSync(join(ASSETS, "jmg-logo-white.png"));
  cached = {
    css,
    logoBlue: new Uint8Array(blue),
    logoBlueUri: `data:image/png;base64,${blue.toString("base64")}`,
    logoWhite: `data:image/png;base64,${white.toString("base64")}`,
  };
  return cached;
}
