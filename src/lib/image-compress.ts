// Compressão de fotos no navegador antes do upload.
// Fotos de celular têm 3–8 MB; redimensionadas para 1920 px em JPEG ficam com 300–600 KB,
// o que acelera o envio em 4G e reduz o armazenamento.

export const MAX_DIMENSION = 1920;
export const JPEG_QUALITY = 0.8;
/** Abaixo deste tamanho a imagem é enviada como está. */
export const MIN_BYTES_TO_COMPRESS = 400 * 1024;

const COMPRESSIBLE = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

/** Dimensões finais mantendo a proporção, sem ampliar imagens menores. */
export function targetSize(width: number, height: number, max = MAX_DIMENSION) {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export function shouldCompress(file: Pick<File, "type" | "size">) {
  return COMPRESSIBLE.includes(file.type) && file.size >= MIN_BYTES_TO_COMPRESS;
}

/** Nome com a extensão trocada para .jpg. */
export function jpegName(name: string) {
  const base = name.replace(/\.[^.]+$/, "");
  return `${base || "foto"}.jpg`;
}

/**
 * Devolve uma versão comprimida da foto, ou o arquivo original quando não for imagem,
 * quando o navegador não conseguir decodificar (ex.: HEIC fora do Safari) ou quando a
 * compressão não reduzir o tamanho.
 */
export async function compressImage(file: File): Promise<File> {
  if (!shouldCompress(file) || typeof createImageBitmap === "undefined") return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const { width, height } = targetSize(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    // Fundo branco para PNG com transparência não virar preto no JPEG.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], jpegName(file.name), {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  }
}
