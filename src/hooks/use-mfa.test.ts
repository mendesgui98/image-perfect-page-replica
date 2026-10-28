import { describe, expect, it } from "vitest";
import { qrSource } from "./use-mfa";

describe("qrSource", () => {
  it("mantém data URI", () => {
    expect(qrSource("data:image/svg+xml;utf-8,<svg/>")).toBe("data:image/svg+xml;utf-8,<svg/>");
  });
  it("converte SVG puro em data URI", () => {
    expect(qrSource("<svg></svg>")).toBe("data:image/svg+xml;utf8,%3Csvg%3E%3C%2Fsvg%3E");
  });
});
