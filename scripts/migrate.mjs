// Aplica as migrações de supabase/migrations em ordem, uma vez cada.
// Usa a mesma tabela de controle da Supabase CLI (supabase_migrations.schema_migrations),
// então o histórico continua compatível com `supabase db push`.
//
// Uso: DATABASE_URL=postgres://postgres:senha@host:5432/postgres node scripts/migrate.mjs
// Opções: MIGRATIONS_DIR (padrão: supabase/migrations), WAIT_FOR_SERVICES=1 (aguarda auth e storage).
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL não definida.");
  process.exit(1);
}
const dir = process.env.MIGRATIONS_DIR ?? "supabase/migrations";
const sql = postgres(url, { max: 1, onnotice: () => {} });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(check, label) {
  for (let i = 0; i < 90; i++) {
    try {
      const [row] = await sql.unsafe(check);
      if (row?.ok) return;
    } catch {
      // banco ainda subindo
    }
    if (i % 10 === 0) console.log(`aguardando ${label}...`);
    await sleep(2000);
  }
  throw new Error(`Tempo esgotado aguardando ${label}`);
}

let current = "";
try {
  await waitFor("select true as ok", "banco");
  if (process.env.WAIT_FOR_SERVICES === "1") {
    // auth.users é criada pelo serviço de Auth e storage.objects pelo Storage.
    await waitFor("select to_regclass('auth.users') is not null as ok", "schema auth");
    await waitFor("select to_regclass('storage.objects') is not null as ok", "schema storage");
  }

  await sql`create schema if not exists supabase_migrations`;
  await sql`create table if not exists supabase_migrations.schema_migrations (
    version text primary key, statements text[], name text)`;

  const applied = new Set(
    (await sql`select version from supabase_migrations.schema_migrations`).map((r) => r.version),
  );
  const files = (await readdir(dir)).filter((f) => /^\d{14}_.+\.sql$/.test(f)).sort();
  let count = 0;
  for (const file of files) {
    const version = file.slice(0, 14);
    if (applied.has(version)) continue;
    const name = file.slice(15, -4);
    const body = await readFile(join(dir, file), "utf8");
    current = file;
    await sql.begin(async (tx) => {
      await tx.unsafe(body);
      await tx`insert into supabase_migrations.schema_migrations (version, statements, name)
        values (${version}, ${[body]}, ${name})`;
    });
    console.log(`aplicada ${file}`);
    count++;
  }
  console.log(count ? `${count} migração(ões) aplicada(s).` : "Banco já está atualizado.");
} catch (error) {
  console.error(`Falha na migração${current ? ` ${current}` : ""}:`);
  console.error(`  ${error.message}`);
  for (const k of ["code", "detail", "hint", "where", "position"]) {
    if (error[k]) console.error(`  ${k}: ${error[k]}`);
  }
  console.error(`  conectado como: ${new URL(url).username}`);
  process.exitCode = 1;
} finally {
  await sql.end();
}
