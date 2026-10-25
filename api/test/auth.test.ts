import assert from "node:assert/strict";
import { test } from "node:test";
import { verifyJwt } from "../src/auth.ts";
import { SECRET, token } from "./helpers.ts";

test("aceita token válido do Auth", () => {
  const claims = verifyJwt(token({ sub: "u1", email: "a@b.c" }), SECRET);
  assert.equal(claims.sub, "u1");
});

test("recusa assinatura com outro segredo", () => {
  assert.throws(() => verifyJwt(token({ sub: "u1" }, "outro"), SECRET), /Assinatura inválida/);
});

test("recusa token expirado", () => {
  const t = token({ sub: "u1", exp: Math.floor(Date.now() / 1000) - 10 });
  assert.throws(() => verifyJwt(t, SECRET), /Sessão expirada/);
});

test("recusa chave anon/service_role usada como sessão", () => {
  assert.throws(() => verifyJwt(token({ role: "anon", sub: "" }), SECRET), /não pertence/);
});

test("recusa algoritmo diferente de HS256", () => {
  const [, body, sig] = token({ sub: "u1" }).split(".");
  const head = Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url");
  assert.throws(() => verifyJwt(`${head}.${body}.${sig}`, SECRET), /Algoritmo/);
});
