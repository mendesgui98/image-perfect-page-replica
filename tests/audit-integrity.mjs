import { PGlite } from "@electric-sql/pglite";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
const db = new PGlite();
await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role BYPASSRLS; CREATE SCHEMA auth; CREATE SCHEMA storage;
CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb DEFAULT '{}');
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text,name text,owner_id text); ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql AS $$ SELECT string_to_array($1,'/') $$;
GRANT USAGE ON SCHEMA auth,storage,public TO authenticated,anon; GRANT SELECT,INSERT,DELETE ON storage.objects TO authenticated; GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated,anon;`);
for (const name of (await readdir("drizzle/migrations")).filter((n) => n.endsWith(".sql")).sort()) {
  try {
    await db.exec(await readFile("drizzle/migrations/" + name, "utf8"));
    console.log("migration OK", name);
  } catch (e) {
    console.error("migration FAILED", name, e.message);
    process.exit(1);
  }
}
const admin = "00000000-0000-0000-0000-000000000001",
  team = "00000000-0000-0000-0000-000000000002",
  pending = "00000000-0000-0000-0000-000000000003";
const value = async (sql, args = []) => Object.values((await db.query(sql, args)).rows[0] ?? {})[0];
const rejects = async (sql, args = [], message) =>
  assert.rejects(() => db.query(sql, args), message);
await db.query(
  "INSERT INTO auth.users(id,email) VALUES($1,'admin@local'),($2,'team@local'),($3,'pending@local')",
  [admin, team, pending],
);
assert.equal(
  await value("SELECT count(*)::int FROM public.user_roles"),
  0,
  "Registration must not grant a role, even on an empty installation",
);
await db.query("INSERT INTO public.user_roles(user_id,role) VALUES($1,'admin'),($2,'equipe')", [
  admin,
  team,
]);
await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [pending]);
await db.exec("SET ROLE authenticated");
assert.equal(await value("SELECT count(*)::int FROM public.people"), 0);
assert.equal(await value("SELECT count(*)::int FROM public.company_settings"), 0);
assert.equal(await value("SELECT count(*)::int FROM public.profiles"), 1);
await rejects(
  "INSERT INTO public.people(kind,name) VALUES('cliente','Unapproved')",
  [],
  /row-level security/i,
);
await db.exec("RESET ROLE");
await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [admin]);
await db.exec("SET ROLE authenticated");
const client = await value(
  "INSERT INTO public.people(kind,name) VALUES('cliente','Cliente teste') RETURNING id",
);
await rejects("INSERT INTO public.budgets(status) VALUES('aprovado')", [], /elaboração/);
const b1 = await value("INSERT INTO public.budgets(title) VALUES('Draft one') RETURNING id");
const b2 = await value("INSERT INTO public.budgets(title) VALUES('Draft two') RETURNING id");
const section = await value(
  "INSERT INTO public.budget_sections(budget_id,title) VALUES($1,'Scope') RETURNING id",
  [b1],
);
await rejects(
  "INSERT INTO public.budget_items(budget_id,section_id,description) VALUES($1,$2,'Wrong scope')",
  [b2, section],
  /item_section_same_budget/,
);
await db.query(
  "INSERT INTO public.budget_items(budget_id,section_id,description) VALUES($1,$2,'Valid scope')",
  [b1, section],
);
await rejects("UPDATE public.budgets SET status='aprovado' WHERE id=$1", [b1], /comprovante/);
await db.query(
  "INSERT INTO storage.objects(bucket_id,name,owner_id) VALUES('jmg-documents','approvals/proof.pdf',$1),('jmg-documents','approvals/orphan.pdf',$1)",
  [admin],
);
await db.query(
  "UPDATE public.budgets SET status='aprovado',approval_date='2026-10-25',approval_path='approvals/proof.pdf' WHERE id=$1",
  [b1],
);
assert.equal(
  (await db.query("DELETE FROM storage.objects WHERE name='approvals/proof.pdf' RETURNING id")).rows
    .length,
  0,
  "Referenced evidence must be retained",
);
assert.equal(
  (await db.query("DELETE FROM storage.objects WHERE name='approvals/orphan.pdf' RETURNING id"))
    .rows.length,
  1,
  "Unreferenced owner uploads may be deleted",
);
await rejects("UPDATE public.budgets SET title='Changed' WHERE id=$1", [b1], /bloqueado/);
const work = await value("SELECT public.convert_budget($1)", [b1]);
assert.equal(await value("SELECT public.convert_budget($1)", [b1]), work);
const revision1 = await value("SELECT public.copy_budget($1,true)", [b1]);
const revision2 = await value("SELECT public.copy_budget($1,true)", [b1]);
assert.equal(await value("SELECT revision FROM public.budgets WHERE id=$1", [revision1]), 1);
assert.equal(await value("SELECT revision FROM public.budgets WHERE id=$1", [revision2]), 2);
await rejects(
  "UPDATE public.budgets SET revision=1 WHERE id=$1",
  [revision2],
  /budget_revision_identity/,
);
const entry = await value(
  "INSERT INTO public.financial_entries(description,direction,amount,due_date) VALUES('Shared','saida',100,'2026-10-25') RETURNING id",
);
await db.query(
  "INSERT INTO public.expense_allocations(entry_id,work_id,amount,rule) VALUES($1,$2,80,'Fixed')",
  [entry, work],
);
await rejects("UPDATE public.financial_entries SET amount=50 WHERE id=$1", [entry], /rateado/);
await rejects("UPDATE public.financial_entries SET canceled=true WHERE id=$1", [entry], /rateado/);
await rejects(
  "UPDATE public.financial_entries SET work_id=$2 WHERE id=$1",
  [entry, work],
  /rateado/,
);
await db.query("UPDATE public.financial_entries SET amount=120 WHERE id=$1", [entry]);
const material = await value(
  "INSERT INTO public.materials(name,purchase_unit,consumption_unit) VALUES('M','un','un') RETURNING id",
);
const payload = { description: "Original", unit: "un", labor_cost: 10, active: true };
const service = await value("SELECT public.save_service_composition(NULL,$1,$2)", [
  payload,
  [{ material_id: material, consumption: 2, loss_pct: 5 }],
]);
await rejects(
  "SELECT public.save_service_composition($1,$2,$3)",
  [
    service,
    { ...payload, description: "Should rollback" },
    [{ material_id: material, consumption: -1, loss_pct: 0 }],
  ],
  /consumo/,
);
assert.equal(
  await value("SELECT description FROM public.services WHERE id=$1", [service]),
  "Original",
);
assert.equal(
  await value("SELECT consumption::int FROM public.service_materials WHERE service_id=$1", [
    service,
  ]),
  2,
);
await db.exec("RESET ROLE");
await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [team]);
await db.exec("SET ROLE authenticated");
assert.equal(await value("SELECT count(*)::int FROM public.work_registry"), 1);
assert.equal(await value("SELECT count(*)::int FROM public.budgets"), 0);
await rejects("SELECT public.save_service_composition(NULL,$1,$2)", [payload, []], /Sem permissão/);
await db.exec("RESET ROLE");
await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [pending]);
await db.exec("SET ROLE authenticated");
assert.equal(await value("SELECT count(*)::int FROM public.work_registry"), 0);
assert.equal(await value("SELECT count(*)::int FROM storage.objects"), 0);
await db.exec("RESET ROLE");
console.log(
  "PASS: registration, RLS profiles, approval, scoped items, evidence retention, locked budgets, conversion, revision uniqueness, allocations, atomic composition and operational access",
);
await db.close();
