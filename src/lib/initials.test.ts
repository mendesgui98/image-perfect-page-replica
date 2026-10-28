import { expect, it } from "vitest";
import { initials } from "./initials";

it("gera iniciais do nome ou do e-mail", () => {
  expect(initials("Guilherme Andriola Mendes")).toBe("GM");
  expect(initials("joao.silva@jmg.com")).toBe("JS");
  expect(initials("ana")).toBe("A");
  expect(initials("")).toBe("?");
});
