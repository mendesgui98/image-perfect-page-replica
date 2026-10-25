import assert from "node:assert/strict";
import { after, test } from "node:test";
import { fakeRepo, start, token } from "./helpers.ts";

const repo = fakeRepo({ adm: ["admin"], fin: ["financeiro"], seguro: ["admin"] }, ["seguro"]);
const api = await start({ repo });
after(() => api.close());

test("health responde com o estado do banco", async () => {
  const r = await api.call("/health");
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { status: "ok", db: true });
});

test("rota inexistente devolve 404 em JSON", async () => {
  const r = await api.call("/nada");
  assert.equal(r.status, 404);
  assert.equal((await r.json()).error, "not_found");
});

test("sem token devolve 401", async () => {
  const r = await api.call("/v1/me");
  assert.equal(r.status, 401);
});

test("/v1/me devolve os papéis do usuário", async () => {
  const r = await api.call("/v1/me", { auth: token({ sub: "fin", email: "f@jmg" }) });
  assert.deepEqual(await r.json(), {
    id: "fin",
    email: "f@jmg",
    roles: ["financeiro"],
    aal: "aal1",
  });
});

test("rotas de admin recusam outros perfis", async () => {
  const r = await api.call("/v1/admin/users", { auth: token({ sub: "fin" }) });
  assert.equal(r.status, 403);
});

test("admin com 2FA cadastrado precisa estar em aal2", async () => {
  const sem = await api.call("/v1/admin/users", { auth: token({ sub: "seguro" }) });
  assert.equal(sem.status, 403);
  assert.equal((await sem.json()).error, "mfa_required");
  const com = await api.call("/v1/admin/users", { auth: token({ sub: "seguro", aal: "aal2" }) });
  assert.equal(com.status, 200);
});

test("convite cria usuário com o papel escolhido", async () => {
  const r = await api.call("/v1/admin/invites", {
    method: "POST",
    auth: token({ sub: "adm" }),
    body: JSON.stringify({ email: " Novo@JMG.com ", role: "equipe" }),
  });
  assert.equal(r.status, 201);
  const { user } = await r.json();
  assert.deepEqual(api.invites.at(-1), "novo@jmg.com");
  assert.deepEqual(repo.roles.get(user.id), ["equipe"]);
});

test("convite valida o corpo", async () => {
  const r = await api.call("/v1/admin/invites", {
    method: "POST",
    auth: token({ sub: "adm" }),
    body: JSON.stringify({ email: "x", role: "dono" }),
  });
  assert.equal(r.status, 400);
});

test("admin não remove o próprio acesso de administrador", async () => {
  const r = await api.call("/v1/admin/users/adm/roles", {
    method: "PUT",
    auth: token({ sub: "adm" }),
    body: JSON.stringify({ roles: ["financeiro"] }),
  });
  assert.equal(r.status, 409);
  assert.equal((await r.json()).error, "self_demotion");
});

test("altera papéis de outro usuário", async () => {
  const r = await api.call("/v1/admin/users/fin/roles", {
    method: "PUT",
    auth: token({ sub: "adm" }),
    body: JSON.stringify({ roles: ["financeiro", "equipe"] }),
  });
  assert.equal(r.status, 200);
  assert.deepEqual(repo.roles.get("fin"), ["financeiro", "equipe"]);
});

test("exportação devolve anexo JSON", async () => {
  const r = await api.call("/v1/admin/export", { auth: token({ sub: "adm" }) });
  assert.equal(r.status, 200);
  assert.match(r.headers.get("content-disposition") ?? "", /jmg-backup-/);
  assert.deepEqual((await r.json()).tables, { budgets: [{ id: "b1" }] });
});

test("CORS só libera a origem do app", async () => {
  const ok = await api.call("/health", { headers: { origin: "https://app.jmg.test" } });
  assert.equal(ok.headers.get("access-control-allow-origin"), "https://app.jmg.test");
  const bad = await api.call("/health", { headers: { origin: "https://evil.test" } });
  assert.equal(bad.headers.get("access-control-allow-origin"), null);
});

test("método errado devolve 405", async () => {
  const r = await api.call("/v1/me", { method: "DELETE", auth: token({ sub: "adm" }) });
  assert.equal(r.status, 405);
});
