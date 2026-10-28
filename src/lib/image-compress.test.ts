import { describe, expect, it } from "vitest";
import { jpegName, shouldCompress, targetSize } from "./image-compress";

describe("compressão de fotos", () => {
  it("reduz o maior lado para 1920 px mantendo a proporção", () => {
    expect(targetSize(4032, 3024)).toEqual({ width: 1920, height: 1440 });
    expect(targetSize(3024, 4032)).toEqual({ width: 1440, height: 1920 });
  });

  it("não amplia imagens pequenas", () => {
    expect(targetSize(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it("só comprime fotos grandes em formatos suportados", () => {
    expect(shouldCompress({ type: "image/jpeg", size: 5_000_000 })).toBe(true);
    expect(shouldCompress({ type: "image/jpeg", size: 100_000 })).toBe(false);
    expect(shouldCompress({ type: "application/pdf", size: 5_000_000 })).toBe(false);
    expect(shouldCompress({ type: "image/gif", size: 5_000_000 })).toBe(false);
  });

  it("troca a extensão para .jpg", () => {
    expect(jpegName("IMG_0001.HEIC")).toBe("IMG_0001.jpg");
    expect(jpegName("foto.obra.png")).toBe("foto.obra.jpg");
    expect(jpegName(".png")).toBe("foto.jpg");
  });
});
