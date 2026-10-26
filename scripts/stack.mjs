// Sobe o sistema inteiro (banco, Auth, API e front) com um comando.
//
//   bun run stack:up         tudo em Docker (como na VPS)            → http://localhost:3000
//   bun run dev:all          banco/Auth em Docker + front e API locais com recarga automática
//   bun run stack:down       para os containers (os dados ficam salvos)
//   bun run stack:logs [svc] acompanha os logs
//   bun run stack:admin <email>  dá perfil de administrador a um usuário já cadastrado
//   bun run stack:reset      apaga containers E dados locais (pede confirmação)
//   bun run stack:test-user  cria a conta de teste local (admin) definida em infra/.env
import { spawn, spawnSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { readEnv, upsertEnv } from "./lib/env-file.mjs";
import { generateSecrets } from "./lib/secrets.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const infra = join(root, "infra");
const infraEnv = join(infra, ".env");
const BACKEND = ["db", "auth", "rest", "storage", "kong", "meta", "studio", "mail", "migrate"];

const c = {
  b: (s) => `\x1b[1m${s}\x1b[0m`,
  g: (s) => `\x1b[32m${s}\x1b[0m`,
  r: (s) => `\x1b[31m${s}\x1b[0m`,
  d: (s) => `\x1b[2m${s}\x1b[0m`,
};
const fail = (msg) => {
  console.error(`\n${c.r("✖")} ${msg}\n`);
  process.exit(1);
};

// Docker Desktop instala o binário dentro do app; o atalho em /usr/local/bin só aparece
// depois de abrir o app (e às vezes nem assim). Procuramos nos lugares conhecidos.
const DOCKER_CANDIDATES = [
  "docker",
  "/usr/local/bin/docker",
  "/opt/homebrew/bin/docker",
  join(homedir(), ".docker", "bin", "docker"),
  "/Applications/Docker.app/Contents/Resources/bin/docker",
  join(homedir(), ".orbstack", "bin", "docker"),
  "/Applications/OrbStack.app/Contents/MacOS/xbin/docker",
];
let DOCKER = "docker";

const run = (args, opts = {}) => spawnSync(DOCKER, args, { stdio: "ignore", ...opts });

async function ensureDocker() {
  const found = DOCKER_CANDIDATES.find(
    (bin) => spawnSync(bin, ["--version"], { stdio: "ignore" }).status === 0,
  );
  if (!found) {
    fail(
      `Docker não encontrado.\n\n  Instale um destes e abra o aplicativo uma vez:\n` +
        `  • Docker Desktop: https://www.docker.com/products/docker-desktop/\n` +
        `  • OrbStack (mais leve no Mac): https://orbstack.dev\n\n  Depois rode o comando de novo.`,
    );
  }
  DOCKER = found;
  // Plugins (compose, credenciais) ficam na mesma pasta do binário.
  if (found.includes("/")) process.env.PATH = `${dirname(found)}:${process.env.PATH}`;

  if (run(["info"]).status !== 0) {
    if (process.platform === "darwin") {
      const app =
        existsSync("/Applications/OrbStack.app") && !existsSync("/Applications/Docker.app")
          ? "OrbStack"
          : "Docker";
      console.log(`Abrindo o ${app}…`);
      spawnSync("open", ["-a", app], { stdio: "ignore" });
    }
    process.stdout.write("aguardando o Docker iniciar");
    for (let i = 0; i < 60 && run(["info"]).status !== 0; i++) {
      process.stdout.write(".");
      await new Promise((r) => setTimeout(r, 3000));
    }
    process.stdout.write("\n");
    if (run(["info"]).status !== 0) {
      fail(
        "O Docker não iniciou. Abra o Docker Desktop, aceite os termos na primeira vez e espere o ícone da baleia ficar parado; depois rode de novo.",
      );
    }
  }
  if (run(["compose", "version"]).status !== 0) {
    fail(
      "O Docker está rodando mas o plugin 'compose' não foi encontrado. Atualize o Docker Desktop.",
    );
  }
}

/** Cria/completa o infra/.env: copia o exemplo, gera segredos vazios e acrescenta chaves novas. */
function ensureInfraEnv() {
  if (!existsSync(infraEnv)) copyFileSync(join(infra, ".env.example"), infraEnv);
  const current = readEnv(infraEnv);
  const example = readEnv(join(infra, ".env.example"));
  const updates = {};
  for (const [k, v] of Object.entries(example)) if (!(k in current)) updates[k] = v;
  const secrets = generateSecrets();
  if (!current.JWT_SECRET) Object.assign(updates, secrets);
  else if (!current.POSTGRES_PASSWORD) updates.POSTGRES_PASSWORD = secrets.POSTGRES_PASSWORD;
  if (!current.SMTP_HOST)
    Object.assign(updates, {
      SMTP_HOST: "mail",
      SMTP_PORT: "1025",
      SMTP_ADMIN_EMAIL: current.SMTP_ADMIN_EMAIL || "nao-responda@jmg.local",
    });
  if (Object.keys(updates).length) {
    upsertEnv(infraEnv, updates);
    console.log(c.d(`infra/.env atualizado (${Object.keys(updates).join(", ")})`));
  }
  return readEnv(infraEnv);
}

function compose(args, opts = {}) {
  const r = spawnSync(DOCKER, ["compose", "--profile", "dev", ...args], {
    cwd: infra,
    stdio: "inherit",
    ...opts,
  });
  if (r.status !== 0 && !opts.allowFail)
    fail(`docker compose ${args.join(" ")} falhou (código ${r.status}).`);
  return r;
}

function showMigrateLogsAndFail() {
  console.log(c.b("\nLogs das migrações do banco:"));
  compose(["logs", "--no-log-prefix", "--tail", "40", "migrate"], { allowFail: true });
  fail("A subida parou. Copie as linhas acima (logs das migrações) e envie para análise.");
}

async function waitFor(url, label, headers = {}, timeoutMs = 180_000) {
  const start = Date.now();
  process.stdout.write(`aguardando ${label}`);
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { headers });
      if (res.status < 500) {
        process.stdout.write(` ${c.g("ok")}\n`);
        return;
      }
    } catch {
      // ainda subindo
    }
    process.stdout.write(".");
    await new Promise((r) => setTimeout(r, 2000));
  }
  process.stdout.write("\n");
  fail(`${label} não respondeu em ${timeoutMs / 1000}s. Veja os logs: bun run stack:logs`);
}

function summary(env, mode) {
  console.log(`
${c.g("✔")} ${c.b("JMG Obras no ar")} ${c.d(`(${mode})`)}

  App ............ http://localhost:${mode === "docker" ? env.WEB_PORT || 3000 : 3000}
  API própria .... http://localhost:${env.API_PORT || 4000}/health
  Gateway/Auth ... http://localhost:${env.KONG_PORT || 8000}
  Studio (banco) . http://localhost:${env.STUDIO_PORT || 3001}
  E-mails (teste)  http://localhost:8025   ${c.d("convites e recuperação de senha chegam aqui")}

  Primeiro acesso: crie a conta em /auth e depois rode
    ${c.b("bun run stack:admin seu@email.com")}
`);
}

const [command = "up", ...rest] = process.argv.slice(2);

if (command === "up") {
  await ensureDocker();
  const env = ensureInfraEnv();
  const up = compose(["up", "-d", "--build", "--remove-orphans"], { allowFail: true });
  if (up.status !== 0) showMigrateLogsAndFail();
  await waitFor(`http://localhost:${env.KONG_PORT || 8000}/auth/v1/health`, "Auth", {
    apikey: env.ANON_KEY,
  });
  await waitFor(`http://localhost:${env.API_PORT || 4000}/health`, "API");
  await waitFor(`http://localhost:${env.WEB_PORT || 3000}/`, "App");
  summary(env, "docker");
} else if (command === "dev") {
  await ensureDocker();
  const env = ensureInfraEnv();
  const up = compose(["up", "-d", "--build", ...BACKEND], { allowFail: true });
  if (up.status !== 0) showMigrateLogsAndFail();
  await waitFor(`http://localhost:${env.KONG_PORT || 8000}/auth/v1/health`, "Auth", {
    apikey: env.ANON_KEY,
  });
  // Front e API locais apontando para a stack local.
  upsertEnv(join(root, ".env.development.local"), {
    // Mesmo endereço do front: o Vite repassa /supabase e /jmg-api (ver vite.config.ts).
    VITE_SUPABASE_URL: "http://localhost:3000/supabase",
    VITE_SUPABASE_PUBLISHABLE_KEY: env.ANON_KEY,
    SUPABASE_URL: `http://localhost:${env.KONG_PORT || 8000}`,
    SUPABASE_PUBLISHABLE_KEY: env.ANON_KEY,
    VITE_API_URL: "http://localhost:3000/jmg-api",
  });
  upsertEnv(join(root, "api", ".env"), {
    PORT: env.API_PORT || "4000",
    DATABASE_URL: `postgres://postgres:${env.POSTGRES_PASSWORD}@localhost:${env.DB_PORT || 54322}/postgres`,
    JWT_SECRET: env.JWT_SECRET,
    AUTH_URL: `http://localhost:${env.KONG_PORT || 8000}/auth/v1`,
    SERVICE_ROLE_KEY: env.SERVICE_ROLE_KEY,
    SITE_URL: "http://localhost:3000",
    CORS_ORIGINS: "http://localhost:3000",
  });
  // A stack em Docker pode estar com web/api rodando (stack:up): liberam as portas 3000/4000.
  compose(["stop", "web", "api"], { allowFail: true, stdio: "ignore" });
  const procs = [
    ["front", "\x1b[36m", "node", ["node_modules/vite/bin/vite.js", "dev"], root],
    [
      "api  ",
      "\x1b[35m",
      "node",
      [
        "--experimental-strip-types",
        "--no-warnings",
        "--env-file=.env",
        "--watch",
        "src/server.ts",
      ],
      join(root, "api"),
    ],
  ].map(([name, color, cmd, args, cwd]) => {
    // O Bun carrega os .env no process.env ao rodar `bun run`, e valores antigos
    // venceriam os arquivos lidos pelo Vite/API. Repassamos o ambiente sem eles.
    const clean = Object.fromEntries(
      Object.entries(process.env).filter(([k]) => !/^(VITE_|SUPABASE_|DEV_KONG|DEV_API)/.test(k)),
    );
    const p = spawn(cmd, args, { cwd, env: { ...clean, FORCE_COLOR: "1" } });
    const tag = `${color}${name}\x1b[0m │ `;
    const pipe = (stream, out) =>
      createInterface({ input: stream }).on("line", (line) => out.write(tag + line + "\n"));
    pipe(p.stdout, process.stdout);
    pipe(p.stderr, process.stderr);
    p.on("exit", (code) => console.log(`${tag}encerrado (${code ?? "sinal"})`));
    return p;
  });
  summary(env, "dev: front e API locais com recarga automática");
  console.log(
    c.d(
      "  Ctrl+C encerra front e API. O banco continua no Docker (bun run stack:down para parar).\n",
    ),
  );
  const stop = () => {
    procs.forEach((p) => p.kill("SIGTERM"));
    setTimeout(() => process.exit(0), 500);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
} else if (command === "down") {
  await ensureDocker();
  compose(["down"]);
} else if (command === "logs") {
  await ensureDocker();
  compose(["logs", "-f", "--tail", "100", ...rest]);
} else if (command === "admin") {
  const email = rest[0];
  if (!email) fail("Informe o e-mail: bun run stack:admin seu@email.com");
  await ensureDocker();
  const sql = `insert into public.user_roles(user_id, role)
    select id, 'admin' from auth.users where lower(email) = lower('${email.replace(/'/g, "''")}')
    on conflict do nothing returning user_id;`;
  const r = compose(["exec", "-T", "db", "psql", "-U", "postgres", "-tAc", sql], {
    stdio: ["ignore", "pipe", "inherit"],
    allowFail: true,
  });
  const out = String(r.stdout ?? "").trim();
  if (r.status !== 0) fail("Não consegui acessar o banco. A stack está no ar? (bun run stack:up)");
  if (!out)
    fail(
      `Nenhum usuário novo promovido. Confira se ${email} já criou a conta em /auth (ou se já é admin).`,
    );
  console.log(`${c.g("✔")} ${email} agora é administrador. Saia e entre de novo no app.`);
} else if (command === "test-user") {
  // Conta de teste local (admin) para revisão e testes automatizados. Só para a stack local.
  await ensureDocker();
  const env = ensureInfraEnv();
  if (!env.UI_TEST_EMAIL || !env.UI_TEST_PASSWORD) {
    upsertEnv(infraEnv, {
      UI_TEST_EMAIL: "revisao.ui@jmg.local",
      UI_TEST_PASSWORD: generateSecrets().POSTGRES_PASSWORD.slice(0, 16),
    });
  }
  const { UI_TEST_EMAIL: email, UI_TEST_PASSWORD: password } = readEnv(infraEnv);
  const base = `http://localhost:${env.KONG_PORT || 8000}/auth/v1`;
  const headers = {
    apikey: env.SERVICE_ROLE_KEY,
    authorization: `Bearer ${env.SERVICE_ROLE_KEY}`,
    "content-type": "application/json",
  };
  const res = await fetch(`${base}/admin/users`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Conta de teste" },
    }),
  }).catch((e) => fail(`Auth fora do ar (${e.message}). Rode bun run stack:up ou dev:all.`));
  if (!res.ok && res.status !== 422) {
    const body = await res.text();
    if (!/already/i.test(body)) fail(`Não consegui criar a conta de teste: ${res.status} ${body}`);
  }
  const sql = `insert into public.user_roles(user_id, role)
    select id, 'admin' from auth.users where lower(email) = lower('${email}')
    on conflict do nothing;`;
  const r = compose(["exec", "-T", "db", "psql", "-U", "postgres", "-tAc", sql], {
    stdio: ["ignore", "pipe", "inherit"],
    allowFail: true,
  });
  if (r.status !== 0) fail("Conta criada, mas não consegui dar o perfil de admin.");
  console.log(
    `${c.g("✔")} Conta de teste pronta: ${email} (senha em infra/.env, UI_TEST_PASSWORD)`,
  );
} else if (command === "reset") {
  await ensureDocker();
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(
    "Isso APAGA o banco e os arquivos locais. Digite APAGAR para confirmar: ",
  );
  rl.close();
  if (answer.trim() !== "APAGAR") fail("Cancelado.");
  compose(["down", "-v", "--remove-orphans"]);
} else {
  fail(`Comando desconhecido: ${command}. Use up, dev, down, logs, admin ou reset.`);
}
